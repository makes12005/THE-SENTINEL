import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

/// Top-level GPS task callback — must be here with vm:entry-point.
/// Delegates to GpsService.startCallback (defined in gps_service.dart).
@pragma('vm:entry-point')
void startCallback() {
  // Re-exported from gps_service.dart; kept here as top-level for the isolate
  FlutterForegroundTask.setTaskHandler(_NullHandler());
}

/// Placeholder — the real handler is set by GpsService.start().
/// This ensures the isolate can boot even if start() hasn't been called yet.
class _NullHandler extends TaskHandler {
  @override Future<void> onStart(DateTime t, TaskStarter s) async {}
  @override Future<void> onRepeatEvent(DateTime t) async {}
  @override Future<void> onDestroy(DateTime t) async {}
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Required by flutter_foreground_task v8+: must be called before runApp
  FlutterForegroundTask.initCommunicationPort();

  // Lock to portrait only
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Match dark theme system bars
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor:                   Colors.transparent,
    statusBarIconBrightness:          Brightness.light,
    systemNavigationBarColor:         Color(0xFF101418),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  runApp(const ProviderScope(child: BusAlertApp()));
}

class BusAlertApp extends StatelessWidget {
  const BusAlertApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Bus Alert — Conductor',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      routerConfig: appRouter,
    );
  }
}
