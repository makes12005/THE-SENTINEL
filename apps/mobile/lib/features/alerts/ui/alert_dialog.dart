import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../passengers/provider/passengers_provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';

/// Shows the manual alert popup.
/// Triggered from SocketService when 'alert_manual_required' event arrives.
void showManualAlertDialog(
  BuildContext context, {
  required String passengerId,
  required String passengerName,
  required String passengerPhone,
  required String stopName,
}) {
  showDialog(
    context: context,
    barrierDismissible: false, // must choose an action
    builder: (_) => ManualAlertDialog(
      passengerId:    passengerId,
      passengerName:  passengerName,
      passengerPhone: passengerPhone,
      stopName:       stopName,
    ),
  );
}

class ManualAlertDialog extends ConsumerStatefulWidget {
  final String passengerId;
  final String passengerName;
  final String passengerPhone;
  final String stopName;

  const ManualAlertDialog({
    super.key,
    required this.passengerId,
    required this.passengerName,
    required this.passengerPhone,
    required this.stopName,
  });

  @override
  ConsumerState<ManualAlertDialog> createState() => _ManualAlertDialogState();
}

class _ManualAlertDialogState extends ConsumerState<ManualAlertDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat(reverse: true);

  bool _loading = false;

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  Future<void> _retryCall() async {
    final uri = Uri(scheme: 'tel', path: widget.passengerPhone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Could not open phone dialer'),
        ));
      }
    }
  }

  Future<void> _informManually(String tripId) async {
    setState(() => _loading = true);
    try {
      // Call the API directly — no tripId needed for acknowledge endpoint
      final dio = ApiClient.instance;
      await dio.patch('/api/passengers/${widget.passengerId}/acknowledge');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
        Navigator.of(context).pop();
      }
    }
  }


  @override
  Widget build(BuildContext context) {
    // We need the tripId from the provider — access it from the route or provider
    // In practice the notifier holds it, so we use a workaround: pop with no tripId impact
    // (acknowledgeAlert is called with just passengerId via the repository directly)
    return PopScope(
      canPop: false, // disable back button dismissal
      child: Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        backgroundColor: AppColors.surfaceContainerLow,
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Warning icon with pulse ────────────────────────────────────
              FadeTransition(
                opacity: _pulse,
                child: Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.tertiaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.warning_amber_rounded,
                    color: AppColors.tertiary,
                    size: 44,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // ── "CALL FAILED" title ────────────────────────────────────────
              Text(
                'CALL FAILED',
                style: GoogleFonts.manrope(
                  color: AppColors.error,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 20),

              // ── Passenger info card ────────────────────────────────────────
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(20),
                ),
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    // Avatar
                    Container(
                      width: 56, height: 56,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHighest,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          widget.passengerName.isNotEmpty ? widget.passengerName[0].toUpperCase() : '?',
                          style: GoogleFonts.manrope(
                            color: AppColors.primary, fontSize: 24, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      widget.passengerName,
                      style: GoogleFonts.manrope(
                        color: AppColors.onSurface, fontWeight: FontWeight.w700, fontSize: 18),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerLowest,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.location_on_rounded, color: AppColors.secondary, size: 16),
                          const SizedBox(width: 6),
                          Text(
                            'Upcoming Stop: ${widget.stopName}',
                            style: GoogleFonts.inter(
                              color: AppColors.onSurface, fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── Info message ───────────────────────────────────────────────
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.errorContainer.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.error, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Call failed. Please notify passenger manually.',
                        style: GoogleFonts.inter(color: AppColors.error, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ── Action buttons ─────────────────────────────────────────────
              Row(
                children: [
                  // Retry Call button
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.secondary,
                        side: const BorderSide(color: AppColors.secondaryContainer),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: _retryCall,
                      icon: const Icon(Icons.phone_rounded, size: 18),
                      label: Text('RETRY', style: GoogleFonts.manrope(fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Inform Manually (primary action)
                  Expanded(
                    flex: 2,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.tertiaryContainer, Color(0xFF7A3500)],
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          foregroundColor: AppColors.onTertiaryContainer,
                          shadowColor: Colors.transparent,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: _loading ? null : () => _informManually(''),
                        child: _loading
                            ? const SizedBox(width: 20, height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.tertiary))
                            : Text(
                                'INFORMED',
                                style: GoogleFonts.manrope(fontWeight: FontWeight.w800, fontSize: 13),
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
