import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_colors.dart';

/// Alert status chip — pending (amber), sent (green), failed (red)
/// Trip status chip — scheduled (amber), active (green), completed (grey)
class StatusChip extends StatelessWidget {
  final String status;
  const StatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final cfg = _config(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: cfg.$2,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (cfg.$3) // pulse dot for active/pending
            _PulseDot(color: cfg.$1),
          if (cfg.$3) const SizedBox(width: 6),
          Text(
            status.toUpperCase(),
            style: GoogleFonts.inter(
              color: cfg.$1,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  /// Returns (textColor, bgColor, showPulseDot)
  (Color, Color, bool) _config(String s) {
    switch (s.toLowerCase()) {
      case 'active':
        return (AppColors.primary, AppColors.primaryContainer, true);
      case 'scheduled':
      case 'ready':
        return (AppColors.tertiary, AppColors.tertiaryContainer, true);
      case 'sent':
        return (AppColors.success, AppColors.successContainer, false);
      case 'failed':
        return (AppColors.error, AppColors.errorContainer, false);
      case 'pending':
        return (AppColors.tertiary, AppColors.tertiaryContainer, true);
      case 'completed':
        return (AppColors.onSurfaceVariant, AppColors.surfaceContainerHighest, false);
      default:
        return (AppColors.onSurfaceVariant, AppColors.surfaceContainerHigh, false);
    }
  }
}

class _PulseDot extends StatefulWidget {
  final Color color;
  const _PulseDot({required this.color});
  @override
  State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat(reverse: true);

  @override
  void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _c,
      child: Container(width: 7, height: 7, decoration: BoxDecoration(shape: BoxShape.circle, color: widget.color)),
    );
  }
}
