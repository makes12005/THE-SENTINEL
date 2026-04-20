import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_colors.dart';

/// Small red pill badge displayed in the top-right of every screen
/// when a driver has taken over a conductor's trip.
///
/// Usage:
///   Stack(
///     children: [
///       YourScreen(),
///       if (isDriverMode) const Positioned(top: 12, right: 16, child: DriverModeBadge()),
///     ],
///   )
class DriverModeBadge extends StatelessWidget {
  const DriverModeBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.18),
        border: Border.all(color: AppColors.error.withOpacity(0.55)),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6, height: 6,
            decoration: BoxDecoration(
              color: AppColors.error,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: AppColors.error.withOpacity(0.6), blurRadius: 6),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Text(
            'DRIVER MODE',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: AppColors.error,
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}
