import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:bus_alert/features/auth/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class ConductorDashboard extends ConsumerStatefulWidget {
  const ConductorDashboard({super.key});

  @override
  ConsumerState<ConductorDashboard> createState() => _ConductorDashboardState();
}

class _ConductorDashboardState extends ConsumerState<ConductorDashboard> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;

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
            Text('Bus Alert', style: AppTextStyles.titleLarge),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: AppColors.textOnSurface),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.person_outline, color: AppColors.textOnSurface),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                labelColor: AppColors.tertiary,
                unselectedLabelColor: AppColors.textOnSurfaceVariant,
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
    final List<Map<String, dynamic>> mockTrips = [
      {
        'id': '1',
        'busNumber': 'GJ01AB1234',
        'origin': 'Ahmedabad',
        'destination': 'Una',
        'departureTime': DateTime.now().add(const Duration(hours: 2)),
        'status': 'ready',
        'passengerCount': 40,
      },
      {
        'id': '2',
        'busNumber': 'GJ05XY9876',
        'origin': 'Surat',
        'destination': 'Rajkot',
        'departureTime': DateTime.now().add(const Duration(hours: 5)),
        'status': 'scheduled',
        'passengerCount': 32,
      },
    ];

    return RefreshIndicator(
      onRefresh: () async {
        setState(() => _isLoading = true);
        await Future.delayed(const Duration(seconds: 1));
        setState(() => _isLoading = false);
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: mockTrips.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Active Assignments',
                    style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.tertiaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'LIVE',
                      style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.onTertiaryContainer),
                    ),
                  ),
                ],
              ),
            );
          }

          final trip = mockTrips[index - 1];
          return _buildTripCard(trip);
        },
      ),
    );
  }

  Widget _buildTripCard(Map<String, dynamic> trip) {
    final status = trip['status'] as String;
    final statusColor = status == 'ready' ? AppColors.tertiary : AppColors.secondary;
    final statusBgColor = status == 'ready' ? AppColors.tertiaryContainer : AppColors.secondaryContainer;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: () => context.push('/conductor/trip/${trip['id']}'),
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
                        Text(
                          'BUS NUMBER',
                          style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          trip['busNumber'],
                          style: AppTextStyles.headlineSmall.copyWith(color: AppColors.primary),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusBgColor.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
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
                            status.toUpperCase(),
                            style: AppTextStyles.labelExtraSmall.copyWith(color: statusColor),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                IntrinsicHeight(
                  child: Row(
                    children: [
                      Column(
                        children: [
                          Icon(Icons.radio_button_checked, size: 16, color: AppColors.secondary),
                          Container(width: 2, height: 24, color: AppColors.outlineVariant),
                          Icon(Icons.location_on, size: 16, color: AppColors.tertiary),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(trip['origin'], style: AppTextStyles.titleMedium),
                            Text(trip['destination'], style: AppTextStyles.titleMedium),
                          ],
                        ),
                      ),
                      Container(
                        alignment: Alignment.centerRight,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              DateFormat.jm().format(trip['departureTime']),
                              style: AppTextStyles.headlineSmall,
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.secondaryContainer,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'TONIGHT',
                                style: AppTextStyles.labelExtraSmall.copyWith(
                                  color: AppColors.onSecondaryContainer,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => context.push('/conductor/trip/${trip['id']}'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryContainer,
                      foregroundColor: AppColors.surfaceTint,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Start Trip', style: AppTextStyles.labelLarge),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward, size: 18),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
