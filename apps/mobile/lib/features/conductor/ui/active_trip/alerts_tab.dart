import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_background.dart';
import '../../../../core/widgets/bento_card.dart';
import '../../../../core/widgets/sentinel_button.dart';
import '../../provider/trip_provider.dart';

class AlertsTab extends ConsumerWidget {
  final String tripId;
  const AlertsTab({super.key, required this.tripId});

  Future<void> _handleManualInfo(BuildContext context, WidgetRef ref, String passengerId) async {
    try {
      await ref.read(tripRepositoryProvider).informManually(tripId, passengerId);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Marked as manually informed')),
        );
        // Refresh trip details
        ref.invalidate(tripDetailsProvider(tripId));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tripAsync = ref.watch(tripDetailsProvider(tripId));

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(
          'SENTINEL',
          style: AppTextStyles.headlineSmall.copyWith(
            color: AppColors.onSurface,
            fontWeight: FontWeight.w900,
            letterSpacing: 4,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: AppBackground(
        child: tripAsync.when(
          data: (trip) {
            final passengers = (trip['passengers'] as List<dynamic>?) ?? [];
            final failedAlerts = passengers.where((p) => p['alert_status'] == 'failed').toList();

            return CustomScrollView(
              slivers: [
                // Header
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
                    child: Row(
                      children: [
                        const Icon(Symbols.notifications_active_rounded,
                            color: AppColors.tertiary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'SYSTEM ALERTS',
                          style: AppTextStyles.labelSmall.copyWith(
                            color: AppColors.tertiary,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 2,
                          ),
                        ),
                        const Spacer(),
                        if (failedAlerts.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.tertiary,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '${failedAlerts.length} FAILED',
                              style: AppTextStyles.labelSmall.copyWith(
                                color: Colors.white,
                                fontSize: 10,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),

                // Active Alerts Section
                if (failedAlerts.isEmpty)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(48.0),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(Symbols.check_circle_rounded, 
                              size: 48, color: AppColors.primary.withOpacity(0.3)),
                            const SizedBox(height: 16),
                            Text(
                              'ALL ALERTS CLEAR',
                              style: AppTextStyles.labelSmall.copyWith(
                                color: AppColors.onSurfaceVariant.withOpacity(0.5),
                                letterSpacing: 2,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                else
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final alert = failedAlerts[index];
                        return Padding(
                          padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                          child: _buildActiveAlertCard(
                            context,
                            ref,
                            passengerId: alert['id'].toString(),
                            title: 'CALL FAILED',
                            subtitle: 'Automatic notification system error',
                            seat: 'Seat ${alert['seat_no'] ?? '??'}',
                            stop: alert['stop_name'] ?? 'Unknown Stop',
                            urgencyColor: AppColors.tertiary,
                          ),
                        );
                      },
                      childCount: failedAlerts.length,
                    ),
                  ),

                // Manual Alerts Grid Header
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
                    child: Text(
                      'TRIGGER MANUAL ALERT',
                      style: AppTextStyles.labelSmall.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                ),

                // Manual Alerts Grid
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  sliver: SliverGrid.count(
                    crossAxisCount: 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 1.1,
                    children: [
                      _buildTemplateCard(
                        context,
                        ref,
                        'Breakdown',
                        Symbols.build_rounded,
                        AppColors.tertiary,
                      ),
                      _buildTemplateCard(
                        context,
                        ref,
                        'Traffic Jam',
                        Symbols.traffic_rounded,
                        AppColors.primary,
                      ),
                      _buildTemplateCard(
                        context,
                        ref,
                        'Accident',
                        Symbols.error_rounded,
                        AppColors.error,
                      ),
                      _buildTemplateCard(
                        context,
                        ref,
                        'Custom Msg',
                        Symbols.chat_bubble_rounded,
                        AppColors.secondary,
                      ),
                    ],
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 100)),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, s) => Center(child: Text('Error: $e')),
        ),
      ),
    );
  }

  Widget _buildActiveAlertCard(
    BuildContext context,
    WidgetRef ref, {
    required String passengerId,
    required String title,
    required String subtitle,
    required String seat,
    required String stop,
    required Color urgencyColor,
  }) {
    return BentoCard(
      padding: const EdgeInsets.all(28),
      backgroundColor: AppColors.surfaceContainerHigh,
      decorators: [
        // Tonal Indicator
        Positioned(
          right: 0,
          top: 0,
          bottom: 0,
          width: 8,
          child: Container(color: urgencyColor),
        ),
      ],
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
                    'PASSENGER LOCATION',
                    style: AppTextStyles.labelSmall.copyWith(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurfaceVariant,
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    seat,
                    style: AppTextStyles.headlineMedium.copyWith(
                      fontSize: 48,
                      fontWeight: FontWeight.w900,
                      color: AppColors.onSurface,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const Icon(Symbols.person_rounded,
                        size: 14, color: AppColors.primary, fill: 1),
                    const SizedBox(width: 6),
                    Text(
                      'UNVERIFIED',
                      style: AppTextStyles.labelSmall.copyWith(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w800,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Container(height: 1, color: AppColors.outlineVariant.withOpacity(0.2)),
          ),

          Text(
            'UPCOMING STOP',
            style: AppTextStyles.labelSmall.copyWith(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: AppColors.onSurfaceVariant,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Symbols.location_on_rounded, color: AppColors.tertiary, size: 28),
              const SizedBox(width: 12),
              Text(
                stop,
                style: AppTextStyles.headlineSmall.copyWith(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 32),
          
          // Action Buttons
          Row(
            children: [
              Expanded(
                child: SentinelButton(
                  label: 'DETAILS',
                  style: SentinelButtonStyle.secondary,
                  onPressed: () {
                    context.push(
                      '/conductor/call-failure',
                      extra: {
                        'tripId': tripId,
                        'passengerId': passengerId,
                        'passengerSeat': seat,
                        'upcomingStop': stop,
                      },
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: SentinelButton(
                  label: 'INFORM',
                  icon: Symbols.campaign_rounded,
                  style: SentinelButtonStyle.primary,
                  onPressed: () => _handleManualInfo(context, ref, passengerId),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTemplateCard(BuildContext context, WidgetRef ref, String title, IconData icon, Color color) {
    return BentoCard(
      padding: EdgeInsets.zero,
      backgroundColor: AppColors.surfaceContainerHigh,
      child: InkWell(
        onTap: () async {
          try {
            await ref.read(tripRepositoryProvider).broadcastAlert(tripId, title.toLowerCase());
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: AppColors.surfaceContainerHighest,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  content: Row(
                    children: [
                      Icon(icon, color: color, size: 20),
                      const SizedBox(width: 12),
                      Text(
                        '$title alert broadcasted to all',
                        style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurface, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              );
            }
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Failed to broadcast: $e')),
              );
            }
          }
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 32, fill: 1),
            ),
            const SizedBox(height: 16),
            Text(
              title.toUpperCase(),
              style: AppTextStyles.labelSmall.copyWith(
                color: color,
                fontWeight: FontWeight.w900,
                fontSize: 11,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

