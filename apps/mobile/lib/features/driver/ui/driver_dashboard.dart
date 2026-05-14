import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../conductor/provider/trip_provider.dart';

class DriverDashboard extends ConsumerWidget {
  const DriverDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // For simplicity, we use the same tripsProvider. Assuming the backend filters by assigned driver/conductor.
    final todayTripsAsync = ref.watch(tripsProvider('today'));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: todayTripsAsync.when(
        data: (trips) {
          if (trips.isEmpty) {
            return const Center(child: Text("No trips assigned for today."));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: trips.length,
            itemBuilder: (context, index) {
              final trip = trips[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Trip #${trip['id']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          Chip(label: Text(trip['status'] ?? 'Scheduled')),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('${trip['start_location']} → ${trip['end_location']}'),
                      const SizedBox(height: 8),
                      Text('Departure: ${trip['scheduled_departure']}'),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            context.push('/driver/trip/${trip['id']}');
                          },
                          child: const Text('START TRIP'),
                        ),
                      )
                    ],
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
