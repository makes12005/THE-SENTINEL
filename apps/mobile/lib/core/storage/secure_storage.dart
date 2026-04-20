import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Thin wrapper around flutter_secure_storage.
/// All keys are namespaced under the busalert. prefix.
class SecureStorage {
  SecureStorage._();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
  );

  // ── Keys ──────────────────────────────────────────────────────────────────
  static const _keyAccessToken  = 'busalert.access_token';
  static const _keyRefreshToken = 'busalert.refresh_token';
  static const _keyRole         = 'busalert.role';
  static const _keyUserId       = 'busalert.user_id';
  static const _keyUserName     = 'busalert.user_name';

  // ── Accessors ─────────────────────────────────────────────────────────────
  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _keyAccessToken,  value: accessToken),
      _storage.write(key: _keyRefreshToken, value: refreshToken),
    ]);
  }

  static Future<String?> getAccessToken()  => _storage.read(key: _keyAccessToken);
  static Future<String?> getRefreshToken() => _storage.read(key: _keyRefreshToken);

  static Future<void> saveUserInfo({
    required String role,
    required String userId,
    required String userName,
  }) async {
    await Future.wait([
      _storage.write(key: _keyRole,     value: role),
      _storage.write(key: _keyUserId,   value: userId),
      _storage.write(key: _keyUserName, value: userName),
    ]);
  }

  static Future<String?> getRole()     => _storage.read(key: _keyRole);
  static Future<String?> getUserId()   => _storage.read(key: _keyUserId);
  static Future<String?> getUserName() => _storage.read(key: _keyUserName);

  static Future<bool> hasValidSession() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  static Future<void> clearAll() async => _storage.deleteAll();
}
