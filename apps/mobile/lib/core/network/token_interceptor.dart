import 'package:dio/dio.dart';
import 'package:synchronized/synchronized.dart';
import '../storage/secure_storage.dart';
import '../env.dart';

/// Intercepts 401 responses and transparently refreshes the access token.
/// Uses a Lock to prevent multiple simultaneous refresh calls.
class TokenInterceptor extends Interceptor {
  final Dio _dio;
  final _lock = Lock();
  bool _isRefreshing = false;

  TokenInterceptor(this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await SecureStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Only intercept 401 on non-refresh endpoints
    if (err.response?.statusCode != 401 ||
        err.requestOptions.path.contains('/auth/refresh') ||
        err.requestOptions.path.contains('/auth/login')) {
      return handler.next(err);
    }

    // Serialize refresh calls with a lock
    await _lock.synchronized(() async {
      try {
        _isRefreshing = true;
        final refreshToken = await SecureStorage.getRefreshToken();
        if (refreshToken == null) {
          await _forceLogout(err, handler);
          return;
        }

        // Attempt token refresh using a clean Dio instance (no interceptors)
        final refreshDio = Dio(BaseOptions(baseUrl: Env.apiBaseUrl));
        final response = await refreshDio.post(
          '/api/auth/refresh',
          data: {'refreshToken': refreshToken},
        );

        final data    = response.data['data'] as Map<String, dynamic>;
        final newToken = data['accessToken'] as String;
        final newRefresh = data['refreshToken'] as String;

        await SecureStorage.saveTokens(
          accessToken: newToken,
          refreshToken: newRefresh,
        );

        // Retry original request with new token
        final opts = err.requestOptions;
        opts.headers['Authorization'] = 'Bearer $newToken';
        final retryResp = await _dio.fetch(opts);
        handler.resolve(retryResp);
      } catch (_) {
        await _forceLogout(err, handler);
      } finally {
        _isRefreshing = false;
      }
    });
  }

  Future<void> _forceLogout(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    await SecureStorage.clearAll();
    // Signal to router that we need to go to /login.
    // We use a custom error type that the router's redirect can detect.
    handler.reject(
      DioException(
        requestOptions: err.requestOptions,
        type: DioExceptionType.cancel,
        message: 'SESSION_EXPIRED',
      ),
    );
  }
}
