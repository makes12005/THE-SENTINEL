import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import 'trip_tab.dart';
import 'passengers_tab.dart';
import 'alerts_tab.dart';
import 'account_tab.dart';

class ActiveTripShell extends StatefulWidget {
  final String tripId;
  const ActiveTripShell({super.key, required this.tripId});

  @override
  State<ActiveTripShell> createState() => _ActiveTripShellState();
}

class _ActiveTripShellState extends State<ActiveTripShell> {
  int _currentIndex = 0;
  
  late final List<Widget> _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = [
      TripTab(tripId: widget.tripId),
      PassengersTab(tripId: widget.tripId),
      AlertsTab(tripId: widget.tripId),
      AccountTab(tripId: widget.tripId),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs,
      ),
      bottomNavigationBar: _buildBottomNavBar(),
    );
  }

  Widget _buildBottomNavBar() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface.withOpacity(0.95),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(0, Symbols.directions_bus_rounded, 'Route'),
                _buildNavItem(1, Symbols.confirmation_number_rounded, 'Tickets'),
                _buildNavItem(2, Symbols.call_rounded, 'Calls'),
                _buildNavItem(3, Symbols.account_circle_rounded, 'Me'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isActive = _currentIndex == index;
    
    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? AppColors.surfaceContainerHigh : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isActive ? AppColors.tertiary : AppColors.onSurface.withOpacity(0.6),
              fill: isActive ? 1 : 0,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: AppTextStyles.labelSmall.copyWith(
                color: isActive ? AppColors.tertiary : AppColors.onSurface.withOpacity(0.6),
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                fontSize: 10,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
