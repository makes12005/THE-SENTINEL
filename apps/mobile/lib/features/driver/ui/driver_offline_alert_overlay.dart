import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/router/app_router.dart';
import 'conductor_offline_alert.dart';

class DriverOfflineAlertOverlay {
  DriverOfflineAlertOverlay._();

  static OverlayEntry? _entry;

  static bool get isShowing => _entry != null;

  static void show({
    required String tripId,
    required String tripName,
    required VoidCallback onTakeOver,
    required VoidCallback onDismiss,
  }) {
    if (_entry != null) return;

    final context = rootNavigatorKey.currentContext;
    if (context == null) return;

    final overlay = Overlay.of(context, rootOverlay: true);
    HapticFeedback.heavyImpact();

    _entry = OverlayEntry(
      builder: (_) => ConductorOfflineAlert(
        tripId: tripId,
        tripName: tripName,
        onTakeOver: () {
          hide();
          onTakeOver();
        },
        onDismiss: () {
          hide();
          onDismiss();
        },
      ),
    );

    overlay.insert(_entry!);
  }

  static void hide() {
    _entry?.remove();
    _entry = null;
  }
}

class DriverModeAppBarBadge extends StatelessWidget {
  const DriverModeAppBarBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.red,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        'DRIVER MODE',
        style: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
