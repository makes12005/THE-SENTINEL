import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../provider/driver_provider.dart';
import '../model/driver_trip.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';

/// Driver Dashboard — mirrors the conductor DashboardScreen layout
/// but adapted for the driver "Transit Hub" (screen 1.html).
///
/// Shows Today / Upcoming / Completed trip tabs.
/// Each trip card shows a "Takeover Required" badge when conductorOnline == false.
class DriverDashboardScreen extends ConsumerStatefulWidget {
  const DriverDashboardScreen({super.key});

  @override
  ConsumerState<DriverDashboardScreen> createState() =>
      _DriverDashboardScreenState();
}

class _DriverDashboardScreenState
    extends ConsumerState<DriverDashboardScreen> {
  int _tabIndex = 0; // 0=Today, 1=Upcoming, 2=Completed

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(driverTripsProvider.notifier).loadTrips();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(driverTripsProvider);
    final tabs = ['Today', 'Upcoming', 'Completed'];
    final lists = [state.today, state.upcoming, state.completed];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ────────────────────────────────────────────────
            _buildHeader(),

            // ── Tab Control ───────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
              child: _SegmentedControl(
                tabs:     tabs,
                selected: _tabIndex,
                onTap:    (i) => setState(() => _tabIndex = i),
              ),
            ),

            // ── Content ───────────────────────────────────────────────
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                backgroundColor: AppColors.surfaceContainerHigh,
                onRefresh: () =>
                    ref.read(driverTripsProvider.notifier).loadTrips(),
                child: state.isLoading
                    ? const Center(
                        child: CircularProgressIndicator(color: AppColors.primary))
                    : state.error != null
                        ? _ErrorView(error: state.error!)
                        : lists[_tabIndex].isEmpty
                            ? _EmptyView(tab: tabs[_tabIndex])
                            : ListView.separated(
                                padding: const EdgeInsets.all(16),
                                itemCount: lists[_tabIndex].length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 12),
                                itemBuilder: (_, i) {
                                  final trip = lists[_tabIndex][i];
                                  return _DriverTripCard(
                                    trip: trip,
                                    onTap: () => context.push(
                                      AppRoutes.driverTripDetail
                                          .replaceAll(':tripId', trip.id),
                                    ),
                                  );
                                },
                              ),
              ),
            ),
          ],
        ),
      ),

      // ── Bottom Navigation ──────────────────────────────────────────
      bottomNavigationBar: _buildBottomNav(tabs),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      color: const Color(0xFF181c20),
      child: Row(
        children: [
          const Icon(Icons.directions_bus_rounded, color: AppColors.primary, size: 24),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Transit Hub',
                    style: GoogleFonts.manrope(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w800,
                        fontSize: 22,
                        letterSpacing: -0.5)),
                Text('Driver Console • Active Duty',
                    style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.5)),
              ],
            ),
          ),
          Container(
            width: 36, height: 36,
            decoration: const BoxDecoration(
                color: AppColors.surfaceContainerHigh, shape: BoxShape.circle),
            child: const Icon(Icons.person_outline, color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNav(List<String> tabs) {
    final icons = [Icons.today_outlined, Icons.event_outlined, Icons.history_outlined];
    final activeIcons = [Icons.today_rounded, Icons.event_rounded, Icons.history_rounded];
    return Container(
      padding: const EdgeInsets.only(bottom: 8, top: 8),
      decoration: const BoxDecoration(
        color: Color(0xFF101418),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24), topRight: Radius.circular(24)),
        boxShadow: [BoxShadow(color: Colors.black38, blurRadius: 24, offset: Offset(0, -4))],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(3, (i) {
          final active = _tabIndex == i;
          return GestureDetector(
            onTap: () => setState(() => _tabIndex = i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(
                color: active ? AppColors.surfaceContainerHigh : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(active ? activeIcons[i] : icons[i],
                      color: active ? AppColors.primary : AppColors.onSurfaceVariant),
                  const SizedBox(height: 4),
                  Text(tabs[i],
                      style: GoogleFonts.inter(
                        color: active ? AppColors.primary : AppColors.onSurfaceVariant,
                        fontSize: 11, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}

// ── Driver Trip Card ──────────────────────────────────────────────────────────

class _DriverTripCard extends StatelessWidget {
  final DriverTrip trip;
  final VoidCallback onTap;

  const _DriverTripCard({required this.trip, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final needsTakeover = trip.needsTakeover;
    final borderColor = needsTakeover ? AppColors.tertiary : AppColors.primary;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(20),
          border: Border(left: BorderSide(color: borderColor, width: 4)),
        ),
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status badge
                  _StatusBadge(needsTakeover: needsTakeover, status: trip.status),
                  const SizedBox(height: 10),
                  // Route
                  Text(
                    trip.displayRoute,
                    style: GoogleFonts.manrope(
                      color: AppColors.onSurface,
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Conductor
                  if (trip.conductorName != null)
                    Row(
                      children: [
                        Icon(
                          needsTakeover ? Icons.wifi_off_rounded : Icons.person_check_outlined,
                          color: needsTakeover ? AppColors.tertiary : AppColors.onSurfaceVariant,
                          size: 14,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          trip.conductorName!,
                          style: GoogleFonts.inter(
                            color: needsTakeover ? AppColors.tertiary : AppColors.onSurfaceVariant,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  trip.scheduledDate.isNotEmpty ? trip.scheduledDate.substring(0, 10) : '',
                  style: GoogleFonts.inter(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 6),
                Icon(Icons.chevron_right_rounded,
                    color: AppColors.onSurfaceVariant, size: 20),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final bool needsTakeover;
  final String status;
  const _StatusBadge({required this.needsTakeover, required this.status});

  @override
  Widget build(BuildContext context) {
    if (needsTakeover) {
      return _PulsingBadge(label: 'TAKEOVER REQUIRED', color: AppColors.tertiary);
    }
    switch (status) {
      case 'active':
        return _PulsingBadge(label: 'CONDUCTOR ACTIVE', color: const Color(0xFF4CAF50));
      case 'scheduled':
        return _SimpleBadge(label: 'READY', color: AppColors.primary);
      case 'completed':
        return _SimpleBadge(label: 'COMPLETED', color: AppColors.onSurfaceVariant);
      default:
        return const SizedBox.shrink();
    }
  }
}

class _PulsingBadge extends StatefulWidget {
  final String label;
  final Color color;
  const _PulsingBadge({required this.label, required this.color});

  @override
  State<_PulsingBadge> createState() => _PulsingBadgeState();
}

class _PulsingBadgeState extends State<_PulsingBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1000))
      ..repeat(reverse: true);
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: widget.color.withOpacity(0.1 + _ctrl.value * 0.1),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: widget.color.withOpacity(0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 6, height: 6,
              decoration: BoxDecoration(
                color: widget.color,
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: widget.color.withOpacity(0.5 + _ctrl.value * 0.5), blurRadius: 8)],
              ),
            ),
            const SizedBox(width: 6),
            Text(
              widget.label,
              style: GoogleFonts.inter(
                color: widget.color,
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SimpleBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _SimpleBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          color: color, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.2),
      ),
    );
  }
}

// ── Supporting widgets ────────────────────────────────────────────────────────

class _SegmentedControl extends StatelessWidget {
  final List<String> tabs;
  final int selected;
  final ValueChanged<int> onTap;

  const _SegmentedControl(
      {required this.tabs, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: List.generate(tabs.length, (i) {
          final active = i == selected;
          return Expanded(
            child: GestureDetector(
              onTap: () => onTap(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: active ? AppColors.surfaceContainerHigh : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  tabs[i],
                  style: GoogleFonts.inter(
                    color: active ? AppColors.primary : AppColors.onSurfaceVariant,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  final String tab;
  const _EmptyView({required this.tab});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.directions_bus_outlined, color: AppColors.outline, size: 48),
          const SizedBox(height: 16),
          Text('No $tab trips',
              style: GoogleFonts.manrope(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 16,
                  fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String error;
  const _ErrorView({required this.error});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(error,
            style: GoogleFonts.inter(color: AppColors.error),
            textAlign: TextAlign.center),
      ),
    );
  }
}
