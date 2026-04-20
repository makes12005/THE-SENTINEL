import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../provider/trips_provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/router/app_router.dart';
import '../../../widgets/status_chip.dart';
import '../../gps/gps_service.dart';
import '../../alerts/socket_service.dart';

class TripDetailScreen extends ConsumerStatefulWidget {
  final String tripId;
  const TripDetailScreen({super.key, required this.tripId});

  @override
  ConsumerState<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends ConsumerState<TripDetailScreen> {
  bool _starting = false;
  bool _completing = false;

  Future<void> _onStartTrip() async {
    setState(() => _starting = true);
    try {
      final repo = ref.read(tripsRepositoryProvider);
      await repo.startTrip(widget.tripId);

      // Mark active trip
      ref.read(activeTripIdProvider.notifier).state = widget.tripId;

      // Start background GPS foreground service
      await GpsService.start(tripId: widget.tripId);

      // Connect Socket.IO
      SocketService.connect(tripId: widget.tripId);

      if (mounted) {
        context.push('/trips/${widget.tripId}/passengers');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Failed to start trip: $e'),
          backgroundColor: AppColors.errorContainer,
        ));
      }
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  Future<void> _onEndTrip() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surfaceContainerHigh,
        title: Text('End Trip?', style: GoogleFonts.manrope(
          color: AppColors.onSurface, fontWeight: FontWeight.w700)),
        content: Text(
          'This will stop GPS tracking and mark the trip as completed.',
          style: GoogleFonts.inter(color: AppColors.onSurfaceVariant),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel', style: GoogleFonts.inter(color: AppColors.onSurfaceVariant)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.errorContainer),
            onPressed: () => Navigator.pop(context, true),
            child: Text('End Trip', style: GoogleFonts.inter(color: AppColors.error)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _completing = true);
    try {
      final repo = ref.read(tripsRepositoryProvider);
      await repo.completeTrip(widget.tripId);
      await GpsService.stop();
      SocketService.disconnect();
      ref.read(activeTripIdProvider.notifier).state = null;
      if (mounted) context.go(AppRoutes.dashboard);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Error: $e'),
        backgroundColor: AppColors.errorContainer,
      ));
    } finally {
      if (mounted) setState(() => _completing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tripAsync = ref.watch(tripDetailProvider(widget.tripId));

    return Scaffold(
      body: tripAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: AppColors.error, size: 48),
              const SizedBox(height: 12),
              Text(e.toString(), style: GoogleFonts.inter(color: AppColors.onSurfaceVariant)),
            ],
          ),
        ),
        data: (trip) => Stack(
          children: [
            // ── Ambient glow ────────────────────────────────────────────────
            Positioned(
              top: -60, right: -60,
              child: Container(
                width: 240, height: 240,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary.withOpacity(0.07),
                ),
              ),
            ),

            Column(
              children: [
                // ── App bar ──────────────────────────────────────────────────
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.primary),
                          onPressed: () => context.pop(),
                        ),
                        Text(
                          'TRIP DETAILS',
                          style: GoogleFonts.manrope(
                            color: AppColors.onSurface,
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 120),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ── Status hero ────────────────────────────────────────
                        Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('CURRENT STATUS', style: GoogleFonts.inter(
                                  color: AppColors.onSurfaceVariant, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
                                const SizedBox(height: 4),
                                StatusChip(status: trip.isActive ? 'active' : 'ready'),
                              ],
                            ),
                            const Spacer(),
                            // GPS & Network status bento
                            Row(
                              children: [
                                _StatusTile(icon: Icons.gps_fixed_rounded, label: 'GPS', active: true),
                                const SizedBox(width: 8),
                                _StatusTile(icon: Icons.wifi_rounded, label: 'NET', active: true),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // ── Main trip card ─────────────────────────────────────
                        Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.secondaryContainer,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text('ROUTE PLAN', style: GoogleFonts.inter(
                                  color: AppColors.onSecondaryContainer, fontSize: 10, fontWeight: FontWeight.w700)),
                              ),
                              const SizedBox(height: 20),
                              // From
                              Row(children: [
                                const Icon(Icons.radio_button_checked, color: AppColors.primaryFixedDim, size: 16),
                                const SizedBox(width: 12),
                                Text(trip.fromCity, style: GoogleFonts.manrope(
                                  color: AppColors.onSurface, fontSize: 24, fontWeight: FontWeight.w700)),
                              ]),
                              // Connector
                              Padding(
                                padding: const EdgeInsets.only(left: 7),
                                child: Container(width: 2, height: 28, color: AppColors.outlineVariant),
                              ),
                              // To
                              Row(children: [
                                const Icon(Icons.location_on, color: AppColors.secondary, size: 16),
                                const SizedBox(width: 12),
                                Text(trip.toCity, style: GoogleFonts.manrope(
                                  color: AppColors.onSurface, fontSize: 24, fontWeight: FontWeight.w700)),
                              ]),
                              const SizedBox(height: 20),
                              // Date chip
                              Row(children: [
                                const Icon(Icons.schedule_rounded, color: AppColors.primary, size: 18),
                                const SizedBox(width: 8),
                                Text(trip.scheduledDate, style: GoogleFonts.inter(
                                  color: AppColors.onSurface, fontWeight: FontWeight.w600)),
                              ]),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // ── Crew section ────────────────────────────────────────
                        Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('CREW PERSONNEL', style: GoogleFonts.inter(
                                color: AppColors.onSurfaceVariant, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
                              const SizedBox(height: 16),
                              // Driver row
                              if (trip.driverName != null)
                                _CrewTile(role: 'DRIVER', name: trip.driverName!, isYou: false),
                              const SizedBox(height: 12),
                              // Conductor row (you)
                              _CrewTile(role: 'CONDUCTOR', name: 'You', isYou: true),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // ── Floating action button ────────────────────────────────────────
            Positioned(
              bottom: 0, left: 0, right: 0,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [AppColors.background, AppColors.background.withOpacity(0)],
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
                child: trip.isActive
                    ? SizedBox(
                        height: 64,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.errorContainer,
                            foregroundColor: AppColors.error,
                          ),
                          onPressed: _completing ? null : _onEndTrip,
                          icon: _completing
                              ? const SizedBox(width: 20, height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.error))
                              : const Icon(Icons.stop_circle_rounded),
                          label: Text('END TRIP', style: GoogleFonts.manrope(
                            fontWeight: FontWeight.w800, fontSize: 18, letterSpacing: 2)),
                        ),
                      )
                    : SizedBox(
                        height: 64,
                        child: ElevatedButton.icon(
                          onPressed: _starting ? null : _onStartTrip,
                          icon: _starting
                              ? const SizedBox(width: 20, height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimaryContainer))
                              : const Icon(Icons.play_arrow_rounded),
                          label: Text('START TRIP', style: GoogleFonts.manrope(
                            fontWeight: FontWeight.w800, fontSize: 18, letterSpacing: 2)),
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── GPS/Network status mini tiles ─────────────────────────────────────────────
class _StatusTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  const _StatusTile({required this.icon, required this.label, required this.active});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.secondary, size: 20),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.inter(color: AppColors.onSurfaceVariant, fontSize: 9, fontWeight: FontWeight.w700)),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 6, height: 6, decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: active ? const Color(0xFF4CAF50) : AppColors.error)),
              const SizedBox(width: 4),
              Text(active ? 'ON' : 'OFF', style: GoogleFonts.manrope(
                color: AppColors.onSurface, fontSize: 12, fontWeight: FontWeight.w700)),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Crew tile ─────────────────────────────────────────────────────────────────
class _CrewTile extends StatelessWidget {
  final String role;
  final String name;
  final bool isYou;
  const _CrewTile({required this.role, required this.name, required this.isYou});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: isYou ? AppColors.secondaryContainer : AppColors.surfaceContainerHighest,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.person_rounded,
              color: isYou ? AppColors.onSecondaryContainer : AppColors.onSurfaceVariant),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(role, style: GoogleFonts.inter(
                  color: AppColors.onSurfaceVariant, fontSize: 10, fontWeight: FontWeight.w700)),
                Text(name, style: GoogleFonts.manrope(
                  color: AppColors.onSurface, fontWeight: FontWeight.w700, fontSize: 15)),
              ],
            ),
          ),
          if (isYou)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.18),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text('ACTIVE', style: GoogleFonts.inter(
                color: AppColors.primaryFixed, fontSize: 10, fontWeight: FontWeight.w700)),
            )
          else
            const Icon(Icons.verified_rounded, color: AppColors.onSurfaceVariant, size: 20),
        ],
      ),
    );
  }
}
