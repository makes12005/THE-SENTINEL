import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class TakeoverAlertScreen extends StatelessWidget {
  final String tripId;
  const TakeoverAlertScreen({super.key, required this.tripId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.red[900],
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.warning_amber_rounded, size: 100, color: Colors.white),
              const SizedBox(height: 24),
              const Text(
                'TAKEOVER REQUEST',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              const Text(
                'Another driver is attempting to take over this trip.',
                style: TextStyle(fontSize: 18, color: Colors.white70),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.white),
                  onPressed: () {
                    // Accept takeover logic
                    context.go('/driver');
                  },
                  child: Text('ACCEPT TAKEOVER', style: TextStyle(fontSize: 16, color: Colors.red[900], fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.white, width: 2)),
                  onPressed: () {
                    // Reject takeover logic
                    context.pop();
                  },
                  child: const Text('REJECT', style: TextStyle(fontSize: 16, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
