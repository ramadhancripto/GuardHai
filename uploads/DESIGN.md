---
name: GuardHai Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a43'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a73'
  outline-variant: '#bccac2'
  surface-tint: '#006c51'
  primary: '#006c51'
  on-primary: '#ffffff'
  primary-container: '#18a982'
  on-primary-container: '#003527'
  inverse-primary: '#5edcb1'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#855300'
  on-tertiary: '#ffffff'
  tertiary-container: '#d08500'
  on-tertiary-container: '#432800'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7df9cd'
  primary-fixed-dim: '#5edcb1'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-trust, life-critical digital environment tailored for Tanzania and the broader African continent. The visual language balances institutional dependability with approachable community warmth. It evokes immediate calm, safety, agency, and clarity under stress.

The aesthetic fuses **Modern Utilitarian Clarity** with **Soft Tactile Ergonomics**:
- **Life-Affirming Grounding:** Anchored by botanical emerald tones to convey vitality, health, and reliable protection, departing from sterile clinical aesthetics.
- **Cognitive Resilience:** Engineered for varying digital literacy, outdoor glare, and low-bandwidth contexts. Visual indicators are unambiguous, prioritizing rapid comprehension across English and Swahili.
- **Thumb-Zone Architecture:** Built strictly mobile-first, ensuring critical emergency triggers and navigation anchors sit within effortless one-handed thumb reach.

## Colors

The palette operates on a strict functional hierarchy where chromatic weight communicates urgency and trust:

- **Primary (`#18A982` / Emerald Green):** The core brand anchor. Used for primary completion tasks, verified states, security confirmations, and wellness indicators. Supported by deep shade `#107A5E` for text or interactive focus, and tint `#E8F7F3` for surface fills.
- **Secondary (`#2563EB` / Calming Cobalt):** Represents structural authority, official verification badges, secondary navigational commands, and informational notices.
- **SOS / Critical Alert (`#DC2626` / Emergency Red):** Strictly quarantined. This color is never used decoratively or for standard destructive actions (e.g., standard deletion). It is solely deployed for life-threatening alarms, immediate dispatch buttons, and panic workflows. Accompanied by `#991B1B` (active) and `#FEF2F2` (emergency tint).
- **Caution / Advisory (`#F59E0B` / Amber Gold):** Deployed for non-life-threatening warnings, pending updates, and educational highlights. Supported by `#FEF3C7`.
- **Neutrals & Surfaces:** Pure White (`#FFFFFF`) forms the active content planes; Soft Slate Canvas (`#F8FAFC`) provides contrast; Border Slate (`#E2E8F0`) establishes crisp definition; Muted Slate (`#64748B`) provides secondary typography; and Deep Charcoal (`#0F172A`) ensures AAA contrast compliance for primary body copy.

## Typography

The type system relies on **Plus Jakarta Sans** for its combination of geometric precision and humanist warmth. The open counters and clean apertures remain sharp under intense sun conditions on mid-range Android screens.

### Linguistic Guidance & Localization (Swahili & English)
- Swahili text frequently expands by 15% to 30% compared to English (e.g., "Settings" vs. "Mipangilio", "Emergency" vs. "Dharura"). Typography tokens feature relaxed line heights and dynamic bounding wrappers to prevent truncation.
- Strict anti-ellipsis rule on labels: Emergency actions, medical directions, and safety procedures must wrap to multiple lines rather than truncate.
- Small labels utilize deliberate positive letter spacing (`letterSpacing: 0.02em` to `0.04em`) to maintain legibility when paired with icon-heavy alerts.

## Layout & Spacing

The layout philosophy follows a responsive fluid grid optimized for thumb-reach ergonomics on mobile and focused dashboards on larger displays.

- **Mobile (< 768px):** 4-column fluid layout with `1rem` margins and `1rem` gutters. Actionable touch targets adhere to a strict minimum size of 48×48px. Critical actions (SOS triggers, primary support taps) are anchored to the bottom persistent action shelf.
- **Tablet (768px - 1024px):** 8-column layout with `2rem` margins and `1.5rem` gutters. Layout transitions into split emergency overview and educational feeds.
- **Desktop (> 1024px):** 12-column layout maxing out at `1280px` canvas width, with `3rem` margins and `2rem` gutters.
- **Rhythm:** Spacing follows an 8-point base grid (`0.5rem`, `1rem`, `1.5rem`, `2rem`), with `0.25rem` utilized exclusively for micro-gaps within badge indicators and icon-label locks.

## Elevation & Depth

Visual hierarchy uses **tonal layer separation combined with soft, natural ambient shadows**. Harsh, high-contrast drop shadows are avoided in favor of calm, diffuse elevations that remain distinct on outdoor displays.

- **Level 0 (Flat / Canvas):** Background layer (`#F8FAFC`). No shadow.
- **Level 1 (Card / Resting Surface):** `#FFFFFF` surface bordered by a crisp `1px solid #E2E8F0`. Shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Interactive Floating / Active Cards):** Elevated items and bottom sheets. Shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Emergency Overlays & Persistent Navigation):** Top priority drawers and floating SOS elements. Shadow: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)`.
- **Emergency Glow Exception:** When an SOS state is armed or pulsing, a tinted atmospheric glow is applied: `0 0 0 6px rgba(220, 38, 38, 0.15), 0 8px 16px -2px rgba(220, 38, 38, 0.25)`.

## Shapes

The design system incorporates a modern, friendly, and protective shape geometry centered on roundedness level `2`.

- **Standard Elements (Buttons, Inputs, List Items):** Radiused at `0.5rem` (`rounded-md` / `rounded`).
- **Surface Enclosures (Cards, Content Panels):** Radiused at `1rem` (`rounded-lg`) and `1.5rem` (`rounded-xl` / `rounded-2xl` equivalent) to convey comfort and approachable utility.
- **SOS Button Exception:** Circular (`9999px` full round) or rounded pills to emphasize instinctual, stress-free activation.
- **Badges & Chips:** Fully rounded pills (`9999px`) to distinguish them from actionable structural cards.

## Components

### Buttons
- **Primary Action:** Solid Emerald Green (`#18A982`) fill, pure white text, bold weight (`label-lg`), height 48px, radius `0.5rem`. On hover/active: `#107A5E`.
- **Secondary Action:** Ghost white fill with `#E2E8F0` border and Charcoal (`#0F172A`) text, or tinted Cobalt (`#EFF6FF`) fill with `#2563EB` text for verified informational steps.
- **SOS Critical Button:** High-visibility `#DC2626` base, white icon/text, prominent tactile sizing (minimum 64px height or circular 72px–80px on emergency screens). Incorporates a press-and-hold tactile feedback interaction to prevent false triggers.

### Cards
- Standard modules use pure white `#FFFFFF` backgrounds, `1px solid #E2E8F0` borders, and `1rem` to `1.5rem` corner radiuses. Content padding is standard `1.25rem` to `1.5rem`.
- Health, Preparedness, and Device Status cards use a top-edge color pill (4px thick) or subtle background tints (`#E8F7F3` for safe, `#FEF3C7` for advisory, `#FEF2F2` for urgent) to provide instant at-a-glance scanning.

### Chips & Badges
- **Status Badges:** Small pills with soft tint backgrounds and strong foreground text.
  - Safe / Active: `#E8F7F3` fill + `#107A5E` text.
  - Official / Verified: `#DBEAFE` fill + `#1D4ED8` text with checkmark icon.
  - Hazard / Warning: `#FEF3C7` fill + `#B45309` text.
- **Filter Chips:** Height 36px, `0.5rem` radius, light border, Charcoal text. Selected state switches to Emerald `#18A982` fill with white text.

### Inputs & Form Fields
- 48px standard touch height, `#FFFFFF` background, `1px solid #CBD5E1` border, `0.5rem` corner radius.
- Labels are persistent and high-contrast (`#0F172A`).
- Focus state: `2px solid #18A982` with no harsh outline shift.
- Helper text: Sits below the input in `#64748B`, switching to `#DC2626` for error states accompanied by an explicit warning icon.

### Checkboxes & Radio Controls
- Minimum 24×24px bounding target inside a 48×48px accessible tap area.
- Radio buttons: `#18A982` active fill with white center circle.
- Checkboxes: `#18A982` active fill with white checkmark icon, `0.25rem` radius.

### Lists
- Separated using `#F1F5F9` borders or segmented card tiles.
- Content rows use a minimum height of 56px with balanced leading icons and trailing directional indicators (`Chevron Right`).

### Dedicated Emergency / Community Modules
- **Offline / Low-Bandwidth Banner:** Compact persistent status strip at viewport top (`#0F172A` background, `#FFFFFF` text) indicating SMS-fallback or cached emergency resources are active.
- **Swahili / English Language Switcher:** Persistent, easily accessible pill toggle situated in the upper utility zone.