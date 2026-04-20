# Design System Document

## 1. Overview & Creative North Star: "The Sentinel"
The Sentinel is a design system engineered for high-stakes, high-velocity professional environments. For a bus conductor, the dashboard is not just an app; it is a mission-critical tool that must remain legible under vibrating transit conditions, shifting light, and rapid-fire interactions.

The "Creative North Star" for this system is **Rugged Sophistication**. We are moving away from the "flat web" look and toward an interface that feels like high-end aerospace instrumentation. By utilizing intentional asymmetry, deep tonal layering, and "Editorial Brutalism," we ensure that the most critical data—passenger counts, route timing, and revenue—commands the conductor's attention without visual clutter.

## 2. Colors: Tonal Depth & The "No-Line" Rule
This system rejects the use of 1px borders. In a "rugged" professional environment, lines create visual noise. Instead, we use **Tonal Layering** to define boundaries.

### The Palette
- **Primary (`#a3cbf2` / `#0b3c5d`):** Our anchor. Use the container variant for large functional blocks and the lightened `primary` for active states.
- **Secondary (`#c4c0ff` / `#6c63ff`):** Used for "Future" or "Upcoming" states, providing a cool, calm counter-balance to the action-oriented blue.
- **Tertiary/Accent (`#ffb68b` / `#ff7a00`):** Reserved strictly for alerts, live statuses, and high-priority "Now" indicators.
- **Surface Hierarchy:** 
    - **Background:** `#101418` (The Void)
    - **Surface-Container-Low:** `#181c20` (Standard Sectioning)
    - **Surface-Container-High:** `#262a2f` (Interactive Cards)

### Core Color Rules
*   **The "No-Line" Rule:** Never use a solid border to separate sections. Separate "Today" from "Upcoming" by shifting from `surface-container-low` to `surface-container-high`. 
*   **The Glass & Gradient Rule:** For floating action buttons or active route headers, apply a subtle gradient from `primary_container` to `primary`. Use `backdrop-blur` (12px-20px) on overlays to maintain the "frosted glass" aerospace aesthetic.
*   **Signature Textures:** Apply a 2% noise texture or a very subtle radial gradient (Primary to Background) on the main dashboard to provide a tactile, premium "rugged" feel.

## 3. Typography: Editorial Authority
We use a dual-type system to balance "Rugged" utility with "High-End" readability.

*   **Display & Headlines (Manrope):** A modern, wide-aperture sans-serif that feels authoritative. Used for high-level stats like "Next Stop" or "Total Revenue."
*   **Body & Labels (Inter):** The workhorse. Inter’s high x-height ensures that even at `label-sm` (`0.6875rem`), a conductor can read a ticket number at a glance.

**Hierarchy Strategy:** 
Use `display-md` for the "Current Stop" to create an intentional focal point. Use `label-md` in all-caps with `0.05em` letter-spacing for secondary metadata (e.g., "LICENSE PLATE" or "ROUTE ID") to mimic professional industrial labeling.

## 4. Elevation & Depth: Tonal Layering
In "The Sentinel," depth is not about shadows; it’s about **Luminance Stacking**.

*   **The Layering Principle:** Place `surface-container-highest` cards onto a `surface-dim` background. This creates a natural "lift" that feels integrated into the hardware.
*   **Ambient Shadows:** If an element must float (like a passenger check-in modal), use a shadow color of `#000000` at 15% opacity with a `40px` blur and `0px` spread. It should feel like a soft glow, not a harsh drop-shadow.
*   **The Ghost Border:** If high-contrast environments require a border for accessibility, use `outline-variant` at 15% opacity. It should be felt, not seen.

## 5. Components: Ruggedized Utility

### Segmented Controls (Navigation)
Forget standard tabs. Use a "Recessed Toggle" look. The track is `surface-container-lowest` with a `1.5rem` (xl) radius. The active segment is a `surface-container-highest` pill that appears to "slide" underneath the text, using a subtle `primary` tint.

### Performance Cards
*   **Radius:** Always `1.5rem` (xl) for a comfortable, modern grip.
*   **Padding:** High internal breathing room (24px) to ensure tap targets are never missed.
*   **No Dividers:** Separate "Passenger Name" from "Ticket Type" using a vertical 8px spacing shift and a color change (On-Surface vs On-Surface-Variant), never a horizontal line.

### High-Tactility Buttons
*   **Primary:** A solid fill of `primary_container` with `on_primary_container` text.
*   **Active/Pressed:** A momentary shift to a `primary` gradient. 
*   **Scale:** Minimum height of 56px for all primary dashboard actions to accommodate use while the vehicle is in motion.

### Status Badges
Status is everything. Use `tertiary_container` for "Delayed" and `secondary_container` for "On Time." These should be pill-shaped with `label-md` bold text.

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place the "Current Route" display slightly off-center or with unique padding to break the "standard app" feel.
*   **Prioritize Contrast:** Ensure all critical text meets a 7:1 contrast ratio against surface containers.
*   **Use "Breathing Room":** Trust that white space (or "dark space") guides the eye better than any arrow or line could.

### Don't:
*   **Don't use pure white:** Never use `#FFFFFF`. Use `on_surface` (`#e0e2e8`) to prevent eye strain in dark cabins.
*   **Don't use standard shadows:** Avoid the default "Material Design" shadows. Stick to Tonal Layering.
*   **Don't clutter:** If a piece of info isn't needed for the current leg of the journey, hide it. Professional tools should be contextual.