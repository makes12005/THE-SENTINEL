import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../../../core/env.dart';
import '../../../core/storage/secure_storage.dart';
import '../alerts/ui/alert_dialog.dart';

/// Singleton Socket.IO service.
/// Call SocketService.instance.connect(tripId) after starting a trip,
/// or use static methods SocketService.connect(tripId: ...).
class SocketService {
  SocketService._();

  // ── Singleton instance (for driver screens) ────────────────────────────────
  static final SocketService instance = SocketService._();

  static IO.Socket? _socket;
  static BuildContext? _dialogContext;

  /// Connect to the backend Socket.IO server.
  static Future<void> connect({required String tripId}) async {
    if (_socket != null && _socket!.connected) return;

    final token = await SecureStorage.getAccessToken();

    _socket = IO.io(
      Env.apiBaseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .setQuery({'tripId': tripId})
          .enableReconnection()
          .setReconnectionAttempts(999)
          .setReconnectionDelay(2000)
          .build(),
    );

    _socket!.connect();

    _socket!.onConnect((_) {
      debugPrint('[Socket] Connected — tripId: $tripId');
      _socket!.emit('join_trip', {'tripId': tripId});
    });

    _socket!.onDisconnect((_) {
      debugPrint('[Socket] Disconnected');
    });

    _socket!.onConnectError((e) {
      debugPrint('[Socket] Connect error: $e');
    });

    // ── Incoming event: manual alert required ──────────────────────────────
    _socket!.on('alert_manual_required', (data) {
      debugPrint('[Socket] alert_manual_required: $data');
      if (_dialogContext != null && _dialogContext!.mounted) {
        final payload = data as Map<String, dynamic>;
        showManualAlertDialog(
          _dialogContext!,
          passengerId:   payload['passengerId'] as String,
          passengerName: payload['passengerName'] as String,
          passengerPhone: payload['passengerPhone'] as String,
          stopName:      payload['stopName'] as String,
        );
      }
    });

    // ── Incoming event: passenger alert updated ────────────────────────────
    // Handled locally in passengers_provider
  }

  /// Register a context so alert dialogs can be shown.
  static void registerDialogContext(BuildContext ctx) {
    _dialogContext = ctx;
  }

  static void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _dialogContext = null;
  }

  static IO.Socket? get socket => _socket;

  // ── Instance API (used by driver screens) ────────────────────────────────

  /// Connect using instance (delegates to static).
  Future<void> connect(String tripId) => SocketService.connect(tripId: tripId);

  /// Subscribe to a Socket.IO event.
  void on(String event, Function(dynamic) handler) {
    _socket?.on(event, handler);
  }

  /// Unsubscribe from a Socket.IO event.
  void off(String event, [Function(dynamic)? handler]) {
    if (handler != null) {
      _socket?.off(event, handler);
    } else {
      _socket?.off(event);
    }
  }
}

