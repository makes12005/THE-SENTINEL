import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';
import '../../alerts/socket_service.dart';
import '../../gps/gps_service.dart';
import '../../passengers/model/passenger.dart';
import '../../passengers/provider/passengers_provider.dart';
import '../../trips/provider/trips_provider.dart';

class BoardingChecklistScreen extends ConsumerStatefulWidget {
  const BoardingChecklistScreen({super.key, required this.tripId});

  final String tripId;

  @override
  ConsumerState<BoardingChecklistScreen> createState() => _BoardingChecklistScreenState();
}

class _BoardingChecklistScreenState extends ConsumerState<BoardingChecklistScreen> {
  final _searchController = TextEditingController();
  final Set<String> _boarded = <String>{};
  bool _starting = false;

  Future<void> _startTrip(List<Passenger> passengers, {required bool force}) async {
    setState(() => _starting = true);
    try {
      final repo = ref.read(tripsRepositoryProvider);
      await repo.startTrip(
        widget.tripId,
        boardingChecklist: passengers.map((passenger) {
          final boarded = _boarded.contains(passenger.id);
          return {
            'id': passenger.id,
            'boarding_status': boarded ? 'boarded' : 'absent',
          };
        }).toList(),
      );

      ref.read(activeTripIdProvider.notifier).state = widget.tripId;
      await GpsService.start(tripId: widget.tripId);
      await SocketService.connect(tripId: widget.tripId);
      if (mounted) context.go('/conductor/active/${widget.tripId}');
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString()), backgroundColor: AppColors.errorContainer),
        );
      }
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final passengersAsync = ref.watch(passengersProvider(widget.tripId));
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: Text('Boarding Check', style: GoogleFonts.manrope(fontWeight: FontWeight.w800)),
      ),
      body: passengersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, _) => Center(child: Text(error.toString())),
        data: (passengers) {
          final filtered = passengers
              .where((passenger) =>
                  passenger.name.toLowerCase().contains(_searchController.text.toLowerCase()) ||
                  passenger.seatNo.toLowerCase().contains(_searchController.text.toLowerCase()))
              .toList()
            ..sort((a, b) => a.seatNo.compareTo(b.seatNo));
          final allBoarded = passengers.isNotEmpty && _boarded.length == passengers.length;
          final missing = passengers.length - _boarded.length;

          return Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Check off passengers as they board', style: GoogleFonts.inter(color: AppColors.onSurfaceVariant)),
                const SizedBox(height: 16),
                TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    hintText: 'Find by name or seat',
                    filled: true,
                    fillColor: AppColors.surfaceContainerHigh,
                  ),
                ),
                const SizedBox(height: 16),
                Text('${_boarded.length}/${passengers.length} boarded', style: GoogleFonts.manrope(color: AppColors.onSurface, fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),
                Expanded(
                  child: ListView.separated(
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, index) {
                      final passenger = filtered[index];
                      final boarded = _boarded.contains(passenger.id);
                      return CheckboxListTile(
                        value: boarded,
                        onChanged: (value) {
                          setState(() {
                            if (value == true) {
                              _boarded.add(passenger.id);
                            } else {
                              _boarded.remove(passenger.id);
                            }
                          });
                        },
                        title: Text('Seat ${passenger.seatNo.isEmpty ? '-' : passenger.seatNo} — ${passenger.name}', style: GoogleFonts.manrope(fontWeight: FontWeight.w700)),
                        subtitle: Text(passenger.pickupPoint.isEmpty ? 'Boards here' : passenger.pickupPoint, style: GoogleFonts.inter()),
                        activeColor: AppColors.primary,
                        tileColor: AppColors.surfaceContainerHigh,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: allBoarded && !_starting ? () => _startTrip(passengers, force: false) : null,
                    child: Text(_starting ? 'Starting...' : 'ALL BOARDED — START TRIP'),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: _starting
                        ? null
                        : () async {
                            final confirm = await showDialog<bool>(
                              context: context,
                              builder: (_) => AlertDialog(
                                title: const Text('Start anyway?'),
                                content: Text('$missing passengers not boarded. Continue?'),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                                  ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Continue')),
                                ],
                              ),
                            );
                            if (confirm == true) {
                              await _startTrip(passengers, force: true);
                            }
                          },
                    child: const Text('START ANYWAY'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
