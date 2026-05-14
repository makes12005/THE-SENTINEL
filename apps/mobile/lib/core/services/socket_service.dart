import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../env.dart';
import '../storage/secure_storage.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;

  Future<void> connect() async {
    if (_socket != null && _socket!.connected) return;

    final token = await SecureStorage.getToken();
    if (token == null) {
      debugPrint('Cannot connect socket: No auth token');
      return;
    }

    _socket = io.io(
      Env.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('Socket connected: ${_socket!.id}');
    });

    _socket!.onDisconnect((_) {
      debugPrint('Socket disconnected');
    });

    _socket!.onConnectError((err) {
      debugPrint('Socket connect error: $err');
    });

    _socket!.connect();
  }

  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
    }
  }

  void emitLocation(Map<String, dynamic> locationData) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('location_update', locationData);
    }
  }

  void onAlert(Function(dynamic) callback) {
    if (_socket != null) {
      _socket!.on('alert', callback);
    }
  }
}
