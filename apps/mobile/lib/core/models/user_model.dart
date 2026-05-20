class UserModel {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String role;
  final String? agencyId;
  final String redirect;
  
  UserModel({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    required this.role,
    this.agencyId,
    required this.redirect,
  });
  
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'],
      email: json['email'],
      role: json['role'] ?? 'passenger',
      agencyId: json['agency_id'] ?? json['agencyId'],
      redirect: json['redirect'] ?? '/',
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'role': role,
      'agency_id': agencyId,
      'redirect': redirect,
    };
  }
  
  bool get isConductor => role == 'conductor';
  bool get isDriver => role == 'driver';
  bool get hasValidRole => isConductor || isDriver;
}

class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final UserModel user;
  final bool isNewUser;
  final String? tempToken;
  
  AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
    this.isNewUser = false,
    this.tempToken,
  });
  
  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json;
    return AuthResponse(
      accessToken: data['access_token'] ?? data['accessToken'] ?? '',
      refreshToken: data['refresh_token'] ?? data['refreshToken'] ?? '',
      user: UserModel.fromJson(data['user'] ?? data),
      isNewUser: data['is_new_user'] ?? false,
      tempToken: data['temp_token'],
    );
  }
}
