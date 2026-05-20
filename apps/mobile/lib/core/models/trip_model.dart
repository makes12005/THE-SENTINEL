class TripModel {
  final String id;
  final String routeId;
  final String routeName;
  final String status;
  final String? busNumber;
  final String? conductorId;
  final String? conductorName;
  final String? driverId;
  final String? driverName;
  final DateTime departureTime;
  final String origin;
  final String destination;
  final int? passengerCount;
  final DateTime createdAt;
  
  TripModel({
    required this.id,
    required this.routeId,
    required this.routeName,
    required this.status,
    this.busNumber,
    this.conductorId,
    this.conductorName,
    this.driverId,
    this.driverName,
    required this.departureTime,
    required this.origin,
    required this.destination,
    this.passengerCount,
    required this.createdAt,
  });
  
  factory TripModel.fromJson(Map<String, dynamic> json) {
    return TripModel(
      id: json['id'] ?? '',
      routeId: json['route_id'] ?? '',
      routeName: json['route_name'] ?? json['routeName'] ?? '',
      status: json['status'] ?? 'scheduled',
      busNumber: json['bus_number'] ?? json['busNumber'],
      conductorId: json['conductor_id'] ?? json['conductorId'],
      conductorName: json['conductor_name'] ?? json['conductorName'],
      driverId: json['driver_id'] ?? json['driverId'],
      driverName: json['driver_name'] ?? json['driverName'],
      departureTime: json['departure_time'] != null 
          ? DateTime.parse(json['departure_time'])
          : DateTime.parse(json['departureTime'] ?? DateTime.now().toIso8601String()),
      origin: json['origin'] ?? '',
      destination: json['destination'] ?? '',
      passengerCount: json['passenger_count'] ?? json['passengerCount'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
    );
  }
  
  bool get isActive => status == 'active' || status == 'in_progress';
  bool get isScheduled => status == 'scheduled';
  bool get isCompleted => status == 'completed';
  bool get isReady => status == 'ready';
}

class PassengerModel {
  final String id;
  final String tripId;
  final String name;
  final String? phone;
  final int seatNo;
  final String pickupStop;
  final String dropStop;
  final String status;
  final String? alertStatus;
  
  PassengerModel({
    required this.id,
    required this.tripId,
    required this.name,
    this.phone,
    required this.seatNo,
    required this.pickupStop,
    required this.dropStop,
    required this.status,
    this.alertStatus,
  });
  
  factory PassengerModel.fromJson(Map<String, dynamic> json) {
    return PassengerModel(
      id: json['id'] ?? '',
      tripId: json['trip_id'] ?? json['tripId'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'],
      seatNo: json['seat_no'] ?? json['seatNo'] ?? 0,
      pickupStop: json['pickup_stop'] ?? json['pickupStop'] ?? '',
      dropStop: json['drop_stop'] ?? json['dropStop'] ?? '',
      status: json['status'] ?? 'pending',
      alertStatus: json['alert_status'] ?? json['alertStatus'],
    );
  }
  
  bool get isPending => status == 'pending';
  bool get isBoarded => status == 'boarded';
  bool get isDropped => status == 'dropped';
  bool get isAbsent => status == 'absent';
  bool get isAlerted => alertStatus == 'alerted';
}
