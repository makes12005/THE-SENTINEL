import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTextStyles {
  // Headlines (Manrope)
  static TextStyle headlineLarge = GoogleFonts.manrope(
    fontSize: 40,
    fontWeight: FontWeight.w800,
    color: AppColors.onSurface,
    letterSpacing: -1.0,
  );

  static TextStyle headlineMedium = GoogleFonts.manrope(
    fontSize: 32,
    fontWeight: FontWeight.w800,
    color: AppColors.onSurface,
    letterSpacing: -0.5,
  );

  static TextStyle headlineSmall = GoogleFonts.manrope(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: AppColors.onSurface,
    letterSpacing: -0.25,
  );

  // Body (Inter)
  static TextStyle bodyLarge = GoogleFonts.inter(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    color: AppColors.onSurface,
  );

  static TextStyle bodyMedium = GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    color: AppColors.onSurfaceVariant,
  );

  static TextStyle bodySmall = GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.normal,
    color: AppColors.onSurfaceVariant,
  );

  // Labels (Inter)
  static TextStyle labelLarge = GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    color: AppColors.onSurface,
    letterSpacing: 1.2,
  );

  static TextStyle labelMedium = GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w700,
    color: AppColors.onSurfaceVariant,
    letterSpacing: 0.5,
  );

  static TextStyle labelSmall = GoogleFonts.inter(
    fontSize: 11,
    fontWeight: FontWeight.w800,
    color: AppColors.onSurfaceVariant,
    letterSpacing: 1.5, // tracking-widest
  );
}
