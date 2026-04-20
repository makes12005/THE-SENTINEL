import '../../../core/network/api_client.dart';
import '../../../core/network/endpoints.dart';
import '../model/passenger.dart';

class PassengersRepository {
  final _dio = ApiClient.instance;

  Future<List<Passenger>> getPassengers(String tripId) async {
    final resp = await _dio.get(Endpoints.tripPassengers(tripId));
    final list = resp.data['data'] as List<dynamic>;
    return list.map((e) => Passenger.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> acknowledgeAlert(String passengerId) async {
    await _dio.patch('/api/passengers/$passengerId/acknowledge');
  }
}
