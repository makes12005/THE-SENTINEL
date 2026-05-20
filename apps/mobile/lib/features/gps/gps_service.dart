import 'dart:async';
import 'package:bus_alert/core/network/api_client.dart';
import 'package:bus_alert/core/network/endpoints.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';

class LocationQueue {
  static const int maxQueueSize = 20;
  final List<Map<String, dynamic>> _queue = [];
  
  List<Map<String, dynamic>> get queue => List.unmodifiable(_queue);
  int get length => _queue.length;
  bool get isEmpty => _queue.isEmpty;
  bool get isFull => _queue.length >= maxQueueSize;
  
  void add(Map<String, dynamic> location) {
    if (isFull) {
      _queue.removeAt(0);
    }
    _queue.add(location);
  }
  
  List<Map<String, dynamic>> flush() {
    final items = List<Map<String, dynamic>>.from(_queue);
    _queue.clear();
    return items;
  }
}

class GpsService {
  static final GpsService _instance = GpsService._internal();
  factory GpsService() => _instance;
  
  GpsService._internal();
  
  final LocationQueue _locationQueue = LocationQueue();
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<Position>? _positionStream;
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  Timer? _flushTimer;
  String? _currentTripId;
  bool _isRunning = false;
  
  LocationQueue get locationQueue => _locationQueue;
  bool get isRunning => _isRunning;
  
  Future<bool> checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }
    
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      return false;
    }
    
    return true;
  }
  
  Future<void> startService(String tripId) async {
    if (_isRunning) return;
    
    final hasPermission = await checkPermission();
    if (!hasPermission) {
      throw Exception('Location permission not granted');
    }
    
    _currentTripId = tripId;
    _isRunning = true;
    
    await FlutterForegroundTask.saveData(key: 'tripId', value: tripId);
    
    FlutterForegroundTask.updateService(
      notificationTitle: 'Bus Alert Active',
      notificationText: 'Tracking location for trip...',
      callback: startCallback,
    );
    
    _positionStream = Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen(_handleLocation);
    
_connectivitySubscription = _connectivity.onConnectivityChanged.listen((ConnectivityResult result) {
      if (result != ConnectivityResult.none) {
        _flushQueue();
      }
    });
    
    _flushTimer = Timer.periodic(const Duration(seconds: 30), (_) => _flushQueue());
  }
  
  Future<void> stopService() async {
    if (!_isRunning) return;
    
    _isRunning = false;
    _currentTripId = null;
    
    await _positionStream?.cancel();
    _positionStream = null;
    
    await _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
    
    _flushTimer?.cancel();
    _flushTimer = null;
    
    await _flushQueue();
    
    FlutterForegroundTask.updateService(
      notificationTitle: 'Bus Alert',
      notificationText: 'Trip completed',
    );
    
    await FlutterForegroundTask.stopService();
  }
  
  void _handleLocation(Position position) async {
    if (_currentTripId == null) return;
    
    final locationData = {
      'lat': position.latitude,
      'lng': position.longitude,
      'accuracy': position.accuracy,
      'speed': position.speed,
      'timestamp': DateTime.now().toIso8601String(),
      'battery_level': await _getBatteryLevel(),
    };
    
    final connectivityResult = await _connectivity.checkConnectivity();
    if (connectivityResult == ConnectivityResult.none) {
      _locationQueue.add(locationData);
      return;
    }
  
  Future<void> _sendLocation(Map<String, dynamic> data) async {
    if (_currentTripId == null) return;
    
    await ApiClient().post(
      Endpoints.tripLocation(_currentTripId!),
      data: data,
    );
  }
  
  Future<void> _flushQueue() async {
    if (_locationQueue.isEmpty || _currentTripId == null) return;
    
    final items = _locationQueue.flush();
    for (final item in items) {
      try {
        await _sendLocation(item);
      } catch (_) {
        _locationQueue.add(item);
        break;
      }
    }
  }
  
  Future<int> _getBatteryLevel() async {
    return 100;
  }
}

@pragma('vm:entry-point')
FutureOr<void> startCallback() async {
  FlutterForegroundTask.updateService(
    notificationTitle: 'Bus Alert Active',
    notificationText: 'Tracking location...',
  );
}
