class LocationQueue {
  static const int maxQueueSize = 20;
  final List<Map<String, dynamic>> _queue = [];
  
  List<Map<String, dynamic>> get queue => List.unmodifiable(_queue);
  int get length => _queue.length;
  bool get isEmpty => _queue.isEmpty;
  bool get isFull => _queue.length >= maxQueueSize;
  
  void add(Map<String, dynamic> location) {
    if (isFull) {
      _queue.removeAt(0);
    }
    _queue.add(location);
  }
  
  List<Map<String, dynamic>> flush() {
    final items = List<Map<String, dynamic>>.from(_queue);
    _queue.clear();
    return items;
  }
}
