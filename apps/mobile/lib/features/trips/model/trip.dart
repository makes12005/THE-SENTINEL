class Trip {
  final String id;
  final String routeId;
  final String fromCity;
  final String toCity;
  final String routeName;
  final String status;        // 'scheduled' | 'active' | 'completed'
  final String scheduledDate;
  final String? driverName;
  final String conductorId;

  const Trip({
    required this.id,
    required this.routeId,
    required this.fromCity,
    required this.toCity,
    required this.routeName,
    required this.status,
    required this.scheduledDate,
    this.driverName,
    required this.conductorId,
  });

  factory Trip.fromJson(Map<String, dynamic> json) {
    final route = json['route'] as Map<String, dynamic>? ?? {};
    final driver = json['driver'] as Map<String, dynamic>?;
    return Trip(
      id:            json['id'] as String,
      routeId:       json['route_id'] as String? ?? '',
      fromCity:      route['from_city'] as String? ?? '',
      toCity:        route['to_city']   as String? ?? '',
      routeName:     route['name']      as String? ?? 'Route',
      status:        json['status']     as String? ?? 'scheduled',
      scheduledDate: json['scheduled_date'] as String? ?? '',
      driverName:    driver?['name']    as String?,
      conductorId:   json['conductor_id'] as String? ?? '',
    );
  }

  bool get isActive    => status == 'active';
  bool get isScheduled => status == 'scheduled';
  bool get isCompleted => status == 'completed';

  String get displayRoute => '$fromCity → $toCity';
}
