import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_colors.dart';
import '../../alerts/socket_service.dart';
import '../../gps/gps_service.dart';
import '../../passengers/provider/passengers_provider.dart';
import '../model/driver_trip.dart';
import '../provider/driver_mode_provider.dart';
import '../provider/driver_provider.dart';
import 'driver_offline_alert_overlay.dart';

class DriverTripOverviewScreen extends ConsumerStatefulWidget {
  const DriverTripOverviewScreen({
    super.key,
    required this.tripId,
  });

  final String tripId;

  @override
  ConsumerState<DriverTripOverviewScreen> createState() =>
      _DriverTripOverviewScreenState();
}

class _DriverTripOverviewScreenState
    extends ConsumerState<DriverTripOverviewScreen> {
  late final SocketService _socket;

  @override
  void initState() {
    super.initState();
    _socket = SocketService.instance;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref
          .read(driverTripDetailProvider(widget.tripId).notifier)
          .loadTrip();
      await _socket.connectToTrip(widget.tripId);
      _socket.joinTripRoom(widget.tripId);
      _socket.on('conductor_offline', _handleConductorOffline);
      _socket.on('conductor_online', _handleConductorOnline);
    });
  }

  void _handleConductorOffline(dynamic data) {
    if (!mounted) return;
    final payload =
        data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
    final eventTripId =
        (payload['tripId'] ?? payload['trip_id'] ?? widget.tripId) as String;
    if (eventTripId != widget.tripId) return;

    final lastSeen =
        _parseDateTime(payload['lastSeenAt'] ?? payload['last_seen_at']);
    ref
        .read(driverTripDetailProvider(widget.tripId).notifier)
        .markConductorOffline(lastSeenAt: lastSeen);

    final trip = ref.read(driverTripDetailProvider(widget.tripId)).trip;
    DriverOfflineAlertOverlay.show(
      tripId: widget.tripId,
      tripName:
          payload['tripName'] as String? ?? trip?.tripName ?? 'Assigned Trip',
      onTakeOver: _takeOver,
      onDismiss: () {},
    );
  }

  void _handleConductorOnline(dynamic data) {
    if (!mounted) return;
    final payload =
        data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
    final eventTripId =
        (payload['tripId'] ?? payload['trip_id'] ?? widget.tripId) as String;
    if (eventTripId != widget.tripId) return;

    DriverOfflineAlertOverlay.hide();
    ref
        .read(driverTripDetailProvider(widget.tripId).notifier)
        .markConductorOnline();
  }

  Future<void> _takeOver() async {
    final notifier = ref.read(driverTripDetailProvider(widget.tripId).notifier);
    final success = await notifier.takeover();

    if (!mounted) return;

    if (success) {
      ref.read(driverModeTripIdProvider.notifier).state = widget.tripId;
      await GpsService.start(tripId: widget.tripId);
      SocketService.joinTrip(widget.tripId);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You are now in control of this trip'),
        ),
      );
      context.push(
        '/conductor/active/${widget.tripId}?driverMode=true',
        extra: true,
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Failed to take over trip. Please try again.'),
        backgroundColor: AppColors.errorContainer,
      ),
    );
  }

  @override
  void dispose() {
    _socket.off('conductor_offline');
    _socket.off('conductor_online');
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(driverTripDetailProvider(widget.tripId));
    final passengersAsync = ref.watch(passengersProvider(widget.tripId));
    final trip = state.trip;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: BackButton(
          onPressed: () => context.pop(),
        ),
        title: Text(
          trip?.tripName ?? 'Trip Overview',
          style: GoogleFonts.manrope(fontWeight: FontWeight.w800),
        ),
        actions: [
          if (state.hasDriverMode) const DriverModeAppBarBadge(),
        ],
      ),
      body: state.isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : trip == null
              ? Center(
                  child: Text(
                    state.error ?? 'Trip not available',
                    style: GoogleFonts.inter(color: AppColors.error),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _RouteHeaderCard(trip: trip),
                    const SizedBox(height: 16),
                    _ConductorStatusCard(trip: trip),
                    const SizedBox(height: 16),
                    _PassengerSummaryCard(
                      trip: trip,
                      passengersAsync: passengersAsync,
                    ),
                    const SizedBox(height: 16),
                    _BusInfoCard(busLabel: trip.busLabel),
                    const SizedBox(height: 24),
                    if (trip.isTakeoverEligible && !state.hasDriverMode)
                      SizedBox(
                        height: 52,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                          ),
                          onPressed: state.isTakingOver ? null : _takeOver,
                          child: state.isTakingOver
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Request Takeover'),
                        ),
                      ),
                    if (!trip.isTakeoverEligible && !state.hasDriverMode)
                      Text(
                        'Takeover becomes available after the conductor has been offline for more than 2 minutes.',
                        style: GoogleFonts.inter(
                          color: AppColors.onSurfaceVariant,
                          fontSize: 12,
                        ),
                        textAlign: TextAlign.center,
                      ),
                  ],
                ),
    );
  }
}

class _RouteHeaderCard extends StatelessWidget {
  const _RouteHeaderCard({required this.trip});

  final DriverTrip trip;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            trip.tripName,
            style: GoogleFonts.manrope(
              color: AppColors.onSurface,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            trip.displayRoute,
            style: GoogleFonts.inter(
              color: AppColors.onSurfaceVariant,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

class _ConductorStatusCard extends StatelessWidget {
  const _ConductorStatusCard({required this.trip});

  final DriverTrip trip;

  @override
  Widget build(BuildContext context) {
    final isOnline = trip.conductorOnline;
    final color = isOnline ? Colors.green : Colors.red;
    final title = isOnline ? 'Conductor Active' : 'Conductor Offline';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.manrope(
                  color: AppColors.onSurface,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Conductor: ${trip.conductorName ?? 'Not assigned'}',
            style: GoogleFonts.inter(color: AppColors.onSurfaceVariant),
          ),
          if (!isOnline)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Last seen: ${_formatLastSeen(trip.conductorLastSeenAt)}',
                style: GoogleFonts.inter(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 13,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _PassengerSummaryCard extends StatelessWidget {
  const _PassengerSummaryCard({
    required this.trip,
    required this.passengersAsync,
  });

  final DriverTrip trip;
  final AsyncValue passengersAsync;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Passengers',
            style: GoogleFonts.manrope(
              color: AppColors.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Total passengers count: ${trip.totalPassengers}',
            style: GoogleFonts.inter(color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 6),
          Text(
            'Alert progress: ${trip.alertedPassengers} of ${trip.totalPassengers} alerted',
            style: GoogleFonts.inter(color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 12),
          passengersAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (_, __) => const SizedBox.shrink(),
            data: (passengers) => Column(
              children: [
                for (final passenger in passengers.take(5))
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      passenger.name,
                      style: GoogleFonts.inter(color: AppColors.onSurface),
                    ),
                    subtitle: Text(
                      passenger.stopName,
                      style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                    trailing: Text(
                      passenger.alertStatus,
                      style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BusInfoCard extends StatelessWidget {
  const _BusInfoCard({required this.busLabel});

  final String? busLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Bus Info',
            style: GoogleFonts.manrope(
              color: AppColors.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            busLabel?.isNotEmpty == true ? busLabel! : 'Bus not assigned',
            style: GoogleFonts.inter(color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

DateTime? _parseDateTime(dynamic value) {
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value)?.toLocal();
}

String _formatLastSeen(DateTime? value) {
  if (value == null) return 'Unavailable';
  final now = DateTime.now();
  final diff = now.difference(value);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
  return '${value.day}/${value.month}/${value.year} ${value.hour}:${value.minute.toString().padLeft(2, '0')}';
}
