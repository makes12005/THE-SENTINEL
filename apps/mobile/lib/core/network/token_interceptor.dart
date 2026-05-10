import 'package:dio/dio.dart';
import 'package:synchronized/synchronized.dart';
import '../auth/session_notifier.dart';
import '../storage/secure_storage.dart';
import '../env.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import '../../features/alerts/socket_service.dart';

/// Intercepts 401 responses and transparently refreshes the access token.
/// Uses a Lock to prevent multiple simultaneous refresh calls.
class TokenInterceptor extends Interceptor {
  final Dio _dio;
  final _lock = Lock();


  TokenInterceptor(this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Do not attach stale bearer tokens to public auth endpoints.
    if (options.path.contains('/api/auth/')) {
      handler.next(options);
      return;
    }

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
    // Never force-refresh/force-logout on auth endpoints.
    if (err.requestOptions.path.contains('/api/auth/')) {
      return handler.next(err);
    }

    // Only intercept 401 on non-auth endpoints
    if (err.response?.statusCode != 401 ||
        err.requestOptions.path.contains('/auth/refresh')) {
      return handler.next(err);
    }

    // Serialize refresh calls with a lock
    await _lock.synchronized(() async {
      try {
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

        // Notify background GPS task about the new token (if running)
        try {
          FlutterForegroundTask.sendDataToTask({
            'type': 'token_refresh',
            'token': newToken,
          });
        } catch (_) {}

        // Notify socket connection about the new token
        SocketService.updateToken(newToken);

        // Retry original request with new token
        final opts = err.requestOptions;
        opts.headers['Authorization'] = 'Bearer $newToken';
        final retryResp = await _dio.fetch(opts);
        handler.resolve(retryResp);
      } catch (_) {
        await _forceLogout(err, handler);
      }
    });
  }

  Future<void> _forceLogout(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    await SecureStorage.clearAll();
    // Notify GoRouter's refreshListenable so it immediately re-evaluates
    // the redirect guard and sends the user to /welcome.
    SessionNotifier.instance.invalidate();
    handler.reject(
      DioException(
        requestOptions: err.requestOptions,
        type: DioExceptionType.cancel,
        message: 'SESSION_EXPIRED',
      ),
    );
  }
}
