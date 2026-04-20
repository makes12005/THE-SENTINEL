/// Driver trip model.
/// Extends the conductor Trip model with driver-specific fields:
///   - conductorName / conductorOnline — for status badge
///   - isDriverModeActive — after a successful takeover

class DriverTrip {
  final String id;
  final String routeId;
  final String fromCity;
  final String toCity;
  final String routeName;
  final String status;         // 'scheduled' | 'active' | 'completed'
  final String scheduledDate;
  final String? conductorId;
  final String? conductorName;
  final bool conductorOnline;  // false → "Takeover Required" badge
  final bool isDriverModeActive; // true after takeover

  const DriverTrip({
    required this.id,
    required this.routeId,
    required this.fromCity,
    required this.toCity,
    required this.routeName,
    required this.status,
    required this.scheduledDate,
    this.conductorId,
    this.conductorName,
    this.conductorOnline = true,
    this.isDriverModeActive = false,
  });

  factory DriverTrip.fromJson(Map<String, dynamic> json) {
    final route = json['route'] as Map<String, dynamic>? ?? {};
    final conductor = json['conductor'] as Map<String, dynamic>?;
    return DriverTrip(
      id:               json['id'] as String,
      routeId:          json['route_id'] as String? ?? '',
      fromCity:         route['from_city']  as String? ?? '',
      toCity:           route['to_city']    as String? ?? '',
      routeName:        route['name']       as String? ?? 'Route',
      status:           json['status']      as String? ?? 'scheduled',
      scheduledDate:    json['scheduled_date'] as String? ?? '',
      conductorId:      json['conductor_id'] as String?,
      conductorName:    conductor?['name']  as String?,
      conductorOnline:  json['conductor_online'] as bool? ?? true,
      isDriverModeActive: false,
    );
  }

  DriverTrip copyWith({bool? isDriverModeActive, bool? conductorOnline}) {
    return DriverTrip(
      id: id, routeId: routeId, fromCity: fromCity, toCity: toCity,
      routeName: routeName, status: status, scheduledDate: scheduledDate,
      conductorId: conductorId, conductorName: conductorName,
      conductorOnline: conductorOnline ?? this.conductorOnline,
      isDriverModeActive: isDriverModeActive ?? this.isDriverModeActive,
    );
  }

  bool get isActive    => status == 'active';
  bool get isScheduled => status == 'scheduled';
  bool get isCompleted => status == 'completed';
  bool get needsTakeover => !conductorOnline;
  String get displayRoute => '$fromCity → $toCity';
}
