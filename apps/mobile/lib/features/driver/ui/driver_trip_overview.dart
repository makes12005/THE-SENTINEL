import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../conductor/provider/trip_provider.dart';

class DriverTripOverview extends ConsumerWidget {
  final String tripId;
  const DriverTripOverview({super.key, required this.tripId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tripAsync = ref.watch(tripDetailsProvider(tripId));

    return Scaffold(
      appBar: AppBar(title: const Text('Trip Overview')),
      body: tripAsync.when(
        data: (trip) {
          final nextStop = trip['next_stop'] ?? 'Unknown';

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 40),
                const Text('Current Speed', style: TextStyle(fontSize: 18, color: Colors.grey)),
                const Text('45 km/h', style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold)),
                const SizedBox(height: 60),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      children: [
                        const Text('Next Stop', style: TextStyle(fontSize: 16, color: Colors.grey)),
                        const SizedBox(height: 8),
                        Text(nextStop, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                    onPressed: () {
                      // Call end trip endpoint, then go back
                      context.go('/driver');
                    },
                    child: const Text('END TRIP', style: TextStyle(fontSize: 16, color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
