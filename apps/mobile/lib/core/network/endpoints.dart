class Endpoints {
  static const String auth = '/api/auth';
  static const String login = '/api/auth/login';
  static const String sendOtp = '/api/auth/send-otp';
  static const String verifyOtp = '/api/auth/verify-otp';
  static const String loginOtp = '/api/auth/login-otp';
  static const String signup = '/api/auth/signup';
  static const String register = '/api/auth/register';
  static const String logout = '/api/auth/logout';
  static const String refresh = '/api/auth/refresh';
  static const String me = '/api/auth/me';
  static const String changePassword = '/api/auth/change-password';
  static const String joinAgency = '/api/auth/join-agency';
  
  static const String trips = '/api/trips';
  static String tripDetail(String tripId) => '/api/trips/$tripId';
  static String tripStart(String tripId) => '/api/trips/$tripId/start';
  static String tripComplete(String tripId) => '/api/trips/$tripId/complete';
  static String tripLocation(String tripId) => '/api/trips/$tripId/location';
  static String tripPassengers(String tripId) => '/api/trips/$tripId/passengers';
  static String tripTakeover(String tripId) => '/api/trips/$tripId/takeover';
  
  static const String geoLibrary = '/api/geo-library';
  
  static const String routes = '/api/routes';
  static String routeDetail(String routeId) => '/api/routes/$routeId';
  static String routeStops(String routeId) => '/api/routes/$routeId/stops';
}
