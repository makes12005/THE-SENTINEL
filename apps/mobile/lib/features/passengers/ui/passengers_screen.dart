import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_colors.dart';
import '../../../widgets/status_chip.dart';
import '../../alerts/socket_service.dart';
import '../../driver/ui/driver_offline_alert_overlay.dart';
import '../model/passenger.dart';
import '../provider/passengers_provider.dart';

class PassengersScreen extends ConsumerStatefulWidget {
  const PassengersScreen({
    super.key,
    required this.tripId,
    this.isDriverMode = false,
  });

  final String tripId;
  final bool isDriverMode;

  @override
  ConsumerState<PassengersScreen> createState() => _PassengersScreenState();
}

class _PassengersScreenState extends ConsumerState<PassengersScreen> {
  @override
  void initState() {
    super.initState();
    if (!widget.isDriverMode) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        SocketService.registerDialogContext(context);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(passengersProvider(widget.tripId));

    return Scaffold(
      body: Column(
        children: [
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                children: [
                  const Icon(
                    Icons.people_alt_rounded,
                    color: AppColors.primary,
                    size: 26,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'PASSENGERS',
                    style: GoogleFonts.manrope(
                      color: AppColors.primary,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.5,
                    ),
                  ),
                  const Spacer(),
                  if (widget.isDriverMode) const DriverModeAppBarBadge(),
                ],
              ),
            ),
          ),
          state.whenOrNull(
                data: (passengers) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: _SummaryRow(passengers: passengers),
                ),
              ) ??
              const SizedBox.shrink(),
          const SizedBox(height: 16),
          Expanded(
            child: state.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
              error: (error, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      color: AppColors.error,
                      size: 48,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      error.toString(),
                      style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () => ref
                          .read(passengersProvider(widget.tripId).notifier)
                          .refresh(),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              data: (passengers) => passengers.isEmpty
                  ? const _EmptyPassengers()
                  : RefreshIndicator(
                      color: AppColors.primary,
                      backgroundColor: AppColors.surfaceContainerHigh,
                      onRefresh: () => ref
                          .read(passengersProvider(widget.tripId).notifier)
                          .refresh(),
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 8,
                        ),
                        itemCount: passengers.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) => _PassengerTile(
                          passenger: passengers[index],
                        ),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.passengers});

  final List<Passenger> passengers;

  @override
  Widget build(BuildContext context) {
    final total = passengers.length;
    final pending = passengers.where((p) => p.isPending).length;
    final sent = passengers.where((p) => p.isSent).length;
    final failed = passengers.where((p) => p.isFailed).length;

    return Row(
      children: [
        _Chip(label: 'TOTAL', value: '$total', color: AppColors.primary),
        const SizedBox(width: 8),
        _Chip(label: 'PENDING', value: '$pending', color: AppColors.tertiary),
        const SizedBox(width: 8),
        _Chip(label: 'SENT', value: '$sent', color: AppColors.success),
        const SizedBox(width: 8),
        _Chip(label: 'FAILED', value: '$failed', color: AppColors.error),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: GoogleFonts.manrope(
                color: color,
                fontWeight: FontWeight.w800,
                fontSize: 20,
              ),
            ),
            Text(
              label,
              style: GoogleFonts.inter(
                color: color.withValues(alpha: 0.7),
                fontSize: 9,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PassengerTile extends StatelessWidget {
  const _PassengerTile({required this.passenger});

  final Passenger passenger;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(20),
        border: passenger.isFailed
            ? Border.all(
                color: AppColors.error.withValues(alpha: 0.3),
                width: 1,
              )
            : null,
      ),
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHighest,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                passenger.name.isNotEmpty
                    ? passenger.name[0].toUpperCase()
                    : '?',
                style: GoogleFonts.manrope(
                  color: AppColors.primary,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  passenger.name,
                  style: GoogleFonts.manrope(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      color: AppColors.outline,
                      size: 14,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      passenger.stopName,
                      style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          StatusChip(status: passenger.alertStatus),
        ],
      ),
    );
  }
}

class _EmptyPassengers extends StatelessWidget {
  const _EmptyPassengers();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.people_outline_rounded,
            color: AppColors.outlineVariant,
            size: 64,
          ),
          const SizedBox(height: 16),
          Text(
            'No passengers',
            style: GoogleFonts.manrope(
              color: AppColors.onSurfaceVariant,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Passengers will appear when the trip begins.',
            style: GoogleFonts.inter(
              color: AppColors.outline,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
