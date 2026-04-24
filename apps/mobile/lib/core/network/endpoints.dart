import '../env.dart';

/// All backend API endpoints as constants.
/// Base URL injected via --dart-define (see Env.apiBaseUrl).
class Endpoints {
  Endpoints._();

  // ── Auth ──────────────────────────────────────────────────────────────────
  static String sendOtp  = '/api/auth/send-otp';
  static String verifyOtp = '/api/auth/verify-otp';
  static String signup   = '/api/auth/signup';
  static String login    = '/api/auth/login'; // Keeping for backward comp if needed
  static String refresh  = '/api/auth/refresh';
  static String logout   = '/api/auth/logout';

  // ── Trips ─────────────────────────────────────────────────────────────────
  static String trips                          = '/api/trips';
  static String tripById(String id)            => '/api/trips/$id';
  static String startTrip(String id)           => '/api/trips/$id/start';
  static String completeTrip(String id)        => '/api/trips/$id/complete';
  static String tripStatus(String id)          => '/api/trips/$id/status';
  static String postLocation(String tripId)    => '/api/trips/$tripId/location';

  // ── Passengers ────────────────────────────────────────────────────────────
  static String tripPassengers(String tripId)  => '/api/trips/$tripId/passengers';
}
