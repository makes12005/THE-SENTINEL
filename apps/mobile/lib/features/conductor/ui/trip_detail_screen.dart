import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class TripDetailScreen extends StatefulWidget {
  final String tripId;

  const TripDetailScreen({super.key, required this.tripId});

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> {
  final Map<String, dynamic> _trip = {
    'id': '1',
    'busNumber': 'GJ01AB1234',
    'origin': 'Ahmedabad',
    'destination': 'Una',
    'departureTime': '10:00 PM',
    'status': 'ready',
    'stops': ['Ahmedabad', 'Vadodara', 'Bharuch', 'Surat', 'Una'],
    'conductor': 'You',
    'driver': 'Rajesh Kumar',
    'passengerCount': 40,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => context.pop(),
        ),
        title: Text('Trip Details', style: AppTextStyles.titleMedium),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Current Status',
                      style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: AppColors.tertiary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _trip['status'].toString().toUpperCase(),
                          style: AppTextStyles.headlineSmall.copyWith(color: AppColors.tertiary),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Bus Number',
                      style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                    ),
                    Text(
                      _trip['busNumber'],
                      style: AppTextStyles.titleMedium.copyWith(color: AppColors.primary),
                    ),
                  ],
                ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.secondaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Route Plan',
                      style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.onSecondaryContainer),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Icon(Icons.radio_button_checked, size: 16, color: AppColors.primary),
                      const SizedBox(width: 12),
                      Text(_trip['origin'], style: AppTextStyles.headlineSmall),
                    ],
                  ),
                  Container(
                    margin: const EdgeInsets.only(left: 7),
                    width: 2,
                    height: 32,
                    color: AppColors.outlineVariant,
                  ),
                  Row(
                    children: [
                      Icon(Icons.location_on, size: 16, color: AppColors.tertiary),
                      const SizedBox(width: 12),
                      Text(_trip['destination'], style: AppTextStyles.headlineSmall),
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
                              Text('Start Time', style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant)),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.schedule, size: 16, color: AppColors.primary),
                                  const SizedBox(width: 4),
                                  Text(_trip['departureTime'], style: AppTextStyles.titleSmall),
                                ],
                              ),
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
                              Text('Passengers', style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant)),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.people, size: 16, color: AppColors.primary),
                                  const SizedBox(width: 4),
                                  Text('${_trip['passengerCount']}', style: AppTextStyles.titleSmall),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('Stops', style: AppTextStyles.titleSmall.copyWith(color: AppColors.textOnSurfaceVariant)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: (_trip['stops'] as List).asMap().entries.map((entry) {
                  final isLast = entry.key == (_trip['stops'] as List).length - 1;
                  return Row(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Center(
                          child: Text(
                            '${entry.key + 1}',
                            style: AppTextStyles.labelSmall.copyWith(color: AppColors.surfaceTint),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(bottom: isLast ? 0 : 12),
                          child: Text(
                            entry.value,
                            style: AppTextStyles.bodyMedium,
                          ),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 24),
            Text('Crew', style: AppTextStyles.titleSmall.copyWith(color: AppColors.textOnSurfaceVariant)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  _buildCrewRow('Driver', _trip['driver'], Icons.drive_eta),
                  const SizedBox(height: 12),
                  _buildCrewRow('Conductor', _trip['conductor'], Icons.person, isActive: true),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.background.withOpacity(0), AppColors.background],
          ),
        ),
        child: SizedBox(
          height: 64,
          child: ElevatedButton(
            onPressed: () => context.push('/conductor/boarding/${widget.tripId}'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryContainer,
              foregroundColor: AppColors.surfaceTint,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.play_arrow, size: 24),
                const SizedBox(width: 8),
                Text('START TRIP', style: AppTextStyles.buttonLarge),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCrewRow(String role, String name, IconData icon, {bool isActive = false}) {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerHigh,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.textOnSurfaceVariant),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(role.toUpperCase(), style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant)),
            Text(name, style: AppTextStyles.titleMedium),
          ],
        ),
        const Spacer(),
        if (isActive)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text('ACTIVE', style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.primary)),
          ),
      ],
    );
  }
}
