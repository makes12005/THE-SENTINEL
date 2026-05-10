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
      connectTimeout: const Duration(seconds: 25),
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

  /// Convenience: parse error message from Dio exception.
  ///
  /// Priority order:
  ///   1. Interceptor-injected SESSION_EXPIRED signal  → "Session expired"
  ///   2. Network / timeout errors                     → "No internet"
  ///   3. Server-provided error body message           → server message (e.g. "Invalid credentials")
  ///   4. HTTP status fallbacks                        → generic status message
  static String parseError(Object error) {
    if (error is DioException) {
      // 1. Explicitly signalled by TokenInterceptor after refresh failure.
      if (error.message == 'SESSION_EXPIRED') {
        return 'Session expired / સેશન સમયસમાપ્તિ. Please login again.';
      }

      // 2. Network-level failures (no response at all).
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.sendTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.connectionError) {
        return 'No internet connection / ઇન્ટરનેટ ઉપલબ્ધ નથી.';
      }

      // 3. Try to read the server's own error message first.
      //    This is the highest-quality message — e.g. "Invalid credentials",
      //    "Phone not registered", "OTP expired", etc.
      final data = error.response?.data;
      if (data is Map) {
        final msg = _extractServerMessage(data);
        if (msg.isNotEmpty) return msg;
      }

      // 4. Generic HTTP status fallbacks (when server sends no body).
      final statusCode = error.response?.statusCode;
      if (statusCode == 400) return 'Invalid request / અમાન્ય વિનંતી.';
      if (statusCode == 401) return 'Incorrect phone or password / ખોટો ફોન અથવા પાસવર્ડ.';
      if (statusCode == 403) return 'Access denied / પ્રવેશ નામંજૂર.';
      if (statusCode == 404) return 'Not found / મળ્યું નહીં.';
      if (statusCode == 409) return 'Already exists / પહેલેથી અસ્તિત્વ ધરાવે છે.';
      if (statusCode == 429) return 'Too many attempts. Please wait / ઘણા પ્રયાસ. થોડીવાર રાહ જુઓ.';
      if (statusCode != null && statusCode >= 500) {
        return 'Server error / સર્વર ભૂલ. Please try again.';
      }

      return 'Could not connect to server / સર્વર સાથે જોડાણ ન થઈ. Check internet.';
    }
    return 'Something went wrong / કંઈક ખોટું થયું. Please try again.';
  }

  /// Extracts the human-readable error message from any { success, data, error } shape.
  static String _extractServerMessage(Map<dynamic, dynamic> data) {
    // Shape: { error: { message: "..." } }
    final errField = data['error'];
    if (errField is Map) {
      final msg = errField['message']?.toString() ?? '';
      if (msg.isNotEmpty) return msg;
    }
    // Shape: { error: "..." }
    if (errField is String && errField.isNotEmpty) return errField;
    // Shape: { message: "..." } (some backends)
    final msg = data['message']?.toString() ?? '';
    return msg;
  }
}
