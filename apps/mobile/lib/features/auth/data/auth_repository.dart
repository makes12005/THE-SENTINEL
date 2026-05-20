import 'package:bus_alert/core/models/user_model.dart';
import 'package:bus_alert/core/network/api_client.dart';
import 'package:bus_alert/core/network/endpoints.dart';
import 'package:bus_alert/core/storage/secure_storage.dart';
import 'package:dio/dio.dart';

class AuthRepository {
  final ApiClient _apiClient = ApiClient();
  final SecureStorage _storage = SecureStorage();
  
  Future<AuthResponse> login({required String contact, required String password}) async {
    try {
      final response = await _apiClient.post(
        Endpoints.login,
        data: {'contact': contact, 'password': password},
      );
      
      final authResponse = AuthResponse.fromJson(response.data);
      await _saveTokens(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<void> sendOtp({required String contact}) async {
    try {
      await _apiClient.post(Endpoints.sendOtp, data: {'contact': contact});
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<({AuthResponse response, bool isNewUser})> verifyOtp({required String contact, required String otp}) async {
    try {
      final response = await _apiClient.post(
        Endpoints.verifyOtp,
        data: {'contact': contact, 'otp': otp},
      );
      
      final authResponse = AuthResponse.fromJson(response.data);
      final isNewUser = response.data['data']?['is_new_user'] ?? false;
      
      if (!isNewUser && authResponse.accessToken.isNotEmpty) {
        await _saveTokens(authResponse);
      }
      
      return (response: authResponse, isNewUser: isNewUser as bool);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<AuthResponse> loginWithOtp({required String contact, required String otp}) async {
    try {
      final response = await _apiClient.post(
        Endpoints.loginOtp,
        data: {'contact': contact, 'otp': otp},
      );
      
      final authResponse = AuthResponse.fromJson(response.data);
      await _saveTokens(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<AuthResponse> signup({
    required String name,
    required String password,
    required String tempToken,
    String? agencyInviteCode,
  }) async {
    try {
      final response = await _apiClient.post(
        Endpoints.signup,
        data: {
          'name': name,
          'password': password,
          'temp_token': tempToken,
          if (agencyInviteCode != null) 'agency_invite_code': agencyInviteCode,
        },
      );
      
      final authResponse = AuthResponse.fromJson(response.data);
      await _saveTokens(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<AuthResponse> joinAgency({required String inviteCode}) async {
    try {
      final response = await _apiClient.post(
        Endpoints.joinAgency,
        data: {'inviteCode': inviteCode},
      );
      
      final authResponse = AuthResponse.fromJson(response.data);
      await _saveTokens(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<AuthResponse> register({
    required String name,
    required String contact,
    required String password,
  }) async {
    try {
      final response = await _apiClient.post(
        Endpoints.register,
        data: {'name': name, 'identifier': contact, 'password': password},
      );
      
      final authResponse = AuthResponse.fromJson(response.data);
      await _saveTokens(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<UserModel> getCurrentUser() async {
    try {
      final response = await _apiClient.get(Endpoints.me);
      return UserModel.fromJson(response.data['data']);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _apiClient.post(
        Endpoints.changePassword,
        data: {'current_password': currentPassword, 'new_password': newPassword},
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<void> logout() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      await _apiClient.post(Endpoints.logout, data: {'refreshToken': refreshToken});
    } catch (_) {
    } finally {
      await _storage.clearAll();
    }
  }
  
  Future<void> _saveTokens(AuthResponse response) async {
    await _storage.saveUserData(
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      userId: response.user.id,
      userRole: response.user.role,
      userName: response.user.name,
      agencyId: response.user.agencyId,
      phone: response.user.phone,
      email: response.user.email,
    );
  }
  
  Exception _handleError(DioException error) {
    final response = error.response;
    final message = response?.data?['error']?['message'] ?? 
        response?.data?['message'] ?? 
        'An error occurred';
    
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return Exception('Connection timed out. Check your internet.');
      case DioExceptionType.connectionError:
        return Exception('No internet connection');
      case DioExceptionType.badResponse:
        return Exception(message);
      default:
        return Exception(message);
    }
  }
}
