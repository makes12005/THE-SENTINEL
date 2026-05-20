import 'package:bus_alert/core/models/user_model.dart';
import 'package:bus_alert/core/storage/secure_storage.dart';
import 'package:bus_alert/features/auth/data/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  error,
}

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? errorMessage;
  final String? tempToken;
  final String? verifiedContact;
  final bool isNewUser;
  
  AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
    this.tempToken,
    this.verifiedContact,
    this.isNewUser = false,
  });
  
  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    String? errorMessage,
    String? tempToken,
    String? verifiedContact,
    bool? isNewUser,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage,
      tempToken: tempToken ?? this.tempToken,
      verifiedContact: verifiedContact ?? this.verifiedContact,
      isNewUser: isNewUser ?? this.isNewUser,
    );
  }
  
  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
  bool get hasError => status == AuthStatus.error;
  bool get needsSignup => isNewUser && tempToken != null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;
  final SecureStorage _storage;
  
  AuthNotifier(this._repository, this._storage) : super(AuthState()) {
    checkAuthStatus();
  }
  
  Future<void> checkAuthStatus() async {
    state = state.copyWith(status: AuthStatus.loading);
    
    try {
      final hasToken = await _storage.hasToken();
      if (!hasToken) {
        state = state.copyWith(status: AuthStatus.unauthenticated);
        return;
      }
      
      final hasValidRole = await _storage.hasValidRole();
      if (!hasValidRole) {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: 'App is for conductors and drivers only',
        );
        return;
      }
      
      final user = await _repository.getCurrentUser();
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: e.toString(),
      );
    }
  }
  
  Future<bool> login({
    required String contact,
    required String password,
  }) async {
    state = state.copyWith(status: AuthStatus.loading);
    
    try {
      final response = await _repository.login(
        contact: contact,
        password: password,
      );
      
      if (!response.user.hasValidRole) {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: 'App is for conductors and drivers only',
        );
        return false;
      }
      
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: response.user,
        errorMessage: null,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }
  
  Future<bool> sendOtp({required String contact}) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    
    try {
      await _repository.sendOtp(contact: contact);
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        verifiedContact: contact,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }
  
  Future<bool> verifyOtp({required String otp}) async {
    if (state.verifiedContact == null) return false;
    
    state = state.copyWith(status: AuthStatus.loading);
    
    try {
      final result = await _repository.verifyOtp(
        contact: state.verifiedContact!,
        otp: otp,
      );
      
      if (result.isNewUser) {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          tempToken: result.response.tempToken,
          isNewUser: true,
        );
        return false;
      }
      
      if (!result.response.user.hasValidRole) {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: 'App is for conductors and drivers only',
        );
        return false;
      }
      
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: result.response.user,
        tempToken: null,
        isNewUser: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }
  
  Future<bool> signup({
    required String name,
    required String password,
    String? agencyInviteCode,
  }) async {
    if (state.tempToken == null) return false;
    
    state = state.copyWith(status: AuthStatus.loading);
    
    try {
      final response = await _repository.signup(
        name: name,
        password: password,
        tempToken: state.tempToken!,
        agencyInviteCode: agencyInviteCode,
      );
      
      if (!response.user.hasValidRole && agencyInviteCode == null) {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          isNewUser: true,
          tempToken: state.tempToken,
        );
      } else {
        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: response.user,
          tempToken: null,
          isNewUser: false,
          errorMessage: null,
        );
      }
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }
  
  Future<bool> joinAgency({required String inviteCode}) async {
    state = state.copyWith(status: AuthStatus.loading);
    
    try {
      final response = await _repository.joinAgency(inviteCode: inviteCode);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: response.user,
        errorMessage: null,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }
  
  Future<void> logout() async {
    state = state.copyWith(status: AuthStatus.loading);
    await _repository.logout();
    state = AuthState(status: AuthStatus.unauthenticated);
  }
  
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      await _repository.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      state = state.copyWith(status: AuthStatus.authenticated);
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
      rethrow;
    }
  }
  
  void resetError() {
    state = state.copyWith(
      status: state.isAuthenticated ? AuthStatus.authenticated : AuthStatus.unauthenticated,
      errorMessage: null,
    );
  }
  
  void reset() {
    state = AuthState(status: AuthStatus.unauthenticated);
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(authRepositoryProvider),
    SecureStorage(),
  );
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

final currentUserProvider = Provider<UserModel?>((ref) {
  return ref.watch(authProvider).user;
});
