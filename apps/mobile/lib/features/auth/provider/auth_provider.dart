import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/auth_repository.dart';
import '../../../core/storage/secure_storage.dart';

final authRepositoryProvider = Provider((ref) => AuthRepository());

final authControllerProvider = StateNotifierProvider<AuthController, AsyncValue<void>>((ref) {
  return AuthController(ref.read(authRepositoryProvider));
});

final userProfileProvider = FutureProvider<Map<String, String?>>((ref) async {
  final name = await SecureStorage.getUserName();
  final role = await SecureStorage.getUserRole();
  final id = await SecureStorage.getUserId();
  return {
    'name': name,
    'role': role,
    'id': id,
  };
});

class AuthController extends StateNotifier<AsyncValue<void>> {
  final AuthRepository _repository;
  
  AuthController(this._repository) : super(const AsyncValue.data(null));

  Future<bool> login(String contact, String password) async {
    state = const AsyncValue.loading();
    try {
      final response = await _repository.login(contact, password);
      final data = response['data'];
      await _saveAuthData(data);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> sendOtp(String contact) async {
    state = const AsyncValue.loading();
    try {
      await _repository.sendOtp(contact);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> verifyOtp(String contact, String otp) async {
    state = const AsyncValue.loading();
    try {
      final response = await _repository.verifyOtp(contact, otp);
      final data = response['data'];
      await _saveAuthData(data);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> joinAgency(String agencyCode) async {
    state = const AsyncValue.loading();
    try {
      await _repository.joinAgency(agencyCode);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<void> logout() async {
    state = const AsyncValue.loading();
    await _repository.logout();
    state = const AsyncValue.data(null);
  }

  Future<void> _saveAuthData(Map<String, dynamic> data) async {
    if (data.containsKey('access_token')) await SecureStorage.saveToken(data['access_token']);
    if (data.containsKey('refresh_token')) await SecureStorage.saveRefreshToken(data['refresh_token']);
    if (data.containsKey('user')) {
      final user = data['user'];
      if (user['id'] != null) await SecureStorage.saveUserId(user['id'].toString());
      if (user['role'] != null) await SecureStorage.saveUserRole(user['role']);
      if (user['name'] != null) await SecureStorage.saveUserName(user['name']);
      if (user['agency_id'] != null) await SecureStorage.saveAgencyId(user['agency_id'].toString());
    }
  }
}
