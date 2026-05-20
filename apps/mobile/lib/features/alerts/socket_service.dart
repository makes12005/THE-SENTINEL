import 'package:bus_alert/core/env.dart';
import 'package:bus_alert/core/storage/secure_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

enum SocketEvent {
  alertManualRequired('alert_manual_required'),
  passengerStatusUpdated('passenger_status_updated'),
  conductorReplaced('conductor_replaced'),
  conductorOffline('conductor_offline'),
  tripUpdated('trip_updated'),
  alertSent('alert_sent');

  final String eventName;
  const SocketEvent(this.eventName);
}

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  
  SocketService._internal();
  
  io.Socket? _socket;
  bool _isConnected = false;
  String? _currentTripId;
  
  final Map<String, List<Function(dynamic)>> _listeners = {};
  
  bool get isConnected => _isConnected;
  
  Future<void> connect() async {
    if (_socket != null && _isConnected) return;
    
    final token = await SecureStorage().getAccessToken();
    if (token == null) {
      debugPrint('[Socket] No token available');
      return;
    }
    
    try {
      _socket = io.io(
        Env.socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(99999)
            .setReconnectionDelay(2000)
            .setAuth({'token': token})
            .build(),
      );
      
      _socket!.onConnect((_) => _onConnect());
      _socket!.onDisconnect((_) => _onDisconnect());
      _socket!.onConnectError((data) => _onConnectError(data));
      _socket!.onError((data) => _onError(data));
      
      _socket!.on('alert_manual_required', (data) => _handleEvent(SocketEvent.alertManualRequired, data));
      _socket!.on('passenger_status_updated', (data) => _handleEvent(SocketEvent.passengerStatusUpdated, data));
      _socket!.on('conductor_replaced', (data) => _handleEvent(SocketEvent.conductorReplaced, data));
      _socket!.on('conductor_offline', (data) => _handleEvent(SocketEvent.conductorOffline, data));
      _socket!.on('trip_updated', (data) => _handleEvent(SocketEvent.tripUpdated, data));
      _socket!.on('alert_sent', (data) => _handleEvent(SocketEvent.alertSent, data));
      
    } catch (e) {
      debugPrint('[Socket] Connection error: $e');
    }
  }
  
  void _onConnect() {
    debugPrint('[Socket] Connected');
    _isConnected = true;
    if (_currentTripId != null) {
      joinTripRoom(_currentTripId!);
    }
  }
  
  void _onDisconnect() {
    debugPrint('[Socket] Disconnected');
    _isConnected = false;
  }
  
  void _onConnectError(dynamic error) {
    debugPrint('[Socket] Connect error: $error');
    _isConnected = false;
  }
  
  void _onError(dynamic error) {
    debugPrint('[Socket] Error: $error');
  }
  
  void joinTripRoom(String tripId) {
    if (_socket == null || !_isConnected) return;
    _currentTripId = tripId;
    _socket!.emit('join_trip', {'tripId': tripId});
    debugPrint('[Socket] Joined trip room: $tripId');
  }
  
  void leaveTripRoom(String tripId) {
    if (_socket == null) return;
    _socket!.emit('leave_trip', {'tripId': tripId});
    _currentTripId = null;
    debugPrint('[Socket] Left trip room: $tripId');
  }
  
  void on(SocketEvent event, Function(dynamic) callback) {
    _listeners.putIfAbsent(event.eventName, () => []);
    _listeners[event.eventName]!.add(callback);
  }
  
  void off(SocketEvent event, Function(dynamic) callback) {
    _listeners[event.eventName]?.remove(callback);
  }
  
  void _handleEvent(SocketEvent event, dynamic data) {
    final listeners = _listeners[event.eventName] ?? [];
    for (final callback in listeners) {
      callback(data);
    }
  }
  
  void emit(String eventName, dynamic data) {
    if (_socket == null || !_isConnected) {
      debugPrint('[Socket] Cannot emit - not connected');
      return;
    }
    _socket!.emit(eventName, data);
  }
  
  Future<void> disconnect() async {
    if (_socket == null) return;
    
    if (_currentTripId != null) {
      leaveTripRoom(_currentTripId!);
    }
    
    _socket!.dispose();
    _socket = null;
    _isConnected = false;
    _listeners.clear();
    
    debugPrint('[Socket] Disconnected and disposed');
  }
}
