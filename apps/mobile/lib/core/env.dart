class Env {
  Env._();

  // Production URL is the default so the app works on real devices out of the box.
  // For local emulator dev, override via:
  //   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3005 --dart-define=SOCKET_URL=http://10.0.2.2:3005
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api-production-e13f.up.railway.app',
  );

  static const String socketUrl = String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: 'https://api-production-e13f.up.railway.app',
  );

  static const String googleMapsApiKey = String.fromEnvironment(
    'GOOGLE_MAPS_API_KEY',
    defaultValue: '',
  );
}
