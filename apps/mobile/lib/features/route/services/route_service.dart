import 'package:bus_alert/core/env.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class RoutePoint {
  final double latitude;
  final double longitude;
  final String? name;
  final int? sequence;
  
  RoutePoint({
    required this.latitude,
    required this.longitude,
    this.name,
    this.sequence,
  });
  
  factory RoutePoint.fromJson(Map<String, dynamic> json) {
    return RoutePoint(
      latitude: json['latitude'] ?? json['lat'],
      longitude: json['longitude'] ?? json['lng'],
      name: json['name'],
      sequence: json['sequence'],
    );
  }
  
  Map<String, dynamic> toJson() => {
    'latitude': latitude,
    'longitude': longitude,
    if (name != null) 'name': name,
    if (sequence != null) 'sequence': sequence,
  };
}

class RouteResult {
  final List<RoutePoint> polyline;
  final double distanceMeters;
  final int durationSeconds;
  final String? summary;
  
  RouteResult({
    required this.polyline,
    required this.distanceMeters,
    required this.durationSeconds,
    this.summary,
  });
  
  String get distanceText {
    if (distanceMeters < 1000) {
      return '${distanceMeters.toInt()} m';
    }
    return '${(distanceMeters / 1000).toStringAsFixed(1)} km';
  }
  
  String get durationText {
    final minutes = durationSeconds ~/ 60;
    if (minutes < 60) {
      return '$minutes min';
    }
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    return '$hours h $remainingMinutes min';
  }
}

class RouteService {
  final Dio _dio = Dio();
  
  Future<RouteResult?> calculateRoute({
    required RoutePoint origin,
    required RoutePoint destination,
    List<RoutePoint> waypoints = const [],
  }) async {
    try {
      final originStr = '${origin.latitude},${origin.longitude}';
      final destinationStr = '${destination.latitude},${destination.longitude}';
      
      String waypointsStr = '';
      if (waypoints.isNotEmpty) {
        waypointsStr = '&waypoints=${waypoints.map((p) => '${p.latitude},${p.longitude}').join('|')}';
      }
      
      final url = '${Env.googleDirectionsApi}?origin=$originStr&destination=$destinationStr$waypointsStr&key=${Env.googleMapsKey}&alternatives=false&optimize=true';
      
      final response = await _dio.get(url);
      
      if (response.statusCode == 200 && response.data['status'] == 'OK') {
        final routes = response.data['routes'] as List;
        if (routes.isEmpty) return null;
        
        final route = routes[0];
        final legs = route['legs'] as List;
        
        double totalDistance = 0;
        int totalDuration = 0;
        
        for (final leg in legs) {
          totalDistance += (leg['distance']['value'] as num).toDouble();
          totalDuration += (leg['duration']['value'] as num).toInt();
        }
        
        final polyline = _decodePolyline(route['overview_polyline']['points'] as String);
        
        return RouteResult(
          polyline: polyline,
          distanceMeters: totalDistance,
          durationSeconds: totalDuration,
          summary: route['summary'],
        );
      }
      
      debugPrint('Google Directions API error: ${response.data['status']}');
      return null;
    } catch (e) {
      debugPrint('Route calculation error: $e');
      return null;
    }
  }
  
  Future<String?> reverseGeocode({required double latitude, required double longitude}) async {
    try {
      final url = '${Env.googleGeocodingApi}?latlng=$latitude,$longitude&key=${Env.googleMapsKey}';
      
      final response = await _dio.get(url);
      
      if (response.statusCode == 200 && response.data['status'] == 'OK') {
        final results = response.data['results'] as List;
        if (results.isNotEmpty) {
          return results[0]['formatted_address'] as String;
        }
      }
      return null;
    } catch (e) {
      debugPrint('Reverse geocode error: $e');
      return null;
    }
  }
  
  Future<List<RoutePoint>> geocodeAddress(String address) async {
    try {
      final url = '${Env.googleGeocodingApi}?address=${Uri.encodeComponent(address)}&key=${Env.googleMapsKey}';
      
      final response = await _dio.get(url);
      
      if (response.statusCode == 200 && response.data['status'] == 'OK') {
        final results = response.data['results'] as List;
        return results.map((result) {
          final location = result['geometry']['location'];
          return RoutePoint(
            latitude: location['lat'],
            longitude: location['lng'],
            name: result['formatted_address'],
          );
        }).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Geocode error: $e');
      return [];
    }
  }
  
  List<RoutePoint> _decodePolyline(String encoded) {
    final List<RoutePoint> points = [];
    int index = 0;
    int lat = 0;
    int lng = 0;
    
    while (index < encoded.length) {
      int b;
      int shift = 0;
      int result = 0;
      
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      
      shift = 0;
      result = 0;
      
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      
      points.add(RoutePoint(
        latitude: lat / 1E5,
        longitude: lng / 1E5,
      ));
    }
    
    return points;
  }
}
