import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/endpoints.dart';
import '../../../core/storage/secure_storage.dart';

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

class VerifyOtpResult {
  final bool isNewUser;
  final String? tempToken;
  final AuthResult? authResult;

  const VerifyOtpResult({
    required this.isNewUser,
    this.tempToken,
    this.authResult,
  });
}

class AuthRepository {
  final _dio = ApiClient.instance;

  AuthResult _parseAuthResult(Map<String, dynamic> data) {
    final user = (data['user'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    return AuthResult(
      accessToken: (data['accessToken'] ?? data['access_token'] ?? '') as String,
      refreshToken: (data['refreshToken'] ?? data['refresh_token'] ?? '') as String,
      role: (user['role'] ?? data['role'] ?? '') as String,
      userId: (user['id'] ?? data['user_id'] ?? '') as String,
      userName: (user['name'] ?? data['user_name'] ?? '') as String,
    );
  }

  Future<void> sendOtp(String contact) async {
    await _dio.post(
      Endpoints.sendOtp,
      data: {'contact': contact},
    );
  }

  Future<AuthResult> login({
    required String contact,
    required String password,
  }) async {
    final response = await _dio.post(
      Endpoints.login,
      data: {
        'contact': contact,
        'password': password,
      },
    );
    final data = response.data['data'] as Map<String, dynamic>;
    return _parseAuthResult(data);
  }

  Future<VerifyOtpResult> verifyOtp(String contact, String otp) async {
    final response = await _dio.post(
      Endpoints.verifyOtp,
      data: {'contact': contact, 'otp': otp},
    );

    final data = response.data['data'] as Map<String, dynamic>;
    final isNewUser = data['is_new_user'] as bool? ?? false;

    return VerifyOtpResult(
      isNewUser: isNewUser,
      tempToken: data['temp_token'] as String?,
      authResult: isNewUser == false
          ? _parseAuthResult(data)
          : null,
    );
  }

  Future<AuthResult> signup({
    required String tempToken,
    required String name,
    required String password,
    String? inviteCode,
  }) async {
    final response = await _dio.post(
      Endpoints.signup,
      data: {
        'temp_token': tempToken,
        'name': name,
        'password': password,
        if (inviteCode != null && inviteCode.isNotEmpty) 'agency_invite_code': inviteCode,
      },
    );

    final data = response.data['data'] as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;

    return _parseAuthResult({
      'access_token': data['access_token'],
      'refresh_token': data['refresh_token'],
      'user': user,
    });
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
