import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

enum SentinelButtonStyle {
  primary, // Gradient (Tertiary)
  secondary, // Surface Container Highest
  primaryContainer, // Primary Container (used for Start Trip)
  ghost, // No background
}

class SentinelButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final SentinelButtonStyle style;
  final IconData? icon;
  final double height;
  final double? width;
  final bool isLoading;

  const SentinelButton({
    super.key,
    required this.label,
    this.onPressed,
    this.style = SentinelButtonStyle.primary,
    this.icon,
    this.height = 56,
    this.width,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: onPressed == null ? 1.0 : 1.0, // We can add hover/active scales later
      duration: const Duration(milliseconds: 100),
      child: Container(
        width: width ?? double.infinity,
        height: height,
        decoration: _getDecoration(),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: isLoading ? null : onPressed,
            borderRadius: BorderRadius.circular(_getBorderRadius()),
            child: Center(
              child: isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (icon != null) ...[
                          Icon(
                            icon,
                            color: _getTextColor(),
                            size: style == SentinelButtonStyle.primary ? 24 : 20,
                          ),
                          const SizedBox(width: 12),
                        ],
                        Text(
                          label.toUpperCase(),
                          style: _getTextStyle(),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }

  BoxDecoration _getDecoration() {
    switch (style) {
      case SentinelButtonStyle.primary:
        return BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.tertiaryContainer, AppColors.onTertiaryContainer],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(_getBorderRadius()),
          boxShadow: [
            BoxShadow(
              color: AppColors.tertiaryContainer.withOpacity(0.4),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        );
      case SentinelButtonStyle.secondary:
        return BoxDecoration(
          color: AppColors.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(_getBorderRadius()),
          border: Border.all(
            color: AppColors.outlineVariant.withOpacity(0.2),
            width: 1,
          ),
        );
      case SentinelButtonStyle.primaryContainer:
        return BoxDecoration(
          color: AppColors.primaryContainer,
          borderRadius: BorderRadius.circular(_getBorderRadius()),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        );
      case SentinelButtonStyle.ghost:
        return const BoxDecoration();
    }
  }

  double _getBorderRadius() {
    return style == SentinelButtonStyle.primaryContainer ? 24 : 12;
  }

  Color _getTextColor() {
    switch (style) {
      case SentinelButtonStyle.primary:
        return Colors.white;
      case SentinelButtonStyle.secondary:
        return AppColors.onSurface;
      case SentinelButtonStyle.primaryContainer:
        return AppColors.onPrimaryContainer;
      case SentinelButtonStyle.ghost:
        return AppColors.primary;
    }
  }

  TextStyle _getTextStyle() {
    final base = AppTextStyles.headlineMedium.copyWith(
      color: _getTextColor(),
      fontWeight: FontWeight.w800,
      letterSpacing: style == SentinelButtonStyle.primaryContainer ? 1.5 : 1.0,
      fontSize: style == SentinelButtonStyle.primary || style == SentinelButtonStyle.primaryContainer ? 18 : 14,
    );
    return base;
  }
}
