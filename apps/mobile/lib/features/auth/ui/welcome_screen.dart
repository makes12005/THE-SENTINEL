import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:bus_alert/features/auth/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';

class WelcomeScreen extends ConsumerStatefulWidget {
  const WelcomeScreen({super.key});

  @override
  ConsumerState<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends ConsumerState<WelcomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _contactController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _contactController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_contactController.text.isEmpty || _passwordController.text.isEmpty) {
      _showError('Please fill in all fields');
      return;
    }

    setState(() => _isLoading = true);
    
    final success = await ref.read(authProvider.notifier).login(
      contact: _contactController.text.trim(),
      password: _passwordController.text,
    );
    
    setState(() => _isLoading = false);
    
    if (success) {
      final user = ref.read(authProvider).user;
      if (user?.isConductor ?? false) {
        context.go('/conductor');
      } else if (user?.isDriver ?? false) {
        context.go('/driver');
      }
    }
  }

  Future<void> _handleGoogleSignIn() async {
    try {
      final googleSignIn = GoogleSignIn();
      final account = await googleSignIn.signIn();
      if (account != null) {
        _showError('Google Sign In requires backend integration');
      }
    } catch (e) {
      _showError('Google Sign In failed');
    }
  }

  void _handleSendOtp() {
    if (_contactController.text.isEmpty) {
      _showError('Please enter phone or email');
      return;
    }
    context.push('/otp', extra: {'contact': _contactController.text.trim(), 'isLoginFlow': true});
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppColors.error),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    
    if (authState.hasError && authState.errorMessage != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showError(authState.errorMessage!);
        ref.read(authProvider.notifier).resetError();
      });
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 48),
              Text(
                'Welcome',
                textAlign: TextAlign.center,
                style: AppTextStyles.displaySmall.copyWith(
                  color: AppColors.textOnSurface,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Access your transit control terminal.',
                textAlign: TextAlign.center,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textOnSurfaceVariant,
                ),
              ),
              const SizedBox(height: 32),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLowest,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: AppColors.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  indicatorPadding: const EdgeInsets.all(4),
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textOnSurfaceVariant,
                  labelStyle: AppTextStyles.labelExtraSmall,
                  dividerColor: Colors.transparent,
                  tabs: const [
                    Tab(text: 'LOGIN'),
                    Tab(text: 'SIGN UP'),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildLoginTab(),
                    _buildSignupTab(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoginTab() {
    return SingleChildScrollView(
      child: Column(
        children: [
          const SizedBox(height: 8),
          _buildGoogleButton(),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(child: Container(height: 1, color: AppColors.surfaceContainerHighest)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Or',
                  style: AppTextStyles.labelExtraSmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              Expanded(child: Container(height: 1, color: AppColors.surfaceContainerHighest)),
            ],
          ),
          const SizedBox(height: 24),
          _buildTextField(
            controller: _contactController,
            label: 'Phone / Email',
            hint: '+91 98765 43210 or email@example.com',
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _passwordController,
            label: 'Password',
            hint: '••••••••',
            obscureText: _obscurePassword,
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                color: AppColors.textSecondary,
              ),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => context.push('/forgot-password'),
              child: Text(
                'Forgot Password?',
                style: AppTextStyles.labelMedium.copyWith(color: AppColors.primary),
              ),
            ),
          ),
          const SizedBox(height: 8),
          _buildPrimaryButton(
            text: 'LOGIN',
            isLoading: _isLoading,
            onPressed: _handleLogin,
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: _handleSendOtp,
            child: Text(
              'Login with OTP',
              style: AppTextStyles.labelMedium.copyWith(color: AppColors.primary),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSignupTab() {
    return SingleChildScrollView(
      child: Column(
        children: [
          const SizedBox(height: 8),
          _buildGoogleButton(),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(child: Container(height: 1, color: AppColors.surfaceContainerHighest)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Or',
                  style: AppTextStyles.labelExtraSmall.copyWith(color: AppColors.textSecondary),
                ),
              ),
              Expanded(child: Container(height: 1, color: AppColors.surfaceContainerHighest)),
            ],
          ),
          const SizedBox(height: 24),
          _buildTextField(
            controller: _nameController,
            label: 'Full Name',
            hint: 'Enter your full name',
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _contactController,
            label: 'Phone / Email',
            hint: '+91 98765 43210 or email@example.com',
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _passwordController,
            label: 'Password',
            hint: '••••••••',
            obscureText: _obscurePassword,
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                color: AppColors.textSecondary,
              ),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
          const SizedBox(height: 24),
          _buildPrimaryButton(
            text: 'SIGN UP',
            isLoading: _isLoading,
            onPressed: () {
              if (_nameController.text.isEmpty || 
                  _contactController.text.isEmpty || 
                  _passwordController.text.isEmpty) {
                _showError('Please fill in all fields');
                return;
              }
              context.push('/otp', extra: {
                'contact': _contactController.text.trim(),
                'name': _nameController.text.trim(),
                'password': _passwordController.text,
                'isLoginFlow': false,
              });
            },
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildGoogleButton() {
    return OutlinedButton(
      onPressed: _handleGoogleSignIn,
      style: OutlinedButton.styleFrom(
        backgroundColor: AppColors.surfaceContainerHigh,
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.network(
            'https://www.google.com/favicon.ico',
            width: 20,
            height: 20,
            errorBuilder: (_, __, ___) => const Icon(Icons.g_mobiledata, size: 24),
          ),
          const SizedBox(width: 12),
          Text(
            'Continue with Google',
            style: AppTextStyles.labelLarge.copyWith(color: AppColors.textOnSurface),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    Widget? suffixIcon,
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
            suffixIcon: suffixIcon,
          ),
        ),
      ],
    );
  }

  Widget _buildPrimaryButton({
    required String text,
    required VoidCallback onPressed,
    bool isLoading = false,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryContainer,
          foregroundColor: AppColors.surfaceTint,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        child: isLoading
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
