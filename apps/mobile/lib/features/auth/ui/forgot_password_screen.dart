import 'dart:async';
import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:bus_alert/features/auth/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pinput/pinput.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _contactController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  int _step = 0;
  bool _isLoading = false;
  int _countdown = 30;
  Timer? _timer;
  bool _canResend = false;
  String? _errorMessage;

  @override
  void dispose() {
    _timer?.cancel();
    _contactController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (_contactController.text.isEmpty) {
      setState(() => _errorMessage = 'Please enter your phone or email');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await ref.read(authProvider.notifier).sendOtp(
      contact: _contactController.text.trim(),
    );

    setState(() {
      _isLoading = false;
    });

    if (success) {
      setState(() => _step = 1);
      _startTimer();
    }
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() {
      _countdown = 30;
      _canResend = false;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown > 0) {
        setState(() => _countdown--);
      } else {
        setState(() => _canResend = true);
        timer.cancel();
      }
    });
  }

  Future<void> _verifyOtp() async {
    if (_otpController.text.length != 6) {
      setState(() => _errorMessage = 'Please enter 6-digit OTP');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await ref.read(authProvider.notifier).verifyOtp(
      otp: _otpController.text,
    );

    setState(() => _isLoading = false);

    if (success) {
      setState(() => _step = 2);
    }
  }

  Future<void> _resetPassword() async {
    if (_newPasswordController.text.length < 8) {
      setState(() => _errorMessage = 'Password must be at least 8 characters');
      return;
    }

    if (_newPasswordController.text != _confirmPasswordController.text) {
      setState(() => _errorMessage = 'Passwords do not match');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    await Future.delayed(const Duration(seconds: 1));

    setState(() => _isLoading = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Password reset successful'),
          backgroundColor: AppColors.success,
        ),
      );
      context.go('/welcome');
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
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Reset Password',
          style: AppTextStyles.titleMedium.copyWith(color: AppColors.primary),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _buildCurrentStep(),
        ),
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_step) {
      case 0:
        return _buildContactStep();
      case 1:
        return _buildOtpStep();
      case 2:
        return _buildNewPasswordStep();
      default:
        return _buildContactStep();
    }
  }

  Widget _buildContactStep() {
    return Column(
      children: [
        const Spacer(),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerHigh,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.lock_reset_outlined,
            size: 40,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 32),
        Text(
          'Forgot Password?',
          style: AppTextStyles.headlineMedium.copyWith(color: AppColors.textOnSurface),
        ),
        const SizedBox(height: 8),
        Text(
          'Enter your registered phone or email\nto receive a reset code',
          textAlign: TextAlign.center,
          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textOnSurfaceVariant),
        ),
        const SizedBox(height: 40),
        _buildInputField(
          controller: _contactController,
          label: 'Phone / Email',
          hint: '+91 98765 43210 or email@example.com',
          keyboardType: TextInputType.emailAddress,
          prefixIcon: Icons.phone_outlined,
        ),
        if (_errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Text(
              _errorMessage!,
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.error),
            ),
          ),
        const Spacer(),
        _buildPrimaryButton('SEND OTP', _sendOtp),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildOtpStep() {
    final defaultPinTheme = PinTheme(
      width: 48,
      height: 56,
      textStyle: AppTextStyles.titleLarge.copyWith(color: AppColors.primary),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
      ),
    );

    return Column(
      children: [
        const Spacer(),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerHigh,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.shield_outlined,
            size: 40,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 32),
        Text(
          'Enter Code',
          style: AppTextStyles.headlineMedium.copyWith(color: AppColors.textOnSurface),
        ),
        const SizedBox(height: 8),
        Text(
          'Enter the 6-digit code sent to\n${_contactController.text}',
          textAlign: TextAlign.center,
          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textOnSurfaceVariant),
        ),
        const SizedBox(height: 40),
        Pinput(
          controller: _otpController,
          length: 6,
          defaultPinTheme: defaultPinTheme,
          onCompleted: (pin) {
            if (pin.length == 6 && !_isLoading) {
              _verifyOtp();
            }
          },
          keyboardType: TextInputType.number,
        ),
        if (_errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Text(
              _errorMessage!,
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.error),
            ),
          ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.timer_outlined, size: 18, color: AppColors.secondary),
            const SizedBox(width: 8),
            Text(
              '${_countdown ~/ 60}:${(_countdown % 60).toString().padLeft(2, '0')}',
              style: AppTextStyles.labelLarge.copyWith(color: AppColors.secondary),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _canResend && !_isLoading ? _sendOtp : null,
          child: Text(
            'Resend OTP',
            style: AppTextStyles.labelMedium.copyWith(
              color: _canResend ? AppColors.primary : AppColors.textSecondary,
            ),
          ),
        ),
        const Spacer(),
        _buildPrimaryButton('VERIFY', _verifyOtp),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildNewPasswordStep() {
    return Column(
      children: [
        const Spacer(),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerHigh,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.password_outlined,
            size: 40,
            color: AppColors.success,
          ),
        ),
        const SizedBox(height: 32),
        Text(
          'Set New Password',
          style: AppTextStyles.headlineMedium.copyWith(color: AppColors.textOnSurface),
        ),
        const SizedBox(height: 8),
        Text(
          'Create a strong password for your account',
          textAlign: TextAlign.center,
          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textOnSurfaceVariant),
        ),
        const SizedBox(height: 40),
        _buildInputField(
          controller: _newPasswordController,
          label: 'New Password',
          hint: '••••••••',
          obscureText: true,
          prefixIcon: Icons.lock_outline,
        ),
        const SizedBox(height: 16),
        _buildInputField(
          controller: _confirmPasswordController,
          label: 'Confirm Password',
          hint: '••••••••',
          obscureText: true,
          prefixIcon: Icons.lock_outline,
        ),
        if (_errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Text(
              _errorMessage!,
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.error),
            ),
          ),
        const Spacer(),
        _buildPrimaryButton('RESET PASSWORD', _resetPassword),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    IconData? prefixIcon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textOnSurfaceVariant),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          style: AppTextStyles.bodyLarge.copyWith(color: AppColors.textOnSurface),
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: prefixIcon != null ? Icon(prefixIcon, color: AppColors.textSecondary) : null,
          ),
        ),
      ],
    );
  }

  Widget _buildPrimaryButton(String text, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryContainer,
          foregroundColor: AppColors.surfaceTint,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.surfaceTint),
              )
            : Text(text, style: AppTextStyles.buttonLarge),
      ),
    );
  }
}
