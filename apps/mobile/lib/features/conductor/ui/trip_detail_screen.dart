import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_background.dart';
import '../../../core/widgets/bento_card.dart';
import '../../../core/widgets/pulse_indicator.dart';
import '../../../core/widgets/sentinel_button.dart';
import '../provider/trip_provider.dart';

class TripDetailScreen extends ConsumerWidget {
  final String tripId;
  const TripDetailScreen({super.key, required this.tripId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tripAsync = ref.watch(tripDetailsProvider(tripId));

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: AppBackground(
        child: tripAsync.when(
          data: (trip) => _buildContent(context, ref, trip),
          loading: () => const Center(
              child: CircularProgressIndicator(color: AppColors.primary)),
          error: (e, _) => Center(
              child: Text('Error: $e',
                  style: const TextStyle(color: AppColors.error))),
        ),
      ),
    );
  }

  Widget _buildContent(
      BuildContext context, WidgetRef ref, Map<String, dynamic> trip) {
    final status = (trip['status'] ?? 'ACTIVE TRIP').toString().toUpperCase();
    final busNumber = trip['bus_number'] ?? 'GJ01AB1234';
    final routeName = trip['route_name'] ?? 'Mahuva - Una';
    final stops = routeName.split(' - ');
    final from = stops.isNotEmpty ? stops[0] : 'Mahuva';
    final to = stops.length > 1 ? stops[1] : 'Una';

    return Column(
      children: [
        // Top App Bar
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Row(
              children: [
                IconButton(
                  onPressed: () => context.pop(),
                  icon: const Icon(Symbols.arrow_back, color: AppColors.primary),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
                const SizedBox(width: 16),
                Text(
                  'TRIP ID: ${tripId.substring(0, 8).toUpperCase()}',
                  style: AppTextStyles.labelSmall.copyWith(
                    color: AppColors.primary,
                    letterSpacing: 1.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                Text(
                  'SENTINEL',
                  style: AppTextStyles.headlineSmall.copyWith(
                    fontSize: 18,
                    letterSpacing: 1.0,
                    color: AppColors.onSurface.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
        ),

        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 140),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status Badge
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHigh,
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(
                          color: AppColors.outlineVariant.withOpacity(0.1),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const PulseIndicator(size: 8, color: Color(0xFF4ADE80)),
                          const SizedBox(width: 8),
                          Text(
                            status,
                            style: AppTextStyles.labelSmall.copyWith(
                              color: AppColors.onSurface,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  routeName,
                  style: AppTextStyles.headlineLarge.copyWith(
                    fontSize: 36,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 32),

                // Route Plan Bento Card
                BentoCard(
                  padding: const EdgeInsets.all(32),
                  backgroundColor: AppColors.surfaceContainerHigh,
                  decorators: [
                    Positioned(
                      right: 24,
                      top: 24,
                      child: Text(
                        '#$busNumber',
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.primary.withOpacity(0.3),
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildRouteStop(Symbols.radio_button_checked, from, true),
                      Padding(
                        padding: const EdgeInsets.only(left: 11),
                        child: Container(
                          width: 2,
                          height: 48,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                AppColors.primary.withOpacity(0.5),
                                AppColors.tertiary.withOpacity(0.5),
                              ],
                            ),
                          ),
                        ),
                      ),
                      _buildRouteStop(Symbols.location_on, to, false),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Crew Personnel Section
                Text(
                  'CREW PERSONNEL',
                  style: AppTextStyles.labelSmall.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 16),
                _buildCrewMember('CONDUCTOR', 'Me', true),
                const SizedBox(height: 12),
                _buildCrewMember('DRIVER', 'Rajesh Kumar', false),
                const SizedBox(height: 32),

                // System Checks Bento Grid
                Text(
                  'SYSTEM CHECKS',
                  style: AppTextStyles.labelSmall.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildSystemStatus('GPS', 'ON', Symbols.gps_fixed),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildSystemStatus('NETWORK', 'ON', Symbols.wifi),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

        // Bottom Action Button Shell
        Container(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 40),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                AppColors.background.withOpacity(0),
                AppColors.background,
              ],
            ),
          ),
          child: SentinelButton(
            label: 'START TRIP',
            icon: Symbols.play_arrow,
            style: SentinelButtonStyle.primaryContainer,
            height: 64,
            onPressed: () async {
              try {
                await ref.read(tripRepositoryProvider).startTrip(tripId);
                if (context.mounted) context.push('/conductor/boarding/$tripId');
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed: $e')),
                  );
                }
              }
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRouteStop(IconData icon, String stopName, bool isOrigin) {
    return Row(
      children: [
        Icon(
          icon,
          color: isOrigin ? AppColors.primary : AppColors.tertiary,
          size: 24,
          fill: 1,
        ),
        const SizedBox(width: 20),
        Text(
          stopName,
          style: AppTextStyles.headlineSmall.copyWith(
            fontSize: 28,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }

  Widget _buildCrewMember(String role, String name, bool isMe) {
    return BentoCard(
      padding: const EdgeInsets.all(16),
      backgroundColor: AppColors.surfaceContainerLow,
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHighest,
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.outlineVariant.withOpacity(0.1),
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(26),
              child: Image.network(
                'https://ui-avatars.com/api/?name=$name&background=31353a&color=${isMe ? 'a3cbf2' : 'ffb68b'}',
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  role,
                  style: AppTextStyles.labelSmall.copyWith(
                    fontSize: 10,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                Text(
                  name,
                  style: AppTextStyles.headlineSmall.copyWith(
                    fontSize: 18,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(99),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Symbols.verified,
                  fill: 1,
                  color: isMe ? AppColors.primary : AppColors.tertiary,
                  size: 14,
                ),
                const SizedBox(width: 6),
                Text(
                  'VERIFIED',
                  style: AppTextStyles.labelSmall.copyWith(
                    fontSize: 10,
                    color: AppColors.onSurface,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSystemStatus(String label, String value, IconData icon) {
    return BentoCard(
      padding: const EdgeInsets.all(20),
      backgroundColor: AppColors.surfaceContainerLow,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.secondary, size: 24),
          const SizedBox(height: 24),
          Text(
            label,
            style: AppTextStyles.labelSmall.copyWith(
              fontSize: 10,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const PulseIndicator(size: 8, color: Color(0xFF4ADE80)),
              const SizedBox(width: 8),
              Text(
                value,
                style: AppTextStyles.headlineSmall.copyWith(
                  fontSize: 20,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
