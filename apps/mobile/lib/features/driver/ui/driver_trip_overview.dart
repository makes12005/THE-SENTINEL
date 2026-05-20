import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class DriverTripOverview extends StatelessWidget {
  final String tripId;

  const DriverTripOverview({super.key, required this.tripId});

  @override
  Widget build(BuildContext context) {
    final tripData = {
      'route': 'Ahmedabad → Una',
      'busNumber': 'GJ01AB1234',
      'departureTime': '06:45 AM',
      'eta': '01:30 PM',
      'conductorName': 'Rajesh Kumar',
      'conductorOnline': false,
      'lastSeen': '2 min ago',
      'passengers': {'total': 40, 'alerted': 12, 'pending': 28},
    };

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => context.pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(tripData['route'] as String, style: AppTextStyles.titleSmall),
            Text(
              tripData['busNumber'] as String,
              style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: AppColors.surfaceContainerLow,
        currentIndex: 0,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondary,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.route), label: 'ROUTE'),
          BottomNavigationBarItem(icon: Icon(Icons.group), label: 'PASSENGERS'),
          BottomNavigationBarItem(icon: Icon(Icons.payments), label: 'REVENUE'),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Active Route',
                    style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(tripData['route'] as String, style: AppTextStyles.headlineMedium),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerHigh,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Departure', style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant)),
                              const SizedBox(height: 4),
                              Text(tripData['departureTime'] as String, style: AppTextStyles.titleMedium),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerHigh,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('ETA Destination', style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant)),
                              const SizedBox(height: 4),
                              Text(tripData['eta'] as String, style: AppTextStyles.titleMedium),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (!(tripData['conductorOnline'] as bool)) ...[
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.tertiaryContainer.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.onTertiaryContainer.withOpacity(0.2)),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: AppColors.onTertiaryContainer.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(Icons.wifi_off, color: AppColors.onTertiaryContainer, size: 28),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Current Status',
                                style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.onTertiaryContainer),
                              ),
                              Text(
                                'Conductor Disconnected',
                                style: AppTextStyles.titleMedium.copyWith(color: AppColors.onTertiaryContainer),
                              ),
                              Text(
                                'Conductor: ${tripData['conductorName']}',
                                style: AppTextStyles.labelMedium.copyWith(color: AppColors.onTertiaryContainer.withOpacity(0.8)),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: AppColors.onTertiaryContainer,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.onTertiaryContainer.withOpacity(0.6),
                                blurRadius: 12,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: () => _handleTakeover(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.onTertiaryContainer,
                          foregroundColor: AppColors.tertiaryContainer,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.assignment_ind, size: 24),
                            const SizedBox(width: 12),
                            Text('TAKE OVER TRIP', style: AppTextStyles.buttonLarge),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.secondaryContainer.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(Icons.people, color: AppColors.secondary, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Conductor Active',
                            style: AppTextStyles.titleMedium,
                          ),
                          Text(
                            'Conductor: ${tripData['conductorName']}',
                            style: AppTextStyles.labelMedium.copyWith(color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.check_circle, color: AppColors.primary),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
          ],
        ),
      ),
    );
  }

  void _handleTakeover(BuildContext context) {
    context.push('/driver/trip/$tripId/takeover');
  }
}
