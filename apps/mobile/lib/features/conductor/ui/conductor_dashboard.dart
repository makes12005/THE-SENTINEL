import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_background.dart';
import '../../../core/widgets/bento_card.dart';
import '../../../core/widgets/pulse_indicator.dart';
import '../provider/trip_provider.dart';

class ConductorDashboard extends ConsumerStatefulWidget {
  const ConductorDashboard({super.key});

  @override
  ConsumerState<ConductorDashboard> createState() => _ConductorDashboardState();
}

class _ConductorDashboardState extends ConsumerState<ConductorDashboard> {
  int _selectedTabIndex = 0;
  final List<String> _tabs = ['Today / Current', 'Upcoming', 'Completed'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: AppBackground(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Top App Bar
            SliverAppBar(
              floating: true,
              pinned: true,
              backgroundColor: AppColors.background.withOpacity(0.8),
              surfaceTintColor: Colors.transparent,
              flexibleSpace: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      const Color(0xFF181C20),
                      const Color(0xFF181C20).withOpacity(0),
                    ],
                  ),
                ),
              ),
              elevation: 0,
              centerTitle: false,
              leading: const Padding(
                padding: EdgeInsets.only(left: 24),
                child: Icon(Symbols.directions_bus_rounded, color: AppColors.primary, fill: 1),
              ),
              leadingWidth: 48,
              title: Text(
                'My Trips',
                style: AppTextStyles.headlineSmall.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                  fontFamily: 'Manrope',
                  letterSpacing: -0.5,
                ),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Symbols.search_rounded, color: AppColors.onSurface),
                  onPressed: () {},
                ),
                Padding(
                  padding: const EdgeInsets.only(right: 24),
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: const BoxDecoration(
                      color: AppColors.surfaceContainerHigh,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Symbols.person_rounded, size: 18, color: AppColors.primary),
                  ),
                ),
              ],
            ),

            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: 16),
                  
                  // Segmented Control
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerLowest,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Row(
                      children: List.generate(_tabs.length, (index) {
                        final isSelected = _selectedTabIndex == index;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _selectedTabIndex = index),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 300),
                              curve: Curves.easeInOut,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: isSelected ? AppColors.surfaceContainerHighest : Colors.transparent,
                                borderRadius: BorderRadius.circular(24),
                                boxShadow: isSelected ? [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.1),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  )
                                ] : null,
                              ),
                              child: Text(
                                _tabs[index],
                                textAlign: TextAlign.center,
                                style: AppTextStyles.labelSmall.copyWith(
                                  color: isSelected ? AppColors.tertiary : AppColors.onSurfaceVariant,
                                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                  fontSize: 13,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Section Label
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'ACTIVE ASSIGNMENTS',
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.onSurfaceVariant,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.5,
                          fontSize: 11,
                          fontFamily: 'Inter',
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.tertiaryContainer,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'LIVE',
                          style: AppTextStyles.labelSmall.copyWith(
                            color: AppColors.tertiary,
                            fontWeight: FontWeight.w900,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ]),
              ),
            ),

            // Trips List
            _buildTripList(),

            const SliverToBoxAdapter(child: SizedBox(height: 140)), // Space for bottom nav
          ],
        ),
      ),

      // Floating Map Button
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 90),
        child: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: AppColors.tertiaryContainer,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.4),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {},
              child: const Icon(Symbols.map_rounded, color: AppColors.tertiary, fill: 1),
            ),
          ),
        ),
      ),

      // Bottom Navigation Bar
      bottomNavigationBar: _buildBottomNavBar(),
    );
  }

  Widget _buildTripList() {
    final statusMap = ['today', 'upcoming', 'completed'];
    final tripsAsync = ref.watch(tripsProvider(statusMap[_selectedTabIndex]));

    return tripsAsync.when(
      data: (trips) {
        if (trips.isEmpty) {
          return SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(top: 100),
              child: Center(
                child: Column(
                  children: [
                    Icon(Symbols.explore_off_rounded, size: 48, color: AppColors.onSurfaceVariant.withOpacity(0.5)),
                    const SizedBox(height: 16),
                    Text(
                      'No trips found for this period.',
                      style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final trip = trips[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: _TripCard(trip: trip),
                );
              },
              childCount: trips.length,
            ),
          ),
        );
      },
      loading: () => const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.only(top: 100),
          child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
        ),
      ),
      error: (e, _) => SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.only(top: 100),
          child: Center(child: Text('Error loading trips', style: TextStyle(color: AppColors.error))),
        ),
      ),
    );
  }

  Widget _buildBottomNavBar() {
    return Container(
      height: 100,
      decoration: BoxDecoration(
        color: const Color(0xFF181C20).withOpacity(0.95),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 40,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(Symbols.route_rounded, 'Trips', isActive: true),
                _buildNavItem(Symbols.notifications_active_rounded, 'Alerts'),
                _buildNavItem(Symbols.account_circle_rounded, 'Account'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, {bool isActive = false}) {
    return GestureDetector(
      onTap: () {},
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? AppColors.surfaceContainerHigh : Colors.transparent,
          borderRadius: BorderRadius.circular(24),
        ),
        transform: isActive ? (Matrix4.identity()..scale(1.05)) : Matrix4.identity(),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isActive ? AppColors.tertiary : AppColors.onSurface.withOpacity(0.6),
              fill: isActive ? 1 : 0,
              size: 26,
            ),
            const SizedBox(height: 4),
            Text(
              label.toUpperCase(),
              style: AppTextStyles.labelSmall.copyWith(
                color: isActive ? AppColors.tertiary : AppColors.onSurface.withOpacity(0.6),
                fontWeight: isActive ? FontWeight.w900 : FontWeight.w600,
                fontSize: 10,
                letterSpacing: 0.8,
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  final Map<String, dynamic> trip;
  const _TripCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    final status = (trip['status'] ?? 'READY').toString().toUpperCase();
    final isReady = status == 'READY' || status == 'LIVE';

    return GestureDetector(
      onTap: () => context.push('/conductor/trip/${trip['id']}'),
      child: BentoCard(
        backgroundColor: isReady ? AppColors.surfaceContainerHigh : AppColors.surfaceContainerLow,
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'BUS NUMBER',
                      style: AppTextStyles.labelSmall.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontWeight: FontWeight.w900,
                        fontSize: 10,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      (trip['bus_number'] ?? 'GJ01AB1234').toUpperCase(),
                      style: AppTextStyles.headlineSmall.copyWith(
                        color: isReady ? AppColors.primary : AppColors.primaryFixedDim,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'Manrope',
                        letterSpacing: -0.5,
                        fontSize: 18,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isReady ? AppColors.tertiaryContainer : AppColors.secondaryContainer.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isReady) ...[
                        const PulseIndicator(size: 8),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        status,
                        style: AppTextStyles.labelSmall.copyWith(
                          color: isReady ? AppColors.onTertiaryContainer : AppColors.secondary,
                          fontWeight: FontWeight.w900,
                          fontSize: 10,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Column(
                  children: [
                    const Icon(Symbols.radio_button_checked_rounded, color: AppColors.secondary, size: 14),
                    Container(
                      width: 2,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.outlineVariant.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(1),
                      ),
                    ),
                    const Icon(Symbols.location_on_rounded, color: AppColors.tertiary, size: 14, fill: 1),
                  ],
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    children: [
                      _buildRouteStop(
                        title: trip['origin_stop_name'] ?? 'Ahmedabad',
                        subtitle: 'Central Station - Platform 4',
                      ),
                      const SizedBox(height: 16),
                      _buildRouteStop(
                        title: trip['destination_stop_name'] ?? 'Una',
                        subtitle: 'City Terminus',
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      trip['time'] ?? '10:00 PM',
                      style: AppTextStyles.headlineSmall.copyWith(
                        fontWeight: FontWeight.w900,
                        fontSize: 20,
                        fontFamily: 'Manrope',
                        letterSpacing: -1,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.secondaryFixed,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'TONIGHT',
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.secondaryContainer,
                          fontWeight: FontWeight.w900,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            if (isReady) ...[
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () => context.push('/conductor/trip/${trip['id']}'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryContainer,
                    foregroundColor: AppColors.onPrimaryContainer,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'START TRIP',
                        style: AppTextStyles.labelLarge.copyWith(
                          fontWeight: FontWeight.w900,
                          fontFamily: 'Manrope',
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Symbols.arrow_forward_rounded, size: 20),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRouteStop({required String title, required String subtitle}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: AppTextStyles.bodyLarge.copyWith(
            fontWeight: FontWeight.w800,
            fontFamily: 'Manrope',
            fontSize: 16,
          ),
        ),
        Text(
          subtitle,
          style: AppTextStyles.labelSmall.copyWith(
            color: AppColors.onSurfaceVariant,
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
