---
name: Velox Fleet Noir
colors:
  surface: '#101418'
  surface-dim: '#101418'
  surface-bright: '#363a3e'
  surface-container-lowest: '#0b0f12'
  surface-container-low: '#181c20'
  surface-container: '#1c2024'
  surface-container-high: '#262a2f'
  surface-container-highest: '#31353a'
  on-surface: '#e0e3e8'
  on-surface-variant: '#c2c7ce'
  inverse-surface: '#e0e3e8'
  inverse-on-surface: '#2d3135'
  outline: '#8c9198'
  outline-variant: '#42474e'
  surface-tint: '#a3cbf2'
  primary: '#cee5ff'
  on-primary: '#003352'
  primary-container: '#a3cbf2'
  on-primary-container: '#2d5678'
  inverse-primary: '#396284'
  secondary: '#c4c0ff'
  on-secondary: '#2d2a5e'
  secondary-container: '#434076'
  on-secondary-container: '#b3afed'
  tertiary: '#ffdcca'
  on-tertiary: '#502405'
  tertiary-container: '#ffb78d'
  on-tertiary-container: '#7a4523'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cde5ff'
  primary-fixed-dim: '#a3cbf2'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#1f4a6b'
  secondary-fixed: '#e3dfff'
  secondary-fixed-dim: '#c4c0ff'
  on-secondary-fixed: '#171348'
  on-secondary-fixed-variant: '#434076'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68b'
  on-tertiary-fixed: '#321200'
  on-tertiary-fixed-variant: '#6c3a19'
  background: '#101418'
  on-background: '#e0e3e8'
  surface-variant: '#31353a'
typography:
  display-time:
    fontFamily: Manrope
    fontSize: 1.5rem
    fontWeight: '900'
    lineHeight: '1.2'
  header-title:
    fontFamily: Manrope
    fontSize: 1.125rem
    fontWeight: '800'
    letterSpacing: -0.02em
  metadata-label:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    letterSpacing: 0.1em
  button-text:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '900'
    letterSpacing: 0.1em
  body-standard:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '700'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  page-padding: 1rem
  card-gap: 1rem
  section-internal: 1.25rem
  element-tight: 0.5rem
  unit-base: 4px
---

## Brand & Style
Velox Fleet Noir is a high-utility, technical design system built for mission-critical logistics and transit operations. The aesthetic is **Modern-Industrial**, prioritizing immediate information density and rapid cognitive processing.

The brand personality is authoritative, precise, and resilient. It utilizes a "Tech Noir" atmosphere—deep charcoal backgrounds layered with high-contrast semantic accents and a subtle grain overlay—to reduce eye strain during night shifts while highlighting urgent operational alerts. The visual language favors heavy typography and uppercase tracking to convey a sense of urgency and professionalism.

## Colors
The palette is rooted in a "Deep Space" neutral base (`#101418`), providing a high-contrast foundation for functional color application. 

- **Primary (Fidelity Blue):** Used for navigation, active state indicators, and primary action icons.
- **Tertiary (Alert Orange):** Reserved strictly for warnings, missing data, and high-priority actionable alerts.
- **Secondary (Periwinkle):** Utilized for historical data, logs, and secondary decorative elements.
- **Surface Tiering:** Depth is communicated through value shifts rather than shadows, using `surface-container-low` for main cards and `high`/`highest` for interactive or nested elements.

## Typography
Typography is treated as a structural element. The system uses **Manrope** for headlines to provide a modern, geometric feel, while **Inter** handles high-legibility body text and utility labels.

Key typographic rules:
- **Weight as Hierarchy:** Use "ExtraBold" (800) and "Black" (900) weights to denote status and primary headers.
- **Micro-Labels:** Technical metadata uses very small (10px) uppercase text with wide letter spacing (tracking-widest) to ensure clarity at small scales.
- **Action Emphasis:** Buttons and actionable labels are strictly uppercase and heavy-weight to stand out against content-heavy sections.

## Layout & Spacing
The system follows a **Fixed-Width / Centered** layout model (max-width: 672px/2xl) optimized for mobile-first transit management. 

- **Grid:** A flexible single-column stack for sections, utilizing a grid-cols-2 pattern only for equal-importance primary controls.
- **Rhythm:** A 4px baseline grid ensures consistent vertical rhythm. Standardized 1rem (16px) gutters separate major sections.
- **Safe Areas:** The header is fixed (h-14) with a backdrop blur to maintain legibility of status icons while scrolling.

## Elevation & Depth
Velox Fleet Noir eschews traditional shadows in favor of **Tonal Layering** and **High-Contrast Outlines**.

- **Surface Tiers:** Background levels are established by increasing the hex value brightness (`surface-container-low` vs `surface-container-high`).
- **Tactile Texture:** A global SVG noise overlay at 2% opacity is applied to the entire UI to prevent "banding" on low-quality screens and provide a matte, industrial texture.
- **Semantic Borders:** Urgent items use 4px solid left-borders (Error Red or Tertiary Orange) to break the grid and command immediate attention.
- **Ghost Outlines:** Secondary cards use a very subtle 10% opacity border to define edges without adding visual bulk.

## Shapes
The shape language is "Soft-Technical." Elements utilize moderate rounding to feel modern and accessible, while maintaining the structural integrity of an industrial tool.

- **Main Cards:** 0.75rem (rounded-xl) for all primary content containers.
- **Buttons & Small Actions:** 0.5rem (rounded-lg) for standard actions; full pills are used only for status indicators or specific icon-only buttons.
- **Interactive States:** Use a subtle `active:scale-95` transform to provide tactile feedback without complex animation.

## Components
### Buttons
- **Primary Action:** `primary-container` background with high-contrast text. 48px height for thumb-accessibility.
- **Alert Action:** `tertiary-container` background with `on-tertiary-container` text. Used exclusively for resolving "Warnings."
- **Ghost/Surface Button:** `surface-container-highest` background for utility actions like "Settings" or "View Log."

### Cards
- **Standard Card:** `surface-container-low` background, 1px subtle outline, 1.25rem internal padding.
- **Alert Card:** `surface-container-high` background with a 4px left-border of a semantic color (Error/Tertiary).

### Logs & Timelines
- Vertical 1px line in `outline-variant/20`.
- 8px status dots with 4px "rings" that match the background color to create a "cut-out" effect over the timeline line.

### Top App Bar
- 56px (h-14) height, 80% opacity background with a 12px blur (backdrop-blur-md) to create a sense of persistent control.