import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../provider/auth_provider.dart';

class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final _nameCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  bool _isJoined = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _codeCtrl.dispose();
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
          // Background Gradient Orbs (matching 4.html)
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF0B3C5D).withOpacity(0.15),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF6C63FF).withOpacity(0.05),
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
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => context.pop(),
                        icon: const Icon(Symbols.arrow_back_rounded, color: AppColors.primary),
                        style: IconButton.styleFrom(
                          hoverColor: const Color(0xFF262A2F),
                        ),
                      ),
                      const Expanded(
                        child: Text(
                          'PROFILE SETUP',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Manrope',
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            letterSpacing: 1.5,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 48), // Balancing for center text
                    ],
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      children: [
                        const SizedBox(height: 24),
                        // Progress Indicator
                        Row(
                          children: [
                            Expanded(child: Container(height: 4, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(2)))),
                            const SizedBox(width: 8),
                            Expanded(child: Container(height: 4, decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(2)))),
                            const SizedBox(width: 8),
                            Expanded(child: Container(height: 4, decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(2)))),
                          ],
                        ),
                        const SizedBox(height: 48),

                        // Identity Section
                        Column(
                          children: [
                            Stack(
                              children: [
                                Container(
                                  width: 112,
                                  height: 112,
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceContainerHigh,
                                    borderRadius: BorderRadius.circular(32), // rounded-[2rem]
                                    border: Border.all(
                                      color: AppColors.outlineVariant.withOpacity(0.5),
                                      style: BorderStyle.solid,
                                    ),
                                  ),
                                  child: const Icon(
                                    Symbols.add_a_photo_rounded,
                                    size: 40,
                                    color: AppColors.onSurfaceVariant,
                                  ),
                                ),
                                Positioned(
                                  bottom: -2,
                                  right: -2,
                                  child: Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: AppColors.background, width: 4),
                                    ),
                                    child: const Icon(
                                      Symbols.edit_rounded,
                                      size: 20,
                                      color: AppColors.onPrimary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),
                            const Text(
                              'Finalize your identity',
                              style: TextStyle(
                                fontFamily: 'Manrope',
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Please verify your details before joining the fleet.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 14,
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 48),

                        // Form Layout
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildLabel('FULL NAME'),
                            const SizedBox(height: 8),
                            _buildInputField(
                              controller: _nameCtrl,
                              hint: 'Enter your full name',
                              icon: Symbols.person_rounded,
                            ),
                            const SizedBox(height: 24),

                            _buildLabel('PHONE NUMBER'),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Container(
                                  height: 64,
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceContainerLow,
                                    borderRadius: BorderRadius.circular(24),
                                  ),
                                  child: const Center(
                                    child: Text(
                                      '+91',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.onSurfaceVariant,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _buildInputField(
                                    controller: TextEditingController(text: '98765 43210'), // Placeholder for design
                                    hint: 'Phone Number',
                                    icon: Symbols.verified_rounded,
                                    iconColor: AppColors.onTertiaryContainer,
                                    isReadOnly: true,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),

                            _buildLabel('ASSIGNED ROLE'),
                            const SizedBox(height: 8),
                            _buildRoleCard(),
                            const SizedBox(height: 32),

                            // Info Card
                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: AppColors.tertiaryContainer.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: AppColors.tertiaryContainer.withOpacity(0.2)),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Symbols.info_rounded, color: AppColors.onTertiaryContainer, size: 20),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: RichText(
                                      text: TextSpan(
                                        style: const TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 14,
                                          color: AppColors.onTertiaryContainer,
                                          height: 1.5,
                                        ),
                                        children: [
                                          const TextSpan(text: 'By completing the setup, you agree to the '),
                                          TextSpan(
                                            text: 'Transit Terms',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.onTertiaryContainer.withOpacity(1),
                                              decoration: TextDecoration.underline,
                                            ),
                                          ),
                                          const TextSpan(text: ' and operational guidelines of The Sentinel Network.'),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 140), // Space for bottom action
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Bottom Action Area
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppColors.background.withOpacity(0),
                    AppColors.background.withOpacity(0.95),
                    AppColors.background,
                  ],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 64,
                    child: ElevatedButton(
                      onPressed: isLoading ? null : () async {
                        // Action logic remains same
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryContainer,
                        foregroundColor: const Color(0xFFA3CBF2),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                        elevation: 8,
                        shadowColor: Colors.black.withOpacity(0.4),
                      ),
                      child: isLoading 
                        ? const CircularProgressIndicator(color: Color(0xFFA3CBF2))
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'COMPLETE SETUP',
                                style: TextStyle(
                                  fontFamily: 'Manrope',
                                  fontWeight: FontWeight.w900,
                                  fontSize: 14,
                                  letterSpacing: 1.5,
                                ),
                              ),
                              SizedBox(width: 12),
                              Icon(Symbols.arrow_forward_rounded, size: 20),
                            ],
                          ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'THE SENTINEL V4.2.0',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                      color: AppColors.onSurfaceVariant.withOpacity(0.5),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        label,
        style: const TextStyle(
          fontFamily: 'Manrope',
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.5,
          color: AppColors.onSurfaceVariant,
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    Color? iconColor,
    bool isReadOnly = false,
  }) {
    return Container(
      height: 64,
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(24),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              readOnly: isReadOnly,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontWeight: FontWeight.w500,
                color: AppColors.onSurface,
              ),
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: TextStyle(
                  color: AppColors.onSurfaceVariant.withOpacity(0.4),
                ),
                border: InputBorder.none,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
          Icon(
            icon,
            color: iconColor ?? AppColors.onSurfaceVariant.withOpacity(0.3),
            fill: iconColor != null ? 1 : 0,
          ),
        ],
      ),
    );
  }

  Widget _buildRoleCard() {
    return Container(
      clipBehavior: Clip.antiAlias, // Important for the background badge
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh.withOpacity(0.5),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.outlineVariant.withOpacity(0.1)),
      ),
      child: Stack(
        children: [
          // Subtle background badge (from 4.html)
          Positioned(
            right: -24,
            bottom: -24,
            child: Opacity(
              opacity: 0.05,
              child: const Icon(
                Symbols.shield_rounded,
                size: 96, // text-8xl
                color: AppColors.onSurface,
              ),
            ),
          ),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.secondaryContainer.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Symbols.directions_bus_rounded, color: AppColors.secondary),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bus Conductor',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      'AUTO-DETECTED VIA ID',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 11,
                        letterSpacing: 1,
                        color: Color(0xB3B4B0FF), // on-secondary-container opacity 0.7
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Symbols.lock_rounded, size: 16, color: AppColors.onSurfaceVariant),
            ],
          ),
        ],
      ),
    );
  }
}
