import 'package:flutter/material.dart';

/// Design tokens extracted from docs/ui/screen/*.html
/// All colors are from the Material You dark theme used in the HTML prototypes.
class AppColors {
  AppColors._();

  // ── Backgrounds ────────────────────────────────────────────────────────────
  static const Color background         = Color(0xFF101418);
  static const Color surface            = Color(0xFF101418);
  static const Color surfaceContainer   = Color(0xFF1c2024);
  static const Color surfaceContainerHigh    = Color(0xFF262a2f);
  static const Color surfaceContainerHighest = Color(0xFF31353a);
  static const Color surfaceContainerLow     = Color(0xFF181c20);
  static const Color surfaceContainerLowest  = Color(0xFF0b0f13);
  static const Color surfaceBright      = Color(0xFF363a3e);

  // ── Primary (steel blue) ──────────────────────────────────────────────────
  static const Color primary            = Color(0xFFa3cbf2);
  static const Color primaryContainer   = Color(0xFF0b3c5d);
  static const Color onPrimary          = Color(0xFF003353);
  static const Color onPrimaryContainer = Color(0xFF7fa7cd);
  static const Color primaryFixed       = Color(0xFFcee5ff);
  static const Color primaryFixedDim    = Color(0xFFa3cbf2);

  // ── Secondary (lavender) ─────────────────────────────────────────────────
  static const Color secondary             = Color(0xFFc4c0ff);
  static const Color secondaryContainer    = Color(0xFF3826cd);
  static const Color onSecondaryContainer  = Color(0xFFb4b0ff);

  // ── Tertiary (amber/orange) ───────────────────────────────────────────────
  static const Color tertiary             = Color(0xFFffb68b);
  static const Color tertiaryContainer    = Color(0xFF602a00);
  static const Color onTertiaryContainer  = Color(0xFFff801d);

  // ── On-surface ────────────────────────────────────────────────────────────
  static const Color onSurface         = Color(0xFFe0e2e8);
  static const Color onSurfaceVariant  = Color(0xFFc2c7ce);
  static const Color outlineVariant    = Color(0xFF42474e);
  static const Color outline           = Color(0xFF8c9198);

  // ── Semantic ──────────────────────────────────────────────────────────────
  static const Color error             = Color(0xFFffb4ab);
  static const Color errorContainer    = Color(0xFF93000a);
  static const Color success           = Color(0xFF4CAF50);
  static const Color successContainer  = Color(0xFF1B5E20);

  // ── Status chip colors ────────────────────────────────────────────────────
  static const Color statusPending  = Color(0xFFffb68b);   // tertiary
  static const Color statusSent     = Color(0xFF4CAF50);   // green
  static const Color statusFailed   = Color(0xFFffb4ab);   // error
}
