import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class BentoCard extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderWidth;
  final EdgeInsets padding;
  final bool isGlass;
  final List<Widget>? decorators;

  const BentoCard({
    super.key,
    required this.child,
    this.borderRadius = 28,
    this.backgroundColor,
    this.borderColor,
    this.borderWidth = 1,
    this.padding = const EdgeInsets.all(24),
    this.isGlass = false,
    this.decorators,
  });

  @override
  Widget build(BuildContext context) {
    Widget content = Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: backgroundColor ?? (isGlass ? Colors.transparent : AppColors.surfaceContainerLow),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: borderColor ?? AppColors.outlineVariant.withOpacity(0.1),
          width: borderWidth,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Stack(
          children: [
            if (decorators != null) ...decorators!,
            Padding(
              padding: padding,
              child: child,
            ),
          ],
        ),
      ),
    );

    if (isGlass) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            decoration: BoxDecoration(
              color: (backgroundColor ?? AppColors.surfaceContainerLow).withOpacity(0.5),
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: borderColor ?? AppColors.outlineVariant.withOpacity(0.2),
                width: borderWidth,
              ),
            ),
            child: Padding(
              padding: padding,
              child: child,
            ),
          ),
        ),
      );
    }

    return content;
  }
}
