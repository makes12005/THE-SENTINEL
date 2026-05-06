class Env {
  Env._();

  // Development defaults. Override with:
  // flutter run --dart-define=API_BASE_URL=https://your-api --dart-define=SOCKET_URL=https://your-api
  static const String apiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3005');

  static const String socketUrl =
      String.fromEnvironment('SOCKET_URL', defaultValue: 'http://10.0.2.2:3005');
}
