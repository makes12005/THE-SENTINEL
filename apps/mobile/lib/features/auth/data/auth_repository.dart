import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../../core/network/endpoints.dart';
import '../../core/storage/secure_storage.dart';

class AuthResult {
  final String accessToken;
  final String refreshToken;
  final String role;
  final String userId;
  final String userName;

  const AuthResult({
    required this.accessToken,
    required this.refreshToken,
    required this.role,
    required this.userId,
    required this.userName,
  });
}

class AuthRepository {
  final _dio = ApiClient.instance;

  /// Login with phone + password. Returns AuthResult on success.
  /// Throws [DioException] or [String] error message on failure.
  Future<AuthResult> login({
    required String phone,
    required String password,
  }) async {
    final response = await _dio.post(
      Endpoints.login,
      data: {'phone': phone, 'password': password},
    );

    final data = response.data['data'] as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;

    return AuthResult(
      accessToken:  data['accessToken']  as String,
      refreshToken: data['refreshToken'] as String,
      role:         user['role']         as String,
      userId:       user['id']           as String,
      userName:     user['name']         as String,
    );
  }

  Future<void> logout() async {
    try {
      final refreshToken = await SecureStorage.getRefreshToken();
      if (refreshToken != null) {
        await _dio.post(Endpoints.logout, data: {'refreshToken': refreshToken});
      }
    } catch (_) {
      // Best-effort logout; always clear locally
    } finally {
      await SecureStorage.clearAll();
    }
  }
}
