import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../provider/trip_provider.dart';

class PassengersTab extends ConsumerWidget {
  final String tripId;
  const PassengersTab({super.key, required this.tripId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tripAsync = ref.watch(tripDetailsProvider(tripId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Symbols.menu_rounded, color: AppColors.onSurface),
          onPressed: () {},
        ),
        title: Text(
          'PASSENGERS',
          style: AppTextStyles.labelSmall.copyWith(
            color: AppColors.onSurface,
            fontWeight: FontWeight.w800,
            letterSpacing: 2,
            fontSize: 14,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Symbols.search_rounded, color: AppColors.onSurface),
            onPressed: () {},
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: AppColors.primaryContainer.withOpacity(0.9),
        child: const Icon(Symbols.person_add_rounded, color: AppColors.primary),
      ),
      body: Stack(
        children: [
          // Background Gradient
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.0,
                  colors: [
                    Color(0x0DFA3CBF2), // Primary with 5% opacity
                    AppColors.background,
                  ],
                ),
              ),
            ),
          ),

          // Noise Overlay
          Positioned.fill(
            child: Opacity(
              opacity: 0.02,
              child: Image.network(
                'https://www.transparenttextures.com/patterns/carbon-fibre.png',
                repeat: ImageRepeat.repeat,
                errorBuilder: (context, error, stackTrace) => const SizedBox(),
              ),
            ),
          ),

          tripAsync.when(
            data: (trip) {
              final passengers = (trip['passengers'] as List<dynamic>?) ?? [];
              final routeName = trip['route_name'] ?? 'Route Unknown';

              return CustomScrollView(
                slivers: [
                  // Sorting Tabs
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                      child: Container(
                        height: 56,
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLowest,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            _buildSortTab('SEAT-WISE', true),
                            _buildSortTab('PICKUP-WISE', false),
                            _buildSortTab('DROP-WISE', false),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Route Header
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'CURRENT ROUTE',
                            style: AppTextStyles.labelSmall.copyWith(
                              color: AppColors.onSurfaceVariant,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.5,
                              fontSize: 10,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  routeName,
                                  style: AppTextStyles.headlineSmall.copyWith(
                                    color: AppColors.onSurface,
                                    fontWeight: FontWeight.w900,
                                    fontFamily: 'Manrope',
                                    fontSize: 32,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: AppColors.tertiaryContainer
                                      .withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Symbols.sensors_rounded,
                                        size: 14, color: AppColors.tertiary),
                                    const SizedBox(width: 4),
                                    Text(
                                      'LIVE',
                                      style: AppTextStyles.labelSmall.copyWith(
                                        color: AppColors.tertiary,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  if (passengers.isEmpty)
                    SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Symbols.person_off_rounded,
                                size: 64,
                                color:
                                    AppColors.onSurfaceVariant.withOpacity(0.2)),
                            const SizedBox(height: 16),
                            Text(
                              'NO PASSENGERS YET',
                              style: AppTextStyles.labelSmall.copyWith(
                                color: AppColors.onSurfaceVariant,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 2,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final p = passengers[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _PassengerCard(passenger: p),
                            );
                          },
                          childCount: passengers.length,
                        ),
                      ),
                    ),
                  const SliverToBoxAdapter(child: SizedBox(height: 100)),
                ],
              );
            },
            loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.primary)),
            error: (e, _) => Center(
                child: Text('Error: $e',
                    style: const TextStyle(color: AppColors.error))),
          ),
        ],
      ),
    );
  }

  Widget _buildSortTab(String label, bool isActive) {
    return Expanded(
      child: Container(
        decoration: BoxDecoration(
          color: isActive ? AppColors.surfaceVariant : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(
            label,
            style: AppTextStyles.labelSmall.copyWith(
              color: isActive ? AppColors.onSurface : AppColors.onSurfaceVariant,
              fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
              fontSize: 10,
            ),
          ),
        ),
      ),
    );
  }
}

class _PassengerCard extends StatelessWidget {
  final Map<String, dynamic> passenger;
  const _PassengerCard({required this.passenger});

  @override
  Widget build(BuildContext context) {
    final status = (passenger['status'] ?? 'pending').toString().toLowerCase();
    final seat = passenger['seat_number'] ?? '??';
    final name = passenger['name'] ?? 'Unknown';
    final boarding = passenger['boarding_stop'] ?? 'N/A';

    final bool isBoarded = status == 'boarded';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isBoarded ? AppColors.primary.withOpacity(0.1) : Colors.transparent,
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // Seat Badge
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: isBoarded ? const Color(0xFF0D3B5E) : const Color(0xFF262A2F),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'SEAT',
                  style: AppTextStyles.labelSmall.copyWith(
                    color: isBoarded ? AppColors.primary : AppColors.onSurfaceVariant,
                    fontSize: 8,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  seat.toString().padLeft(2, '0'),
                  style: AppTextStyles.headlineSmall.copyWith(
                    color: isBoarded ? AppColors.primary : AppColors.onSurface,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Manrope',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 20),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: AppTextStyles.bodyLarge.copyWith(
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Symbols.location_on_rounded,
                        size: 16, color: AppColors.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      boarding.toUpperCase(),
                      style: AppTextStyles.labelSmall.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Status Action
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isBoarded
                  ? AppColors.surfaceContainerHighest.withOpacity(0.3)
                  : AppColors.surfaceContainerHighest.withOpacity(0.3),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: isBoarded
                  ? const Icon(Symbols.check_circle_rounded,
                      color: AppColors.primary, size: 24)
                  : const Icon(Symbols.edit_note_rounded,
                      color: AppColors.onSurfaceVariant, size: 24),
            ),
          ),
        ],
      ),
    );
  }
}
