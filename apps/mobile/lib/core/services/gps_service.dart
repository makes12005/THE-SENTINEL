import 'dart:isolate';
import 'package:flutter/foundation.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';
import 'location_queue.dart';
import 'socket_service.dart';

@pragma('vm:entry-point')
void startCallback() {
  FlutterForegroundTask.setTaskHandler(LocationTaskHandler());
}

class LocationTaskHandler extends TaskHandler {
  @override
  Future<void> onStart(DateTime timestamp, SendPort? sendPort) async {
    // Set up location streaming
    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((Position position) async {
      final locData = {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'speed': position.speed,
        'timestamp': position.timestamp.toIso8601String(),
      };
      
      // Send location directly via socket if connected (handled in SocketService)
      SocketService().emitLocation(locData);

      // Add to queue for persistent sync
      await LocationQueue.enqueueLocation(locData);

      FlutterForegroundTask.updateService(
        notificationTitle: 'Bus Alert Tracking Active',
        notificationText: 'Current speed: ${(position.speed * 3.6).toStringAsFixed(1)} km/h',
      );
    });
  }

  @override
  Future<void> onRepeatEvent(DateTime timestamp, SendPort? sendPort) async {}

  @override
  Future<void> onDestroy(DateTime timestamp, SendPort? sendPort) async {
    // Cleanup if needed
  }
}

class GpsService {
  static void init() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'bus_alert_location_tracking',
        channelName: 'Location Tracking',
        channelDescription: 'Maintains GPS tracking in the background',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
        iconData: const NotificationIconData(
          resType: ResourceType.mipmap,
          resPrefix: ResourcePrefix.ic,
          name: 'launcher',
        ),
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: const ForegroundTaskOptions(
        interval: 5000,
        isOnceEvent: false,
        autoRunOnBoot: false,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );
  }

  static Future<bool> requestPermissions() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    // Request notification permissions for foreground task
    final NotificationPermission notificationPermissionStatus =
        await FlutterForegroundTask.requestNotificationPermission();

    return notificationPermissionStatus == NotificationPermission.granted;
  }

  static Future<void> startTracking() async {
    if (await FlutterForegroundTask.isRunningService) return;

    final hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      debugPrint('Location/Notification permissions denied.');
      return;
    }

    await FlutterForegroundTask.startService(
      notificationTitle: 'Bus Alert Tracking Active',
      notificationText: 'Initializing GPS...',
      callback: startCallback,
    );
  }

  static Future<void> stopTracking() async {
    if (await FlutterForegroundTask.isRunningService) {
      await FlutterForegroundTask.stopService();
    }
  }
}
