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
  final _passCon = TextEditingController();
  int _authTab = 0;

  @override
  void dispose() {
    _contactCon.dispose();
    _passCon.dispose();
    super.dispose();
  }

  Future<void> _onPasswordLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final contact = _contactCon.text.trim();
    final password = _passCon.text;
    if (password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Password is required'),
        backgroundColor: AppColors.errorContainer,
      ));
      return;
    }

    final success = await ref.read(authProvider.notifier).loginWithPassword(
      contact: contact,
      password: password,
    );
    if (success && mounted) {
      context.go(AppRoutes.dashboard);
    }
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
                            'Access your transit control terminal.',
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
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerLowest,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _authTab = 0),
                              child: Container(
                                height: 44,
                                decoration: BoxDecoration(
                                  color: _authTab == 0 ? AppColors.surfaceContainerHigh : Colors.transparent,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Center(
                                  child: Text('LOGIN', style: GoogleFonts.manrope(fontWeight: FontWeight.w800, letterSpacing: 1.2, color: _authTab == 0 ? AppColors.primary : AppColors.onSurfaceVariant)),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _authTab = 1),
                              child: Container(
                                height: 44,
                                decoration: BoxDecoration(
                                  color: _authTab == 1 ? AppColors.surfaceContainerHigh : Colors.transparent,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Center(
                                  child: Text('SIGN UP', style: GoogleFonts.manrope(fontWeight: FontWeight.w800, letterSpacing: 1.2, color: _authTab == 1 ? AppColors.primary : AppColors.onSurfaceVariant)),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.g_mobiledata_rounded, size: 28),
                        label: Text('Continue with Google', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.surfaceContainerHigh,
                          foregroundColor: AppColors.onSurface,
                          elevation: 0,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        const Expanded(child: Divider(color: AppColors.surfaceContainerHighest)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: Text('OR', style: GoogleFonts.manrope(fontSize: 11, letterSpacing: 1.4, color: AppColors.outline)),
                        ),
                        const Expanded(child: Divider(color: AppColors.surfaceContainerHighest)),
                      ],
                    ),
                    const SizedBox(height: 22),
                    Text(
                      'PHONE NUMBER / EMAIL',
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
                    const SizedBox(height: 20),
                    Text(
                      'PASSWORD',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurfaceVariant,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _passCon,
                      obscureText: true,
                      style: GoogleFonts.inter(color: AppColors.onSurface, fontSize: 16),
                      decoration: const InputDecoration(
                        hintText: '••••••••',
                        prefixIcon: Icon(Icons.lock_outline, color: AppColors.onSurfaceVariant),
                      ),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 60,
                      child: ElevatedButton(
                        onPressed: auth.isLoading ? null : _onPasswordLogin,
                        child: auth.isLoading
                            ? const SizedBox(
                                width: 24, height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: AppColors.onPrimaryContainer,
                                ),
                              )
                            : Text(
                                'LOGIN',
                                style: GoogleFonts.manrope(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                  letterSpacing: 3,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: auth.isLoading ? null : _onSendOtp,
                      child: Text(
                        'LOGIN WITH OTP',
                        style: GoogleFonts.manrope(
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.3,
                          color: AppColors.primary,
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
