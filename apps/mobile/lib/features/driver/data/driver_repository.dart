import '../../../core/network/api_client.dart';
import '../model/driver_trip.dart';

class DriverRepository {
  final _dio = ApiClient.instance;

  /// GET /api/trips — returns trips assigned to this driver's agency.
  /// The backend filters by agencyId from JWT; driver role can list active trips.
  Future<List<DriverTrip>> listTrips({String? status}) async {
    final response = await _dio.get(
      '/api/trips',
      queryParameters: status != null ? {'status': status} : null,
    );
    final data = (response.data['data'] as List<dynamic>? ?? []);
    return data
        .map((e) => DriverTrip.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /api/trips/:id — full trip detail.
  Future<DriverTrip> getTrip(String tripId) async {
    final response = await _dio.get('/api/trips/$tripId');
    return DriverTrip.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  /// GET /api/trips/:id/status — conductor status + alert summary.
  /// Returns raw JSON; caller parses conductorOnline field.
  Future<Map<String, dynamic>> getTripStatus(String tripId) async {
    final response = await _dio.get('/api/trips/$tripId/status');
    return response.data['data'] as Map<String, dynamic>;
  }

  /// PUT /api/trips/:id/takeover — driver takes over conductor role.
  Future<Map<String, dynamic>> takeoverTrip(String tripId) async {
    final response = await _dio.put('/api/trips/$tripId/takeover');
    return response.data['data'] as Map<String, dynamic>;
  }
}
