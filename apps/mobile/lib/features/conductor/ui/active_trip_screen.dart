import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';
import '../../alerts/stop_alert_service.dart';
import '../../passengers/model/passenger.dart';
import '../../passengers/provider/passengers_provider.dart';

class ActiveTripScreen extends ConsumerStatefulWidget {
  const ActiveTripScreen({super.key, required this.tripId, this.isDriverMode = false});

  final String tripId;
  final bool isDriverMode;

  @override
  ConsumerState<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends ConsumerState<ActiveTripScreen> {
  int _currentStopIndex = 0;
  Position? _currentPosition;
  StreamSubscription<Position>? _positionSub;

  @override
  void initState() {
    super.initState();
    StopAlertService.instance.configure();
    _positionSub = Geolocator.getPositionStream().listen((position) {
      setState(() => _currentPosition = position);
    });
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final passengersAsync = ref.watch(passengersProvider(widget.tripId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: Text('Active Trip', style: GoogleFonts.manrope(fontWeight: FontWeight.w800)),
      ),
      body: passengersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, _) => Center(child: Text(error.toString())),
        data: (passengers) {
          final stops = _distinctStops(passengers);
          final nextStop = stops.isEmpty ? null : stops[_currentStopIndex.clamp(0, stops.length - 1)];
          final dropOffs = nextStop == null
              ? <Passenger>[]
              : passengers.where((passenger) => passenger.stopName == nextStop.name && !passenger.isAbsent).toList();
          final pickups = nextStop == null
              ? <Passenger>[]
              : passengers.where((passenger) => passenger.pickupPoint == nextStop.name && !passenger.isAbsent).toList();

          double distanceKm = 0;
          double etaMinutes = 0;
          if (nextStop != null && _currentPosition != null) {
            distanceKm = Geolocator.distanceBetween(
                  _currentPosition!.latitude,
                  _currentPosition!.longitude,
                  nextStop.lat,
                  nextStop.lng,
                ) /
                1000;
            final speedKmh = (_currentPosition!.speed * 3.6).clamp(0, 120);
            etaMinutes = speedKmh > 5 ? (distanceKm / speedKmh) * 60 : 0;
            unawaited(StopAlertService.instance.handleDistance(stopName: nextStop.name, distanceKm: distanceKm));
          }

          return Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(nextStop?.name ?? 'No next stop', style: GoogleFonts.manrope(color: AppColors.onSurface, fontSize: 28, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text('Current speed: ${((_currentPosition?.speed ?? 0) * 3.6).toStringAsFixed(1)} km/h', style: GoogleFonts.inter(color: AppColors.onSurfaceVariant)),
                Text('Distance to next stop: ${distanceKm.toStringAsFixed(2)} km', style: GoogleFonts.inter(color: AppColors.onSurfaceVariant)),
                Text('ETA to next stop: ${etaMinutes > 0 ? etaMinutes.toStringAsFixed(0) : '--'} min', style: GoogleFonts.inter(color: AppColors.onSurfaceVariant)),
                const SizedBox(height: 20),
                Expanded(
                  child: Row(
                    children: [
                      Expanded(child: _PassengerSideCard(title: '🔴 Getting Off', passengers: dropOffs, emptyText: 'No dropoffs here')),
                      const SizedBox(width: 14),
                      Expanded(child: _PassengerSideCard(title: '🟢 Boarding Here', passengers: pickups, emptyText: 'No pickups here')),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => context.push('/conductor/passengers/${widget.tripId}${widget.isDriverMode ? '?driverMode=true' : ''}'),
                        child: const Text('All passengers'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: nextStop == null
                            ? null
                            : () {
                                setState(() {
                                  if (_currentStopIndex < stops.length - 1) {
                                    _currentStopIndex += 1;
                                  }
                                });
                              },
                        child: const Text('Mark stop complete'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  List<_StopNode> _distinctStops(List<Passenger> passengers) {
    final ordered = passengers.toList()
      ..sort((a, b) => a.stopSequence.compareTo(b.stopSequence));
    final seen = <String>{};
    final stops = <_StopNode>[];
    for (final passenger in ordered) {
      if (seen.add(passenger.stopName)) {
        stops.add(_StopNode(passenger.stopName, passenger.stopLatitude, passenger.stopLongitude));
      }
    }
    return stops;
  }
}

class _PassengerSideCard extends StatelessWidget {
  const _PassengerSideCard({
    required this.title,
    required this.passengers,
    required this.emptyText,
  });

  final String title;
  final List<Passenger> passengers;
  final String emptyText;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.manrope(fontWeight: FontWeight.w800, color: AppColors.onSurface)),
          const SizedBox(height: 12),
          if (passengers.isEmpty)
            Text(emptyText, style: GoogleFonts.inter(color: AppColors.onSurfaceVariant))
          else
            ...passengers.map((passenger) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Text(
                    'Seat ${passenger.seatNo.isEmpty ? '-' : passenger.seatNo} — ${passenger.name}',
                    style: GoogleFonts.inter(color: AppColors.onSurface),
                  ),
                )),
        ],
      ),
    );
  }
}

class _StopNode {
  const _StopNode(this.name, this.lat, this.lng);

  final String name;
  final double lat;
  final double lng;
}
