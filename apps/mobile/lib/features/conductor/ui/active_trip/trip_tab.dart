import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class TripTab extends StatelessWidget {
  final String tripId;

  const TripTab({super.key, required this.tripId});

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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Current Speed',
                      style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.success.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Container(width: 6, height: 6, decoration: BoxDecoration(color: AppColors.success, shape: BoxShape.circle)),
                          const SizedBox(width: 6),
                          Text('GPS Active', style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.success)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  '45',
                  style: AppTextStyles.displayMedium.copyWith(
                    fontSize: 64,
                    color: AppColors.textOnSurface,
                  ),
                ),
                Text('km/h', style: AppTextStyles.titleMedium.copyWith(color: AppColors.textSecondary)),
              ],
            ),
          ),
          const SizedBox(height: 16),
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
                Text(
                  'Vadodara',
                  style: AppTextStyles.headlineLarge.copyWith(color: AppColors.tertiary),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.straighten, size: 18, color: AppColors.textSecondary),
                    const SizedBox(width: 8),
                    Text('12.5 km away', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
                    const SizedBox(width: 16),
                    Icon(Icons.schedule, size: 18, color: AppColors.textSecondary),
                    const SizedBox(width: 8),
                    Text('~18 min', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
                  ],
                ),
                const SizedBox(height: 16),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: 0.35,
                    backgroundColor: AppColors.surfaceContainerHigh,
                    color: AppColors.primary,
                    minHeight: 8,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.error.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(color: AppColors.error, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Getting Off',
                            style: AppTextStyles.labelMedium.copyWith(color: AppColors.error),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (gettingOff.isEmpty)
                        Text(
                          'None',
                          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                        )
                      else
                        ...gettingOff.map((p) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            'Seat ${p['seat']} — ${p['name']}',
                            style: AppTextStyles.bodyMedium,
                          ),
                        )),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.success.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Boarding Here',
                            style: AppTextStyles.labelMedium.copyWith(color: AppColors.success),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (boardingHere.isEmpty)
                        Text(
                          'None',
                          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                        )
                      else
                        ...boardingHere.map((p) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            'Seat ${p['seat']} — ${p['name']}',
                            style: AppTextStyles.bodyMedium,
                          ),
                        )),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: OutlinedButton(
              onPressed: () => context.go('/conductor'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: BorderSide(color: AppColors.error, width: 2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.stop_circle_outlined, size: 20),
                  const SizedBox(width: 8),
                  Text('END TRIP', style: AppTextStyles.buttonLarge),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
