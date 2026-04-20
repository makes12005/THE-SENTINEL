import 'dart:async';
import 'dart:convert';
import 'dart:isolate';
import 'dart:ui';
import 'package:dio/dio.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/env.dart';
import '../../../core/storage/secure_storage.dart';
import 'location_queue.dart';

/// Background GPS TaskHandler (runs in separate isolate).
/// Registered via FlutterForegroundTask.setTaskHandler.
class _GpsTaskHandler extends TaskHandler {
  static const _locationKey = 'busalert.active_trip_id';

  String? _tripId;
  String? _accessToken;
  StreamSubscription<Position>? _positionSub;
  late final Dio _dio;

  // Called when the foreground service starts
  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    final prefs   = await SharedPreferences.getInstance();
    _tripId       = prefs.getString(_locationKey);
    _accessToken  = await SecureStorage.getAccessToken();

    _dio = Dio(BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Authorization': 'Bearer $_accessToken'},
    ));

    // Start streaming GPS
    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,       // meters
      ),
    ).listen(_onPosition);
  }

  // Called on the FlutterForegroundTask timer interval (every 10s)
  @override
  Future<void> onRepeatEvent(DateTime timestamp) async {
    // Nothing needed here — position stream handles it.
    // But flush offline queue on every tick as a fallback.
    await _flushQueue();
  }

  @override
  Future<void> onDestroy(DateTime timestamp) async {
    await _positionSub?.cancel();
  }

  // ── Handle incoming main-isolate messages ──────────────────────────────────
  @override
  void onReceiveData(Object data) {
    if (data is Map && data['type'] == 'token_refresh') {
      _accessToken = data['token'] as String;
      _dio.options.headers['Authorization'] = 'Bearer $_accessToken';
    }
  }

  // ── GPS position callback ──────────────────────────────────────────────────
  Future<void> _onPosition(Position pos) async {
    if (_tripId == null) return;

    final payload = {
      'latitude':  pos.latitude,
      'longitude': pos.longitude,
      'accuracy':  pos.accuracy,
    };

    // Try to flush offline queue first
    await _flushQueue();

    try {
      await _dio.post('/api/trips/$_tripId/location', data: payload);
    } catch (_) {
      // Network failure — push to offline queue
      await LocationQueue.push(
        tripId: _tripId!,
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
      );
    }
  }

  // ── Flush offline queue ────────────────────────────────────────────────────
  Future<void> _flushQueue() async {
    final items = await LocationQueue.getAll();
    if (items.isEmpty) return;

    final failed = <Map<String, dynamic>>[];
    for (final item in items) {
      try {
        final tid = item['tripId'] as String;
        await _dio.post('/api/trips/$tid/location', data: {
          'latitude':  item['lat'],
          'longitude': item['lng'],
          'accuracy':  item['accuracy'],
        });
      } catch (_) {
        failed.add(item);
      }
    }

    // Keep only items that still failed
    if (failed.isEmpty) {
      await LocationQueue.clear();
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('busalert.location_queue', jsonEncode(failed));
    }
  }
}

/// Public API for starting / stopping the background GPS service.
class GpsService {
  GpsService._();

  static const _tripIdKey = 'busalert.active_trip_id';
  static const _channelId = 'bus_alert_gps';

  /// Request permissions and start the foreground service.
  static Future<void> start({required String tripId}) async {
    // Persist trip id for the isolate to read
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tripIdKey, tripId);

    // Initialise notification channel
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: _channelId,
        channelName: 'Bus Alert GPS',
        channelDescription: 'Live GPS tracking for active trips',
        channelImportance: NotificationChannelImportance.DEFAULT,
        priority: NotificationPriority.DEFAULT,
        enableVibration: false,
        onlyAlertOnce: true,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: false,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(10000), // 10s
        autoRunOnBoot: true,
        allowWakeLock: true,
      ),
    );

    // Request permissions
    await _requestPermissions();

    // Start or restart the service
    if (await FlutterForegroundTask.isRunningService) {
      await FlutterForegroundTask.restartService();
    } else {
      await FlutterForegroundTask.startService(
        serviceId: 1001,
        notificationTitle: 'Bus Alert — Trip Active',
        notificationText: 'GPS tracking is running',
        callback: startCallback,
      );
    }
  }

  static Future<void> stop() async {
    await FlutterForegroundTask.stopService();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tripIdKey);
  }

  static Future<void> _requestPermissions() async {
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    // Android 11+: background location must be granted separately
    if (perm == LocationPermission.whileInUse) {
      // Prompt user to go to settings for "Allow all the time"
      await Geolocator.openAppSettings();
    }
    await FlutterForegroundTask.requestIgnoreBatteryOptimization();
  }
}

/// Top-level callback — must be a non-anonymous function
@pragma('vm:entry-point')
void startCallback() {
  FlutterForegroundTask.setTaskHandler(_GpsTaskHandler());
}
