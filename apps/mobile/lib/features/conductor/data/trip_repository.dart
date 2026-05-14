import '../../../core/network/api_client.dart';
import 'package:dio/dio.dart';

class TripRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<dynamic>> getTrips(String status) async {
    try {
      final response = await _apiClient.dio.get('/api/trips?status=$status');
      return response.data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> getTripDetails(String id) async {
    try {
      final response = await _apiClient.dio.get('/api/trips/$id');
      return response.data['data'];
    } catch (e) {
      if (e is DioException) throw Exception(e.response?.data['error'] ?? 'Failed to get trip');
      rethrow;
    }
  }

  Future<void> startTrip(String id) async {
    await _apiClient.dio.post('/api/trips/$id/start');
  }

  Future<void> departTrip(String id) async {
    await _apiClient.dio.post('/api/trips/$id/depart');
  }

  Future<void> retryAlert(String tripId, String passengerId) async {
    await _apiClient.dio.put('/api/trips/$tripId/passengers/$passengerId/alert/retry');
  }

  Future<void> informManually(String tripId, String passengerId) async {
    await _apiClient.dio.put('/api/trips/$tripId/passengers/$passengerId/alert/manual');
  }

  Future<void> broadcastAlert(String tripId, String type) async {
    await _apiClient.dio.post('/api/trips/$tripId/alert/broadcast', data: {'type': type});
  }
}
