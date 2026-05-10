import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../alerts/socket_service.dart';
import '../model/driver_trip.dart';
import '../provider/driver_provider.dart';
import 'driver_offline_alert_overlay.dart';

class DriverDashboardScreen extends ConsumerStatefulWidget {
  const DriverDashboardScreen({super.key});

  @override
  ConsumerState<DriverDashboardScreen> createState() =>
      _DriverDashboardScreenState();
}

class _DriverDashboardScreenState extends ConsumerState<DriverDashboardScreen> {
  late final SocketService _socket;

  @override
  void initState() {
    super.initState();
    _socket = SocketService.instance;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref.read(driverTripsProvider.notifier).loadTrips();
      _connectSocketForVisibleTrips();
    });
  }

  void _connectSocketForVisibleTrips() {
    final trips = ref.read(driverTripsProvider).trips;
    if (trips.isEmpty) return;

    final firstTripId = trips.first.id;
    _socket.connectToTrip(firstTripId).then((_) {
      for (final trip in trips) {
        _socket.joinTripRoom(trip.id);
      }
    });

    _socket.off('conductor_offline');
    _socket.off('conductor_online');
    _socket.on('conductor_offline', _handleConductorOffline);
    _socket.on('conductor_online', _handleConductorOnline);
  }

  void _handleConductorOffline(dynamic data) {
    if (!mounted) return;
    final payload =
        data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
    final tripId = (payload['tripId'] ?? payload['trip_id'] ?? '') as String;
    if (tripId.isEmpty) return;

    final state = ref.read(driverTripsProvider);
    final match = state.trips.where((trip) => trip.id == tripId);
    if (match.isEmpty) return;
    final trip = match.first;

    DriverOfflineAlertOverlay.show(
      tripId: trip.id,
      tripName: payload['tripName'] as String? ?? trip.tripName,
      onTakeOver: () {
        if (!mounted) return;
        context.push(
          AppRoutes.driverTripDetail.replaceAll(':id', trip.id),
        );
      },
      onDismiss: () {},
    );
  }

  void _handleConductorOnline(dynamic data) {
    DriverOfflineAlertOverlay.hide();
  }

  Future<void> _refresh() async {
    await ref.read(driverTripsProvider.notifier).loadTrips();
    _connectSocketForVisibleTrips();
  }

  @override
  void dispose() {
    _socket.off('conductor_offline');
    _socket.off('conductor_online');
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(driverTripsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Bus Alert',
          style: GoogleFonts.manrope(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            onPressed: () => context.push(AppRoutes.driverProfile),
            icon: const Icon(Icons.person_outline_rounded),
            tooltip: 'Profile',
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _refresh,
        child: Builder(
          builder: (context) {
            if (state.isLoading) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: const [
                  _SkeletonCard(),
                  SizedBox(height: 12),
                  _SkeletonCard(),
                  SizedBox(height: 12),
                  _SkeletonCard(),
                ],
              );
            }

            if (state.error != null) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(24),
                children: [
                  const SizedBox(height: 120),
                  Icon(
                    Icons.error_outline_rounded,
                    color: AppColors.error.withValues(alpha: 0.9),
                    size: 48,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    state.error!,
                    style: GoogleFonts.inter(color: AppColors.error),
                    textAlign: TextAlign.center,
                  ),
                ],
              );
            }

            if (state.trips.isEmpty) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  const SizedBox(height: 180),
                  Center(
                    child: Text(
                      'No trips assigned today',
                      style: GoogleFonts.manrope(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              );
            }

            return ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: state.trips.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final trip = state.trips[index];
                return _DriverTripCard(
                  trip: trip,
                  onTap: () {
                    context.push(
                      AppRoutes.driverTripDetail.replaceAll(':id', trip.id),
                    );
                  },
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _DriverTripCard extends StatelessWidget {
  const _DriverTripCard({
    required this.trip,
    required this.onTap,
  });

  final DriverTrip trip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final schedule = _formatSchedule(trip.scheduledDate);
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    trip.displayRoute,
                    style: GoogleFonts.manrope(
                      color: AppColors.onSurface,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                _StatusBadge(trip: trip),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              schedule,
              style: GoogleFonts.inter(
                color: AppColors.onSurfaceVariant,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Conductor: ${trip.conductorName ?? 'Not assigned'}',
              style: GoogleFonts.inter(
                color: AppColors.onSurface,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatefulWidget {
  const _StatusBadge({required this.trip});

  final DriverTrip trip;

  @override
  State<_StatusBadge> createState() => _StatusBadgeState();
}

class _StatusBadgeState extends State<_StatusBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.trip.status;
    final needsTakeover = widget.trip.needsTakeover;
    final label = needsTakeover
        ? 'Takeover Required'
        : status == 'completed'
            ? 'Completed'
            : status == 'active'
                ? 'Conductor Active'
                : 'Scheduled';

    final color = needsTakeover
        ? Colors.red
        : status == 'completed'
            ? Colors.blue
            : status == 'active'
                ? Colors.green
                : Colors.grey;

    final child = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );

    if (!needsTakeover) return child;

    return FadeTransition(
      opacity: Tween<double>(begin: 0.45, end: 1).animate(_controller),
      child: child,
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 124,
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }
}

String _formatSchedule(String raw) {
  final parsed = DateTime.tryParse(raw)?.toLocal();
  if (parsed == null) return raw.isEmpty ? 'Schedule unavailable' : raw;
  final month = _monthName(parsed.month);
  final hour = parsed.hour % 12 == 0 ? 12 : parsed.hour % 12;
  final minute = parsed.minute.toString().padLeft(2, '0');
  final suffix = parsed.hour >= 12 ? 'PM' : 'AM';
  return '${parsed.day} $month ${parsed.year}, $hour:$minute $suffix';
}

String _monthName(int month) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return months[month - 1];
}
