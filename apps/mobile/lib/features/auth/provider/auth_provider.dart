import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/auth_repository.dart';
import '../../core/auth/session_notifier.dart';
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
  final String? tempToken; // For new user registration flow
  final String? identifier; // Store email/phone during OTP flow

  const AuthState({
    this.isLoading = false,
    this.error,
    this.isAuthenticated = false,
    this.role,
    this.userId,
    this.userName,
    this.tempToken,
    this.identifier,
  });

  AuthState copyWith({
    bool? isLoading,
    String? error,
    bool? isAuthenticated,
    String? role,
    String? userId,
    String? userName,
    String? tempToken,
    String? identifier,
  }) {
    return AuthState(
      isLoading:       isLoading       ?? this.isLoading,
      error:           error,           // null clears error
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      role:            role            ?? this.role,
      userId:          userId          ?? this.userId,
      userName:        userName        ?? this.userName,
      tempToken:       tempToken       ?? this.tempToken,
      identifier:      identifier      ?? this.identifier,
    );
  }
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;

  AuthNotifier(this._repo) : super(const AuthState());

  void setIdentifier(String identifier) {
    state = state.copyWith(identifier: identifier, error: null);
  }

  Future<bool> sendOtp(String identifier) async {
    state = state.copyWith(isLoading: true, error: null, identifier: identifier);
    try {
      await _repo.sendOtp(identifier);
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: ApiClient.parseError(e));
      return false;
    }
  }

  /// Returns true if existing user (logged in).
  /// Returns false if new user (needs signup).
  /// Throws or sets error if failed.
  Future<bool?> verifyOtp(String otp) async {
    if (state.identifier == null) {
      state = state.copyWith(error: 'Identifier is missing. Please restart login.');
      return null;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repo.verifyOtp(state.identifier!, otp);

      if (result.isNewUser) {
        state = state.copyWith(
          isLoading: false,
          tempToken: result.tempToken,
        );
        return false; // Not fully authenticated yet, needs signup
      } else {
        final authResult = result.authResult!;
        return await _handleAuthSuccess(authResult);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: ApiClient.parseError(e));
      return null;
    }
  }

  Future<bool> signup({
    required String name,
    required String password,
    String? inviteCode,
  }) async {
    if (state.tempToken == null) {
      state = state.copyWith(error: 'Session expired. Please verify OTP again.');
      return false;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repo.signup(
        tempToken: state.tempToken!,
        name: name,
        password: password,
        inviteCode: inviteCode,
      );

      return await _handleAuthSuccess(result);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: ApiClient.parseError(e));
      return false;
    }
  }

  Future<bool> _handleAuthSuccess(AuthResult result) async {
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
      tempToken: null, // Clear temp token
    );
    return true;
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState();
    // Notify GoRouter to re-run its redirect guard → /welcome
    SessionNotifier.instance.invalidate();
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final authRepositoryProvider = Provider<AuthRepository>((_) => AuthRepository());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(ref.read(authRepositoryProvider)),
);
