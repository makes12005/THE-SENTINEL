import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';

class CaptureLocationScreen extends StatefulWidget {
  const CaptureLocationScreen({super.key});

  @override
  State<CaptureLocationScreen> createState() => _CaptureLocationScreenState();
}

class _CaptureLocationScreenState extends State<CaptureLocationScreen> {
  GoogleMapController? _mapController;
  LatLng? _currentLocation;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _determinePosition();
  }

  Future<void> _determinePosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() => _isLoading = false);
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        setState(() => _isLoading = false);
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      setState(() => _isLoading = false);
      return;
    }

    final pos = await Geolocator.getCurrentPosition();
    setState(() {
      _currentLocation = LatLng(pos.latitude, pos.longitude);
      _isLoading = false;
    });

    _mapController?.animateCamera(CameraUpdate.newLatLngZoom(_currentLocation!, 15));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Capture Location')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _currentLocation == null
              ? const Center(child: Text('Failed to get location.'))
              : Stack(
                  children: [
                    GoogleMap(
                      initialCameraPosition: CameraPosition(target: _currentLocation!, zoom: 15),
                      myLocationEnabled: true,
                      myLocationButtonEnabled: true,
                      onMapCreated: (controller) => _mapController = controller,
                      onCameraMove: (position) {
                        _currentLocation = position.target;
                      },
                    ),
                    const Center(
                      child: Icon(Icons.location_pin, size: 48, color: Colors.red),
                    ),
                    Positioned(
                      bottom: 24,
                      left: 24,
                      right: 24,
                      child: ElevatedButton(
                        onPressed: () {
                          // Return captured location
                          Navigator.pop(context, _currentLocation);
                        },
                        child: const Text('CONFIRM LOCATION'),
                      ),
                    ),
                  ],
                ),
    );
  }
}
