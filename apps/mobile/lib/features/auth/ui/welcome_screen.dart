import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../provider/auth_provider.dart';

class WelcomeScreen extends ConsumerStatefulWidget {
  const WelcomeScreen({super.key});

  @override
  ConsumerState<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends ConsumerState<WelcomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _loginContactCtrl = TextEditingController();
  final _loginPasswordCtrl = TextEditingController();
  final _signupNameCtrl = TextEditingController();
  final _signupContactCtrl = TextEditingController();
  final _signupPasswordCtrl = TextEditingController();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _loginContactCtrl.dispose();
    _loginPasswordCtrl.dispose();
    _signupNameCtrl.dispose();
    _signupContactCtrl.dispose();
    _signupPasswordCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.isLoading;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Noise-like Gradient Background (Matching .noise-bg)
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.0,
                  colors: [
                    Color(0x0DFA3CBF2), // rgba(163, 203, 242, 0.05)
                    AppColors.background,
                  ],
                ),
              ),
            ),
          ),
          
          // Visual Polish Orbs (Matching fixed top-[-10%] and bottom-[-5%])
          Positioned(
            top: -MediaQuery.of(context).size.height * 0.1,
            right: -MediaQuery.of(context).size.width * 0.1,
            child: Container(
              width: 256,
              height: 256,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withOpacity(0.1),
              ),
              child: const SizedBox(),
            ),
          ),
          Positioned(
            bottom: -MediaQuery.of(context).size.height * 0.05,
            left: -MediaQuery.of(context).size.width * 0.1,
            child: Container(
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.secondary.withOpacity(0.05),
              ),
              child: const SizedBox(),
            ),
          ),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  const SizedBox(height: 64),
                  
                  // 1. Top: Welcome Header
                  Column(
                    children: [
                      Text(
                        'Welcome',
                        style: AppTextStyles.headlineLarge.copyWith(
                          fontSize: 40,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -1.0,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Access your transit control terminal.',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.onSurfaceVariant,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),
                  
                  // 2. Login / Sign Up toggle
                  Container(
                    height: 56,
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerLowest,
                      borderRadius: BorderRadius.circular(28),
                    ),
                    child: Row(
                      children: [
                        _buildToggleItem(0, 'LOGIN'),
                        _buildToggleItem(1, 'SIGN UP'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                  
                  // 3. Continue with Google
                  _buildGoogleButton(),
                  
                  const SizedBox(height: 32),
                  
                  // Divider
                  Row(
                    children: [
                      Expanded(child: Container(height: 1, color: AppColors.surfaceContainerHighest)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          'OR',
                          style: AppTextStyles.labelSmall.copyWith(
                            color: AppColors.outlineVariant,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 3,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      Expanded(child: Container(height: 1, color: AppColors.surfaceContainerHighest)),
                    ],
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Tab Content (Auth Form)
                  _tabController.index == 0 
                    ? _buildLoginTab(isLoading)
                    : _buildSignupTab(isLoading),
                  
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToggleItem(int index, String label) {
    final isActive = _tabController.index == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tabController.index = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isActive ? AppColors.surfaceContainerHighest : Colors.transparent,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Text(
            label,
            style: AppTextStyles.labelSmall.copyWith(
              color: isActive ? AppColors.primary : AppColors.onSurfaceVariant,
              fontWeight: FontWeight.w700,
              fontSize: 13,
              letterSpacing: 1.2,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGoogleButton() {
    return Container(
      width: double.infinity,
      height: 60,
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {}, // TODO: Google Sign In
          borderRadius: BorderRadius.circular(12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.network(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuCEhMhAS14snMCqgSGt_2gerPVe3WBk6jPpGQ2U9vHPct7gwHzK7f6o22qb-biLlAuFbq77_Xdr2vmPtZYDdltLqcPEFBp1W3_9PN348-b_NrkLDeRjOSR0IAuzz-0GrED78PzxpDZwZ4cJSy0fw_ICSU8Pj4Tm0rVXiYXGCbckBjxTYGq8el4rT5ljYPFDa7d5cPZ95U7Dwzu3Sr_iIFybmdxJOh8h7B9TOmXzmSmcAbXlH1D-Q70SZyd5ZwHXn-lkE3K8U4AKylZG',
                height: 20,
              ),
              const SizedBox(width: 12),
              Text(
                'Continue with Google',
                style: AppTextStyles.bodyLarge.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoginTab(bool isLoading) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInputField(
          label: 'Phone Number',
          controller: _loginContactCtrl,
          hint: '+1 (555) 000-0000',
          keyboardType: TextInputType.phone,
        ),
        const SizedBox(height: 24),
        _buildInputField(
          label: 'Password',
          controller: _loginPasswordCtrl,
          hint: '••••••••',
          isPassword: true,
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => context.push('/forgot-password'),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              'Forgot Password?'.toUpperCase(),
              style: AppTextStyles.labelSmall.copyWith(
                color: AppColors.onSurfaceVariant.withOpacity(0.6),
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        _buildPrimaryButton(
          label: 'LOGIN',
          isLoading: isLoading,
          onPressed: () async {
            final success = await ref.read(authControllerProvider.notifier)
                .login(_loginContactCtrl.text, _loginPasswordCtrl.text);
            if (success && mounted) {
              context.go('/conductor');
            } else if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: AppColors.errorContainer,
                  content: Text('Login failed', style: TextStyle(color: AppColors.onErrorContainer)),
                ),
              );
            }
          },
        ),
        const SizedBox(height: 24),
        Center(
          child: TextButton(
            onPressed: () => context.push('/otp', extra: {'contact': _loginContactCtrl.text}),
            child: Text(
              'LOGIN WITH OTP',
              style: AppTextStyles.labelLarge.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSignupTab(bool isLoading) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInputField(
          label: 'Full Name',
          controller: _signupNameCtrl,
          hint: 'Enter your name',
        ),
        const SizedBox(height: 24),
        _buildInputField(
          label: 'Phone Number',
          controller: _signupContactCtrl,
          hint: '+1 (555) 000-0000',
          keyboardType: TextInputType.phone,
        ),
        const SizedBox(height: 24),
        _buildInputField(
          label: 'Password',
          controller: _signupPasswordCtrl,
          hint: '••••••••',
          isPassword: true,
        ),
        const SizedBox(height: 32),
        _buildPrimaryButton(
          label: 'SIGN UP',
          isLoading: isLoading,
          onPressed: () async {
            final success = await ref.read(authControllerProvider.notifier)
                .sendOtp(_signupContactCtrl.text);
            if (success && mounted) {
              context.push('/otp', extra: {
                'contact': _signupContactCtrl.text,
                'isSignup': true,
              });
            } else if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: AppColors.errorContainer,
                  content: Text('Failed to send OTP', style: TextStyle(color: AppColors.onErrorContainer)),
                ),
              );
            }
          },
        ),
      ],
    );
  }

  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required String hint,
    bool isPassword = false,
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
              fontWeight: FontWeight.w800,
              letterSpacing: 1.5,
              fontSize: 11,
            ),
          ),
        ),
        TextField(
          controller: controller,
          obscureText: isPassword && _obscurePassword,
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
                  icon: Icon(_obscurePassword ? Symbols.visibility_rounded : Symbols.visibility_off_rounded, size: 20, color: AppColors.outlineVariant),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
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
    bool isLoading = false,
  }) {
    return Container(
      width: double.infinity,
      height: 68,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryContainer,
          foregroundColor: AppColors.onPrimaryContainer,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ),
        child: isLoading
          ? const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.onPrimaryContainer),
            )
          : Text(
              label,
              style: AppTextStyles.headlineSmall.copyWith(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                letterSpacing: 2.5,
                color: AppColors.onPrimaryContainer,
              ),
            ),
      ),
    );
  }
}

