import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../provider/trip_provider.dart';

class TripTab extends ConsumerWidget {
  final String tripId;
  const TripTab({super.key, required this.tripId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tripAsync = ref.watch(tripDetailsProvider(tripId));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background Gradient Overlay (matching 1.html decorative blur)
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withOpacity(0.05),
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
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
            error: (err, stack) => Center(
              child: Text('Error: $err', style: const TextStyle(color: AppColors.error)),
            ),
            data: (trip) {
              final status = (trip['status'] ?? 'READY').toUpperCase();
              final busNumber = (trip['bus_number'] ?? 'GJ01AB1234').toUpperCase();
              final source = trip['source_name'] ?? 'Ahmedabad';
              final destination = trip['destination_name'] ?? 'Una';
              final startTime = trip['start_time'] ?? '10:00 PM';
              final office = trip['office_name'] ?? 'Ahmedabad Office';
              final driverName = trip['driver_name'] ?? 'Rajesh Kumar';

              return Column(
                children: [
                  Expanded(
                    child: CustomScrollView(
                      physics: const BouncingScrollPhysics(),
                      slivers: [
                        // Top App Bar
                        SliverAppBar(
                          expandedHeight: 80,
                          collapsedHeight: 64,
                          pinned: true,
                          backgroundColor: AppColors.background,
                          elevation: 0,
                          centerTitle: false,
                          leading: IconButton(
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(
                              Symbols.arrow_back_rounded,
                              color: AppColors.primary,
                            ),
                          ),
                          title: Text(
                            'TRIP DETAILS',
                            style: AppTextStyles.headlineSmall.copyWith(
                              color: AppColors.onSurface,
                              fontWeight: FontWeight.w800,
                              fontSize: 18,
                              fontFamily: 'Manrope',
                              letterSpacing: 1.5,
                            ),
                          ),
                        ),

                        SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          sliver: SliverList(
                            delegate: SliverChildListDelegate([
                              const SizedBox(height: 16),

                              // Trip Hero Status Row
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'CURRENT STATUS',
                                        style: AppTextStyles.labelSmall.copyWith(
                                          color: AppColors.onSurfaceVariant,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          const _PulseIndicator(color: AppColors.tertiary),
                                          const SizedBox(width: 8),
                                          Text(
                                            status,
                                            style: AppTextStyles.headlineMedium.copyWith(
                                              color: AppColors.tertiary,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: -0.5,
                                            ),
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
                                          'BUS NUMBER',
                                          style: AppTextStyles.labelSmall.copyWith(
                                            color: AppColors.onSurfaceVariant,
                                            fontSize: 10,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          busNumber,
                                          style: AppTextStyles.headlineSmall.copyWith(
                                            color: AppColors.primary,
                                            fontSize: 18,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 24),

                              _buildMainTripCard(source, destination, startTime, office),
                              const SizedBox(height: 24),
                              _buildCrewSection(driverName),
                              const SizedBox(height: 24),
                              Row(
                                children: [
                                  Expanded(
                                    child: _buildSystemCheck(
                                      'GPS',
                                      Symbols.location_on_rounded,
                                      true,
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: _buildSystemCheck(
                                      'Network',
                                      Symbols.wifi_rounded,
                                      true,
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 120), // Padding for bottom button
                            ]),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),

          // Bottom Action Button
          _buildBottomActionButton(context),
        ],
      ),
    );
  }

  Widget _buildMainTripCard(String source, String destination, String startTime, String office) {
    return Container(
      padding: const EdgeInsets.all(24),
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
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              'ROUTE PLAN',
              style: AppTextStyles.labelSmall.copyWith(
                color: AppColors.onSecondaryContainer,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Route visualization
          Row(
            children: [
              const Icon(Symbols.radio_button_checked_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 12),
              Text(
                source,
                style: AppTextStyles.headlineSmall.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                ),
              ),
            ],
          ),
          Container(
            margin: const EdgeInsets.only(left: 9),
            height: 32,
            width: 2,
            color: AppColors.outlineVariant,
          ),
          Row(
            children: [
              const Icon(Symbols.location_on_rounded, color: AppColors.secondary, size: 20),
              const SizedBox(width: 12),
              Text(
                destination,
                style: AppTextStyles.headlineSmall.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),
          const Divider(color: AppColors.outlineVariant, thickness: 1),
          const SizedBox(height: 24),

          // Info Grid
          Row(
            children: [
              Expanded(child: _buildInfoBox('START TIME', startTime, Symbols.schedule_rounded)),
              const SizedBox(width: 16),
              Expanded(child: _buildInfoBox('OFFICE', office, Symbols.corporate_fare_rounded)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoBox(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTextStyles.labelSmall.copyWith(
              color: AppColors.onSurfaceVariant,
              fontSize: 9,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(icon, color: AppColors.primary, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  value,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCrewSection(String driverName) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'CREW PERSONNEL',
            style: AppTextStyles.labelSmall.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          _buildCrewMember(
            'DRIVER',
            driverName,
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCMfom1qrxC2auBqr8Ooo-RjW7b9zjvb7EIuWtvYIFyf4pohASDPvRzpzsesh0eEzbmY2ZYqiMWcIy9nYnBS0X710oL6v0sQtjKSTDgrHI5GcszmKZoj0cNyGo6SH343kHcuiW5DRi2KUBQqsRKSnUgfsJKO4EYD8V7Tycpe_W70AhU6axfKqHJV1XiUos--2RpTbnWjzZG1oGSURvN3zTswYGqfn8Mt-zYhaNGBAK47C-n-5fiFeaNyABsd5gymcuDibgQKK2Dq6fy',
            isVerified: true,
          ),
          const SizedBox(height: 12),
          _buildCrewMember(
            'CONDUCTOR',
            'You',
            null,
            isActive: true,
          ),
        ],
      ),
    );
  }

  Widget _buildCrewMember(String role, String name, String? imageUrl,
      {bool isVerified = false, bool isActive = false}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive ? AppColors.secondaryContainer : AppColors.surfaceVariant,
            ),
            child: ClipOval(
              child: imageUrl != null
                  ? Image.network(imageUrl, fit: BoxFit.cover)
                  : Icon(
                      Symbols.person_rounded,
                      color: isActive ? AppColors.onSecondaryContainer : AppColors.onSurfaceVariant,
                      fill: 1,
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
                    fontSize: 9,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                Text(
                  name,
                  style: AppTextStyles.bodyLarge.copyWith(
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Manrope',
                  ),
                ),
              ],
            ),
          ),
          if (isVerified)
            const Icon(Symbols.verified_rounded, color: AppColors.onSurfaceVariant, size: 20),
          if (isActive)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'ACTIVE',
                style: AppTextStyles.labelSmall.copyWith(
                  color: AppColors.primary,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSystemCheck(String label, IconData icon, bool isOn) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.secondary, size: 28),
          const SizedBox(height: 16),
          Text(
            label,
            style: AppTextStyles.labelSmall.copyWith(
              color: AppColors.onSurfaceVariant,
              fontSize: 10,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: isOn ? const Color(0xFF4ADE80) : AppColors.error,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                isOn ? 'ON' : 'OFF',
                style: AppTextStyles.headlineSmall.copyWith(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'Manrope',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBottomActionButton(BuildContext context) {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.background.withOpacity(0),
              AppColors.background.withOpacity(0.9),
              AppColors.background,
            ],
            stops: const [0.0, 0.4, 1.0],
          ),
        ),
        child: Container(
          height: 64,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: AppColors.primaryContainer.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryContainer,
              foregroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              elevation: 0,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Symbols.play_arrow_rounded, fill: 1, size: 28),
                const SizedBox(width: 12),
                Text(
                  'START TRIP',
                  style: AppTextStyles.headlineSmall.copyWith(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                    color: AppColors.primary,
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

class _PulseIndicator extends StatefulWidget {
  final Color color;
  const _PulseIndicator({required this.color});

  @override
  State<_PulseIndicator> createState() => _PulseIndicatorState();
}

class _PulseIndicatorState extends State<_PulseIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: widget.color.withOpacity(0.5 + (_controller.value * 0.5)),
            boxShadow: [
              BoxShadow(
                color: widget.color.withOpacity(0.2 * _controller.value),
                blurRadius: 10 * _controller.value,
                spreadRadius: 5 * _controller.value,
              ),
            ],
          ),
        );
      },
    );
  }
}
