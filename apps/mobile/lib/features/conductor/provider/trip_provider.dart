import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/trip_repository.dart';

final tripRepositoryProvider = Provider((ref) => TripRepository());

final tripsProvider = FutureProvider.family<List<dynamic>, String>((ref, status) {
  return ref.read(tripRepositoryProvider).getTrips(status);
});

final tripDetailsProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) {
  return ref.read(tripRepositoryProvider).getTripDetails(id);
});
