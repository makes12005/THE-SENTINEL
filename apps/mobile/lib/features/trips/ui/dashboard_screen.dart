import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../model/trip.dart';
import '../provider/trips_provider.dart';
import '../../auth/provider/auth_provider.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../widgets/trip_card.dart';
import '../../../widgets/status_chip.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});
  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _selectedTab = 0;
  static const _tabs  = ['Today', 'Upcoming', 'Completed'];
  static const _statuses = ['scheduled', 'active', 'scheduled'];  // mapped by tab

  @override
  void initState() {
    super.initState();
    // Refresh trips when screen first opens
    Future.microtask(() => ref.read(tripsProvider.notifier).refresh(status: 'scheduled'));
  }

  void _onTabChanged(int idx) {
    setState(() => _selectedTab = idx);
    final status = idx == 0 ? 'scheduled' : idx == 2 ? 'completed' : null;
    ref.read(tripsProvider.notifier).refresh(status: status);
  }

  Future<void> _onLogout() async {
    await ref.read(authProvider.notifier).logout();
    if (mounted) context.go(AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    final tripsAsync = ref.watch(tripsProvider);

    return Scaffold(
      body: Stack(
        children: [
          // ── Ambient glow ──────────────────────────────────────────────────
          Positioned(
            top: -40, right: -60,
            child: Container(
              width: 220, height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withOpacity(0.05),
              ),
            ),
          ),

          Column(
            children: [
              // ── Top app bar ────────────────────────────────────────────────
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: Row(
                    children: [
                      const Icon(Icons.directions_bus_rounded, color: AppColors.primary, size: 28),
                      const SizedBox(width: 10),
                      Text(
                        'My Trips',
                        style: GoogleFonts.manrope(
                          color: AppColors.primary,
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      // LIVE badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.tertiaryContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'LIVE',
                          style: GoogleFonts.inter(
                            color: AppColors.tertiary,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      PopupMenuButton<String>(
                        icon: const Icon(Icons.account_circle_outlined, color: AppColors.onSurface),
                        color: AppColors.surfaceContainerHigh,
                        onSelected: (v) { if (v == 'logout') _onLogout(); },
                        itemBuilder: (_) => [
                          PopupMenuItem(
                            value: 'logout',
                            child: Row(children: [
                              const Icon(Icons.logout, color: AppColors.error, size: 18),
                              const SizedBox(width: 8),
                              Text('Logout', style: GoogleFonts.inter(color: AppColors.onSurface)),
                            ]),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // ── Segmented tab control ──────────────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerLowest,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  padding: const EdgeInsets.all(6),
                  child: Row(
                    children: List.generate(_tabs.length, (i) {
                      final active = i == _selectedTab;
                      return Expanded(
                        child: GestureDetector(
                          onTap: () => _onTabChanged(i),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            curve: Curves.easeInOut,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: active ? AppColors.surfaceContainerHighest : Colors.transparent,
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: Text(
                              _tabs[i],
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(
                                color: active ? AppColors.tertiary : AppColors.onSurfaceVariant,
                                fontSize: 13,
                                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // ── Section label ──────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  children: [
                    Text(
                      'ACTIVE ASSIGNMENTS',
                      style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── Trips list ─────────────────────────────────────────────────
              Expanded(
                child: tripsAsync.when(
                  loading: () => const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                  error: (e, _) => _ErrorState(
                    message: e.toString(),
                    onRetry: () => ref.read(tripsProvider.notifier).refresh(),
                  ),
                  data: (trips) {
                    if (trips.isEmpty) {
                      return _EmptyState(tab: _tabs[_selectedTab]);
                    }
                    return RefreshIndicator(
                      color: AppColors.primary,
                      backgroundColor: AppColors.surfaceContainerHigh,
                      onRefresh: () => ref.read(tripsProvider.notifier).refresh(),
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
                        itemCount: trips.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 16),
                        itemBuilder: (context, i) => TripCard(
                          trip: trips[i],
                          onTap: () => context.push('/trips/${trips[i].id}'),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),

      // ── Bottom nav ─────────────────────────────────────────────────────────
      bottomNavigationBar: _BusAlertBottomNav(currentIndex: 0),
    );
  }
}

// ── Bottom navigation bar ─────────────────────────────────────────────────────
class _BusAlertBottomNav extends StatelessWidget {
  final int currentIndex;
  const _BusAlertBottomNav({required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        border: const Border(top: BorderSide(color: AppColors.outlineVariant, width: 0.5)),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(icon: Icons.route_rounded, label: 'Trips',     active: currentIndex == 0),
              _NavItem(icon: Icons.notifications_active_outlined, label: 'Alerts', active: currentIndex == 1),
              _NavItem(icon: Icons.account_circle_outlined, label: 'Account', active: currentIndex == 2),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  const _NavItem({required this.icon, required this.label, required this.active});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      decoration: BoxDecoration(
        color: active ? AppColors.surfaceContainerHigh : Colors.transparent,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: active ? AppColors.tertiary : AppColors.onSurfaceVariant, size: 24),
          const SizedBox(height: 4),
          Text(
            label.toUpperCase(),
            style: GoogleFonts.inter(
              color: active ? AppColors.tertiary : AppColors.onSurfaceVariant.withOpacity(0.6),
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Empty / Error states ──────────────────────────────────────────────────────
class _EmptyState extends StatelessWidget {
  final String tab;
  const _EmptyState({required this.tab});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.directions_bus_outlined, color: AppColors.outlineVariant, size: 64),
          const SizedBox(height: 16),
          Text(
            'No $tab trips',
            style: GoogleFonts.manrope(color: AppColors.onSurfaceVariant, fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            'Your assigned trips will appear here.',
            style: GoogleFonts.inter(color: AppColors.outline, fontSize: 14),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off_rounded, color: AppColors.error, size: 48),
          const SizedBox(height: 12),
          Text('Could not load trips', style: GoogleFonts.manrope(color: AppColors.onSurface, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(message, style: GoogleFonts.inter(color: AppColors.onSurfaceVariant, fontSize: 12), textAlign: TextAlign.center),
          const SizedBox(height: 20),
          ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
