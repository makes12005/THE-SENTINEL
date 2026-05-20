import 'package:bus_alert/core/network/api_client.dart';
import 'package:bus_alert/core/network/endpoints.dart';
import 'package:bus_alert/core/storage/secure_storage.dart';
import 'package:dio/dio.dart';

class TokenInterceptor extends Interceptor {
  final SecureStorage _storage = SecureStorage();
  
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken != null) {
        try {
          final response = await Dio().post(
            '${ApiClient().dio.options.baseUrl}${Endpoints.refresh}',
            data: {'refreshToken': refreshToken},
          );
          
          if (response.statusCode == 200 && response.data['success'] == true) {
            final newAccessToken = response.data['data']['access_token'] ?? response.data['data']['accessToken'];
            final newRefreshToken = response.data['data']['refresh_token'] ?? response.data['data']['refreshToken'];
            
            await _storage.saveAccessToken(newAccessToken);
            await _storage.saveRefreshToken(newRefreshToken);
            
            err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
            
            final retryResponse = await Dio().fetch(err.requestOptions);
            return handler.resolve(retryResponse);
          }
        } catch (e) {
          await _storage.clearAll();
        }
      }
    }
    handler.next(err);
  }
}
