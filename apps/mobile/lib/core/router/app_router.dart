import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/ui/welcome_screen.dart';
import '../../features/auth/ui/otp_screen.dart';
import '../../features/auth/ui/signup_screen.dart';
import '../../features/trips/ui/dashboard_screen.dart';
import '../../features/trips/ui/trip_detail_screen.dart';
import '../../features/passengers/ui/passengers_screen.dart';
import '../../features/driver/ui/driver_dashboard_screen.dart';
import '../../features/driver/ui/driver_trip_overview_screen.dart';
import '../auth/session_notifier.dart';
import '../storage/secure_storage.dart';

/// All named route constants
class AppRoutes {
  AppRoutes._();
  // ── Auth ────────────────────────────────────────────────────
  static const welcome    = '/welcome';
  static const otp        = '/otp';
  static const signup     = '/signup';

  // ── Conductor ──────────────────────────────────────────────
  static const dashboard  = '/dashboard';
  static const tripDetail = '/trips/:tripId';
  static const passengers = '/trips/:tripId/passengers';

  // ── Driver ────────────────────────────────────────────────
  static const driverDashboard  = '/driver';
  static const driverTripDetail = '/driver/trips/:tripId';
}

String routeForRole(String? role) {
  switch (role) {
    case 'driver':
      return AppRoutes.driverDashboard;
    case 'conductor':
    case 'passenger':
      return AppRoutes.dashboard;
    default:
      return AppRoutes.welcome;
  }
}

/// go_router configuration with role-based auth redirect guard.
/// - No session             → /welcome
/// - conductor session      → /dashboard
/// - driver session         → /driver
final GoRouter appRouter = GoRouter(
  initialLocation: AppRoutes.welcome,
  debugLogDiagnostics: true,
  // Re-evaluate redirect guard whenever the session is forcibly invalidated
  // (e.g., refresh token expired in TokenInterceptor → _forceLogout).
  refreshListenable: SessionNotifier.instance,

  redirect: (BuildContext context, GoRouterState state) async {
    final hasSession = await SecureStorage.hasValidSession();
    final isLoggingIn = state.matchedLocation == AppRoutes.welcome || 
                        state.matchedLocation == AppRoutes.otp || 
                        state.matchedLocation == AppRoutes.signup;

    if (!hasSession && !isLoggingIn) return AppRoutes.welcome;

    if (hasSession && isLoggingIn) {
      // Route to the correct dashboard based on role
      final role = await SecureStorage.getRole();
      return routeForRole(role);
    }

    final role = hasSession ? await SecureStorage.getRole() : null;
    final isDriverRoute = state.matchedLocation.startsWith('/driver');
    if (hasSession && isDriverRoute && role != 'driver') {
      return routeForRole(role);
    }

    final isConductorRoute = state.matchedLocation == AppRoutes.dashboard ||
        state.matchedLocation.startsWith('/trips/');
    if (hasSession && isConductorRoute && role == 'driver') {
      return routeForRole(role);
    }

    return null; // no redirect needed
  },

  routes: [
    // ── Auth ────────────────────────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.welcome,
      name: 'welcome',
      builder: (context, state) => const WelcomeScreen(),
    ),
    GoRoute(
      path: AppRoutes.otp,
      name: 'otp',
      builder: (context, state) => const OtpScreen(),
    ),
    GoRoute(
      path: AppRoutes.signup,
      name: 'signup',
      builder: (context, state) => const SignupScreen(),
    ),

    // ── Conductor ────────────────────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.dashboard,
      name: 'dashboard',
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: AppRoutes.tripDetail,
      name: 'tripDetail',
      builder: (context, state) {
        final tripId = state.pathParameters['tripId']!;
        return TripDetailScreen(tripId: tripId);
      },
    ),
    GoRoute(
      path: AppRoutes.passengers,
      name: 'passengers',
      builder: (context, state) {
        final tripId = state.pathParameters['tripId']!;
        return PassengersScreen(tripId: tripId);
      },
    ),

    // ── Driver ───────────────────────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.driverDashboard,
      name: 'driverDashboard',
      builder: (context, state) => const DriverDashboardScreen(),
    ),
    GoRoute(
      path: AppRoutes.driverTripDetail,
      name: 'driverTripDetail',
      builder: (context, state) {
        final tripId = state.pathParameters['tripId']!;
        return DriverTripOverviewScreen(tripId: tripId);
      },
    ),
  ],

  // Global error page
  errorBuilder: (context, state) => Scaffold(
    backgroundColor: const Color(0xFF101418),
    body: Center(
      child: Text(
        'Page not found: ${state.error}',
        style: const TextStyle(color: Color(0xFFe0e2e8)),
      ),
    ),
  ),
);
