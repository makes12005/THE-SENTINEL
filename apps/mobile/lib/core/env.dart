/// Runtime environment configuration.
/// API_BASE_URL is injected at build time via --dart-define.
///
/// Run command:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
///   (10.0.2.2 is the Android emulator alias for localhost)
///
/// For production build (APK):
///   flutter build apk --release --dart-define=API_BASE_URL=https://bus-alert-api.railway.app
///
/// For device on same network:
///   flutter run --dart-define=API_BASE_URL=http://192.168.x.x:3000
class Env {
  Env._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000', // emulator localhost
  );
}
