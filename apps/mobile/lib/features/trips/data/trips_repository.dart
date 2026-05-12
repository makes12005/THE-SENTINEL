import '../../../core/network/api_client.dart';
import '../../../core/network/endpoints.dart';
import '../model/trip.dart';

class TripsRepository {
  final _dio = ApiClient.instance;

  Future<List<Trip>> listTrips({String? status}) async {
    try {
      print('[DEBUG] Fetching trips with status: $status');
      final resp = await _dio.get(
        Endpoints.trips,
        queryParameters: status != null ? {'status': status} : null,
      );
      print('[DEBUG] Trips response data: ${resp.data}');
      final list = resp.data['data'] as List<dynamic>? ?? [];
      print('[DEBUG] Parsed trips count: ${list.length}');
      return list.map((e) => Trip.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      print('[DEBUG] Error fetching trips: $e');
      throw Exception(ApiClient.parseError(e));
    }
  }

  Future<Trip> getTripById(String tripId) async {
    try {
      final resp = await _dio.get(Endpoints.tripById(tripId));
      return Trip.fromJson(resp.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw Exception(ApiClient.parseError(e));
    }
  }

  Future<void> startTrip(String tripId, {List<Map<String, String>>? boardingChecklist}) async {
    try {
      await _dio.put(
        Endpoints.startTrip(tripId),
        data: boardingChecklist == null ? null : {'passengers': boardingChecklist},
      );
    } catch (e) {
      throw Exception(ApiClient.parseError(e));
    }
  }

  Future<void> completeTrip(String tripId) async {
    try {
      await _dio.put(Endpoints.completeTrip(tripId));
    } catch (e) {
      throw Exception(ApiClient.parseError(e));
    }
  }

  Future<Map<String, dynamic>> getTripStatus(String tripId) async {
    final resp = await _dio.get(Endpoints.tripStatus(tripId));
    return resp.data['data'] as Map<String, dynamic>;
  }
}
