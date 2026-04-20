import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../features/trips/model/trip.dart';
import 'status_chip.dart';
import '../core/theme/app_colors.dart';

class TripCard extends StatelessWidget {
  final Trip trip;
  final VoidCallback onTap;

  const TripCard({super.key, required this.trip, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isReady  = trip.isScheduled;
    final isActive = trip.isActive;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedScale(
        duration: const Duration(milliseconds: 80),
        scale: 1.0,
        child: Container(
          decoration: BoxDecoration(
            color: isActive ? AppColors.primaryContainer.withOpacity(0.3) : AppColors.surfaceContainerHigh,
            borderRadius: BorderRadius.circular(24),
            border: isActive
                ? Border.all(color: AppColors.primary.withOpacity(0.3), width: 1.5)
                : null,
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header row: route label + status ──────────────────────────
              Row(
                children: [
                  Expanded(
                    child: Text(
                      trip.displayRoute,
                      style: GoogleFonts.manrope(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w700,
                        fontSize: 17,
                      ),
                    ),
                  ),
                  StatusChip(status: trip.status),
                ],
              ),
              const SizedBox(height: 16),

              // ── Route visual (from → to) ────────────────────────────────────
              Row(
                children: [
                  // Dot-line-dot connector
                  Column(
                    children: [
                      Icon(Icons.radio_button_checked, color: AppColors.secondary, size: 14),
                      Container(width: 2, height: 28, color: AppColors.outlineVariant.withOpacity(0.4)),
                      Icon(Icons.location_on, color: AppColors.tertiary, size: 14),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(trip.fromCity, style: GoogleFonts.manrope(
                          color: AppColors.onSurface, fontWeight: FontWeight.w600, fontSize: 15)),
                        const SizedBox(height: 12),
                        Text(trip.toCity, style: GoogleFonts.manrope(
                          color: AppColors.onSurface, fontWeight: FontWeight.w600, fontSize: 15)),
                      ],
                    ),
                  ),
                  // Time + date
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        _formatDate(trip.scheduledDate),
                        style: GoogleFonts.manrope(
                          color: AppColors.onSurface,
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.secondaryContainer,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'TODAY',
                          style: GoogleFonts.inter(
                            color: AppColors.onSecondaryContainer,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(String date) {
    if (date.isEmpty) return '--:--';
    try {
      final dt = DateTime.parse(date);
      final h  = dt.hour.toString().padLeft(2, '0');
      final m  = dt.minute.toString().padLeft(2, '0');
      return '$h:$m';
    } catch (_) { return date; }
  }
}
