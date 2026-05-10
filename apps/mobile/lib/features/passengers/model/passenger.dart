class Passenger {
  final String id;
  final String name;
  final String phone;
  final String stopName;
  final int stopSequence;
  final String pickupPoint;
  final String seatNo;
  final String boardingStatus;
  final double stopLatitude;
  final double stopLongitude;
  final String alertStatus;   // 'pending' | 'sent' | 'failed' | 'acknowledged'

  const Passenger({
    required this.id,
    required this.name,
    required this.phone,
    required this.stopName,
    required this.stopSequence,
    required this.pickupPoint,
    required this.seatNo,
    required this.boardingStatus,
    required this.stopLatitude,
    required this.stopLongitude,
    required this.alertStatus,
  });

  factory Passenger.fromJson(Map<String, dynamic> json) {
    return Passenger(
      id:           json['id']            as String,
      name:         json['name']          as String? ?? 'Unknown',
      phone:        json['phone']         as String? ?? '',
      stopName:     json['stop_name']     as String? ?? '',
      stopSequence: json['stop_sequence'] as int?    ?? 0,
      pickupPoint:  json['pickup_point']  as String? ?? '',
      seatNo:       json['seat_no']       as String? ?? '',
      boardingStatus: json['boarding_status'] as String? ?? 'pending',
      stopLatitude: (json['stop_latitude'] as num?)?.toDouble() ?? 0,
      stopLongitude: (json['stop_longitude'] as num?)?.toDouble() ?? 0,
      alertStatus:  json['alert_status']  as String? ?? 'pending',
    );
  }

  Passenger copyWithStatus(String status) => Passenger(
    id: id, name: name, phone: phone,
    stopName: stopName, stopSequence: stopSequence,
    pickupPoint: pickupPoint, seatNo: seatNo,
    boardingStatus: boardingStatus,
    stopLatitude: stopLatitude, stopLongitude: stopLongitude,
    alertStatus: status,
  );

  bool get isPending     => alertStatus == 'pending';
  bool get isSent        => alertStatus == 'sent';
  bool get isFailed      => alertStatus == 'failed';
  bool get isAcknowledged => alertStatus == 'acknowledged';
  bool get isBoarded => boardingStatus == 'boarded';
  bool get isAbsent => boardingStatus == 'absent';
}
