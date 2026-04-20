import 'app_colors.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      canvasColor: AppColors.surface,

      // ── Color scheme ──────────────────────────────────────────────────────
      colorScheme: const ColorScheme.dark(
        surface:          AppColors.surface,
        primary:          AppColors.primary,
        primaryContainer: AppColors.primaryContainer,
        onPrimary:        AppColors.onPrimary,
        onPrimaryContainer: AppColors.onPrimaryContainer,
        secondary:        AppColors.secondary,
        secondaryContainer: AppColors.secondaryContainer,
        onSecondaryContainer: AppColors.onSecondaryContainer,
        tertiary:         AppColors.tertiary,
        tertiaryContainer: AppColors.tertiaryContainer,
        onTertiaryContainer: AppColors.onTertiaryContainer,
        onSurface:        AppColors.onSurface,
        onSurfaceVariant: AppColors.onSurfaceVariant,
        outline:          AppColors.outline,
        outlineVariant:   AppColors.outlineVariant,
        error:            AppColors.error,
        errorContainer:   AppColors.errorContainer,
      ),

      // ── Typography ────────────────────────────────────────────────────────
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.manrope(
          color: AppColors.onSurface, fontWeight: FontWeight.w800, fontSize: 36,
        ),
        displayMedium: GoogleFonts.manrope(
          color: AppColors.onSurface, fontWeight: FontWeight.w700, fontSize: 28,
        ),
        headlineLarge: GoogleFonts.manrope(
          color: AppColors.onSurface, fontWeight: FontWeight.w800, fontSize: 24,
        ),
        headlineMedium: GoogleFonts.manrope(
          color: AppColors.onSurface, fontWeight: FontWeight.w700, fontSize: 20,
        ),
        titleLarge: GoogleFonts.manrope(
          color: AppColors.onSurface, fontWeight: FontWeight.w700, fontSize: 18,
        ),
        bodyLarge: GoogleFonts.inter(color: AppColors.onSurface, fontSize: 16),
        bodyMedium: GoogleFonts.inter(color: AppColors.onSurfaceVariant, fontSize: 14),
        labelSmall: GoogleFonts.inter(
          color: AppColors.onSurfaceVariant,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
        ),
      ),

      // ── App bar ───────────────────────────────────────────────────────────
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primary),
        titleTextStyle: GoogleFonts.manrope(
          color: AppColors.onSurface,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: 1,
        ),
      ),

      // ── Input fields ──────────────────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceContainerHigh,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        labelStyle: GoogleFonts.inter(color: AppColors.onSurfaceVariant, fontSize: 11),
        hintStyle: GoogleFonts.inter(color: AppColors.outline, fontSize: 14),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      ),

      // ── Elevated button ───────────────────────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryContainer,
          foregroundColor: AppColors.onPrimaryContainer,
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 4,
          textStyle: GoogleFonts.manrope(fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: 2),
        ),
      ),

      // ── Card ──────────────────────────────────────────────────────────────
      cardTheme: CardTheme(
        color: AppColors.surfaceContainerHigh,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        margin: EdgeInsets.zero,
      ),

      // ── Divider ───────────────────────────────────────────────────────────
      dividerTheme: const DividerThemeData(
        color: AppColors.outlineVariant,
        thickness: 1,
        space: 0,
      ),

      // ── Bottom navigation ─────────────────────────────────────────────────
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surfaceContainerLow,
        selectedItemColor: AppColors.tertiary,
        unselectedItemColor: AppColors.onSurfaceVariant,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),

      // ── Snack bar ─────────────────────────────────────────────────────────
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.surfaceContainerHighest,
        contentTextStyle: GoogleFonts.inter(color: AppColors.onSurface),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
