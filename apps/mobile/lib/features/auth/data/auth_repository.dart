import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import 'package:dio/dio.dart';

class AuthRepository {
  final ApiClient _apiClient = ApiClient();

  Future<Map<String, dynamic>> login(String contact, String password) async {
    try {
      final response = await _apiClient.dio.post('/api/auth/login', data: {
        'contact': contact,
        'password': password,
      });
      return response.data;
    } catch (e) {
      if (e is DioException) {
        throw Exception(e.response?.data['error'] ?? 'Login failed');
      }
      rethrow;
    }
  }

  Future<void> sendOtp(String contact) async {
    try {
      await _apiClient.dio.post('/api/auth/send-otp', data: {
        'contact': contact,
      });
    } catch (e) {
      if (e is DioException) {
        throw Exception(e.response?.data['error'] ?? 'Failed to send OTP');
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyOtp(String contact, String otp) async {
    try {
      final response = await _apiClient.dio.post('/api/auth/verify-otp', data: {
        'contact': contact,
        'otp': otp,
      });
      return response.data;
    } catch (e) {
      if (e is DioException) {
        throw Exception(e.response?.data['error'] ?? 'Failed to verify OTP');
      }
      rethrow;
    }
  }
  
  Future<void> joinAgency(String agencyCode) async {
    try {
      await _apiClient.dio.post('/api/auth/join-agency', data: {
        'agency_code': agencyCode,
      });
    } catch (e) {
      if (e is DioException) {
        throw Exception(e.response?.data['error'] ?? 'Failed to join agency');
      }
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _apiClient.dio.post('/api/auth/logout');
    } catch (e) {
      // Ignore errors on logout
    } finally {
      await SecureStorage.clearAll();
    }
  }
}
