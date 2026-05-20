import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTextStyles {
  static TextStyle get displayLarge => GoogleFonts.manrope(
    fontSize: 57,
    fontWeight: FontWeight.w800,
    letterSpacing: -0.25,
    color: Colors.white,
  );

  static TextStyle get displayMedium => GoogleFonts.manrope(
    fontSize: 45,
    fontWeight: FontWeight.w800,
    letterSpacing: 0,
    color: Colors.white,
  );

  static TextStyle get displaySmall => GoogleFonts.manrope(
    fontSize: 36,
    fontWeight: FontWeight.w800,
    letterSpacing: 0,
    color: Colors.white,
  );

  static TextStyle get headlineLarge => GoogleFonts.manrope(
    fontSize: 32,
    fontWeight: FontWeight.w800,
    letterSpacing: 0,
    color: Colors.white,
  );

  static TextStyle get headlineMedium => GoogleFonts.manrope(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: 0,
    color: Colors.white,
  );

  static TextStyle get headlineSmall => GoogleFonts.manrope(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    letterSpacing: 0,
    color: Colors.white,
  );

  static TextStyle get titleLarge => GoogleFonts.manrope(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    letterSpacing: 0,
    color: Colors.white,
  );

  static TextStyle get titleMedium => GoogleFonts.manrope(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.15,
    color: Colors.white,
  );

  static TextStyle get titleSmall => GoogleFonts.manrope(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    color: Colors.white,
  );

  static TextStyle get bodyLarge => GoogleFonts.inter(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.5,
    color: Colors.white,
  );

  static TextStyle get bodyMedium => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.25,
    color: Colors.white,
  );

  static TextStyle get bodySmall => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.4,
    color: Colors.white,
  );

  static TextStyle get labelLarge => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    color: Colors.white,
  );

  static TextStyle get labelMedium => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5,
    color: Colors.white,
  );

  static TextStyle get labelSmall => GoogleFonts.inter(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5,
    color: Colors.white,
  );

  static TextStyle get labelExtraSmall => GoogleFonts.inter(
    fontSize: 10,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.0,
    color: Colors.white,
  );

  static TextStyle get button => GoogleFonts.manrope(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.5,
    color: Colors.white,
  );

  static TextStyle get buttonLarge => GoogleFonts.manrope(
    fontSize: 16,
    fontWeight: FontWeight.w800,
    letterSpacing: 1.5,
    color: Colors.white,
  );

  static TextStyle get caption => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.4,
    color: const Color(0xFF8E8E93),
  );
}
