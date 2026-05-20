import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static final SecureStorage _instance = SecureStorage._internal();
  factory SecureStorage() => _instance;
  
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  
  SecureStorage._internal();
  
  static const String _keyAccessToken = 'access_token';
  static const String _keyRefreshToken = 'refresh_token';
  static const String _keyUserId = 'user_id';
  static const String _keyUserRole = 'user_role';
  static const String _keyUserName = 'user_name';
  static const String _keyAgencyId = 'agency_id';
  static const String _keyUserPhone = 'user_phone';
  static const String _keyUserEmail = 'user_email';
  
  Future<void> saveAccessToken(String token) async {
    await _storage.write(key: _keyAccessToken, value: token);
  }
  
  Future<String?> getAccessToken() async {
    return await _storage.read(key: _keyAccessToken);
  }
  
  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _keyRefreshToken, value: token);
  }
  
  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _keyRefreshToken);
  }
  
  Future<void> saveUserId(String id) async {
    await _storage.write(key: _keyUserId, value: id);
  }
  
  Future<String?> getUserId() async {
    return await _storage.read(key: _keyUserId);
  }
  
  Future<void> saveUserRole(String role) async {
    await _storage.write(key: _keyUserRole, value: role);
  }
  
  Future<String?> getUserRole() async {
    return await _storage.read(key: _keyUserRole);
  }
  
  Future<void> saveUserName(String name) async {
    await _storage.write(key: _keyUserName, value: name);
  }
  
  Future<String?> getUserName() async {
    return await _storage.read(key: _keyUserName);
  }
  
  Future<void> saveAgencyId(String agencyId) async {
    await _storage.write(key: _keyAgencyId, value: agencyId);
  }
  
  Future<String?> getAgencyId() async {
    return await _storage.read(key: _keyAgencyId);
  }
  
  Future<void> saveUserPhone(String? phone) async {
    if (phone != null) {
      await _storage.write(key: _keyUserPhone, value: phone);
    }
  }
  
  Future<String?> getUserPhone() async {
    return await _storage.read(key: _keyUserPhone);
  }
  
  Future<void> saveUserEmail(String? email) async {
    if (email != null) {
      await _storage.write(key: _keyUserEmail, value: email);
    }
  }
  
  Future<String?> getUserEmail() async {
    return await _storage.read(key: _keyUserEmail);
  }
  
  Future<void> saveUserData({
    required String accessToken,
    required String refreshToken,
    required String userId,
    required String userRole,
    required String userName,
    String? agencyId,
    String? phone,
    String? email,
  }) async {
    await Future.wait([
      saveAccessToken(accessToken),
      saveRefreshToken(refreshToken),
      saveUserId(userId),
      saveUserRole(userRole),
      saveUserName(userName),
      if (agencyId != null) saveAgencyId(agencyId),
      if (phone != null) saveUserPhone(phone),
      if (email != null) saveUserEmail(email),
    ]);
  }
  
  Future<bool> hasToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
  
  Future<bool> hasValidRole() async {
    final role = await getUserRole();
    return role == 'conductor' || role == 'driver';
  }
  
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
