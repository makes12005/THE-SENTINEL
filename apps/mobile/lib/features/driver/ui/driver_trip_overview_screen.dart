import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../provider/driver_provider.dart';
import '../../passengers/ui/passengers_screen.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../features/alerts/socket_service.dart';
import '../../../features/gps/gps_service.dart';
import '../../../widgets/driver_mode_badge.dart';
import 'conductor_offline_alert.dart';

/// Driver Trip Overview — read-only view of an active trip.
/// Based on docs/ui/screen/driver/2.html.
///
/// Shows:
///   - Route info (from → to, departure, ETA)
///   - Conductor status (Connected green / Disconnected orange pulsing)
///   - "Take Over Trip" button when conductor disconnected
///   - "DRIVER MODE" badge in top-right after takeover
class DriverTripOverviewScreen extends ConsumerStatefulWidget {
  final String tripId;
  const DriverTripOverviewScreen({super.key, required this.tripId});

  @override
  ConsumerState<DriverTripOverviewScreen> createState() =>
      _DriverTripOverviewScreenState();
}

class _DriverTripOverviewScreenState
    extends ConsumerState<DriverTripOverviewScreen> {
  int _navIndex = 0; // 0=Route, 1=Passengers
  late final SocketService _socket;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(driverTripDetailProvider(widget.tripId).notifier).loadTrip();
      _initSocket();
    });
  }

  void _initSocket() {
    _socket = SocketService.instance;
    _socket.connect(widget.tripId);

    // Conductor went offline — update state and show full-screen alert
    _socket.on('conductor_offline', (data) {
      if (!mounted) return;
      ref
          .read(driverTripDetailProvider(widget.tripId).notifier)
          .markConductorOffline();
      _showTakeoverAlert();
    });

    // Another device confirmed takeover
    _socket.on('conductor_replaced', (data) {
      if (!mounted) return;
      ref
          .read(driverTripDetailProvider(widget.tripId).notifier)
          .markDriverModeActive();
    });
  }

  Future<void> _showTakeoverAlert() async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => ConductorOfflineAlert(
        tripId: widget.tripId,
        onTakeOver: _takeOver,
        onDismiss: () => Navigator.of(context).pop(),
      ),
    );
  }

  Future<void> _takeOver() async {
    Navigator.of(context).pop(); // close alert dialog
    final success = await ref
        .read(driverTripDetailProvider(widget.tripId).notifier)
        .takeover();

    if (success && mounted) {
      // Start GPS service — same as conductor
      await GpsService.start(tripId: widget.tripId);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Takeover successful — GPS started'),
          backgroundColor: Color(0xFF4CAF50),
        ),
      );
    } else if (mounted) {
      final err = ref.read(driverTripDetailProvider(widget.tripId)).error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err ?? 'Takeover failed'),
          backgroundColor: AppColors.errorContainer,
        ),
      );
    }
  }

  @override
  void dispose() {
    _socket.off('conductor_offline');
    _socket.off('conductor_replaced');
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(driverTripDetailProvider(widget.tripId));
    final trip  = state.trip;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // ── Main content ─────────────────────────────────────────
          SafeArea(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : trip == null
                    ? Center(child: Text(state.error ?? 'Loading…',
                          style: GoogleFonts.inter(color: AppColors.error)))
                    : _navIndex == 1
                        ? PassengersScreen(
                            tripId: widget.tripId,
                            isDriverMode: state.hasDriverMode,
                          )
                        : _buildRouteView(trip, state),
          ),

          // ── Driver Mode badge ─────────────────────────────────────
          if (state.hasDriverMode)
            const Positioned(top: 56, right: 16, child: DriverModeBadge()),
        ],
      ),

      // ── Bottom Navigation ──────────────────────────────────────────
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildRouteView(trip, state) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          backgroundColor: const Color(0xFF181c20),
          leading: BackButton(
            color: AppColors.onSurface,
            onPressed: () => context.pop(),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                trip.displayRoute,
                style: GoogleFonts.manrope(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w700,
                    fontSize: 17),
              ),
              Text(
                trip.routeName,
                style: GoogleFonts.inter(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 11,
                    letterSpacing: 1.5,
                    fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.all(20),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              // ── Route hero card ─────────────────────────────────
              _RouteHeroCard(trip: trip),
              const SizedBox(height: 20),

              // ── Conductor status card ────────────────────────────
              _ConductorStatusCard(
                conductorName: trip.conductorName ?? 'Unknown',
                online: trip.conductorOnline,
                isTakingOver: state.isTakingOver,
                hasDriverMode: state.hasDriverMode,
                onTakeOver: _takeOver,
              ),

              const SizedBox(height: 80),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomNav() {
    final items = [
      (Icons.route_outlined, 'ROUTE'),
      (Icons.group_outlined, 'PASSENGERS'),
    ];
    return Container(
      padding: const EdgeInsets.only(bottom: 8, top: 8),
      decoration: const BoxDecoration(
        color: Color(0xFF181c20),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24), topRight: Radius.circular(24)),
        boxShadow: [BoxShadow(color: Colors.black38, blurRadius: 24, offset: Offset(0, -4))],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(2, (i) {
          final active = _navIndex == i;
          return GestureDetector(
            onTap: () => setState(() => _navIndex = i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
              decoration: BoxDecoration(
                color: active ? AppColors.surfaceContainerHigh : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(items[i].$1,
                      color: active ? AppColors.primary : AppColors.onSurfaceVariant),
                  const SizedBox(height: 4),
                  Text(items[i].$2,
                      style: GoogleFonts.inter(
                        color: active ? AppColors.primary : AppColors.onSurfaceVariant,
                        fontSize: 10, fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                      )),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}

// ── Route Hero Card ───────────────────────────────────────────────────────────

class _RouteHeroCard extends StatelessWidget {
  final trip;
  const _RouteHeroCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ACTIVE ROUTE',
              style: GoogleFonts.inter(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.5)),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(trip.fromCity,
                  style: GoogleFonts.manrope(
                      color: AppColors.onSurface,
                      fontSize: 26,
                      fontWeight: FontWeight.w800)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Icon(Icons.east_rounded, color: AppColors.primary, size: 22),
              ),
              Text(trip.toCity,
                  style: GoogleFonts.manrope(
                      color: AppColors.onSurface,
                      fontSize: 26,
                      fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('DEPARTURE',
                          style: GoogleFonts.inter(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 9, fontWeight: FontWeight.w700,
                              letterSpacing: 1.2)),
                      const SizedBox(height: 4),
                      Text(
                        trip.scheduledDate.isNotEmpty
                            ? trip.scheduledDate.substring(0, 10)
                            : '—',
                        style: GoogleFonts.manrope(
                            color: AppColors.onSurface, fontSize: 15,
                            fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('STATUS',
                          style: GoogleFonts.inter(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 9, fontWeight: FontWeight.w700,
                              letterSpacing: 1.2)),
                      const SizedBox(height: 4),
                      Text(
                        trip.status.toUpperCase(),
                        style: GoogleFonts.manrope(
                            color: trip.isActive ? const Color(0xFF4CAF50) : AppColors.onSurface,
                            fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Conductor Status Card (core driver interaction) ────────────────────────────

class _ConductorStatusCard extends StatelessWidget {
  final String conductorName;
  final bool online;
  final bool isTakingOver;
  final bool hasDriverMode;
  final VoidCallback onTakeOver;

  const _ConductorStatusCard({
    required this.conductorName,
    required this.online,
    required this.isTakingOver,
    required this.hasDriverMode,
    required this.onTakeOver,
  });

  @override
  Widget build(BuildContext context) {
    // If driver mode is already active → show confirmation chip
    if (hasDriverMode) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF4CAF50).withOpacity(0.1),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFF4CAF50).withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFF4CAF50).withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_outline_rounded,
                  color: Color(0xFF4CAF50), size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('YOU ARE IN CONTROL',
                      style: GoogleFonts.inter(
                        color: const Color(0xFF4CAF50),
                        fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
                  Text('Driver mode active — GPS running',
                      style: GoogleFonts.manrope(
                          color: AppColors.onSurface,
                          fontSize: 15, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // Normal / warning state
    final isWarning = !online;
    final cardColor = isWarning
        ? AppColors.tertiaryContainer.withOpacity(0.3)
        : AppColors.surfaceContainerLow;
    final borderColor = isWarning
        ? AppColors.tertiary.withOpacity(0.3)
        : Colors.transparent;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: (isWarning ? AppColors.tertiary : AppColors.secondary)
                      .withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isWarning ? Icons.wifi_off_rounded : Icons.person_check_outlined,
                  color: isWarning ? AppColors.tertiary : AppColors.secondary,
                  size: 26,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isWarning ? 'CURRENT STATUS' : 'SECONDARY STATUS',
                      style: GoogleFonts.inter(
                        color: isWarning ? AppColors.tertiary : AppColors.onSurfaceVariant,
                        fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.2),
                    ),
                    Text(
                      isWarning ? 'Conductor Disconnected' : 'Conductor Active',
                      style: GoogleFonts.manrope(
                        color: isWarning ? AppColors.tertiary : AppColors.onSurface,
                        fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    Text(
                      'Conductor: $conductorName',
                      style: GoogleFonts.inter(
                        color: isWarning
                            ? AppColors.tertiary.withOpacity(0.8)
                            : AppColors.onSurfaceVariant,
                        fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              if (isWarning)
                _PulsingDot()
              else
                const Icon(Icons.check_circle_outline, color: AppColors.primary),
            ],
          ),

          // Take Over button — only shown when conductor offline
          if (isWarning) ...[
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 58,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.tertiary,
                  foregroundColor: AppColors.onTertiary,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                onPressed: isTakingOver ? null : onTakeOver,
                icon: isTakingOver
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.assignment_ind_rounded),
                label: Text(
                  isTakingOver ? 'TAKING OVER…' : 'TAKE OVER TRIP',
                  style: GoogleFonts.manrope(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PulsingDot extends StatefulWidget {
  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) => Container(
        width: 12, height: 12,
        decoration: BoxDecoration(
          color: AppColors.tertiary,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: AppColors.tertiary.withOpacity(0.4 + _ctrl.value * 0.6),
              blurRadius: 8 + _ctrl.value * 8,
            ),
          ],
        ),
      ),
    );
  }
}
