import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:bus_alert/features/auth/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class DriverDashboard extends ConsumerStatefulWidget {
  const DriverDashboard({super.key});

  @override
  ConsumerState<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends ConsumerState<DriverDashboard> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Row(
          children: [
            const Icon(Icons.directions_bus, color: AppColors.primary),
            const SizedBox(width: 8),
            Text('MY TRIPS', style: AppTextStyles.titleMedium),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline, color: AppColors.textOnSurface),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Transit Hub',
                  style: AppTextStyles.headlineLarge.copyWith(color: AppColors.textOnSurface),
                ),
                const SizedBox(height: 4),
                Text(
                  'Driver Console • Active Duty',
                  style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(24),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: AppColors.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(24),
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                indicatorPadding: const EdgeInsets.all(4),
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.textSecondary,
                labelStyle: AppTextStyles.labelSmall,
                dividerColor: Colors.transparent,
                tabs: const [
                  Tab(text: 'TODAY'),
                  Tab(text: 'UPCOMING'),
                  Tab(text: 'COMPLETED'),
                ],
              ),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildTripList('today'),
                _buildTripList('upcoming'),
                _buildTripList('completed'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripList(String type) {
    final mockTrips = [
      {
        'id': '1',
        'busNumber': 'GJ01AB1234',
        'origin': 'Ahmedabad',
        'destination': 'Una',
        'departureTime': DateTime.now().add(const Duration(hours: 2)),
        'status': 'active',
        'conductor': 'Rajesh Kumar',
        'conductorOnline': true,
      },
      {
        'id': '2',
        'busNumber': 'GJ05XY9876',
        'origin': 'Surat',
        'destination': 'Rajkot',
        'departureTime': DateTime.now().add(const Duration(hours: 5)),
        'status': 'ready',
        'conductor': 'Amit Shah',
        'conductorOnline': false,
      },
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: mockTrips.length,
      itemBuilder: (context, index) {
        final trip = mockTrips[index];
        return _buildTripCard(trip);
      },
    );
  }

  Widget _buildTripCard(Map<String, dynamic> trip) {
    final status = trip['status'] as String;
    final conductorOnline = trip['conductorOnline'] as bool;

    Color statusColor;
    String statusText;
    if (status == 'active') {
      statusColor = AppColors.tertiary;
      statusText = 'ACTIVE';
    } else if (!conductorOnline) {
      statusColor = AppColors.error;
      statusText = 'TAKEOVER REQUIRED';
    } else {
      statusColor = AppColors.secondary;
      statusText = 'READY';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(24),
        border: status == 'active' ? Border.all(color: AppColors.tertiary.withOpacity(0.5), width: 2) : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: () => context.push('/driver/trip/${trip['id']}'),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: statusColor,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                statusText,
                                style: AppTextStyles.labelExtraSmall.copyWith(color: statusColor),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          trip['busNumber'],
                          style: AppTextStyles.headlineSmall.copyWith(color: AppColors.primary),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Departure',
                          style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          DateFormat.jm().format(trip['departureTime']),
                          style: AppTextStyles.titleLarge,
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        conductorOnline ? Icons.check_circle : Icons.warning,
                        color: conductorOnline ? AppColors.success : AppColors.error,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          conductorOnline ? '🟢 Conductor Active' : '🔴 Takeover Required',
                          style: AppTextStyles.labelMedium.copyWith(
                            color: conductorOnline ? AppColors.success : AppColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'FROM',
                            style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                          ),
                          Text(trip['origin'], style: AppTextStyles.titleMedium),
                        ],
                      ),
                    ),
                    Icon(Icons.trending_flat, color: AppColors.primary),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'TO',
                            style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                          ),
                          Text(trip['destination'], style: AppTextStyles.titleMedium),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
