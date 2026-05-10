import '../../../core/network/api_client.dart';
import '../../../core/network/endpoints.dart';
import '../../../core/storage/secure_storage.dart';
import '../model/driver_profile.dart';
import '../model/driver_trip.dart';

class DriverRepository {
  final _dio = ApiClient.instance;

  Future<DriverProfile> getProfile() async {
    final response = await _dio.get(Endpoints.me);
    return DriverProfile.fromJson(
        response.data['data'] as Map<String, dynamic>);
  }

  Future<List<DriverTrip>> listTrips() async {
    final response = await _dio.get(Endpoints.trips);
    final userId = await SecureStorage.getUserId();
    final data = (response.data['data'] as List<dynamic>? ?? []);
    final trips = data
        .map((e) => DriverTrip.fromJson(e as Map<String, dynamic>))
        .toList();
    if (userId == null || userId.isEmpty) {
      return trips;
    }
    return trips.where((trip) => trip.driverId == userId).toList();
  }

  Future<DriverTrip> getTrip(String tripId) async {
    final tripResponse = await _dio.get('/api/trips/$tripId');
    var trip =
        DriverTrip.fromJson(tripResponse.data['data'] as Map<String, dynamic>);

    try {
      final statusResponse = await _dio.get('/api/trips/$tripId/status');
      final statusData = statusResponse.data['data'] as Map<String, dynamic>;
      trip = trip.copyWith(
        conductorOnline: (statusData['conductor_online'] ??
            statusData['is_conductor_online'] ??
            trip.conductorOnline) as bool,
        conductorLastSeenAt: _parseDateTime(statusData['last_seen_at'] ??
                statusData['conductor_last_seen_at']) ??
            trip.conductorLastSeenAt,
        totalPassengers: _toInt(
          statusData['total_passengers'] ?? statusData['passenger_count'],
        ),
        alertedPassengers: _toInt(
          statusData['alerted_passengers'] ?? statusData['alerts_sent'],
        ),
        busLabel: (statusData['bus_number'] ??
            statusData['vehicle_number'] ??
            trip.busLabel) as String?,
      );
    } catch (_) {
      // Keep the base trip payload if the status endpoint is unavailable.
    }

    return trip;
  }

  Future<void> takeoverTrip(String tripId) async {
    await _dio.put('/api/trips/$tripId/takeover');
  }

  Future<void> completeTrip(String tripId) async {
    await _dio.put('/api/trips/$tripId/complete');
  }
}

DateTime? _parseDateTime(dynamic value) {
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value)?.toLocal();
}

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}
