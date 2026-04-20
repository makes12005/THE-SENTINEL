import '../../core/network/api_client.dart';
import '../../core/network/endpoints.dart';
import '../model/trip.dart';

class TripsRepository {
  final _dio = ApiClient.instance;

  Future<List<Trip>> listTrips({String? status}) async {
    final resp = await _dio.get(
      Endpoints.trips,
      queryParameters: status != null ? {'status': status} : null,
    );
    final list = resp.data['data'] as List<dynamic>;
    return list.map((e) => Trip.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Trip> getTripById(String tripId) async {
    final resp = await _dio.get(Endpoints.tripById(tripId));
    return Trip.fromJson(resp.data['data'] as Map<String, dynamic>);
  }

  Future<void> startTrip(String tripId) async {
    await _dio.put(Endpoints.startTrip(tripId));
  }

  Future<void> completeTrip(String tripId) async {
    await _dio.put(Endpoints.completeTrip(tripId));
  }

  Future<Map<String, dynamic>> getTripStatus(String tripId) async {
    final resp = await _dio.get(Endpoints.tripStatus(tripId));
    return resp.data['data'] as Map<String, dynamic>;
  }
}
