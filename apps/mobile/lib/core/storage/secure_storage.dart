import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage();

  static Future<void> saveToken(String token) async => await _storage.write(key: 'access_token', value: token);
  static Future<String?> getToken() async => await _storage.read(key: 'access_token');
  
  static Future<void> saveRefreshToken(String token) async => await _storage.write(key: 'refresh_token', value: token);
  static Future<String?> getRefreshToken() async => await _storage.read(key: 'refresh_token');

  static Future<void> saveUserId(String id) async => await _storage.write(key: 'user_id', value: id);
  static Future<String?> getUserId() async => await _storage.read(key: 'user_id');

  static Future<void> saveUserRole(String role) async => await _storage.write(key: 'user_role', value: role);
  static Future<String?> getUserRole() async => await _storage.read(key: 'user_role');

  static Future<void> saveUserName(String name) async => await _storage.write(key: 'user_name', value: name);
  static Future<String?> getUserName() async => await _storage.read(key: 'user_name');

  static Future<void> saveAgencyId(String id) async => await _storage.write(key: 'agency_id', value: id);
  static Future<String?> getAgencyId() async => await _storage.read(key: 'agency_id');

  static Future<void> clearAll() async => await _storage.deleteAll();
}
