class DriverProfile {
  final String id;
  final String name;
  final String phone;
  final String agencyName;
  final String role;
  final String? profilePhotoUrl;

  const DriverProfile({
    required this.id,
    required this.name,
    required this.phone,
    required this.agencyName,
    required this.role,
    this.profilePhotoUrl,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    final agency = json['agency'] as Map<String, dynamic>? ?? const {};
    return DriverProfile(
      id: (json['id'] ?? '') as String,
      name: (json['name'] ?? 'Driver') as String,
      phone: (json['phone'] ?? '') as String,
      agencyName: (agency['name'] ?? json['agency_name'] ?? 'Assigned Agency')
          as String,
      role: (json['role'] ?? 'driver') as String,
      profilePhotoUrl: json['profile_photo_url'] as String?,
    );
  }

  String get maskedPhone {
    if (phone.isEmpty) return 'Not available';
    final visible =
        phone.length >= 4 ? phone.substring(phone.length - 4) : phone;
    return '******$visible';
  }
}
