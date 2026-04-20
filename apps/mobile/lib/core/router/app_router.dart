import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/ui/login_screen.dart';
import '../../features/trips/ui/dashboard_screen.dart';
import '../../features/trips/ui/trip_detail_screen.dart';
import '../../features/passengers/ui/passengers_screen.dart';
import '../../features/driver/ui/driver_dashboard_screen.dart';
import '../../features/driver/ui/driver_trip_overview_screen.dart';
import '../storage/secure_storage.dart';

/// All named route constants
class AppRoutes {
  AppRoutes._();
  // ── Conductor ──────────────────────────────────────────────
  static const login      = '/login';
  static const dashboard  = '/dashboard';
  static const tripDetail = '/trips/:tripId';
  static const passengers = '/trips/:tripId/passengers';
  // ── Driver ────────────────────────────────────────────────
  static const driverDashboard  = '/driver';
  static const driverTripDetail = '/driver/trips/:tripId';
}

/// go_router configuration with role-based auth redirect guard.
/// - No session             → /login
/// - conductor session      → /dashboard
/// - driver session         → /driver
final GoRouter appRouter = GoRouter(
  initialLocation: AppRoutes.login,
  debugLogDiagnostics: true,

  redirect: (BuildContext context, GoRouterState state) async {
    final hasSession = await SecureStorage.hasValidSession();
    final isLoggingIn = state.matchedLocation == AppRoutes.login;

    if (!hasSession && !isLoggingIn) return AppRoutes.login;

    if (hasSession && isLoggingIn) {
      // Route to the correct dashboard based on role
      final role = await SecureStorage.getRole();
      return role == 'driver' ? AppRoutes.driverDashboard : AppRoutes.dashboard;
    }

    // Prevent conductors from accessing driver routes and vice versa
    final isDriverRoute = state.matchedLocation.startsWith('/driver');
    if (hasSession && isDriverRoute) {
      final role = await SecureStorage.getRole();
      if (role == 'conductor') return AppRoutes.dashboard;
    }

    return null; // no redirect needed
  },

  routes: [
    // ── Auth ────────────────────────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.login,
      name: 'login',
      builder: (context, state) => const LoginScreen(),
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
