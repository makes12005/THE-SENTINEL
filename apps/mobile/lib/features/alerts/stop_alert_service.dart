import 'package:audio_session/audio_session.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:just_audio/just_audio.dart';

class StopAlertService {
  StopAlertService._();

  static final StopAlertService instance = StopAlertService._();
  final AudioPlayer _player = AudioPlayer();
  final FlutterTts _tts = FlutterTts();
  String? _lastStopName;
  int _lastLevel = 0;

  Future<void> configure() async {
    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration(
      androidAudioAttributes: AndroidAudioAttributes(
        contentType: AndroidAudioContentType.sonification,
        usage: AndroidAudioUsage.alarm,
        flags: AndroidAudioFlags.audibilityEnforced,
      ),
    ));
  }

  Future<void> handleDistance({
    required String stopName,
    required double distanceKm,
  }) async {
    if (_lastStopName != stopName) {
      _lastStopName = stopName;
      _lastLevel = 0;
    }

    final nextLevel = distanceKm <= 0.5 ? 3 : distanceKm <= 2 ? 2 : distanceKm <= 5 ? 1 : 0;
    if (nextLevel == 0 || nextLevel <= _lastLevel) return;
    _lastLevel = nextLevel;

    if (nextLevel == 1) {
      HapticFeedback.lightImpact();
      await _tts.speak('Approaching $stopName');
      return;
    }

    if (nextLevel == 2) {
      HapticFeedback.heavyImpact();
      await _tts.speak('Strong alert. Approaching $stopName');
      return;
    }

    HapticFeedback.heavyImpact();
    await _tts.speak('Arrived at $stopName');
    try {
      await _player.setAsset('assets/silence.mp3');
      await _player.play();
    } catch (_) {}
  }

  Future<void> dispose() async {
    await _player.dispose();
    await _tts.stop();
  }
}
