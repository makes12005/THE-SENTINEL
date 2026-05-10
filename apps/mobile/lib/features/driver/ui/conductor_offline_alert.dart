import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_colors.dart';

class ConductorOfflineAlert extends StatefulWidget {
  const ConductorOfflineAlert({
    super.key,
    required this.tripId,
    required this.tripName,
    required this.onTakeOver,
    required this.onDismiss,
  });

  final String tripId;
  final String tripName;
  final VoidCallback onTakeOver;
  final VoidCallback onDismiss;

  @override
  State<ConductorOfflineAlert> createState() => _ConductorOfflineAlertState();
}

class _ConductorOfflineAlertState extends State<ConductorOfflineAlert>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat(reverse: true);

  @override
  void initState() {
    super.initState();
    HapticFeedback.vibrate();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.78),
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: AppColors.error.withValues(alpha: 0.45),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.errorContainer,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.error.withValues(
                                alpha: 0.18 + (_pulseController.value * 0.28),
                              ),
                              blurRadius: 18 + (_pulseController.value * 16),
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.warning_rounded,
                          color: AppColors.error,
                          size: 52,
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Conductor Offline',
                    style: GoogleFonts.manrope(
                      color: AppColors.onSurface,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Conductor has been offline for 2+ minutes',
                    style: GoogleFonts.inter(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 15,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.tripName,
                    style: GoogleFonts.inter(
                      color: AppColors.primary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      onPressed: widget.onTakeOver,
                      child: const Text('TAKE OVER TRIP'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.onSurface,
                        side: const BorderSide(color: AppColors.outlineVariant),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      onPressed: widget.onDismiss,
                      child: const Text('DISMISS'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
