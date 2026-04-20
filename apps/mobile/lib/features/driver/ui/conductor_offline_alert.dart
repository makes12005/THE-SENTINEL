import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';

/// Full-screen emergency overlay shown when Socket.IO fires `conductor_offline`.
/// Based on docs/ui/screen/driver/3.html
///
/// - Cannot be dismissed by back button (barrierDismissible: false)
/// - "TAKE OVER TRIP" primary CTA
/// - "DISMISS" secondary button
/// - Shows last sync, latency, unit telemetry
class ConductorOfflineAlert extends StatefulWidget {
  final String tripId;
  final VoidCallback onTakeOver;
  final VoidCallback onDismiss;

  const ConductorOfflineAlert({
    super.key,
    required this.tripId,
    required this.onTakeOver,
    required this.onDismiss,
  });

  @override
  State<ConductorOfflineAlert> createState() => _ConductorOfflineAlertState();
}

class _ConductorOfflineAlertState extends State<ConductorOfflineAlert>
    with TickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();

    // Vibrate device for urgency
    HapticFeedback.vibrate();

    _pulseCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat(reverse: true);

    _fadeCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 400));
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnim,
      child: Dialog.fullscreen(
        backgroundColor: AppColors.background,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // ── Radial orange glow background ─────────────────────
            Positioned.fill(
              child: AnimatedBuilder(
                animation: _pulseCtrl,
                builder: (_, __) => Container(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      center: Alignment.center,
                      radius: 0.9,
                      colors: [
                        const Color(0xFFff7a00).withOpacity(0.08 + _pulseCtrl.value * 0.06),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // ── Top App Bar ────────────────────────────────────────
            Positioned(
              top: 0, left: 0, right: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded,
                          color: AppColors.tertiary, size: 26),
                      const SizedBox(width: 10),
                      Text('EMERGENCY OVERRIDE',
                          style: GoogleFonts.manrope(
                            color: AppColors.tertiary,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          )),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerHigh,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text('SYSTEM CRITICAL',
                            style: GoogleFonts.inter(
                              color: AppColors.onSurface,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.2,
                            )),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // ── Centre content ────────────────────────────────────
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 80, 24, 24),
                child: Column(
                  children: [
                    // ── Pulsing wifi_off icon ─────────────────────
                    AnimatedBuilder(
                      animation: _pulseCtrl,
                      builder: (_, __) => Container(
                        width: 140, height: 140,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.tertiaryContainer,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.tertiary.withOpacity(0.1 + _pulseCtrl.value * 0.2),
                              blurRadius: 40 + _pulseCtrl.value * 30,
                              spreadRadius: 10,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.wifi_off_rounded,
                          color: AppColors.tertiary,
                          size: 72,
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // ── Title ─────────────────────────────────────
                    Text(
                      'GPS FAILURE',
                      style: GoogleFonts.manrope(
                        color: const Color(0xFFff7a00),
                        fontSize: 42,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -1,
                      ),
                    ),
                    Container(
                      width: 60, height: 4,
                      margin: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFff7a00),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    Text(
                      'Immediate action required.\nConductor unit has lost connection.',
                      style: GoogleFonts.inter(
                        color: AppColors.onSurface,
                        fontSize: 17,
                        height: 1.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 40),

                    // ── Primary CTA ───────────────────────────────
                    SizedBox(
                      width: double.infinity,
                      height: 72,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFff7a00),
                          foregroundColor: AppColors.background,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                          elevation: 8,
                          shadowColor: const Color(0xFFff7a00).withOpacity(0.4),
                        ),
                        onPressed: widget.onTakeOver,
                        icon: const Icon(Icons.navigation_rounded, size: 28),
                        label: Text('TAKE OVER TRIP',
                            style: GoogleFonts.manrope(
                              fontWeight: FontWeight.w900,
                              fontSize: 20,
                              letterSpacing: 2,
                            )),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // ── Secondary row ─────────────────────────────
                    Row(
                      children: [
                        Expanded(
                          child: _SecondaryButton(
                            label: 'RETRY',
                            icon: Icons.refresh_rounded,
                            onTap: () {
                              HapticFeedback.lightImpact();
                              // no-op: socket will retry automatically
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _SecondaryButton(
                            label: 'DISMISS',
                            icon: Icons.close_rounded,
                            onTap: widget.onDismiss,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 40),

                    // ── Telemetry row ─────────────────────────────
                    _TelemetryRow(tripId: widget.tripId),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SecondaryButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _SecondaryButton({required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.outlineVariant),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: AppColors.onSurface, size: 18),
            const SizedBox(width: 8),
            Text(label,
                style: GoogleFonts.inter(
                  color: AppColors.onSurface,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                )),
          ],
        ),
      ),
    );
  }
}

class _TelemetryRow extends StatelessWidget {
  final String tripId;
  const _TelemetryRow({required this.tripId});

  @override
  Widget build(BuildContext context) {
    final now = TimeOfDay.now();
    final timeStr =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    return Row(
      children: [
        Expanded(
          child: _TelemetryCell(
            label: 'LAST SYNC',
            value: timeStr,
            highlight: true,
          ),
        ),
        const SizedBox(width: 8),
        const Expanded(
          child: _TelemetryCell(label: 'LATENCY', value: 'TIMEOUT'),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _TelemetryCell(
            label: 'TRIP ID',
            value: tripId.substring(0, 6).toUpperCase(),
          ),
        ),
      ],
    );
  }
}

class _TelemetryCell extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;

  const _TelemetryCell({required this.label, required this.value, this.highlight = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        border: highlight
            ? Border(left: BorderSide(color: AppColors.tertiary, width: 3))
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: GoogleFonts.inter(
                color: AppColors.onSurfaceVariant,
                fontSize: 9,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              )),
          const SizedBox(height: 4),
          Text(value,
              style: GoogleFonts.manrope(
                color: AppColors.onSurface,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              )),
        ],
      ),
    );
  }
}
