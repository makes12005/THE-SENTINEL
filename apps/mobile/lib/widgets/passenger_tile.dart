import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../features/passengers/model/passenger.dart';
import '../core/theme/app_colors.dart';
import 'status_chip.dart';

/// Standalone passenger tile — reusable in list views.
class PassengerTile extends StatelessWidget {
  final Passenger passenger;
  final VoidCallback? onTap;

  const PassengerTile({super.key, required this.passenger, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(20),
          border: passenger.isFailed
              ? Border.all(color: AppColors.error.withOpacity(0.3))
              : null,
        ),
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            _Avatar(name: passenger.name),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(passenger.name, style: GoogleFonts.manrope(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  )),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, color: AppColors.outline, size: 14),
                      const SizedBox(width: 4),
                      Text(passenger.stopName, style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
            StatusChip(status: passenger.alertStatus),
          ],
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String name;
  const _Avatar({required this.name});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44, height: 44,
      decoration: const BoxDecoration(
        color: AppColors.surfaceContainerHighest,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: GoogleFonts.manrope(
            color: AppColors.primary, fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
