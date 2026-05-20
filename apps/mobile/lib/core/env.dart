class Env {
  static const String apiBaseUrl = 'https://api-production-e13f.up.railway.app';
  static const String socketUrl = 'https://api-production-e13f.up.railway.app';
  
  // Google Maps API Key - used for Route Creation (accurate routing)
  static const String googleMapsKey = String.fromEnvironment(
    'GOOGLE_MAPS_API_KEY',
    defaultValue: 'AIzaSyDIyF8EOz9HgEaPmP2YJPgRALe7IF1gOAQ',
  );
  
  // Google Maps API endpoints
  static const String googleDirectionsApi = 'https://maps.googleapis.com/maps/api/directions/json';
  static const String googleGeocodingApi = 'https://maps.googleapis.com/maps/api/geocode/json';
  
  // Timeouts
  static const int connectTimeoutMs = 15000;
  static const int receiveTimeoutMs = 30000;
  static const int gpsUpdateIntervalSeconds = 10;
}
