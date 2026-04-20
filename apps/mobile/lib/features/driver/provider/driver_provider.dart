import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/driver_repository.dart';
import '../model/driver_trip.dart';
import '../../../core/network/api_client.dart';

// ── Repository provider ──────────────────────────────────────────────────────

final driverRepositoryProvider = Provider<DriverRepository>((_) => DriverRepository());

// ── Driver trips list (dashboard) ────────────────────────────────────────────

class DriverTripsState {
  final List<DriverTrip> today;
  final List<DriverTrip> upcoming;
  final List<DriverTrip> completed;
  final bool isLoading;
  final String? error;

  const DriverTripsState({
    this.today = const [],
    this.upcoming = const [],
    this.completed = const [],
    this.isLoading = false,
    this.error,
  });

  DriverTripsState copyWith({
    List<DriverTrip>? today,
    List<DriverTrip>? upcoming,
    List<DriverTrip>? completed,
    bool? isLoading,
    String? error,
  }) {
    return DriverTripsState(
      today:     today     ?? this.today,
      upcoming:  upcoming  ?? this.upcoming,
      completed: completed ?? this.completed,
      isLoading: isLoading ?? this.isLoading,
      error:     error,
    );
  }
}

class DriverTripsNotifier extends StateNotifier<DriverTripsState> {
  final DriverRepository _repo;

  DriverTripsNotifier(this._repo) : super(const DriverTripsState());

  Future<void> loadTrips() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final all = await _repo.listTrips();
      final today    = all.where((t) => t.isActive).toList();
      final upcoming = all.where((t) => t.isScheduled).toList();
      final completed = all.where((t) => t.isCompleted).toList();
      state = state.copyWith(
        today: today, upcoming: upcoming, completed: completed, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: ApiClient.parseError(e));
    }
  }
}

final driverTripsProvider =
    StateNotifierProvider<DriverTripsNotifier, DriverTripsState>(
  (ref) => DriverTripsNotifier(ref.read(driverRepositoryProvider)),
);

// ── Single trip detail + takeover ─────────────────────────────────────────────

class DriverTripDetailState {
  final DriverTrip? trip;
  final bool isLoading;
  final bool isTakingOver;
  final bool hasDriverMode; // true after successful takeover
  final String? error;

  const DriverTripDetailState({
    this.trip,
    this.isLoading = false,
    this.isTakingOver = false,
    this.hasDriverMode = false,
    this.error,
  });

  DriverTripDetailState copyWith({
    DriverTrip? trip,
    bool? isLoading,
    bool? isTakingOver,
    bool? hasDriverMode,
    String? error,
  }) {
    return DriverTripDetailState(
      trip:          trip         ?? this.trip,
      isLoading:     isLoading    ?? this.isLoading,
      isTakingOver:  isTakingOver ?? this.isTakingOver,
      hasDriverMode: hasDriverMode ?? this.hasDriverMode,
      error:         error,
    );
  }
}

class DriverTripDetailNotifier
    extends StateNotifier<DriverTripDetailState> {
  final DriverRepository _repo;
  final String tripId;

  DriverTripDetailNotifier(this._repo, this.tripId)
      : super(const DriverTripDetailState());

  Future<void> loadTrip() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final trip = await _repo.getTrip(tripId);
      state = state.copyWith(trip: trip, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: ApiClient.parseError(e));
    }
  }

  /// Driver presses "Take Over Trip"
  Future<bool> takeover() async {
    state = state.copyWith(isTakingOver: true, error: null);
    try {
      await _repo.takeoverTrip(tripId);
      final updatedTrip = state.trip?.copyWith(isDriverModeActive: true);
      state = state.copyWith(
        isTakingOver: false,
        hasDriverMode: true,
        trip: updatedTrip,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
          isTakingOver: false, error: ApiClient.parseError(e));
      return false;
    }
  }

  /// Called when Socket.IO conductor_offline event fires
  void markConductorOffline() {
    final updated = state.trip?.copyWith(conductorOnline: false);
    state = state.copyWith(trip: updated);
  }

  /// Called when Socket.IO conductor_replaced event fires (another device triggered it)
  void markDriverModeActive() {
    final updated = state.trip?.copyWith(isDriverModeActive: true);
    state = state.copyWith(hasDriverMode: true, trip: updated);
  }
}

final driverTripDetailProvider = StateNotifierProvider.family<
    DriverTripDetailNotifier, DriverTripDetailState, String>(
  (ref, tripId) =>
      DriverTripDetailNotifier(ref.read(driverRepositoryProvider), tripId),
);
