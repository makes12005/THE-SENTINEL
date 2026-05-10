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
  static String? _activeTripId;

  /// Connect to the backend Socket.IO server.
  static Future<void> connect({required String tripId}) async {
    _activeTripId = tripId;

    if (_socket != null && _socket!.connected) {
      joinTrip(tripId);
      return;
    }

    final token = await SecureStorage.getAccessToken();

    _socket = IO.io(
      Env.socketUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .setQuery({'tripId': tripId})
          .enableReconnection()
          .setReconnectionAttempts(99999)
          .setReconnectionDelay(2000)
          .setReconnectionDelayMax(30000)
          .build(),
    );

    _socket!.connect();

    _socket!.onConnect((_) {
      debugPrint('Socket connected');
      debugPrint('[Socket] Connected - tripId: $tripId');
      if (_activeTripId != null) {
        joinTrip(_activeTripId!);
      }
    });

    _socket!.onDisconnect((reason) {
      debugPrint('[Socket] Disconnected: $reason');
    });

    _socket!.onConnectError((e) {
      debugPrint('Socket connection error');
      debugPrint('[Socket] Connect error: $e');
    });

    _socket!.on('reconnect', (attempt) {
      debugPrint('[Socket] Reconnected after $attempt attempts');
      if (_activeTripId != null) {
        joinTrip(_activeTripId!);
      }
    });

    // ── Incoming event: manual alert required ──────────────────────────────
    _socket!.on('alert_manual_required', (data) {
      debugPrint('[Socket] alert_manual_required: $data');
      if (_dialogContext != null && _dialogContext!.mounted) {
        final payload = data as Map<String, dynamic>;
        showManualAlertDialog(
          _dialogContext!,
          passengerId: payload['passengerId'] as String,
          passengerName: payload['passengerName'] as String,
          passengerPhone: payload['passengerPhone'] as String,
          stopName: payload['stopName'] as String,
        );
      }
    });

    // ── Incoming event: passenger alert updated ────────────────────────────
    // Handled locally in passengers_provider
  }

  static void joinTrip(String tripId) {
    _activeTripId = tripId;
    _socket?.emit('join_trip', {'tripId': tripId});
  }

  // ── Update token on refresh ────────────────────────────────────────────────
  static void updateToken(String newToken) {
    if (_socket != null) {
      _socket!.auth = {'token': newToken};
      if (_socket!.disconnected) {
        _socket!.connect();
      }
    }
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
    _activeTripId = null;
  }

  static IO.Socket? get socket => _socket;

  // ── Instance API (used by driver screens) ────────────────────────────────

  /// Connect using instance (delegates to static).
  Future<void> connectToTrip(String tripId) =>
      SocketService.connect(tripId: tripId);

  void joinTripRoom(String tripId) => SocketService.joinTrip(tripId);

  /// Subscribe to a Socket.IO event.
  void on(String event, Function(dynamic) handler) {
    _socket?.on(event, handler);
  }

  /// Driver-specific helper for conductor offline emergency events.
  void onConductorOffline(void Function(Map<String, dynamic>) handler) {
    _socket?.on('conductor_offline', (data) {
      if (data is Map<String, dynamic>) {
        handler(data);
      } else {
        handler(<String, dynamic>{});
      }
    });
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
