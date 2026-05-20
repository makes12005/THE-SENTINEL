import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class BoardingChecklistScreen extends StatefulWidget {
  final String tripId;

  const BoardingChecklistScreen({super.key, required this.tripId});

  @override
  State<BoardingChecklistScreen> createState() => _BoardingChecklistScreenState();
}

class _BoardingChecklistScreenState extends State<BoardingChecklistScreen> {
  final List<Map<String, dynamic>> _passengers = List.generate(40, (index) => {
    'id': '${index + 1}',
    'name': 'Passenger ${index + 1}',
    'seatNo': index + 1,
    'pickupPoint': index % 2 == 0 ? 'Stop ${index + 1}' : 'Stop ${index % 5 + 1}',
    'isBoarded': false,
  });

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  int get _boardedCount => _passengers.where((p) => p['isBoarded'] as bool).length;
  int get _totalCount => _passengers.length;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _toggleBoarded(int index) {
    setState(() {
      _passengers[index]['isBoarded'] = !_passengers[index]['isBoarded'];
    });
  }

  List<Map<String, dynamic>> get _filteredPassengers {
    if (_searchQuery.isEmpty) return _passengers;
    return _passengers.where((p) {
      final name = p['name'].toString().toLowerCase();
      final seatNo = p['seatNo'].toString();
      return name.contains(_searchQuery.toLowerCase()) || seatNo.contains(_searchQuery);
    }).toList();
  }

  Future<void> _startTrip() async {
    final unboarded = _totalCount - _boardedCount;
    if (unboarded > 0) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: AppColors.surfaceContainer,
          title: Text('Confirm Start', style: AppTextStyles.headlineSmall),
          content: Text(
            '$unboarded passengers not boarded. Continue anyway?',
            style: AppTextStyles.bodyMedium,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('No', style: AppTextStyles.labelLarge.copyWith(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.tertiaryContainer,
                foregroundColor: AppColors.onTertiaryContainer,
              ),
              child: const Text('Yes, Start'),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }

    context.push('/conductor/active/${widget.tripId}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => context.pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Boarding Check', style: AppTextStyles.titleMedium),
            Text(
              'Ahmedabad → Una',
              style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              onChanged: (value) => setState(() => _searchQuery = value),
              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textOnSurface),
              decoration: InputDecoration(
                hintText: 'Search by name or seat...',
                prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: AppColors.textSecondary),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
            ),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Boarded',
                        style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$_boardedCount / $_totalCount',
                        style: AppTextStyles.headlineSmall.copyWith(color: AppColors.tertiary),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: _boardedCount / _totalCount,
                      backgroundColor: AppColors.surfaceContainerHigh,
                      color: AppColors.tertiary,
                      minHeight: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _filteredPassengers.length,
              itemBuilder: (context, index) {
                final passenger = _filteredPassengers[index];
                final originalIndex = _passengers.indexWhere((p) => p['id'] == passenger['id']);
                final isBoarded = passenger['isBoarded'] as bool;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    leading: Checkbox(
                      value: isBoarded,
                      onChanged: (_) => _toggleBoarded(originalIndex),
                      fillColor: WidgetStateProperty.resolveWith((states) {
                        if (states.contains(WidgetState.selected)) {
                          return AppColors.tertiary;
                        }
                        return AppColors.outlineVariant;
                      }),
                    ),
                    title: Text(
                      passenger['name'],
                      style: AppTextStyles.bodyMedium,
                    ),
                    subtitle: Text(
                      'Seat ${passenger['seatNo']} • ${passenger['pickupPoint']}',
                      style: AppTextStyles.labelMedium.copyWith(color: AppColors.textSecondary),
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isBoarded ? AppColors.success.withOpacity(0.2) : AppColors.textSecondary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isBoarded ? 'Boarded' : 'Pending',
                        style: AppTextStyles.labelExtraSmall.copyWith(
                          color: isBoarded ? AppColors.success : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.background.withOpacity(0), AppColors.background],
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: _boardedCount == _totalCount ? _startTrip : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryContainer,
                  foregroundColor: AppColors.surfaceTint,
                  disabledBackgroundColor: AppColors.surfaceContainerHigh,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Text(
                  'START TRIP (${_boardedCount}/$_totalCount boarded)',
                  style: AppTextStyles.buttonLarge,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 48,
              child: OutlinedButton(
                onPressed: _startTrip,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.textOnSurface,
                  side: BorderSide(color: AppColors.outline),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Text('Start Anyway', style: AppTextStyles.labelLarge),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
