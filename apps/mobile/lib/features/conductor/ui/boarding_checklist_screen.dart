import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../provider/trip_provider.dart';

class BoardingChecklistScreen extends ConsumerStatefulWidget {
  final String tripId;
  const BoardingChecklistScreen({super.key, required this.tripId});

  @override
  ConsumerState<BoardingChecklistScreen> createState() => _BoardingChecklistScreenState();
}

class _BoardingChecklistScreenState extends ConsumerState<BoardingChecklistScreen> {
  final Set<String> _boardedPassengerIds = {};
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final tripAsync = ref.watch(tripDetailsProvider(widget.tripId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Symbols.arrow_back_rounded, color: AppColors.onSurface),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'BOARDING CHECKLIST',
          style: AppTextStyles.labelSmall.copyWith(
            color: AppColors.onSurface,
            fontWeight: FontWeight.w800,
            letterSpacing: 2,
          ),
        ),
        centerTitle: true,
      ),
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          // Background Gradient
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.0,
                  colors: [
                    Color(0x0DFA3CBF2), // Primary with 5% opacity
                    AppColors.background,
                  ],
                ),
              ),
            ),
          ),

          // Noise Overlay
          Positioned.fill(
            child: Opacity(
              opacity: 0.02,
              child: Image.network(
                'https://www.transparenttextures.com/patterns/carbon-fibre.png',
                repeat: ImageRepeat.repeat,
                errorBuilder: (context, error, stackTrace) => const SizedBox(),
              ),
            ),
          ),

          tripAsync.when(
            data: (trip) => _buildContent(context, trip),
            loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
            error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: AppColors.error))),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, Map<String, dynamic> trip) {
    final passengers = (trip['passengers'] as List<dynamic>?) ?? [];
    final filteredPassengers = passengers.where((p) {
      final name = (p['name'] ?? '').toString().toLowerCase();
      final seat = (p['seat_number'] ?? '').toString().toLowerCase();
      return name.contains(_searchQuery.toLowerCase()) || seat.contains(_searchQuery.toLowerCase());
    }).toList();

    final totalCount = passengers.length;
    final boardedCount = _boardedPassengerIds.length;

    return Column(
      children: [
        SizedBox(height: MediaQuery.of(context).padding.top + 56),
        // Summary Card
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.primary.withOpacity(0.1), width: 1),
            ),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Symbols.group_rounded, color: AppColors.primary, size: 28, fill: 1),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PASSENGER SUMMARY',
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.onSurfaceVariant,
                          fontWeight: FontWeight.w800,
                          fontSize: 9,
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: '$boardedCount',
                              style: AppTextStyles.headlineSmall.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w900,
                                fontSize: 32,
                                fontFamily: 'Manrope',
                              ),
                            ),
                            TextSpan(
                              text: ' / $totalCount ',
                              style: AppTextStyles.headlineSmall.copyWith(
                                color: AppColors.onSurfaceVariant.withOpacity(0.5),
                                fontWeight: FontWeight.w400,
                                fontSize: 24,
                                fontFamily: 'Manrope',
                              ),
                            ),
                            TextSpan(
                              text: 'READY',
                              style: AppTextStyles.labelSmall.copyWith(
                                color: boardedCount == totalCount ? const Color(0xFF10B981) : AppColors.onSurfaceVariant,
                                fontWeight: FontWeight.w800,
                                fontSize: 12,
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        // Search Bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: TextField(
            onChanged: (val) => setState(() => _searchQuery = val),
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurface, fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              hintText: 'Search manifest...',
              hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant.withOpacity(0.4)),
              prefixIcon: const Icon(Symbols.search_rounded, color: AppColors.primary, size: 20),
              filled: true,
              fillColor: AppColors.surfaceContainerLow,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 18),
            ),
          ),
        ),

        // List
        Expanded(
          child: filteredPassengers.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Symbols.person_search_rounded, size: 64, color: AppColors.onSurfaceVariant.withOpacity(0.1)),
                      const SizedBox(height: 16),
                      Text(
                        'NO PASSENGERS MATCHING',
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.onSurfaceVariant,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 140),
                  itemCount: filteredPassengers.length,
                  itemBuilder: (context, index) {
                    final p = filteredPassengers[index];
                    final pId = p['id'].toString();
                    final seat = p['seat_number'] ?? '??';
                    final name = p['name'] ?? 'Unknown Passenger';
                    final stop = p['boarding_stop'] ?? 'Main Terminal';
                    final isBoarded = _boardedPassengerIds.contains(pId);

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _BoardingCard(
                        pId: pId,
                        seat: seat,
                        name: name,
                        stop: stop,
                        isBoarded: isBoarded,
                        onToggle: () {
                          setState(() {
                            if (isBoarded) {
                              _boardedPassengerIds.remove(pId);
                            } else {
                              _boardedPassengerIds.add(pId);
                            }
                          });
                        },
                      ),
                    );
                  },
                ),
        ),

        // Depart Trip Footer
        Container(
          padding: EdgeInsets.fromLTRB(24, 16, 24, MediaQuery.of(context).padding.bottom + 24),
          decoration: BoxDecoration(
            color: AppColors.background.withOpacity(0.8),
            border: Border(top: BorderSide(color: AppColors.outline.withOpacity(0.05))),
          ),
          child: SizedBox(
            width: double.infinity,
            height: 64,
            child: ElevatedButton(
              onPressed: () => _handleDepart(context, boardedCount, totalCount),
              style: ElevatedButton.styleFrom(
                backgroundColor: boardedCount == totalCount ? const Color(0xFF10B981) : AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Symbols.local_shipping_rounded, fill: 1, size: 24),
                  const SizedBox(width: 12),
                  Text(
                    'CONFIRM DEPARTURE',
                    style: AppTextStyles.labelSmall.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _handleDepart(BuildContext context, int boardedCount, int totalCount) async {
    if (boardedCount < totalCount) {
      final proceed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: AppColors.surfaceContainerHigh,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          title: Row(
            children: [
              const Icon(Symbols.warning_rounded, color: AppColors.tertiary),
              const SizedBox(width: 12),
              const Text('INCOMPLETE BOARDING', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
            ],
          ),
          content: Text(
            'You have $boardedCount out of $totalCount passengers boarded. Do you want to depart anyway?',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('WAIT', style: AppTextStyles.labelSmall.copyWith(color: AppColors.onSurfaceVariant)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.tertiary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('DEPART NOW'),
            ),
          ],
        ),
      );
      if (proceed != true) return;
    }

    try {
      await ref.read(tripRepositoryProvider).departTrip(widget.tripId);
      if (context.mounted) {
        context.go('/conductor/active/${widget.tripId}');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.error,
            content: Text('Failed to depart: $e', style: const TextStyle(color: Colors.white)),
          ),
        );
      }
    }
  }
}

class _BoardingCard extends StatelessWidget {
  final String pId;
  final String seat;
  final String name;
  final String stop;
  final bool isBoarded;
  final VoidCallback onToggle;

  const _BoardingCard({
    required this.pId,
    required this.seat,
    required this.name,
    required this.stop,
    required this.isBoarded,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onToggle,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isBoarded ? const Color(0xFF10B981).withOpacity(0.05) : AppColors.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isBoarded ? const Color(0xFF10B981).withOpacity(0.2) : Colors.transparent,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            // Seat Badge
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: isBoarded ? const Color(0xFF10B981).withOpacity(0.1) : AppColors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text(
                  seat,
                  style: AppTextStyles.headlineSmall.copyWith(
                    color: isBoarded ? const Color(0xFF10B981) : AppColors.onSurface,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Manrope',
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            // Passenger Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name.toUpperCase(),
                    style: AppTextStyles.bodyLarge.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: isBoarded ? AppColors.onSurface : AppColors.onSurface.withOpacity(0.8),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Symbols.location_on_rounded, size: 14, color: AppColors.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(
                        stop,
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.onSurfaceVariant,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Interactive Checkbox
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: isBoarded ? const Color(0xFF10B981) : Colors.transparent,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isBoarded ? Colors.transparent : AppColors.outline.withOpacity(0.2),
                  width: 2,
                ),
              ),
              child: isBoarded
                  ? const Icon(Symbols.check_rounded, color: Colors.white, size: 24, weight: 700)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

