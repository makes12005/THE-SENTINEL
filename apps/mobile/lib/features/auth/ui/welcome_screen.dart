import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../provider/auth_provider.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';

class WelcomeScreen extends ConsumerStatefulWidget {
  const WelcomeScreen({super.key});

  @override
  ConsumerState<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends ConsumerState<WelcomeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _contactCon = TextEditingController();

  @override
  void dispose() {
    _contactCon.dispose();
    super.dispose();
  }

  Future<void> _onSendOtp() async {
    if (!_formKey.currentState!.validate()) return;
    
    final contact = _contactCon.text.trim();
    
    final success = await ref.read(authProvider.notifier).sendOtp(contact);
    if (success && mounted) {
      context.push(AppRoutes.otp);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    // Show error snackbar reactively
    ref.listen<AuthState>(authProvider, (prev, next) {
      if (next.error != null && next.error != prev?.error) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(next.error!),
          backgroundColor: AppColors.errorContainer,
        ));
      }
    });

    return Scaffold(
      body: Stack(
        children: [
          Positioned(
            top: -80, right: -80,
            child: _glowOrb(AppColors.primary.withOpacity(0.08), 260),
          ),
          Positioned(
            bottom: -60, left: -80,
            child: _glowOrb(AppColors.secondary.withOpacity(0.05), 320),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 40),
                    Center(
                      child: Column(
                        children: [
                          Container(
                            width: 72, height: 72,
                            decoration: BoxDecoration(
                              color: AppColors.primaryContainer,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Icon(
                              Icons.directions_bus_rounded,
                              color: AppColors.primary,
                              size: 40,
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            'Welcome',
                            style: GoogleFonts.manrope(
                              fontSize: 36,
                              fontWeight: FontWeight.w800,
                              color: AppColors.onSurface,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Enter your phone number or email to continue.',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              color: AppColors.onSurfaceVariant,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 48),
                    Text(
                      'PHONE OR EMAIL',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurfaceVariant,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _contactCon,
                      keyboardType: TextInputType.emailAddress,
                      style: GoogleFonts.inter(color: AppColors.onSurface, fontSize: 16),
                      decoration: const InputDecoration(
                        hintText: '+91XXXXXXXXXX or name@example.com',
                        prefixIcon: Icon(Icons.alternate_email, color: AppColors.onSurfaceVariant),
                      ),
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Phone number or email is required';
                        final value = v.trim();
                        final isEmail = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value);
                        final digits = value.replaceAll(RegExp(r'\D'), '');
                        final isPhone =
                            value.startsWith('+') ? digits.length >= 10 : digits.length == 10;
                        if (!isEmail && !isPhone) {
                          return 'Enter a valid phone number or email';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 60,
                      child: ElevatedButton(
                        onPressed: auth.isLoading ? null : _onSendOtp,
                        child: auth.isLoading
                            ? const SizedBox(
                                width: 24, height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: AppColors.onPrimaryContainer,
                                ),
                              )
                            : Text(
                                'SEND OTP',
                                style: GoogleFonts.manrope(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                  letterSpacing: 3,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _glowOrb(Color color, double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.15),
            blurRadius: size * 0.4,
            spreadRadius: size * 0.1,
          ),
        ],
      ),
    );
  }
}
