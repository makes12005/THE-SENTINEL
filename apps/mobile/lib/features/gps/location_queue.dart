import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Offline queue for GPS location updates.
/// When the network is unavailable, locations are stored in SharedPreferences.
/// On the next successful send, the queue is flushed first.
class LocationQueue {
  static const _key = 'busalert.location_queue';
  static const _maxItems = 20;

  static Future<void> push({
    required String tripId,
    required double lat,
    required double lng,
    required double accuracy,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final raw   = prefs.getString(_key) ?? '[]';
    final list  = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();

    list.add({
      'tripId':    tripId,
      'lat':       lat,
      'lng':       lng,
      'accuracy':  accuracy,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });

    // Cap queue size — drop oldest if too large
    final trimmed = list.length > _maxItems ? list.sublist(list.length - _maxItems) : list;
    await prefs.setString(_key, jsonEncode(trimmed));
  }

  static Future<List<Map<String, dynamic>>> getAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw   = prefs.getString(_key) ?? '[]';
    return (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }

  static Future<bool> isEmpty() async {
    final items = await getAll();
    return items.isEmpty;
  }
}
