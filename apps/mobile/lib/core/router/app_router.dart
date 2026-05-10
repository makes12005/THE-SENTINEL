import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/ui/otp_screen.dart';
import '../../features/auth/ui/signup_screen.dart';
import '../../features/auth/ui/welcome_screen.dart';
import '../../features/driver/ui/driver_dashboard_screen.dart';
import '../../features/driver/ui/driver_profile_screen.dart';
import '../../features/driver/ui/driver_trip_overview_screen.dart';
import '../../features/gps/ui/capture_location_screen.dart';
import '../../features/conductor/ui/active_trip_screen.dart';
import '../../features/conductor/ui/boarding_checklist_screen.dart';
import '../../features/passengers/ui/passengers_screen.dart';
import '../../features/trips/ui/dashboard_screen.dart';
import '../../features/trips/ui/trip_detail_screen.dart';
import '../auth/session_notifier.dart';
import '../storage/secure_storage.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

class AppRoutes {
  AppRoutes._();

  static const welcome = '/welcome';
  static const otp = '/otp';
  static const signup = '/signup';

  static const dashboard = '/conductor/dashboard';
  static const tripDetail = '/conductor/trip/:id';
  static const boardingChecklist = '/conductor/boarding/:id';
  static const activeTrip = '/conductor/active/:id';
  static const passengerManifest = '/conductor/passengers/:id';
  static const captureLocation = '/conductor/capture-location';

  static const driverDashboard = '/driver/dashboard';
  static const driverTripDetail = '/driver/trip/:id';
  static const driverProfile = '/driver/profile';
}

String routeForRole(String? role) {
  switch (role) {
    case 'driver':
      return AppRoutes.driverDashboard;
    case 'conductor':
      return AppRoutes.dashboard;
    default:
      return '${AppRoutes.welcome}?error=unsupported_role';
  }
}

final GoRouter appRouter = GoRouter(
  navigatorKey: rootNavigatorKey,
  initialLocation: AppRoutes.welcome,
  debugLogDiagnostics: true,
  refreshListenable: SessionNotifier.instance,
  redirect: (BuildContext context, GoRouterState state) async {
    bool hasSession = false;
    try {
      hasSession = await SecureStorage.hasValidSession();
    } catch (e) {
      debugPrint('[Router] SecureStorage.hasValidSession failed: $e');
      hasSession = false;
    }

    final isLoggingIn = state.matchedLocation == AppRoutes.welcome ||
        state.matchedLocation == AppRoutes.otp ||
        state.matchedLocation == AppRoutes.signup;

    if (!hasSession && !isLoggingIn) {
      return AppRoutes.welcome;
    }

    if (hasSession && isLoggingIn) {
      try {
        final role = await SecureStorage.getRole();
        return routeForRole(role);
      } catch (e) {
        debugPrint('[Router] SecureStorage.getRole failed: $e');
        return AppRoutes.welcome;
      }
    }

    String? role;
    if (hasSession) {
      try {
        role = await SecureStorage.getRole();
      } catch (e) {
        debugPrint('[Router] SecureStorage.getRole failed: $e');
      }
    }

    if (hasSession && role != 'driver' && role != 'conductor') {
      return AppRoutes.welcome;
    }

    final isDriverRoute = state.matchedLocation.startsWith('/driver');
    if (hasSession && isDriverRoute && role != 'driver') {
      return routeForRole(role);
    }

    final isConductorRoute = state.matchedLocation.startsWith('/conductor');
    final isDriverMode = state.uri.queryParameters['driverMode'] == 'true' ||
        state.extra == true;
    if (hasSession && isConductorRoute && role == 'driver' && !isDriverMode) {
      return routeForRole(role);
    }

    return null;
  },
  routes: [
    GoRoute(
      path: AppRoutes.welcome,
      name: 'welcome',
      builder: (context, state) => WelcomeScreen(
        initialError: state.uri.queryParameters['error'],
      ),
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
    GoRoute(
      path: AppRoutes.dashboard,
      name: 'dashboard',
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      redirect: (_, __) => AppRoutes.dashboard,
    ),
    GoRoute(
      path: AppRoutes.tripDetail,
      name: 'tripDetail',
      builder: (context, state) {
        final tripId = state.pathParameters['id']!;
        final isDriverMode =
            state.uri.queryParameters['driverMode'] == 'true' ||
                state.extra == true;
        return TripDetailScreen(
          tripId: tripId,
          isDriverMode: isDriverMode,
        );
      },
    ),
    GoRoute(
      path: '/trips/:tripId',
      redirect: (_, state) =>
          '/conductor/trip/${state.pathParameters['tripId']}',
    ),
    GoRoute(
      path: AppRoutes.boardingChecklist,
      name: 'boardingChecklist',
      builder: (context, state) {
        final tripId = state.pathParameters['id']!;
        return BoardingChecklistScreen(tripId: tripId);
      },
    ),
    GoRoute(
      path: AppRoutes.activeTrip,
      name: 'activeTrip',
      builder: (context, state) {
        final tripId = state.pathParameters['id']!;
        final isDriverMode =
            state.uri.queryParameters['driverMode'] == 'true' ||
                state.extra == true;
        return ActiveTripScreen(
          tripId: tripId,
          isDriverMode: isDriverMode,
        );
      },
    ),
    GoRoute(
      path: AppRoutes.passengerManifest,
      name: 'passengerManifest',
      builder: (context, state) {
        final tripId = state.pathParameters['id']!;
        final isDriverMode =
            state.uri.queryParameters['driverMode'] == 'true' ||
                state.extra == true;
        return PassengersScreen(
          tripId: tripId,
          isDriverMode: isDriverMode,
        );
      },
    ),
    GoRoute(
      path: '/trips/:tripId/passengers',
      redirect: (_, state) =>
          '/conductor/active/${state.pathParameters['tripId']}',
    ),
    GoRoute(
      path: AppRoutes.captureLocation,
      name: 'captureLocation',
      builder: (context, state) => const CaptureLocationScreen(),
    ),
    GoRoute(
      path: AppRoutes.driverDashboard,
      name: 'driverDashboard',
      builder: (context, state) => const DriverDashboardScreen(),
    ),
    GoRoute(
      path: '/driver',
      redirect: (_, __) => AppRoutes.driverDashboard,
    ),
    GoRoute(
      path: AppRoutes.driverTripDetail,
      name: 'driverTripDetail',
      builder: (context, state) {
        final tripId = state.pathParameters['id']!;
        return DriverTripOverviewScreen(tripId: tripId);
      },
    ),
    GoRoute(
      path: AppRoutes.driverProfile,
      name: 'driverProfile',
      builder: (context, state) => const DriverProfileScreen(),
    ),
  ],
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
