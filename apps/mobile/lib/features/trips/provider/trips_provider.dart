import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/trips_repository.dart';
import '../model/trip.dart';

// ── Repository provider ───────────────────────────────────────────────────────
final tripsRepositoryProvider = Provider<TripsRepository>(
  (_) => TripsRepository(),
);

// ── Trips list provider (async, auto-refreshes) ───────────────────────────────
class TripsNotifier extends AsyncNotifier<List<Trip>> {
  @override
  Future<List<Trip>> build() => _load();

  Future<List<Trip>> _load({String? status}) async {
    final repo = ref.read(tripsRepositoryProvider);
    return repo.listTrips(status: status);
  }

  Future<void> refresh({String? status}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _load(status: status));
  }
}

final tripsProvider = AsyncNotifierProvider<TripsNotifier, List<Trip>>(
  TripsNotifier.new,
);

// ── Active trip id (set when conductor starts a trip) ─────────────────────────
final activeTripIdProvider = StateProvider<String?>((ref) => null);

// ── Single trip detail ─────────────────────────────────────────────────────────
final tripDetailProvider = FutureProvider.family<Trip, String>((ref, tripId) {
  final repo = ref.read(tripsRepositoryProvider);
  return repo.getTripById(tripId);
});
