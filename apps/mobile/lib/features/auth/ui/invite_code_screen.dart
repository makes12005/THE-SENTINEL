import 'package:bus_alert/core/theme/app_colors.dart';
import 'package:bus_alert/core/theme/app_text_styles.dart';
import 'package:bus_alert/features/auth/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class InviteCodeScreen extends ConsumerStatefulWidget {
  const InviteCodeScreen({super.key});

  @override
  ConsumerState<InviteCodeScreen> createState() => _InviteCodeScreenState();
}

class _InviteCodeScreenState extends ConsumerState<InviteCodeScreen> {
  final _inviteCodeController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _inviteCodeController.dispose();
    super.dispose();
  }

  Future<void> _handleJoinAgency() async {
    if (_inviteCodeController.text.isEmpty) {
      setState(() => _errorMessage = 'Please enter an agency code');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await ref.read(authProvider.notifier).joinAgency(
      inviteCode: _inviteCodeController.text.trim().toUpperCase(),
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

  void _handleSkip() {
    final user = ref.read(authProvider).user;
    if (user?.isConductor ?? false) {
      context.go('/conductor');
    } else if (user?.isDriver ?? false) {
      context.go('/driver');
    } else {
      context.go('/welcome');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    if (authState.hasError && authState.errorMessage != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        setState(() => _errorMessage = authState.errorMessage);
        ref.read(authProvider.notifier).resetError();
      });
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Agency Code',
          style: AppTextStyles.titleMedium.copyWith(color: AppColors.primary),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
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
                  Icons.domain_outlined,
                  size: 40,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'Enter Agency Code',
                style: AppTextStyles.headlineMedium.copyWith(color: AppColors.textOnSurface),
              ),
              const SizedBox(height: 8),
              Text(
                'Enter your agency\'s unique invite code\nto join the team',
                textAlign: TextAlign.center,
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textOnSurfaceVariant),
              ),
              const SizedBox(height: 40),
              TextField(
                controller: _inviteCodeController,
                textAlign: TextAlign.center,
                style: AppTextStyles.headlineSmall.copyWith(
                  color: AppColors.primary,
                  letterSpacing: 4,
                ),
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  hintText: 'BUS-XXXX',
                  hintStyle: AppTextStyles.headlineSmall.copyWith(
                    color: AppColors.textSecondary,
                    letterSpacing: 4,
                  ),
                  contentPadding: const EdgeInsets.symmetric(vertical: 20),
                ),
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
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleJoinAgency,
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
                      : Text('CONTINUE', style: AppTextStyles.buttonLarge),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: _isLoading ? null : _handleSkip,
                child: Text(
                  'Skip for now',
                  style: AppTextStyles.labelMedium.copyWith(color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
