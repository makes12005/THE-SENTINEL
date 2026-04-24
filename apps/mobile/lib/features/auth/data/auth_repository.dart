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

  Future<void> sendOtp(String identifier) async {
    await _dio.post(
      Endpoints.sendOtp,
      data: {'identifier': identifier},
    );
  }

  Future<VerifyOtpResult> verifyOtp(String identifier, String otp) async {
    final response = await _dio.post(
      Endpoints.verifyOtp,
      data: {'identifier': identifier, 'otp': otp},
    );

    final data = response.data['data'] as Map<String, dynamic>;

    if (data['is_new_user'] == true) {
      return VerifyOtpResult(
        isNewUser: true,
        tempToken: data['temp_token'] as String,
      );
    } else {
      final user = data['user'] as Map<String, dynamic>;
      return VerifyOtpResult(
        isNewUser: false,
        authResult: AuthResult(
          accessToken: data['access_token'] as String,
          refreshToken: data['refresh_token'] as String,
          role: user['role'] as String,
          userId: user['id'] as String,
          userName: user['name'] as String,
        ),
      );
    }
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
        if (inviteCode != null && inviteCode.isNotEmpty) 'invite_code': inviteCode,
      },
    );

    final data = response.data['data'] as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;

    return AuthResult(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
      role: user['role'] as String,
      userId: user['id'] as String,
      userName: user['name'] as String,
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
