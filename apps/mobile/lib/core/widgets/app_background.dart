import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class AppBackground extends StatelessWidget {
  final Widget child;
  final bool showNoise;
  final List<Color>? gradientColors;

  const AppBackground({
    super.key,
    required this.child,
    this.showNoise = true,
    this.gradientColors,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Base Background Color
        Container(color: AppColors.background),

        // Radial Gradient
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.center,
                radius: 1.2,
                colors: gradientColors ??
                    [
                      AppColors.primary.withOpacity(0.05),
                      AppColors.background,
                    ],
              ),
            ),
          ),
        ),

        // Noise Overlay (Simulated with a repeated pattern)
        if (showNoise)
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

        // Gradient Orbs (Top Right & Bottom Left as seen in HTML)
        Positioned(
          top: MediaQuery.of(context).size.height * 0.5,
          right: -100,
          child: Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              color: AppColors.tertiaryContainer.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 100, sigmaY: 100),
              child: const SizedBox(),
            ),
          ),
        ),
        Positioned(
          bottom: -80,
          left: -80,
          child: Container(
            width: 320,
            height: 320,
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 120, sigmaY: 120),
              child: const SizedBox(),
            ),
          ),
        ),

        // The actual content
        child,
      ],
    );
  }
}
