import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:vibration/vibration.dart';
import 'package:just_audio/just_audio.dart';

class ManualAlertDialog extends StatefulWidget {
  final String passengerName;
  final int seatNo;
  final String stopName;
  final String? phone;
  final VoidCallback onMarkNotified;

  const ManualAlertDialog({
    super.key,
    required this.passengerName,
    required this.seatNo,
    required this.stopName,
    this.phone,
    required this.onMarkNotified,
  });

  @override
  State<ManualAlertDialog> createState() => _ManualAlertDialogState();
}

class _ManualAlertDialogState extends State<ManualAlertDialog> {
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isPlaying = false;

  @override
  void initState() {
    super.initState();
    _playAlarm();
    _vibrate();
  }

  Future<void> _playAlarm() async {
    try {
      await _audioPlayer.setAsset('assets/sounds/alert.mp3');
      _audioPlayer.setLoopMode(LoopMode.one);
      await _audioPlayer.play();
      setState(() => _isPlaying = true);
    } catch (e) {
      debugPrint('Failed to play alarm: $e');
    }
  }

  void _vibrate() async {
    if (await Vibration.hasVibrator() ?? false) {
      Vibration.vibrate(pattern: [500, 1000, 500, 1000], repeat: -1);
    }
  }

  void _stopAlarm() {
    _audioPlayer.stop();
    _audioPlayer.dispose();
    Vibration.cancel();
    setState(() => _isPlaying = false);
  }

  Future<void> _callPassenger() async {
    if (widget.phone == null) return;
    
    _stopAlarm();
    final uri = Uri.parse('tel:${widget.phone}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _handleMarkNotified() {
    _stopAlarm();
    widget.onMarkNotified();
    Navigator.of(context).pop(true);
  }

  @override
  void dispose() {
    _stopAlarm();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => false,
      child: Dialog.fullscreen(
        backgroundColor: AppColors.background,
        child: Container(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.center,
              radius: 1.5,
              colors: [
                AppColors.onTertiaryContainer.withOpacity(0.1),
                AppColors.background,
              ],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: AppColors.tertiaryContainer,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Icon(
                      Icons.warning,
                      size: 48,
                      color: AppColors.onTertiaryContainer,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Alert Required',
                    style: AppTextStyles.displayMedium.copyWith(color: AppColors.onTertiaryContainer),
                  ),
                  const SizedBox(height: 32),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Passenger', style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant)),
                                const SizedBox(height: 4),
                                Text(widget.passengerName, style: AppTextStyles.titleLarge),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.tertiaryContainer,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                'Seat ${widget.seatNo}',
                                style: AppTextStyles.titleMedium.copyWith(color: AppColors.onTertiaryContainer),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(color: AppColors.outlineVariant),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Icon(Icons.location_on, color: AppColors.tertiary),
                            const SizedBox(width: 8),
                            Expanded(child: Text(widget.stopName, style: AppTextStyles.titleMedium)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    height: 64,
                    child: ElevatedButton(
                      onPressed: widget.phone != null ? _callPassenger : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.onTertiaryContainer,
                        foregroundColor: AppColors.tertiaryContainer,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.phone, size: 24),
                          const SizedBox(width: 12),
                          Text('CALL NOW', style: AppTextStyles.buttonLarge),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: OutlinedButton(
                      onPressed: _handleMarkNotified,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.textOnSurface,
                        side: BorderSide(color: AppColors.outline),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: const Text('MARK NOTIFIED'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
