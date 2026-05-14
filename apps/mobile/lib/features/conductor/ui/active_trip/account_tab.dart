import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/storage/secure_storage.dart';

class AccountTab extends ConsumerWidget {
  final String tripId;
  const AccountTab({super.key, required this.tripId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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

          // Noise Overlay
          Positioned.fill(
            child: Opacity(
              opacity: 0.02,
              child: Image.network(
                'https://www.transparenttextures.com/patterns/carbon-fibre.png',
                repeat: ImageRepeat.repeat,
                errorBuilder: (context, error, stackTrace) => const SizedBox(),
              ),
            ),
          ),

          CustomScrollView(
            slivers: [
              // Custom AppBar with Branding
              SliverAppBar(
                expandedHeight: 120,
                collapsedHeight: 80,
                pinned: true,
                backgroundColor: AppColors.background,
                elevation: 0,
                flexibleSpace: FlexibleSpaceBar(
                  background: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 60, 24, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'THE SENTINEL',
                          style: AppTextStyles.labelSmall.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 4,
                            fontSize: 10,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Conductor Account',
                          style: AppTextStyles.headlineSmall.copyWith(
                            fontWeight: FontWeight.w900,
                            fontFamily: 'Manrope',
                            letterSpacing: -1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                actions: [
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Symbols.notifications_rounded, color: AppColors.primary),
                  ),
                  const SizedBox(width: 8),
                ],
              ),

              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    const SizedBox(height: 16),
                    
                    // Profile Header Card
                    _buildProfileHeader(),
                    
                    const SizedBox(height: 32),
                    
                    // Stats Section
                    _buildSectionHeader('OPERATIONAL STATS'),
                    const SizedBox(height: 16),
                    _buildStatsGrid(),
                    
                    const SizedBox(height: 32),
                    
                    // Actions Section
                    _buildSectionHeader('SYSTEM ACTIONS'),
                    const SizedBox(height: 16),
                    _buildActionItem(
                      icon: Symbols.support_agent_rounded,
                      title: 'Agency Support',
                      subtitle: 'Direct line to dispatcher',
                      onTap: () {},
                    ),
                    _buildActionItem(
                      icon: Symbols.emergency_share_rounded,
                      title: 'Emergency Contact',
                      subtitle: 'SOS Protocols & Numbers',
                      onTap: () {},
                    ),
                    _buildActionItem(
                      icon: Symbols.history_rounded,
                      title: 'Trip History',
                      subtitle: 'Past 30 days performance',
                      onTap: () {},
                    ),
                    _buildActionItem(
                      icon: Symbols.settings_rounded,
                      title: 'System Preferences',
                      subtitle: 'Notification & Voice settings',
                      onTap: () {},
                    ),
                    
                    const SizedBox(height: 40),
                    
                    // Logout Section
                    _buildLogoutButton(context),
                    
                    const SizedBox(height: 120),
                  ]),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: AppTextStyles.labelSmall.copyWith(
        color: AppColors.onSurfaceVariant,
        fontWeight: FontWeight.w800,
        fontSize: 10,
        letterSpacing: 2,
      ),
    );
  }

  Widget _buildProfileHeader() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.outlineVariant.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.primaryContainer,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.primary.withOpacity(0.2)),
            ),
            child: const Icon(Symbols.person_rounded, color: AppColors.primary, size: 44, fill: 1),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'MAHESH PATEL',
                  style: AppTextStyles.headlineSmall.copyWith(
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Manrope',
                    fontSize: 22,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'CHIEF CONDUCTOR • GJ-42',
                    style: AppTextStyles.labelSmall.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w900,
                      fontSize: 9,
                      letterSpacing: 1,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Symbols.verified_rounded, color: AppColors.secondary, size: 14, fill: 1),
                    const SizedBox(width: 4),
                    Text(
                      'Verified Identity',
                      style: AppTextStyles.labelSmall.copyWith(
                        color: AppColors.onSurfaceVariant.withOpacity(0.7),
                        fontSize: 10,
                        letterSpacing: 0,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid() {
    return Row(
      children: [
        _buildStatCard('MONTHLY TRIPS', '142', Symbols.route_rounded),
        const SizedBox(width: 16),
        _buildStatCard('SAFETY RATING', '4.9', Symbols.verified_user_rounded),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.outlineVariant.withOpacity(0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppColors.primary, size: 20),
            ),
            const SizedBox(height: 20),
            Text(
              value,
              style: AppTextStyles.headlineSmall.copyWith(
                fontWeight: FontWeight.w900,
                fontFamily: 'Manrope',
                fontSize: 32,
                letterSpacing: -1.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: AppTextStyles.labelSmall.copyWith(
                color: AppColors.onSurfaceVariant,
                fontWeight: FontWeight.w700,
                fontSize: 9,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHigh.withOpacity(0.5),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.outlineVariant.withOpacity(0.05)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: AppTextStyles.bodyLarge.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface,
                          fontFamily: 'Manrope',
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.onSurfaceVariant.withOpacity(0.7),
                          fontSize: 10,
                          letterSpacing: 0,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Symbols.chevron_right_rounded, 
                  color: AppColors.onSurfaceVariant.withOpacity(0.3),
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 72,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.error.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: () => _handleLogout(context),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.errorContainer.withOpacity(0.1),
          foregroundColor: AppColors.error,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: BorderSide(color: AppColors.error.withOpacity(0.2)),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Symbols.logout_rounded, size: 24, weight: 600),
            const SizedBox(width: 12),
            Text(
              'TERMINATE SESSION',
              style: AppTextStyles.labelLarge.copyWith(
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
                fontFamily: 'Manrope',
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surfaceContainerHigh,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        title: Text(
          'TERMINATE SESSION',
          style: AppTextStyles.headlineSmall.copyWith(
            fontFamily: 'Manrope',
            fontWeight: FontWeight.w900,
            fontSize: 20,
            letterSpacing: -0.5,
          ),
        ),
        content: Text(
          'Are you sure you want to log out? All active trip data will be synchronized before closing.',
          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'CANCEL', 
              style: TextStyle(
                color: AppColors.onSurfaceVariant, 
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.errorContainer,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('LOGOUT', style: TextStyle(fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await SecureStorage.clearAll();
      if (context.mounted) {
        context.go('/welcome');
      }
    }
  }
}

