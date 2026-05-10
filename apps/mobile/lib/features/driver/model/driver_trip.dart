class DriverTrip {
  final String id;
  final String driverId;
  final String routeId;
  final String routeName;
  final String fromCity;
  final String toCity;
  final String status;
  final String scheduledDate;
  final String? conductorId;
  final String? conductorName;
  final bool conductorOnline;
  final DateTime? conductorLastSeenAt;
  final int totalPassengers;
  final int alertedPassengers;
  final String? busLabel;
  final bool isDriverModeActive;

  const DriverTrip({
    required this.id,
    required this.driverId,
    required this.routeId,
    required this.routeName,
    required this.fromCity,
    required this.toCity,
    required this.status,
    required this.scheduledDate,
    this.conductorId,
    this.conductorName,
    this.conductorOnline = true,
    this.conductorLastSeenAt,
    this.totalPassengers = 0,
    this.alertedPassengers = 0,
    this.busLabel,
    this.isDriverModeActive = false,
  });

  factory DriverTrip.fromJson(Map<String, dynamic> json) {
    final route = json['route'] as Map<String, dynamic>? ?? const {};
    final conductor = json['conductor'] as Map<String, dynamic>? ?? const {};
    final driver = json['driver'] as Map<String, dynamic>? ?? const {};
    final bus = json['bus'] as Map<String, dynamic>? ??
        json['vehicle'] as Map<String, dynamic>? ??
        const {};
    return DriverTrip(
      id: (json['id'] ?? '') as String,
      driverId: (json['driver_id'] ?? driver['id'] ?? '') as String,
      routeId: (json['route_id'] ?? '') as String,
      routeName:
          (route['name'] ?? json['trip_name'] ?? 'Assigned Trip') as String,
      fromCity: (route['from_city'] ?? route['from'] ?? '') as String,
      toCity: (route['to_city'] ?? route['to'] ?? '') as String,
      status: (json['status'] ?? 'scheduled') as String,
      scheduledDate: (json['scheduled_date'] ??
          json['scheduled_at'] ??
          json['start_time'] ??
          '') as String,
      conductorId: (json['conductor_id'] ?? conductor['id']) as String?,
      conductorName: (conductor['name'] ?? json['conductor_name']) as String?,
      conductorOnline: (json['conductor_online'] ?? true) as bool,
      conductorLastSeenAt: _parseDateTime(
          json['conductor_last_seen_at'] ?? json['last_seen_at']),
      totalPassengers: _toInt(
        json['total_passengers'] ??
            json['passenger_count'] ??
            json['passengers_total'],
      ),
      alertedPassengers: _toInt(
        json['alerted_passengers'] ??
            json['alerts_sent'] ??
            json['passengers_alerted'],
      ),
      busLabel: (bus['registration_number'] ??
          bus['vehicle_number'] ??
          bus['name'] ??
          json['bus_number']) as String?,
      isDriverModeActive: (json['is_driver_mode_active'] ?? false) as bool,
    );
  }

  DriverTrip copyWith({
    String? status,
    bool? conductorOnline,
    DateTime? conductorLastSeenAt,
    int? totalPassengers,
    int? alertedPassengers,
    String? busLabel,
    bool? isDriverModeActive,
  }) {
    return DriverTrip(
      id: id,
      driverId: driverId,
      routeId: routeId,
      routeName: routeName,
      fromCity: fromCity,
      toCity: toCity,
      status: status ?? this.status,
      scheduledDate: scheduledDate,
      conductorId: conductorId,
      conductorName: conductorName,
      conductorOnline: conductorOnline ?? this.conductorOnline,
      conductorLastSeenAt: conductorLastSeenAt ?? this.conductorLastSeenAt,
      totalPassengers: totalPassengers ?? this.totalPassengers,
      alertedPassengers: alertedPassengers ?? this.alertedPassengers,
      busLabel: busLabel ?? this.busLabel,
      isDriverModeActive: isDriverModeActive ?? this.isDriverModeActive,
    );
  }

  bool get isActive => status == 'active';
  bool get isScheduled => status == 'scheduled';
  bool get isCompleted => status == 'completed';
  bool get needsTakeover => !conductorOnline && !isCompleted;
  bool get isTakeoverEligible {
    if (conductorOnline) return false;
    if (conductorLastSeenAt == null) return true;
    return DateTime.now().difference(conductorLastSeenAt!).inMinutes >= 2;
  }

  String get tripName => routeName;
  String get displayRoute => '$fromCity to $toCity';
}

DateTime? _parseDateTime(dynamic value) {
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value)?.toLocal();
}

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}
