import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_background.dart';
import '../../../core/widgets/bento_card.dart';
import '../../../core/widgets/sentinel_button.dart';
import '../provider/trip_provider.dart';

class CallFailureScreen extends ConsumerStatefulWidget {
  final String tripId;
  final String passengerId;
  final String passengerSeat;
  final String upcomingStop;

  const CallFailureScreen({
    super.key,
    required this.tripId,
    required this.passengerId,
    required this.passengerSeat,
    required this.upcomingStop,
  });

  @override
  ConsumerState<CallFailureScreen> createState() => _CallFailureScreenState();
}

class _CallFailureScreenState extends ConsumerState<CallFailureScreen> {
  bool _isLoading = false;

  Future<void> _handleRetry() async {
    setState(() => _isLoading = true);
    try {
      await ref.read(tripRepositoryProvider).retryAlert(widget.tripId, widget.passengerId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Alert retry triggered successfully')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to retry alert: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleManual() async {
    setState(() => _isLoading = true);
    try {
      await ref.read(tripRepositoryProvider).informManually(widget.tripId, widget.passengerId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Marked as manually informed')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update status: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: AppBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Symbols.arrow_back, color: AppColors.primary),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      'CALL STATUS',
                      style: AppTextStyles.labelSmall.copyWith(
                        color: AppColors.primary,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      'SENTINEL',
                      style: AppTextStyles.headlineSmall.copyWith(
                        fontSize: 18,
                        letterSpacing: 1.0,
                        color: AppColors.onSurface.withOpacity(0.8),
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Error Indicator
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: AppColors.tertiaryContainer,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.onTertiaryContainer.withOpacity(0.2),
                          ),
                        ),
                        child: const Icon(
                          Symbols.warning,
                          fill: 1,
                          color: AppColors.onTertiaryContainer,
                          size: 48,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'CALL FAILED',
                        style: AppTextStyles.headlineMedium.copyWith(
                          color: AppColors.onTertiaryContainer,
                          fontSize: 28,
                          letterSpacing: -0.5,
                        ),
                      ),
                      Text(
                        'Automatic notification system error',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.onSurfaceVariant.withOpacity(0.8),
                        ),
                      ),
                      const SizedBox(height: 40),

                      // Passenger Info Card
                      BentoCard(
                        padding: const EdgeInsets.all(32),
                        backgroundColor: AppColors.surfaceContainerHigh,
                        decorators: [
                          // Subtle Radial Gradient Background
                          Positioned.fill(
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: RadialGradient(
                                  center: Alignment.topLeft,
                                  radius: 1.5,
                                  colors: [
                                    AppColors.primaryContainer.withOpacity(0.1),
                                    Colors.transparent,
                                  ],
                                ),
                              ),
                            ),
                          ),
                          // Tonal Indicator for urgency
                          Positioned(
                            top: 0,
                            bottom: 0,
                            right: 0,
                            child: Container(
                              width: 8,
                              color: AppColors.onTertiaryContainer,
                            ),
                          ),
                        ],
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'PASSENGER LOCATION',
                                      style: AppTextStyles.labelSmall.copyWith(
                                        color: AppColors.onSurfaceVariant,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      widget.passengerSeat,
                                      style: AppTextStyles.headlineLarge.copyWith(
                                        fontSize: 48,
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceContainerHighest,
                                    borderRadius: BorderRadius.circular(99),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Symbols.person,
                                        fill: 1,
                                        color: AppColors.primary,
                                        size: 14,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'UNVERIFIED',
                                        style: AppTextStyles.labelSmall.copyWith(
                                          color: AppColors.onSurface,
                                          fontSize: 10,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),
                            Container(
                              height: 1,
                              width: double.infinity,
                              color: AppColors.outlineVariant.withOpacity(0.1),
                            ),
                            const SizedBox(height: 24),
                            Text(
                              'UPCOMING STOP',
                              style: AppTextStyles.labelSmall.copyWith(
                                color: AppColors.onSurfaceVariant,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Symbols.location_on, color: AppColors.tertiary),
                                const SizedBox(width: 12),
                                Text(
                                  widget.upcomingStop,
                                  style: AppTextStyles.headlineSmall.copyWith(
                                    fontSize: 32,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // System Message
                      const SizedBox(height: 32),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppColors.outlineVariant.withOpacity(0.1),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Symbols.info, color: AppColors.tertiary, size: 20),
                            const SizedBox(width: 12),
                            Expanded(
                              child: RichText(
                                text: TextSpan(
                                  style: AppTextStyles.bodySmall.copyWith(
                                    height: 1.5,
                                  ),
                                  children: [
                                    const TextSpan(
                                      text: 'The system could not establish a voice connection. Conductor must ensure passenger is notified before arriving at ',
                                    ),
                                    TextSpan(
                                      text: widget.upcomingStop,
                                      style: const TextStyle(
                                        color: AppColors.onSurface,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const TextSpan(text: ' stop.'),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Bottom Actions
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    SentinelButton(
                      label: 'RETRY CALL',
                      icon: Symbols.replay,
                      style: SentinelButtonStyle.secondary,
                      onPressed: _isLoading ? null : _handleRetry,
                    ),
                    const SizedBox(height: 16),
                    SentinelButton(
                      label: 'INFORM MANUALLY',
                      icon: Symbols.campaign,
                      style: SentinelButtonStyle.primary,
                      height: 72,
                      onPressed: _isLoading ? null : _handleManual,
                    ),
                  ],
                ),
              ),

              // Mock Bottom Nav Spacer (if needed)
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }
}
