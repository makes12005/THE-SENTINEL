import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:bus_alert/features/conductor/ui/active_trip/alerts_tab.dart';
import 'package:bus_alert/features/conductor/ui/active_trip/passengers_tab.dart';
import 'package:bus_alert/features/conductor/ui/active_trip/trip_tab.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ActiveTripShell extends StatefulWidget {
  final String tripId;

  const ActiveTripShell({super.key, required this.tripId});

  @override
  State<ActiveTripShell> createState() => _ActiveTripShellState();
}

class _ActiveTripShellState extends State<ActiveTripShell> {
  int _currentIndex = 0;
  String _tripDuration = '00:00:00';

  @override
  Widget build(BuildContext context) {
    final tabs = [
      TripTab(tripId: widget.tripId),
      PassengersTab(tripId: widget.tripId),
      AlertsTab(tripId: widget.tripId),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => _showEndTripDialog(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Ahmedabad → Una', style: AppTextStyles.titleSmall),
            const SizedBox(height: 2),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'TRIP ACTIVE',
                    style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.success),
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Icons.timer_outlined, size: 14, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text(_tripDuration, style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textSecondary)),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert, color: AppColors.textOnSurface),
            onPressed: () {},
          ),
        ],
      ),
      body: tabs[_currentIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLow.withOpacity(0.95),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.15),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildNavItem(Icons.route, 'TRIP', 0),
                _buildNavItem(Icons.people, 'PASSENGERS', 1),
                _buildNavItem(Icons.notifications_active, 'ALERTS', 2),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.surfaceContainerHigh : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.tertiary : AppColors.textSecondary,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: AppTextStyles.labelExtraSmall.copyWith(
                color: isSelected ? AppColors.tertiary : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showEndTripDialog() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surfaceContainer,
        title: Text('End Trip?', style: AppTextStyles.headlineSmall),
        content: Text(
          'Are you sure you want to end this trip? This action cannot be undone.',
          style: AppTextStyles.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel', style: AppTextStyles.labelLarge.copyWith(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            child: const Text('End Trip'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      context.go('/conductor');
    }
  }
}
