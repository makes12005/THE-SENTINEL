import 'package:go_router/go_router.dart';

import '../storage/secure_storage.dart';

import '../../features/auth/ui/welcome_screen.dart';
import '../../features/auth/ui/login_screen.dart';
import '../../features/auth/ui/signup_screen.dart';
import '../../features/auth/ui/otp_screen.dart';
import '../../features/auth/ui/profile_setup_screen.dart';
import '../../features/auth/ui/forgot_password_screen.dart';

import '../../features/conductor/ui/conductor_dashboard.dart';
import '../../features/conductor/ui/trip_detail_screen.dart';
import '../../features/conductor/ui/boarding_checklist_screen.dart';
import '../../features/conductor/ui/active_trip/active_trip_shell.dart';
import '../../features/conductor/ui/call_failure_screen.dart';

import '../../features/driver/ui/driver_dashboard.dart';
import '../../features/driver/ui/driver_trip_overview.dart';
import '../../features/driver/ui/takeover_alert_screen.dart';

import '../../features/profile/ui/profile_screen.dart';
import '../../features/location/ui/capture_location_screen.dart';

class AppRouter {
  static final router = GoRouter(
    initialLocation: '/welcome',
    redirect: (context, state) async {
      final token = await SecureStorage.getToken();
      final role = await SecureStorage.getUserRole();
      final isAuthRoute = state.matchedLocation.startsWith('/welcome') || 
                          state.matchedLocation.startsWith('/login') || 
                          state.matchedLocation.startsWith('/signup') || 
                          state.matchedLocation.startsWith('/otp') || 
                          state.matchedLocation.startsWith('/invite-code') || 
                          state.matchedLocation.startsWith('/forgot-password');

      if (token == null && !isAuthRoute) return '/welcome';
      
      if (token != null && isAuthRoute) {
        if (role == 'conductor') return '/conductor';
        if (role == 'driver') return '/driver';
        return '/welcome';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/welcome', builder: (context, state) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (context, state) => const SignupScreen()),
      GoRoute(
        path: '/otp', 
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return OtpScreen(
            contact: extra['contact'] ?? '',
            isSignup: extra['isSignup'] ?? false,
          );
        }
      ),
      GoRoute(path: '/invite-code', builder: (context, state) => const ProfileSetupScreen()),
      GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordScreen()),
      
      GoRoute(path: '/conductor', builder: (context, state) => const ConductorDashboard()),
      GoRoute(path: '/conductor/trip/:id', builder: (context, state) => TripDetailScreen(tripId: state.pathParameters['id']!)),
      GoRoute(path: '/conductor/boarding/:id', builder: (context, state) => BoardingChecklistScreen(tripId: state.pathParameters['id']!)),
      GoRoute(path: '/conductor/active/:id', builder: (context, state) => ActiveTripShell(tripId: state.pathParameters['id']!)),
      GoRoute(
        path: '/conductor/call-failure',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return CallFailureScreen(
            tripId: extra['tripId'] ?? '',
            passengerId: extra['passengerId'] ?? '',
            passengerSeat: extra['passengerSeat'] ?? 'Seat 12',
            upcomingStop: extra['upcomingStop'] ?? 'Una',
          );
        },
      ),
      
      GoRoute(path: '/driver', builder: (context, state) => const DriverDashboard()),
      GoRoute(path: '/driver/trip/:id', builder: (context, state) => DriverTripOverview(tripId: state.pathParameters['id']!)),
      GoRoute(path: '/driver/takeover/:id', builder: (context, state) => TakeoverAlertScreen(tripId: state.pathParameters['id']!)),
      
      GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
      GoRoute(path: '/capture-location', builder: (context, state) => const CaptureLocationScreen()),
    ],
  );
}
