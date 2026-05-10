import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/endpoints.dart';
import '../../../core/theme/app_colors.dart';

class CaptureLocationScreen extends StatefulWidget {
  const CaptureLocationScreen({super.key});

  @override
  State<CaptureLocationScreen> createState() => _CaptureLocationScreenState();
}

class _CaptureLocationScreenState extends State<CaptureLocationScreen> {
  Position? _position;
  String _suggestedName = '';
  String _status = '';
  bool _saving = false;
  final _saved = <String>[];

  @override
  void initState() {
    super.initState();
    _loadCurrentLocation();
  }

  Future<void> _loadCurrentLocation() async {
    final position = await Geolocator.getCurrentPosition();
    setState(() => _position = position);
    await _reverseGeocode(position.latitude, position.longitude);
  }

  Future<void> _reverseGeocode(double lat, double lng) async {
    try {
      final response = await ApiClient.instance.get(Endpoints.reverseGeocode(lat, lng));
      final data = response.data['data'] as Map<String, dynamic>?;
      if (data == null) return;
      setState(() => _suggestedName = data['name'] as String? ?? '');
    } catch (_) {}
  }

  Future<void> _capture() async {
    final target = _position;
    if (target == null) return;
    setState(() {
      _saving = true;
      _status = '';
    });
    try {
      await ApiClient.instance.post(
        Endpoints.geoLibrary,
        data: {
          'name': _suggestedName,
          'latitude': target.latitude,
          'longitude': target.longitude,
        },
      );
      setState(() {
        _saved.insert(0, _suggestedName);
        _status = 'Location saved as $_suggestedName and shared with all agencies';
      });
    } catch (error) {
      setState(() => _status = ApiClient.parseError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final position = _position;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: Text('Capture Location', style: GoogleFonts.manrope(fontWeight: FontWeight.w800)),
      ),
      body: position == null
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                Expanded(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      GoogleMap(
                        initialCameraPosition: CameraPosition(
                          target: LatLng(position.latitude, position.longitude),
                          zoom: 16,
                        ),
                        myLocationEnabled: true,
                        myLocationButtonEnabled: true,
                        onMapCreated: (_) {},
                        onCameraMove: (cameraPosition) {
                          _position = Position(
                            longitude: cameraPosition.target.longitude,
                            latitude: cameraPosition.target.latitude,
                            timestamp: DateTime.now(),
                            accuracy: 0,
                            altitude: 0,
                            altitudeAccuracy: 0,
                            heading: 0,
                            headingAccuracy: 0,
                            speed: 0,
                            speedAccuracy: 0,
                          );
                        },
                        onCameraIdle: () {
                          final current = _position;
                          if (current != null) {
                            _reverseGeocode(current.latitude, current.longitude);
                          }
                        },
                      ),
                      IgnorePointer(
                        child: Icon(Icons.add_location_alt_rounded, size: 52, color: AppColors.error),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Current Coordinates', style: GoogleFonts.inter(color: AppColors.onSurfaceVariant, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text('${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}', style: GoogleFonts.manrope(color: AppColors.onSurface, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 16),
                      TextField(
                        controller: TextEditingController(text: _suggestedName)
                          ..selection = TextSelection.collapsed(offset: _suggestedName.length),
                        onChanged: (value) => _suggestedName = value,
                        decoration: const InputDecoration(
                          labelText: 'Suggested name',
                          filled: true,
                          fillColor: AppColors.surfaceContainerHigh,
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _saving ? null : _capture,
                          child: Text(_saving ? 'Saving...' : 'CAPTURE'),
                        ),
                      ),
                      if (_status.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(_status, style: GoogleFonts.inter(color: AppColors.primary)),
                      ],
                      const SizedBox(height: 16),
                      Text('Saved locations', style: GoogleFonts.manrope(color: AppColors.onSurface, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      ..._saved.take(5).map((item) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Text('• $item', style: GoogleFonts.inter(color: AppColors.onSurfaceVariant)),
                          )),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
