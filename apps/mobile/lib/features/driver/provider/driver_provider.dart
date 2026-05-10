import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../data/driver_repository.dart';
import '../model/driver_profile.dart';
import '../model/driver_trip.dart';

final driverRepositoryProvider =
    Provider<DriverRepository>((_) => DriverRepository());

class DriverTripsState {
  final List<DriverTrip> trips;
  final bool isLoading;
  final String? error;

  const DriverTripsState({
    this.trips = const [],
    this.isLoading = false,
    this.error,
  });

  DriverTripsState copyWith({
    List<DriverTrip>? trips,
    bool? isLoading,
    String? error,
  }) {
    return DriverTripsState(
      trips: trips ?? this.trips,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class DriverTripsNotifier extends StateNotifier<DriverTripsState> {
  DriverTripsNotifier(this._repo) : super(const DriverTripsState());

  final DriverRepository _repo;

  Future<void> loadTrips() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final trips = await _repo.listTrips();
      state = state.copyWith(isLoading: false, trips: _todayTrips(trips));
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ApiClient.parseError(e),
      );
    }
  }

  List<DriverTrip> _todayTrips(List<DriverTrip> trips) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final filtered = trips.where((trip) {
      final scheduled = _parseDateTime(trip.scheduledDate);
      if (scheduled == null) {
        return trip.isActive || trip.isScheduled || trip.isCompleted;
      }
      final tripDay = DateTime(scheduled.year, scheduled.month, scheduled.day);
      return tripDay == today;
    }).toList()
      ..sort((a, b) => a.scheduledDate.compareTo(b.scheduledDate));
    return filtered;
  }
}

final driverTripsProvider =
    StateNotifierProvider<DriverTripsNotifier, DriverTripsState>(
  (ref) => DriverTripsNotifier(ref.read(driverRepositoryProvider)),
);

final driverProfileProvider = FutureProvider<DriverProfile>((ref) async {
  return ref.read(driverRepositoryProvider).getProfile();
});

class DriverTripDetailState {
  final DriverTrip? trip;
  final bool isLoading;
  final bool isTakingOver;
  final bool hasDriverMode;
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
      trip: trip ?? this.trip,
      isLoading: isLoading ?? this.isLoading,
      isTakingOver: isTakingOver ?? this.isTakingOver,
      hasDriverMode: hasDriverMode ?? this.hasDriverMode,
      error: error,
    );
  }
}

class DriverTripDetailNotifier extends StateNotifier<DriverTripDetailState> {
  DriverTripDetailNotifier(this._repo, this.tripId)
      : super(const DriverTripDetailState());

  final DriverRepository _repo;
  final String tripId;

  Future<void> loadTrip() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final trip = await _repo.getTrip(tripId);
      state = state.copyWith(
        trip: trip,
        isLoading: false,
        hasDriverMode: trip.isDriverModeActive,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ApiClient.parseError(e),
      );
    }
  }

  Future<bool> takeover() async {
    state = state.copyWith(isTakingOver: true, error: null);
    try {
      await _repo.takeoverTrip(tripId);
      state = state.copyWith(
        isTakingOver: false,
        hasDriverMode: true,
        trip: state.trip?.copyWith(isDriverModeActive: true),
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isTakingOver: false,
        error: ApiClient.parseError(e),
      );
      return false;
    }
  }

  void markConductorOffline({DateTime? lastSeenAt}) {
    state = state.copyWith(
      trip: state.trip?.copyWith(
        conductorOnline: false,
        conductorLastSeenAt: lastSeenAt ?? state.trip?.conductorLastSeenAt,
      ),
    );
  }

  void markConductorOnline() {
    state = state.copyWith(
      trip: state.trip?.copyWith(conductorOnline: true),
    );
  }

  void markDriverModeActive() {
    state = state.copyWith(
      hasDriverMode: true,
      trip: state.trip?.copyWith(isDriverModeActive: true),
    );
  }
}

final driverTripDetailProvider = StateNotifierProvider.family<
    DriverTripDetailNotifier, DriverTripDetailState, String>(
  (ref, tripId) => DriverTripDetailNotifier(
    ref.read(driverRepositoryProvider),
    tripId,
  ),
);

DateTime? _parseDateTime(String? value) {
  if (value == null || value.isEmpty) return null;
  return DateTime.tryParse(value)?.toLocal();
}
