import 'package:bus_alert/core/network/api_client.dart';
import 'package:bus_alert/core/network/endpoints.dart';
import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

class CaptureLocationScreen extends StatefulWidget {
  const CaptureLocationScreen({super.key});

  @override
  State<CaptureLocationScreen> createState() => _CaptureLocationScreenState();
}

class _CaptureLocationScreenState extends State<CaptureLocationScreen> {
  final MapController _mapController = MapController();
  LatLng? _currentPosition;
  final TextEditingController _nameController = TextEditingController();
  bool _isLoading = true;
  bool _isSaving = false;
  List<Map<String, dynamic>> _savedLocations = [];

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _loadSavedLocations();
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    try {
      final hasPermission = await _checkPermission();
      if (!hasPermission) {
        setState(() => _isLoading = false);
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _currentPosition = LatLng(position.latitude, position.longitude);
        _isLoading = false;
      });

      if (_currentPosition != null) {
        _mapController.move(_currentPosition!, 16);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error getting location: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<bool> _checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    return permission != LocationPermission.deniedForever;
  }

  Future<void> _loadSavedLocations() async {
    setState(() {
      _savedLocations = [
        {'name': 'Vadodara Bus Stand', 'lat': 22.3072, 'lng': 73.1812, 'date': '2026-05-15'},
        {'name': 'Surat Station', 'lat': 21.1702, 'lng': 72.8311, 'date': '2026-05-14'},
      ];
    });
  }

  Future<void> _captureLocation() async {
    if (_currentPosition == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location not available'), backgroundColor: AppColors.error),
      );
      return;
    }

    if (_nameController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a name for this location'), backgroundColor: AppColors.error),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      await ApiClient().post(
        Endpoints.geoLibrary,
        data: {
          'name': _nameController.text,
          'latitude': _currentPosition!.latitude,
          'longitude': _currentPosition!.longitude,
        },
      );

      setState(() => _isSaving = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Location saved and shared with all agencies'),
            backgroundColor: AppColors.success,
          ),
        );
        _nameController.clear();
        _loadSavedLocations();
      }
    } catch (e) {
      setState(() => _isSaving = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving location: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Capture Location', style: AppTextStyles.titleMedium),
      ),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                _isLoading
                    ? Container(
                        color: AppColors.surfaceContainer,
                        child: const Center(
                          child: CircularProgressIndicator(color: AppColors.primary),
                        ),
                      )
                    : FlutterMap(
                        mapController: _mapController,
                        options: MapOptions(
                          initialCenter: _currentPosition ?? const LatLng(22.3072, 73.1812),
                          initialZoom: 16,
                        ),
                        children: [
                          TileLayer(
                            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'com.busalert.mobile',
                          ),
                          if (_currentPosition != null)
                            MarkerLayer(
                              markers: [
                                Marker(
                                  point: _currentPosition!,
                                  width: 40,
                                  height: 40,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white, width: 3),
                                    ),
                                    child: const Icon(Icons.location_on, color: Colors.white, size: 24),
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                // Crosshair center
                if (!_isLoading)
                  Center(
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.primary, width: 2),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Icon(Icons.add, color: AppColors.primary, size: 24),
                    ),
                  ),
                // Coordinates display
                if (_currentPosition != null && !_isLoading)
                  Positioned(
                    bottom: 16,
                    left: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainer.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Current Coordinates', style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant)),
                          const SizedBox(height: 4),
                          Text(
                            'Lat: ${_currentPosition!.latitude.toStringAsFixed(4)} | Lng: ${_currentPosition!.longitude.toStringAsFixed(4)}',
                            style: AppTextStyles.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainer,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: _nameController,
                  style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textOnSurface),
                  decoration: InputDecoration(
                    hintText: 'Enter location name',
                    hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.edit, color: AppColors.textSecondary),
                      onPressed: () {},
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _captureLocation,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryContainer,
                      foregroundColor: AppColors.surfaceTint,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _isSaving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.surfaceTint),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.add_location, size: 20),
                              const SizedBox(width: 8),
                              Text('CAPTURE LOCATION', style: AppTextStyles.labelLarge),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'My Captures',
                  style: AppTextStyles.titleSmall.copyWith(color: AppColors.textOnSurface),
                ),
                const SizedBox(height: 8),
                ...(_savedLocations.isEmpty
                    ? [
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text(
                            'No locations captured yet',
                            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                          ),
                        )
                      ]
                    : _savedLocations.map((loc) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerHigh,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.location_on, color: AppColors.primary, size: 20),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(loc['name'], style: AppTextStyles.bodyMedium),
                                  Text(
                                    '${loc['lat']}, ${loc['lng']}',
                                    style: AppTextStyles.labelSmall.copyWith(color: AppColors.textSecondary),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              loc['date'],
                              style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
