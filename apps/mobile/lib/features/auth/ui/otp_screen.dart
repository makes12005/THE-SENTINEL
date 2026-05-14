import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pinput/pinput.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../provider/auth_provider.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String contact;
  final bool isSignup;
  
  const OtpScreen({super.key, required this.contact, this.isSignup = false});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final pinController = TextEditingController();
  final focusNode = FocusNode();

  @override
  void dispose() {
    pinController.dispose();
    focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.isLoading;

    final defaultPinTheme = PinTheme(
      width: 56,
      height: 56,
      textStyle: AppTextStyles.headlineMedium.copyWith(
        color: AppColors.primary,
        fontWeight: FontWeight.bold,
        fontFamily: 'Manrope',
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
      ),
    );

    final focusedPinTheme = defaultPinTheme.copyDecorationWith(
      color: AppColors.surfaceContainerHighest,
      border: Border.all(color: AppColors.primary, width: 2),
    );

    return Scaffold(
      body: Stack(
        children: [
          // Background Gradient (matching noise-bg in 2.html)
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                color: AppColors.background,
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

          // Contextual Visual (from 2.html)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 256,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    AppColors.primaryContainer.withOpacity(0.2),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Top App Bar
                Container(
                  height: 64,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: const BoxDecoration(
                    color: Color(0xFF181C20), // Exact color from 2.html header
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => context.pop(),
                        icon: const Icon(Symbols.arrow_back_rounded, color: AppColors.primary),
                        style: IconButton.styleFrom(
                          hoverColor: AppColors.surfaceContainerHigh,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Verify OTP',
                        style: AppTextStyles.labelLarge.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Manrope',
                          fontSize: 18,
                        ),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      children: [
                        const SizedBox(height: 60),
                        
                        // Header Icon
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerHigh,
                            borderRadius: BorderRadius.circular(12), // rounded-xl from 2.html
                          ),
                          child: const Icon(
                            Symbols.shield_lock_rounded,
                            color: AppColors.primary,
                            size: 48, // text-5xl from 2.html
                            fill: 1,
                          ),
                        ),
                        const SizedBox(height: 32),

                        Text(
                          'Enter Code',
                          style: AppTextStyles.headlineMedium.copyWith(
                            fontWeight: FontWeight.w800, // font-extrabold
                            fontSize: 30, // text-3xl
                            fontFamily: 'Manrope',
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Enter the 6-digit code sent to your phone.',
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: AppColors.onSurfaceVariant,
                            fontWeight: FontWeight.w500,
                            fontFamily: 'Inter',
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 48),

                        // OTP Grid
                        Pinput(
                          controller: pinController,
                          focusNode: focusNode,
                          length: 6,
                          defaultPinTheme: defaultPinTheme,
                          focusedPinTheme: focusedPinTheme,
                          separatorBuilder: (index) => const SizedBox(width: 8),
                          hapticFeedbackType: HapticFeedbackType.lightImpact,
                          onCompleted: (pin) => _verifyOtp(pin),
                        ),
                        const SizedBox(height: 48),

                        // Primary Action
                        SizedBox(
                          width: double.infinity,
                          height: 64, // h-16
                          child: ElevatedButton(
                            onPressed: isLoading ? null : () => _verifyOtp(pinController.text),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.onTertiaryContainer, // bg-on-tertiary-container
                              foregroundColor: AppColors.onTertiary, // text-on-tertiary
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), // rounded-xl
                              elevation: 8,
                              shadowColor: AppColors.tertiaryContainer.withOpacity(0.2),
                            ),
                            child: isLoading 
                              ? const CircularProgressIndicator(color: AppColors.onTertiary) 
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      'VERIFY', 
                                      style: AppTextStyles.labelLarge.copyWith(
                                        fontWeight: FontWeight.w800, // font-extrabold
                                        fontFamily: 'Manrope',
                                        letterSpacing: 2, // tracking-widest
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Symbols.chevron_right_rounded),
                                  ],
                                ),
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Secondary Actions & Timer
                        Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceContainerLow,
                                borderRadius: BorderRadius.circular(9999), // rounded-full
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Symbols.timer_rounded, color: AppColors.secondary, size: 18, fill: 1),
                                  const SizedBox(width: 8),
                                  Text(
                                    '00:30',
                                    style: AppTextStyles.labelLarge.copyWith(
                                      color: AppColors.secondary,
                                      fontWeight: FontWeight.w800,
                                      fontFamily: 'Manrope',
                                      letterSpacing: 1,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextButton(
                              onPressed: null, // TODO: Implement resend
                              child: Text(
                                'Resend OTP',
                                style: AppTextStyles.labelSmall.copyWith(
                                  color: AppColors.onSurfaceVariant,
                                  fontWeight: FontWeight.bold, // font-bold
                                  fontFamily: 'Inter',
                                  fontSize: 14,
                                  letterSpacing: 1,
                                  decoration: TextDecoration.none,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                
                // Footer (as in 2.html)
                Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Text(
                    'SENTINEL SECURE NODE V4.2.0',
                    style: AppTextStyles.labelSmall.copyWith(
                      color: AppColors.onSurfaceVariant.withOpacity(0.3),
                      letterSpacing: 3,
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _verifyOtp(String pin) async {
    if (pin.length < 6) return;
    
    final success = await ref.read(authControllerProvider.notifier).verifyOtp(widget.contact, pin);
    if (!mounted) return;
    
    if (success) {
      if (widget.isSignup) {
        context.go('/profile-setup');
      } else {
        context.go('/conductor');
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.errorContainer,
          content: Text('Invalid OTP', style: TextStyle(color: AppColors.onErrorContainer)),
        ),
      );
      pinController.clear();
      focusNode.requestFocus();
    }
  }
}

