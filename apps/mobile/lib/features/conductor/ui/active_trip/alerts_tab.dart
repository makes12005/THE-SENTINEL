import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:flutter/material.dart';

class AlertsTab extends StatelessWidget {
  final String tripId;

  const AlertsTab({super.key, required this.tripId});

  @override
  Widget build(BuildContext context) {
    final gettingOff = [
      {'seat': 12, 'name': 'Rahul Shah'},
      {'seat': 15, 'name': 'Priya Patel'},
    ];

    final boardingHere = [
      {'seat': 8, 'name': 'Amit Modi'},
      {'seat': 22, 'name': 'Sneha Joshi'},
    ];

    final pendingAlerts = 28;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainer,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Next Stop',
                  style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.location_on, size: 28, color: AppColors.tertiary),
                    const SizedBox(width: 12),
                    Text(
                      'Vadodara',
                      style: AppTextStyles.headlineLarge.copyWith(color: AppColors.tertiary),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.straighten, size: 16, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Text('12.5 km', style: AppTextStyles.labelMedium.copyWith(color: AppColors.primary)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.tertiaryContainer.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Approaching',
                        style: AppTextStyles.labelMedium.copyWith(color: AppColors.onTertiaryContainer),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Getting Off Here',
            style: AppTextStyles.titleMedium.copyWith(color: AppColors.textOnSurface),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(16),
            ),
            child: gettingOff.isEmpty
                ? Text('No passengers dropping here', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary))
                : Column(
                    children: gettingOff.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.error.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('Seat ${p['seat']}', style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.error)),
                          ),
                          const SizedBox(width: 12),
                          Text('${p['name']}', style: AppTextStyles.bodyMedium),
                        ],
                      ),
                    )).toList(),
                  ),
          ),
          const SizedBox(height: 20),
          Text(
            'Boarding Here',
            style: AppTextStyles.titleMedium.copyWith(color: AppColors.textOnSurface),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(16),
            ),
            child: boardingHere.isEmpty
                ? Text('No passengers boarding here', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary))
                : Column(
                    children: boardingHere.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.success.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('Seat ${p['seat']}', style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.success)),
                          ),
                          const SizedBox(width: 12),
                          Text('${p['name']}', style: AppTextStyles.bodyMedium),
                        ],
                      ),
                    )).toList(),
                  ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withOpacity(0.3),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primaryContainer),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Pending Alerts', style: AppTextStyles.titleMedium),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text('$pendingAlerts', style: AppTextStyles.titleMedium.copyWith(color: AppColors.background)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Passengers awaiting notification',
                  style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryContainer,
                      foregroundColor: AppColors.surfaceTint,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.notifications_active, size: 18),
                        const SizedBox(width: 8),
                        Text('SEND ALERTS', style: AppTextStyles.labelLarge),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
