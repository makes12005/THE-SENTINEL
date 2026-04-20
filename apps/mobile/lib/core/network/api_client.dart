import 'package:dio/dio.dart';
import '../env.dart';
import 'token_interceptor.dart';

/// Singleton Dio HTTP client.
/// Configured with base URL, timeouts, logging, and token auto-refresh.
class ApiClient {
  ApiClient._();

  static late final Dio _dio;
  static bool _initialized = false;

  static Dio get instance {
    if (!_initialized) _init();
    return _dio;
  }

  static void _init() {
    _dio = Dio(BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Token interceptor runs first — attaches Bearer + handles 401
    _dio.interceptors.add(TokenInterceptor(_dio));

    // Logging in debug mode
    assert(() {
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
      ));
      return true;
    }());

    _initialized = true;
  }

  /// Convenience: parse error message from Dio exception
  static String parseError(Object error) {
    if (error is DioException) {
      if (error.message == 'SESSION_EXPIRED') return 'Session expired. Please log in again.';
      final data = error.response?.data;
      if (data is Map) {
        return (data['error']?['message'] ?? data['error'] ?? 'Server error').toString();
      }
      return error.message ?? 'Network error';
    }
    return error.toString();
  }
}
