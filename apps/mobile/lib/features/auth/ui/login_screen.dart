import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../provider/auth_provider.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _phoneCon   = TextEditingController();
  final _passCon    = TextEditingController();
  bool  _obscure    = true;

  @override
  void dispose() {
    _phoneCon.dispose();
    _passCon.dispose();
    super.dispose();
  }

  Future<void> _onLogin() async {
    if (!_formKey.currentState!.validate()) return;
    final success = await ref.read(authProvider.notifier).login(
      phone:    _phoneCon.text.trim(),
      password: _passCon.text,
    );
    if (success && mounted) {
      context.go(AppRoutes.dashboard);
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
          // ── Ambient glow orbs ────────────────────────────────────────────
          Positioned(
            top: -80, right: -80,
            child: _glowOrb(AppColors.primary.withOpacity(0.08), 260),
          ),
          Positioned(
            bottom: -60, left: -80,
            child: _glowOrb(AppColors.secondary.withOpacity(0.05), 320),
          ),

          // ── Main content ─────────────────────────────────────────────────
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 40),

                    // ── Welcome header ──────────────────────────────────────
                    Center(
                      child: Column(
                        children: [
                          // Bus Alert icon
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

                    // ── Phone field ─────────────────────────────────────────
                    Text(
                      'PHONE NUMBER',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurfaceVariant,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _phoneCon,
                      keyboardType: TextInputType.phone,
                      style: GoogleFonts.inter(color: AppColors.onSurface, fontSize: 16),
                      decoration: const InputDecoration(
                        hintText: '+91XXXXXXXXXX',
                        prefixIcon: Icon(Icons.phone_outlined, color: AppColors.onSurfaceVariant),
                      ),
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Phone number is required';
                        if (!v.startsWith('+91') || v.length != 13) {
                          return 'Use format +91XXXXXXXXXX';
                        }
                        return null;
                      },
                    ),

                    const SizedBox(height: 20),

                    // ── Password field ──────────────────────────────────────
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
                      obscureText: _obscure,
                      style: GoogleFonts.inter(color: AppColors.onSurface, fontSize: 16),
                      decoration: InputDecoration(
                        hintText: '••••••••',
                        prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppColors.onSurfaceVariant),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            color: AppColors.onSurfaceVariant,
                          ),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Password is required';
                        if (v.length < 6)           return 'Password too short';
                        return null;
                      },
                    ),

                    const SizedBox(height: 32),

                    // ── Login button ────────────────────────────────────────
                    SizedBox(
                      width: double.infinity,
                      height: 60,
                      child: ElevatedButton(
                        onPressed: auth.isLoading ? null : _onLogin,
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

                    const SizedBox(height: 24),

                    // ── Footer notice ───────────────────────────────────────
                    Center(
                      child: Text(
                        'Conductor access only',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppColors.outline,
                          fontWeight: FontWeight.w500,
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
      width: size, height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
      ),
      child: ImageFiltered(
        imageFilter: ColorFilter.mode(color, BlendMode.srcIn),
        child: Container(),
      ),
    );
  }
}
