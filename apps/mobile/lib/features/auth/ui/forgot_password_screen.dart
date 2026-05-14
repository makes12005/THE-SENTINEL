import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pinput/pinput.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../provider/auth_provider.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _contactCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _pinFocusNode = FocusNode();
  
  int _step = 1; // 1: Contact, 2: OTP, 3: New Password
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _contactCtrl.dispose();
    _otpCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    _pinFocusNode.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    final success = await ref.read(authControllerProvider.notifier).sendOtp(_contactCtrl.text);
    if (success && mounted) {
      setState(() => _step = 2);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.errorContainer,
          content: Text('Failed to send OTP', style: TextStyle(color: AppColors.onErrorContainer)),
        ),
      );
    }
  }

  Future<void> _verifyOtp(String pin) async {
    if (pin.length < 6) return;
    final success = await ref.read(authControllerProvider.notifier).verifyOtp(_contactCtrl.text, pin);
    if (success && mounted) {
      setState(() => _step = 3);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.errorContainer,
          content: Text('Invalid OTP', style: TextStyle(color: AppColors.onErrorContainer)),
        ),
      );
      _otpCtrl.clear();
      _pinFocusNode.requestFocus();
    }
  }

  Future<void> _resetPassword() async {
    if (_passwordCtrl.text != _confirmCtrl.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match')),
      );
      return;
    }
    
    // TODO: Implement reset password in auth_provider
    // For now, we simulate success
    setState(() {}); // Trigger loading if we had it
    
    // Simulate API call
    await Future.delayed(const Duration(seconds: 1));
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.successContainer,
          content: Text('Password updated successfully', style: TextStyle(color: AppColors.onSuccessContainer)),
        ),
      );
      context.go('/welcome');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.isLoading;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background Gradient
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
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

          SafeArea(
            child: Column(
              children: [
                // Header matching OtpScreen
                _buildHeader(),

                Expanded(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: SingleChildScrollView(
                      key: ValueKey(_step),
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: _buildStepContent(isLoading),
                    ),
                  ),
                ),

                // Footer
                _buildFooter(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: const BoxDecoration(
        color: Color(0xFF181C20),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () {
              if (_step > 1) {
                setState(() => _step--);
              } else {
                context.pop();
              }
            },
            icon: const Icon(Symbols.arrow_back_rounded, color: AppColors.primary),
          ),
          const SizedBox(width: 8),
          Text(
            _step == 3 ? 'RESET PASSWORD' : 'FORGOT PASSWORD',
            style: AppTextStyles.labelLarge.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.bold,
              fontFamily: 'Manrope',
              fontSize: 14,
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepContent(bool isLoading) {
    switch (_step) {
      case 1:
        return _buildStep1(isLoading);
      case 2:
        return _buildStep2(isLoading);
      case 3:
        return _buildStep3(isLoading);
      default:
        return const SizedBox();
    }
  }

  Widget _buildStep1(bool isLoading) {
    return Column(
      children: [
        const SizedBox(height: 60),
        _buildIconHeader(Symbols.shield_lock_rounded),
        const SizedBox(height: 32),
        Text(
          'Security Recovery',
          style: AppTextStyles.headlineMedium.copyWith(
            fontWeight: FontWeight.w800,
            fontSize: 30,
            fontFamily: 'Manrope',
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Enter your registered phone number to receive a reset code.',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.onSurfaceVariant,
            fontWeight: FontWeight.w500,
            fontFamily: 'Inter',
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 48),
        _buildInputField(
          label: 'Phone Number',
          controller: _contactCtrl,
          hint: '+91 00000 00000',
          keyboardType: TextInputType.phone,
        ),
        const SizedBox(height: 48),
        _buildPrimaryButton(
          label: 'SEND RESET CODE',
          isLoading: isLoading,
          onPressed: _sendOtp,
          icon: Symbols.send_rounded,
        ),
      ],
    );
  }

  Widget _buildStep2(bool isLoading) {
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

    return Column(
      children: [
        const SizedBox(height: 60),
        _buildIconHeader(Symbols.verified_user_rounded),
        const SizedBox(height: 32),
        Text(
          'Verify Identity',
          style: AppTextStyles.headlineMedium.copyWith(
            fontWeight: FontWeight.w800,
            fontSize: 30,
            fontFamily: 'Manrope',
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Enter the 6-digit code sent to\n${_contactCtrl.text}',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.onSurfaceVariant,
            fontWeight: FontWeight.w500,
            fontFamily: 'Inter',
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 48),
        Pinput(
          controller: _otpCtrl,
          focusNode: _pinFocusNode,
          length: 6,
          defaultPinTheme: defaultPinTheme,
          focusedPinTheme: focusedPinTheme,
          separatorBuilder: (index) => const SizedBox(width: 8),
          hapticFeedbackType: HapticFeedbackType.lightImpact,
          onCompleted: _verifyOtp,
        ),
        const SizedBox(height: 48),
        _buildPrimaryButton(
          label: 'VERIFY CODE',
          isLoading: isLoading,
          onPressed: () => _verifyOtp(_otpCtrl.text),
          icon: Symbols.check_circle_rounded,
        ),
        const SizedBox(height: 32),
        _buildResendSection(),
      ],
    );
  }

  Widget _buildStep3(bool isLoading) {
    return Column(
      children: [
        const SizedBox(height: 60),
        _buildIconHeader(Symbols.lock_reset_rounded),
        const SizedBox(height: 32),
        Text(
          'New Password',
          style: AppTextStyles.headlineMedium.copyWith(
            fontWeight: FontWeight.w800,
            fontSize: 30,
            fontFamily: 'Manrope',
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Create a strong password to protect your terminal access.',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.onSurfaceVariant,
            fontWeight: FontWeight.w500,
            fontFamily: 'Inter',
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 48),
        _buildInputField(
          label: 'New Password',
          controller: _passwordCtrl,
          hint: '••••••••',
          isPassword: true,
          isObscured: _obscurePassword,
          onToggleVisibility: () => setState(() => _obscurePassword = !_obscurePassword),
        ),
        const SizedBox(height: 24),
        _buildInputField(
          label: 'Confirm Password',
          controller: _confirmCtrl,
          hint: '••••••••',
          isPassword: true,
          isObscured: _obscureConfirm,
          onToggleVisibility: () => setState(() => _obscureConfirm = !_obscureConfirm),
        ),
        const SizedBox(height: 48),
        _buildPrimaryButton(
          label: 'UPDATE PASSWORD',
          isLoading: isLoading,
          onPressed: _resetPassword,
          icon: Symbols.published_with_changes_rounded,
        ),
      ],
    );
  }

  Widget _buildIconHeader(IconData icon) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        icon,
        color: AppColors.primary,
        size: 48,
        fill: 1,
      ),
    );
  }

  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required String hint,
    bool isPassword = false,
    bool isObscured = false,
    VoidCallback? onToggleVisibility,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            label.toUpperCase(),
            style: AppTextStyles.labelSmall.copyWith(
              color: AppColors.onSurfaceVariant,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
              fontSize: 11,
            ),
          ),
        ),
        TextField(
          controller: controller,
          obscureText: isPassword && isObscured,
          keyboardType: keyboardType,
          style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w500, color: AppColors.onSurface),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: AppColors.outlineVariant.withOpacity(0.5)),
            filled: true,
            fillColor: AppColors.surfaceContainerHigh,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            suffixIcon: isPassword 
              ? IconButton(
                  icon: Icon(isObscured ? Symbols.visibility_rounded : Symbols.visibility_off_rounded, size: 20, color: AppColors.outlineVariant),
                  onPressed: onToggleVisibility,
                )
              : null,
          ),
        ),
      ],
    );
  }

  Widget _buildPrimaryButton({
    required String label,
    required VoidCallback onPressed,
    required IconData icon,
    bool isLoading = false,
  }) {
    return Container(
      width: double.infinity,
      height: 64,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: AppColors.tertiaryContainer.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.onTertiaryContainer,
          foregroundColor: AppColors.onTertiary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ),
        child: isLoading
          ? const CircularProgressIndicator(color: AppColors.onTertiary)
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  label,
                  style: AppTextStyles.labelLarge.copyWith(
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Manrope',
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(width: 12),
                Icon(icon, size: 20),
              ],
            ),
      ),
    );
  }

  Widget _buildResendSection() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(9999),
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
          onPressed: null,
          child: Text(
            'Resend OTP',
            style: AppTextStyles.labelSmall.copyWith(
              color: AppColors.onSurfaceVariant,
              fontWeight: FontWeight.bold,
              fontFamily: 'Inter',
              fontSize: 14,
              letterSpacing: 1,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFooter() {
    return Padding(
      padding: const EdgeInsets.all(32.0),
      child: Text(
        'SENTINEL SECURE NODE V4.2.0',
        style: AppTextStyles.labelSmall.copyWith(
          color: AppColors.onSurfaceVariant.withOpacity(0.3),
          letterSpacing: 3,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
