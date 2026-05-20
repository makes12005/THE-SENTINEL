import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:bus_alert/features/route/services/route_service.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class RouteCreationScreen extends StatefulWidget {
  const RouteCreationScreen({super.key});

  @override
  State<RouteCreationScreen> createState() => RouteCreationScreenState();
}

class RouteCreationScreenState extends State<RouteCreationScreen> {
  final RouteService _routeService = RouteService();
  GoogleMapController? _mapController;
  final TextEditingController _routeNameController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  
  List<Marker> _markers = [];
  List<RoutePoint> _routePoints = [];
  Set<Polyline> _polylines = {};
  
  RouteResult? _calculatedRoute;
  bool _isLoading = false;
  bool _isCalculating = false;
  String? _routeNameError;
  
  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }
  
  @override
  void dispose() {
    _routeNameController.dispose();
    _searchController.dispose();
    super.dispose();
  }
  
  Future<void> _getCurrentLocation() async {
    try {
      final hasPermission = await _checkPermission();
      if (!hasPermission) return;
      
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      if (_mapController != null) {
        _mapController!.animateCamera(
          CameraUpdate.newLatLngZoom(
            LatLng(position.latitude, position.longitude),
            14,
          ),
        );
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
    }
  }
  
  Future<bool> _checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;
    
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission != LocationPermission.deniedForever;
  }
  
  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
  }
  
  void _onMapTap(LatLng point) {
    setState(() {
      _routePoints.add(RoutePoint(
        latitude: point.latitude,
        longitude: point.longitude,
        sequence: _routePoints.length + 1,
      ));
      _updateMarkers();
    });
    
    if (_routePoints.length >= 2) {
      _calculateRouteFromPoints();
    }
  }
  
  void _updateMarkers() {
    _markers = _routePoints.asMap().entries.map((entry) {
      final index = entry.key;
      final point = entry.value;
      
      return Marker(
        markerId: MarkerId('point_$index'),
        position: LatLng(point.latitude, point.longitude),
        infoWindow: InfoWindow(
          title: point.name ?? 'Stop ${index + 1}',
          snippet: index == 0 ? 'Start' : index == _routePoints.length - 1 ? 'End' : 'Waypoint',
        ),
        icon: index == 0
          ? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen)
          : index == _routePoints.length - 1
            ? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed)
            : BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
      );
    }).toList();
  }
  
  Future<void> _calculateRouteFromPoints() async {
    if (_routePoints.length < 2) return;
    
    setState(() => _isCalculating = true);
    
    try {
      final origin = _routePoints.first;
      final destination = _routePoints.last;
      final waypoints = _routePoints.length > 2 
        ? _routePoints.sublist(1, _routePoints.length - 1) 
        : <RoutePoint>[];
      
      final result = await _routeService.calculateRoute(
        origin: origin,
        destination: destination,
        waypoints: waypoints,
      );
      
      if (result != null) {
        setState(() {
          _calculatedRoute = result;
          _polylines = {
            Polyline(
              polylineId: const PolylineId('route'),
              points: result.polyline.map((p) => LatLng(p.latitude, p.longitude)).toList(),
              color: AppColors.primary,
              width: 5,
            ),
          };
          _isCalculating = false;
        });
        
        if (_mapController != null && result.polyline.isNotEmpty) {
          final bounds = _calculateBounds(result.polyline);
          _mapController!.animateCamera(
            CameraUpdate.newLatLngBounds(bounds, 50),
          );
        }
      } else {
        setState(() => _isCalculating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not calculate route. Check your connection.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      setState(() => _isCalculating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
      );
    }
  }
  
  LatLngBounds _calculateBounds(List<RoutePoint> points) {
    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;
    
    for (final point in points) {
      if (point.latitude < minLat) minLat = point.latitude;
      if (point.latitude > maxLat) maxLat = point.latitude;
      if (point.longitude < minLng) minLng = point.longitude;
      if (point.longitude > maxLng) maxLng = point.longitude;
    }
    
    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }
  
  void _removePoint(int index) {
    setState(() {
      _routePoints.removeAt(index);
      for (int i = 0; i < _routePoints.length; i++) {
        _routePoints[i] = RoutePoint(
          latitude: _routePoints[i].latitude,
          longitude: _routePoints[i].longitude,
          name: _routePoints[i].name,
          sequence: i + 1,
        );
      }
      _updateMarkers();
    });
    
    if (_routePoints.length >= 2) {
      _calculateRouteFromPoints();
    } else {
      setState(() {
        _polylines = {};
        _calculatedRoute = null;
      });
    }
  }
  
  Future<void> _saveRoute() async {
    if (_routeNameController.text.isEmpty) {
      setState(() => _routeNameError = 'Route name is required');
      return;
    }
    
    if (_routePoints.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add at least 2 points to create a route'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    
    setState(() {
      _isLoading = true;
      _routeNameError = null;
    });
    
    try {
      // TODO: Call API to save route
      await Future.delayed(const Duration(seconds: 1));
      
      setState(() => _isLoading = false);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Route created successfully'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
      );
    }
  }
  
  void _clearRoute() {
    setState(() {
      _routePoints.clear();
      _markers.clear();
      _polylines.clear();
      _calculatedRoute = null;
      _routeNameController.clear();
    });
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
        title: Text('Create Route', style: AppTextStyles.titleMedium),
        actions: [
          if (_routePoints.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.refresh, color: AppColors.textSecondary),
              onPressed: _clearRoute,
            ),
          IconButton(
            icon: const Icon(Icons.check, color: AppColors.primary),
            onPressed: _isLoading ? null : _saveRoute,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: GoogleMap(
              onMapCreated: _onMapCreated,
              initialCameraPosition: const CameraPosition(
                target: LatLng(22.3072, 73.1812),
                zoom: 12,
              ),
              markers: _markers.toSet(),
              polylines: _polylines,
              onTap: _onMapTap,
              myLocationEnabled: true,
              myLocationButtonEnabled: true,
              zoomControlsEnabled: false,
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
                  controller: _routeNameController,
                  style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textOnSurface),
                  decoration: InputDecoration(
                    hintText: 'Route Name (e.g., Vadodara - Surat)',
                    hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                    errorText: _routeNameError,
                  ),
                ),
                if (_isCalculating)
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      children: [
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                        ),
                        const SizedBox(width: 12),
                        Text('Calculating route...', style: AppTextStyles.bodyMedium),
                      ],
                    ),
                  ),
                if (_calculatedRoute != null && !_isCalculating)
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Column(
                          children: [
                            Icon(Icons.route, color: AppColors.primary, size: 24),
                            const SizedBox(height: 4),
                            Text(_calculatedRoute!.distanceText, style: AppTextStyles.titleMedium),
                            Text('Distance', style: AppTextStyles.labelSmall.copyWith(color: AppColors.textSecondary)),
                          ],
                        ),
                        Container(width: 1, height: 40, color: AppColors.outlineVariant),
                        Column(
                          children: [
                            Icon(Icons.schedule, color: AppColors.tertiary, size: 24),
                            const SizedBox(height: 4),
                            Text(_calculatedRoute!.durationText, style: AppTextStyles.titleMedium),
                            Text('Duration', style: AppTextStyles.labelSmall.copyWith(color: AppColors.textSecondary)),
                          ],
                        ),
                        Container(width: 1, height: 40, color: AppColors.outlineVariant),
                        Column(
                          children: [
                            Icon(Icons.location_on, color: AppColors.error, size: 24),
                            const SizedBox(height: 4),
                            Text('${_routePoints.length}', style: AppTextStyles.titleMedium),
                            Text('Stops', style: AppTextStyles.labelSmall.copyWith(color: AppColors.textSecondary)),
                          ],
                        ),
                      ],
                    ),
                  ),
                Row(
                  children: [
                    Text('Tap on map to add stops', style: AppTextStyles.labelMedium.copyWith(color: AppColors.textSecondary)),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: _isLoading ? null : _saveRoute,
                      icon: _isLoading 
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                          )
                        : const Icon(Icons.save_outlined, size: 18),
                      label: Text('Save Route', style: AppTextStyles.labelLarge),
                    ),
                  ],
                ),
                if (_routePoints.isNotEmpty)
                  Container(
                    height: 80,
                    margin: const EdgeInsets.only(top: 8),
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _routePoints.length,
                      itemBuilder: (context, index) {
                        final point = _routePoints[index];
                        return Container(
                          width: 120,
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: index == 0
                              ? AppColors.primaryContainer.withOpacity(0.3)
                              : index == _routePoints.length - 1
                                ? AppColors.tertiaryContainer.withOpacity(0.3)
                                : AppColors.surfaceContainerHigh,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: index == 0
                                ? AppColors.primary
                                : index == _routePoints.length - 1
                                  ? AppColors.tertiary
                                  : AppColors.outlineVariant,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                index == 0 ? 'Start' : index == _routePoints.length - 1 ? 'End' : 'Stop ${index + 1}',
                                style: AppTextStyles.labelSmall.copyWith(
                                  color: index == 0 ? AppColors.primary : index == _routePoints.length - 1 ? AppColors.error : AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${point.latitude.toStringAsFixed(4)}, ${point.longitude.toStringAsFixed(4)}',
                                style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              InkWell(
                                onTap: () => _removePoint(index),
                                child: Text(
                                  'Remove',
                                  style: AppTextStyles.labelSmall.copyWith(color: AppColors.error),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
