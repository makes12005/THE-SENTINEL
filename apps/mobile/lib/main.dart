import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

// Note: startCallback is defined in gps_service.dart with @pragma('vm:entry-point').
// Flutter foreground task stores the function handle directly — no re-declaration needed here.

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = true;

  // Avoid app-start crashes caused by transient Google Fonts fetch failures.
  FlutterError.onError = (FlutterErrorDetails details) {
    final msg = details.exceptionAsString();
    if (msg.contains('google_fonts')) {
      debugPrint('[Fonts] Non-fatal font load error: $msg');
      return;
    }
    FlutterError.presentError(details);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    final msg = error.toString();
    if (msg.contains('google_fonts')) {
      debugPrint('[Fonts] Ignored async font error: $msg');
      return true;
    }
    return false;
  };

  // Required by flutter_foreground_task v8+: must be called before runApp
  FlutterForegroundTask.initCommunicationPort();

  // Lock to portrait only
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Match dark theme system bars
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor:                    Colors.transparent,
    statusBarIconBrightness:           Brightness.light,
    systemNavigationBarColor:          Color(0xFF101418),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  runApp(const ProviderScope(child: BusAlertApp()));
}

class BusAlertApp extends StatelessWidget {
  const BusAlertApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Bus Alert',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      routerConfig: appRouter,
    );
  }
}
