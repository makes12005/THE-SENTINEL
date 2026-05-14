import 'package:dio/dio.dart';
import '../storage/secure_storage.dart';
import '../router/app_router.dart';

class TokenInterceptor extends Interceptor {
  final Dio dio;

  TokenInterceptor(this.dio);

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await SecureStorage.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    return handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final refreshToken = await SecureStorage.getRefreshToken();
      if (refreshToken != null) {
        try {
          final response = await dio.post('/api/auth/refresh', data: {
            'refresh_token': refreshToken,
          });
          
          if (response.statusCode == 200) {
            final newToken = response.data['data']['access_token'];
            final newRefresh = response.data['data']['refresh_token'];
            
            await SecureStorage.saveToken(newToken);
            if (newRefresh != null) await SecureStorage.saveRefreshToken(newRefresh);
            
            final opts = err.requestOptions;
            opts.headers['Authorization'] = 'Bearer $newToken';
            
            final retryResponse = await dio.fetch(opts);
            return handler.resolve(retryResponse);
          }
        } catch (e) {
          await SecureStorage.clearAll();
          AppRouter.router.go('/welcome');
          return handler.next(err);
        }
      } else {
        await SecureStorage.clearAll();
        AppRouter.router.go('/welcome');
      }
    }
    return handler.next(err);
  }
}
