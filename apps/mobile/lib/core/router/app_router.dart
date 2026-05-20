import 'package:bus_alert/features/auth/provider/auth_provider.dart';
import 'package:bus_alert/features/auth/ui/forgot_password_screen.dart';
import 'package:bus_alert/features/auth/ui/invite_code_screen.dart';
import 'package:bus_alert/features/auth/ui/login_screen.dart';
import 'package:bus_alert/features/auth/ui/otp_screen.dart';
import 'package:bus_alert/features/auth/ui/signup_screen.dart';
import 'package:bus_alert/features/auth/ui/welcome_screen.dart';
import 'package:bus_alert/features/conductor/ui/active_trip/active_trip_shell.dart';
import 'package:bus_alert/features/conductor/ui/boarding_checklist_screen.dart';
import 'package:bus_alert/features/conductor/ui/conductor_dashboard.dart';
import 'package:bus_alert/features/conductor/ui/trip_detail_screen.dart';
import 'package:bus_alert/features/driver/ui/driver_dashboard.dart';
import 'package:bus_alert/features/driver/ui/driver_trip_overview.dart';
import 'package:bus_alert/features/gps/ui/capture_location_screen.dart';
import 'package:bus_alert/features/profile/ui/profile_screen.dart';
import 'package:bus_alert/features/route/ui/route_creation_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  
  return GoRouter(
    initialLocation: '/welcome',
    debugLogDiagnostics: true,
    refreshListenable: _GoRouterRefreshNotifier(ref),
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final isAuthenticated = auth.isAuthenticated;
      final user = auth.user;
      final isNewUser = auth.isNewUser;
      final tempToken = auth.tempToken;
      
      final isAuthRoute = state.matchedLocation.startsWith('/login') ||
          state.matchedLocation.startsWith('/signup') ||
          state.matchedLocation.startsWith('/otp') ||
          state.matchedLocation.startsWith('/invite-code') ||
          state.matchedLocation.startsWith('/forgot-password') ||
          state.matchedLocation == '/welcome';
      
      if (isNewUser && tempToken != null && !state.matchedLocation.startsWith('/signup')) {
        return '/signup';
      }
      
      if (isAuthenticated) {
        if (isAuthRoute) {
          if (user?.isConductor ?? false) {
            return '/conductor';
          } else if (user?.isDriver ?? false) {
            return '/driver';
          }
        }
        
        if (state.matchedLocation.startsWith('/conductor') && user?.isConductor != true) {
          return '/driver';
        }
        
        if (state.matchedLocation.startsWith('/driver') && user?.isDriver != true) {
          return '/conductor';
        }
        
        return null;
      }
      
      if (!isAuthenticated && !isAuthRoute) {
        return '/welcome';
      }
      
      return null;
    },
    routes: [
      GoRoute(
        path: '/welcome',
        name: 'welcome',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        name: 'signup',
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: '/otp',
        name: 'otp',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return OtpScreen(
            contact: extra?['contact'] ?? '',
            isLoginFlow: extra?['isLoginFlow'] ?? false,
          );
        },
      ),
      GoRoute(
        path: '/invite-code',
        name: 'invite-code',
        builder: (context, state) => const InviteCodeScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        name: 'forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      
      GoRoute(
        path: '/conductor',
        name: 'conductor-dashboard',
        builder: (context, state) => const ConductorDashboard(),
      ),
      GoRoute(
        path: '/conductor/trip/:id',
        name: 'conductor-trip-detail',
        builder: (context, state) {
          final tripId = state.pathParameters['id']!;
          return TripDetailScreen(tripId: tripId);
        },
      ),
      GoRoute(
        path: '/conductor/boarding/:id',
        name: 'conductor-boarding',
        builder: (context, state) {
          final tripId = state.pathParameters['id']!;
          return BoardingChecklistScreen(tripId: tripId);
        },
      ),
      GoRoute(
        path: '/conductor/active/:id',
        name: 'conductor-active-trip',
        builder: (context, state) {
          final tripId = state.pathParameters['id']!;
          return ActiveTripShell(tripId: tripId);
        },
      ),
      
      GoRoute(
        path: '/driver',
        name: 'driver-dashboard',
        builder: (context, state) => const DriverDashboard(),
      ),
      GoRoute(
        path: '/driver/trip/:id',
        name: 'driver-trip-overview',
        builder: (context, state) {
          final tripId = state.pathParameters['id']!;
          return DriverTripOverview(tripId: tripId);
        },
      ),
      
      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/capture-location',
        name: 'capture-location',
        builder: (context, state) => const CaptureLocationScreen(),
      ),
      GoRoute(
        path: '/create-route',
        name: 'create-route',
        builder: (context, state) => const RouteCreationScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      body: Center(
        child: Text(
          'Page not found',
          style: TextStyle(color: Colors.white),
        ),
      ),
    ),
  );
});

class _GoRouterRefreshNotifier extends ChangeNotifier {
  _GoRouterRefreshNotifier(this.ref) {
    ref.listen<AuthState>(authProvider, (_, __) {
      notifyListeners();
    });
  }
  
  final Ref ref;
}
