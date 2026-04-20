import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/auth_repository.dart';
import '../../core/storage/secure_storage.dart';
import '../../core/network/api_client.dart';

// ── State ─────────────────────────────────────────────────────────────────────

class AuthState {
  final bool isLoading;
  final String? error;
  final bool isAuthenticated;
  final String? role;
  final String? userId;
  final String? userName;

  const AuthState({
    this.isLoading = false,
    this.error,
    this.isAuthenticated = false,
    this.role,
    this.userId,
    this.userName,
  });

  AuthState copyWith({
    bool? isLoading,
    String? error,
    bool? isAuthenticated,
    String? role,
    String? userId,
    String? userName,
  }) {
    return AuthState(
      isLoading:       isLoading       ?? this.isLoading,
      error:           error,           // null clears error
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      role:            role            ?? this.role,
      userId:          userId          ?? this.userId,
      userName:        userName        ?? this.userName,
    );
  }
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;

  AuthNotifier(this._repo) : super(const AuthState());

  Future<bool> login({required String phone, required String password}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repo.login(phone: phone, password: password);

      // ROLE GUARD — conductor or driver only
      const allowedRoles = ['conductor', 'driver'];
      if (!allowedRoles.contains(result.role)) {
        state = state.copyWith(
          isLoading: false,
          error: 'Access denied. This app is for conductors and drivers only. Role: ${result.role}',
        );
        return false;
      }

      await SecureStorage.saveTokens(
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      );
      await SecureStorage.saveUserInfo(
        role: result.role,
        userId: result.userId,
        userName: result.userName,
      );

      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        role: result.role,
        userId: result.userId,
        userName: result.userName,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ApiClient.parseError(e),
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState();
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final authRepositoryProvider = Provider<AuthRepository>((_) => AuthRepository());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(ref.read(authRepositoryProvider)),
);
