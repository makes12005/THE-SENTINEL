import '../env.dart';

/// All backend API endpoints as constants.
/// Base URL injected via --dart-define (see Env.apiBaseUrl).
class Endpoints {
  Endpoints._();

  // ── Auth ──────────────────────────────────────────────────────────────────
  static String login    = '/api/auth/login';
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
