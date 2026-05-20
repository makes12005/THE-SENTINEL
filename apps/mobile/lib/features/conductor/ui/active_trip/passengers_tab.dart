import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:flutter/material.dart';

enum SortType { seatNo, pickup, drop }

class PassengersTab extends StatefulWidget {
  final String tripId;

  const PassengersTab({super.key, required this.tripId});

  @override
  State<PassengersTab> createState() => _PassengersTabState();
}

class _PassengersTabState extends State<PassengersTab> {
  SortType _sortBy = SortType.seatNo;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<Map<String, dynamic>> _passengers = List.generate(40, (index) {
    final statuses = ['PENDING', 'ALERTED', 'BOARDED', 'DROPPED', 'ABSENT'];
    return {
      'seatNo': index + 1,
      'name': 'Passenger ${index + 1}',
      'stop': 'Stop ${(index % 5) + 1}',
      'status': statuses[index % 5],
    };
  });

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PENDING': return AppColors.textSecondary;
      case 'ALERTED': return AppColors.primary;
      case 'BOARDED': return AppColors.success;
      case 'DROPPED': return AppColors.secondary;
      case 'ABSENT': return AppColors.error;
      default: return AppColors.textSecondary;
    }
  }

  List<Map<String, dynamic>> get _filteredPassengers {
    var list = _passengers.where((p) {
      final name = p['name'].toString().toLowerCase();
      final seatNo = p['seatNo'].toString();
      return name.contains(_searchQuery.toLowerCase()) || seatNo.contains(_searchQuery);
    }).toList();

    switch (_sortBy) {
      case SortType.seatNo:
        list.sort((a, b) => (a['seatNo'] as int).compareTo(b['seatNo'] as int));
        break;
      case SortType.pickup:
        list.sort((a, b) => a['stop'].toString().compareTo(b['stop'].toString()));
        break;
      case SortType.drop:
        list.sort((a, b) => a['stop'].toString().compareTo(b['stop'].toString()));
        break;
    }

    return list;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredPassengers;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            onChanged: (value) => setState(() => _searchQuery = value),
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textOnSurface),
            decoration: InputDecoration(
              hintText: 'Search passengers...',
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
          child: Row(
            children: [
              _buildSortButton('SEAT NO', SortType.seatNo),
              const SizedBox(width: 8),
              _buildSortButton('PICKUP', SortType.pickup),
              const SizedBox(width: 8),
              _buildSortButton('DROP', SortType.drop),
              const Spacer(),
              Text(
                '${filtered.length} total',
                style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: filtered.length,
            itemBuilder: (context, index) {
              final p = filtered[index];
              final statusColor = _getStatusColor(p['status']);

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          '${p['seatNo']}',
                          style: AppTextStyles.titleSmall,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(p['name'], style: AppTextStyles.bodyMedium),
                          Text(p['stop'], style: AppTextStyles.labelMedium.copyWith(color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        p['status'],
                        style: AppTextStyles.labelExtraSmall.copyWith(color: statusColor),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSortButton(String label, SortType sortType) {
    final isSelected = _sortBy == sortType;
    return GestureDetector(
      onTap: () => setState(() => _sortBy = sortType),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryContainer : AppColors.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: AppTextStyles.labelExtraSmall.copyWith(
            color: isSelected ? AppColors.surfaceTint : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
