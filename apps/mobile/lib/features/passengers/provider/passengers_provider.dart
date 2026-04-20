import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../data/passengers_repository.dart';
import '../model/passenger.dart';
import '../../alerts/socket_service.dart';

// ── Repository provider ───────────────────────────────────────────────────────
final passengersRepositoryProvider = Provider<PassengersRepository>(
  (_) => PassengersRepository(),
);

// ── Passengers state notifier (realtime capable) ──────────────────────────────
class PassengersNotifier extends StateNotifier<AsyncValue<List<Passenger>>> {
  final PassengersRepository _repo;
  final String tripId;
  IO.Socket? _socket;

  PassengersNotifier(this._repo, this.tripId) : super(const AsyncLoading()) {
    _load();
    _listenSocket();
  }

  Future<void> _load() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _repo.getPassengers(tripId));
  }

  Future<void> refresh() => _load();

  void _listenSocket() {
    _socket = SocketService.socket;
    if (_socket == null) return;

    _socket!.on('passenger_alert_updated', (data) {
      final d  = data as Map<String, dynamic>;
      final id = d['passengerId'] as String;
      final s  = d['status'] as String;
      _updatePassengerStatus(id, s);
    });
  }

  void _updatePassengerStatus(String passengerId, String status) {
    state.whenData((passengers) {
      final updated = passengers.map((p) {
        return p.id == passengerId ? p.copyWithStatus(status) : p;
      }).toList();
      state = AsyncData(updated);
    });
  }

  Future<void> acknowledgeAlert(String passengerId) async {
    await _repo.acknowledgeAlert(passengerId);
    _updatePassengerStatus(passengerId, 'acknowledged');
  }

  @override
  void dispose() {
    _socket?.off('passenger_alert_updated');
    super.dispose();
  }
}

// ── Provider (family by tripId) ───────────────────────────────────────────────
final passengersProvider = StateNotifierProvider.family<
    PassengersNotifier, AsyncValue<List<Passenger>>, String>(
  (ref, tripId) => PassengersNotifier(
    ref.read(passengersRepositoryProvider),
    tripId,
  ),
);
