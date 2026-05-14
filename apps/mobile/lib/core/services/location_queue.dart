import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';

class LocationQueue {
  static const String _queueKey = 'location_queue';

  /// Adds a location to the queue. If online, attempts to sync immediately.
  static Future<void> enqueueLocation(Map<String, dynamic> locationData) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> queue = prefs.getStringList(_queueKey) ?? [];
    queue.add(jsonEncode(locationData));
    await prefs.setStringList(_queueKey, queue);

    await syncQueue();
  }

  /// Attempts to send all queued locations to the server.
  static Future<void> syncQueue() async {
    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult == ConnectivityResult.none) {
      debugPrint('No internet connection, keeping locations in queue.');
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    List<String> queue = prefs.getStringList(_queueKey) ?? [];

    if (queue.isEmpty) return;

    List<String> failedQueue = [];

    for (String item in queue) {
      try {
        final data = jsonDecode(item);
        // Assuming there is a batch endpoint or we send one by one
        // Using ApiClient singleton
        await ApiClient().dio.post('/api/locations', data: data);
      } catch (e) {
        debugPrint('Failed to sync location: $e');
        failedQueue.add(item);
      }
    }

    // Keep failed items in the queue
    await prefs.setStringList(_queueKey, failedQueue);
    if (failedQueue.isEmpty) {
      debugPrint('Location queue synced successfully.');
    } else {
      debugPrint('${failedQueue.length} locations remain in queue.');
    }
  }
}
