# Josh Levy Labs — Brand Guidelines MVP

> **Version:** 1.0  
> **Last Updated:** February 25, 2026  
> **Applies To:** Clawdbot Hub, joshlevylabs.com, Lever iOS/Mobile Apps

---

## 1. Brand Identity

### 1.1 Brand Essence
Josh Levy Labs is a builder's brand. Every product — from The Hub to joshlevylabs.com to the Lever app — should feel like a **command center built by an engineer who cares about craft**. Dark, focused, premium, and purposeful. No fluff.

### 1.2 Brand Personality
- **Precise** — Every pixel has a purpose
- **Premium** — Dark, sophisticated, confident
- **Builder-focused** — Tools for people who ship
- **Warm tech** — Amber/orange accents humanize the dark interfaces
- **Minimal but not sparse** — Clean doesn't mean empty

### 1.3 Tagline
*"Build what matters."*

---

## 2. Color System

### 2.1 Core Palette (Unified)

All products share a common color DNA. The specific implementations vary by platform (CSS hex for web, React Native tokens for mobile) but the **intent and visual output must be consistent**.

#### Backgrounds (Dark Surfaces)
| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#09090b` | Primary background (deepest) |
| `surface` | `#111114` | Elevated surfaces (cards, tab bars) |
| `surface-light` | `#18181b` | Secondary cards, inputs |
| `surface-hover` | `#1f1f23` | Hover/pressed states |
| `border` | `#27272a` | Dividers, card borders |
| `border-light` | `#3f3f46` | Stronger dividers, active borders |

> **Note:** The Hub currently uses Slate-900 (`#0F172A`) as its primary background and Slate-850 (`#131B2E`) for cards. **Migration target:** Align with the zinc-based scale above for consistency across all products.

#### Brand Accent (Amber/Orange)
| Token | Hex | Usage |
|-------|-----|-------|
| `accent-primary` | `#f59e0b` | Primary CTAs, active states, key highlights |
| `accent-light` | `#fbbf24` | Premium text highlights, hover states |
| `accent-dark` | `#d97706` | Borders on accent elements |
| `accent-muted` | `#78350f` | Subtle accent backgrounds |
| `accent-ultra-muted` | `rgba(245, 158, 11, 0.08)` | Selected state fills |

> **Amber is the signature.** It's the thread that ties every product together. When a user sees amber on dark, they should think Josh Levy Labs.

#### Secondary Accent (Glow / Orange-Red)
| Token | Hex | Usage |
|-------|-----|-------|
| `glow-400` | `#fb923c` | Secondary highlights |
| `glow-500` | `#f97316` | Gradients, border glows |
| `glow-600` | `#ea580c` | Deep glow effects |

#### Tertiary Accent (Cyber / Cyan)
| Token | Hex | Usage |
|-------|-----|-------|
| `cyber-400` | `#22d3ee` | Tech-feel accents, data viz secondary |
| `cyber-500` | `#06b6d4` | Info states, links (sparingly) |

#### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#fafafa` | Primary text (slightly off-white) |
| `text-secondary` | `#a1a1aa` | Descriptions, secondary info |
| `text-muted` | `#71717a` | Hints, disabled, meta |
| `text-faint` | `#52525b` | Disclaimers, timestamps |
| `text-inverse` | `#09090b` | Text on accent backgrounds |

#### Semantic / Status
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#22c55e` | Positive states, buy signals |
| `success-muted` | `rgba(34, 197, 94, 0.15)` | Success backgrounds |
| `warning` | `#f59e0b` | Warnings (shares accent) |
| `warning-muted` | `rgba(245, 158, 11, 0.15)` | Warning backgrounds |
| `error` | `#ef4444` | Errors, sell signals, destructive |
| `error-muted` | `rgba(239, 68, 68, 0.15)` | Error backgrounds |
| `info` | `#3b82f6` | Informational states |
| `info-muted` | `rgba(59, 130, 246, 0.15)` | Info backgrounds |

### 2.2 Hub-Specific Adjustments
The Hub currently uses a **Slate + Teal** system:
- Primary: Deep Blue (`#2563EB` → `#3B82F6`)
- Accent: Teal (`#0D9488` → `#14B8A6`)

**Migration plan:** Transition the Hub's accent system from Teal to Amber to match the unified brand. The Teal can be retained as a **tertiary/data visualization** color only.

### 2.3 Color Don'ts
- ❌ Don't use pure white (`#ffffff`) as text — use `#fafafa` (zinc-50)
- ❌ Don't use pure black (`#000000`) as background — use `#09090b` (zinc-950)
- ❌ Don't mix amber and teal as competing accents
- ❌ Don't use saturated colors for large surfaces — keep them for small indicators

---

## 3. Typography

### 3.1 Font Families

| Context | Primary | Fallback | Notes |
|---------|---------|----------|-------|
| **Hub** | Montserrat | system-ui, sans-serif | Geometric, modern, confident |
| **joshlevylabs.com** | Inter | system-ui, sans-serif | Clean, readable, professional |
| **Lever Mobile** | System Default (SF Pro / Roboto) | — | Platform native for performance |

> **Unification Target:** Adopt **Inter** as the primary font across all web properties. Inter is more readable at small sizes, has excellent variable font support, and is the modern standard for product UIs. Montserrat can be retained for **display headings only** if desired.

### 3.2 Font Weights
| Weight | Token | Usage |
|--------|-------|-------|
| 400 | `normal` | Body text |
| 500 | `medium` | Emphasized body, labels |
| 600 | `semibold` | Subheadings, buttons |
| 700 | `bold` | Headings, key metrics |
| 800 | `extrabold` | Hero text, large numbers |

### 3.3 Monospace
Use **JetBrains Mono** for code blocks, terminal output, and technical data across all web properties.

### 3.4 Type Scale
| Size | Pixel | Usage |
|------|-------|-------|
| `xs` | 12px | Fine print, timestamps |
| `sm` | 14px | Secondary text, labels |
| `md` | 16px | Body text (base) |
| `lg` | 18px | Emphasized body |
| `xl` | 20px | Subheadings |
| `2xl` | 24px | Section headings |
| `3xl` | 32px | Page headings |
| `4xl` | 40px | Hero headings |

---

## 4. Spacing System

Consistent spacing creates visual rhythm. All products should use an **8px base grid**.

| Token | Value | Usage |
|-------|-------|-------|
| `xxs` | 2px | Hairline gaps |
| `xs` | 4px | Tight — related inline elements |
| `sm` | 8px | Standard — row gaps, chip margins |
| `md` | 16px | Comfortable — card padding, inputs |
| `lg` | 24px | Section — scroll padding, section gaps |
| `xl` | 32px | Large — section breaks, header margins |
| `2xl` | 48px | Page — hero sections, major separations |
| `3xl` | 64px | Splash — empty states, centering |

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tiny elements (progress bars, chart bars) |
| `sm` | 8px | Badges, small chips |
| `md` | 12px | Buttons, inputs, small cards |
| `lg` | 16px | Primary cards, modals |
| `xl` | 20px | Bottom sheets, large modals |
| `full` | 999px | Pills, avatars, progress tracks |

---

## 6. Elevation & Shadows

### 6.1 Shadow Scale
| Level | CSS | Usage |
|-------|-----|-------|
| **Card** | `0 1px 3px rgba(0,0,0,0.3)` | Default card elevation |
| **Card Hover** | `0 4px 6px rgba(0,0,0,0.3)` | Hovered cards |
| **Elevated** | `0 4px 8px rgba(0,0,0,0.3)` | Modals, bottom sheets, floating |
| **Glow** | `0 0 20px rgba(249,115,22,0.4)` | Premium CTAs, accent glow |
| **Glow SM** | `0 0 10px rgba(249,115,22,0.3)` | Subtle accent glow |
| **Success Glow** | `0 0 12px rgba(34,197,94,0.15)` | Positive P&L |
| **Danger Glow** | `0 0 12px rgba(239,68,68,0.15)` | Negative P&L, errors |

### 6.2 Glassmorphism (joshlevylabs.com)
```css
/* Standard glass card */
.glass-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
}

/* Dark glass card (accent-tinted) */
.glass-card-dark {
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.2);
  background: rgba(17, 17, 20, 0.8);
  backdrop-filter: blur(12px);
}
```

> **Usage:** Glass effects are appropriate for joshlevylabs.com (marketing) and sparingly in the Hub for overlay panels. **Do not use** in the Lever mobile app (performance cost).

---

## 7. Component Patterns

### 7.1 Cards
Cards are the fundamental building block across all products.

```
┌─────────────────────────┐
│  ● Title            ⋮  │  ← Header: 16px padding, semibold title
│─────────────────────────│
│                         │
│  Content area           │  ← Body: 16px padding
│                         │
│─────────────────────────│
│  Footer / Actions       │  ← Footer: 12px padding (optional)
└─────────────────────────┘
```

**Card specs:**
- Background: `surface` (`#111114`)
- Border: `border` (`#27272a`), 1px solid
- Border radius: `lg` (16px) for mobile, `xl` (12px) for web cards
- Hover: Border lightens to `border-light`, shadow increases
- Padding: 16px (md)

### 7.2 Buttons

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| **Primary** | `accent-primary` | `text-inverse` | none | Main CTAs |
| **Secondary** | transparent | `accent-primary` | `accent-primary` 1px | Secondary actions |
| **Ghost** | transparent | `text-secondary` | none | Tertiary actions |
| **Destructive** | `error` | white | none | Delete, cancel |
| **Tech** | gradient (accent → glow) | white | none | Premium CTAs (marketing only) |

**Button specs:**
- Height: 40px (default), 32px (sm), 48px (lg)
- Padding: 16px horizontal
- Border radius: `md` (12px)
- Font weight: `semibold` (600)
- Font size: `sm` (14px)

### 7.3 Inputs
- Background: `surface-light` (`#18181b`)
- Border: `border` (`#27272a`), 1px solid
- Focus: `accent-primary` border, `rgba(245, 158, 11, 0.2)` ring
- Border radius: `md` (12px)
- Height: 40px
- Padding: 12px horizontal

### 7.4 Navigation
- **Hub:** Left sidebar (fixed, 256px wide), collapsible on mobile
- **joshlevylabs.com:** Top sticky nav bar, glass effect
- **Lever:** Bottom tab bar (system default height)

All nav elements should use:
- Active state: `accent-primary` text/icon
- Inactive state: `text-muted`
- Hover: `text-secondary`

---

## 8. Animation & Motion

### 8.1 Timing
| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| **Micro** | 150ms | ease-out | Hover states, focus |
| **Standard** | 300ms | ease-out | Transitions, reveals |
| **Emphasis** | 500ms | ease-in-out | Page transitions, fades |
| **Dramatic** | 1000ms+ | custom | Data flow, hero animations |

### 8.2 Keyframe Patterns
```css
/* Glow pulse — for accent CTAs */
@keyframes glow-pulse {
  0% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.3); }
  100% { box-shadow: 0 0 40px rgba(249, 115, 22, 0.6); }
}

/* Fade in — standard entry */
@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* Slide up — content reveal */
@keyframes slide-up {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Data flow — animated connections (Hub) */
@keyframes data-flow {
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
}
```

### 8.3 Animation Rules
- ✅ Use animation to guide attention
- ✅ Respect `prefers-reduced-motion`
- ❌ Never animate just for decoration
- ❌ Avoid animation durations > 1s for interactive elements
- ❌ No animation in the mobile app that blocks interaction

---

## 9. Data Visualization

### 9.1 Chart Colors
For charts, use this ordered palette:

| Order | Color | Hex | Usage |
|-------|-------|-----|-------|
| 1 | Amber | `#f59e0b` | Primary series |
| 2 | Emerald | `#22c55e` | Positive / secondary |
| 3 | Blue | `#3b82f6` | Tertiary |
| 4 | Red | `#ef4444` | Negative / alerts |
| 5 | Cyan | `#06b6d4` | Quaternary |
| 6 | Purple | `#a855f7` | Fifth series (rare) |

### 9.2 Signal Flow (Hub-Specific)
The Hub's Signal Flow chart uses tier-specific colors:
- Tier ≥3/8: Emerald `rgb(52, 211, 153)`
- Tier 2/8: Blue `rgb(96, 165, 250)`
- Tier 1/8: Slate `rgb(203, 213, 225)`

Connection lines use animated dashed strokes with glow filters.

---

## 10. Iconography

### 10.1 Icon Library
Use **Lucide React** (web) — it's already in use across both the Hub and joshlevylabs.com.

For mobile, use platform-native icon sets (SF Symbols on iOS, Material Icons on Android) with Lucide as a fallback.

### 10.2 Icon Sizing
| Context | Size | Stroke |
|---------|------|--------|
| Navigation | 20px | 1.5px |
| Inline | 16px | 1.5px |
| Header | 24px | 2px |
| Hero | 32px+ | 2px |

---

## 11. Logo

### 11.1 Primary Logo
The Joshua OS logo (`joshuaOSlogo-white.png` / `joshuaOSlogo-black.png`) is the primary brand mark.

### 11.2 Hub Logo
The Hub uses a simple text-based wordmark: "Clawdbot Hub" with a blue (`#2563EB`) rounded square containing a bold "C".

**Migration target:** Unify the Hub logo treatment with the Josh Levy Labs brand. Consider a sub-brand approach: "Josh Levy Labs · Hub"

### 11.3 Clear Space
Maintain at least 1x logo height of clear space on all sides.

---

## 12. Platform-Specific Notes

### 12.1 Clawdbot Hub (Next.js + Tailwind)
- **Tailwind config:** `~/clawd/clawdbot-hub/tailwind.config.ts`
- **Global CSS:** `~/clawd/clawdbot-hub/src/app/globals.css`
- **Current font:** Montserrat (migration target: Inter)
- **Current accent:** Teal (migration target: Amber)
- **Layout:** Sidebar + main content area

### 12.2 joshlevylabs.com (Next.js + Tailwind)
- **Tailwind config:** `~/joshlevylabs/apps/web/tailwind.config.ts`
- **Global CSS:** `~/joshlevylabs/apps/web/app/globals.css`
- **Current font:** Inter + JetBrains Mono ✅ (already aligned)
- **Current accent:** Amber ✅ (already aligned)
- **Layout:** Sticky top nav + full-width content

### 12.3 Lever Mobile (Expo + NativeWind)
- **Theme file:** `~/joshlevylabs/apps/mobile/constants/theme.ts`
- **Tailwind config:** `~/joshlevylabs/apps/mobile/tailwind.config.js`
- **Current colors:** Zinc + Amber ✅ (already aligned)
- **Layout:** Bottom tab navigation

---

## 13. Migration Roadmap

### Phase 1: Foundation (Current)
- [x] Document existing design tokens across all products
- [x] Identify unified color palette
- [x] Create this brand guidelines document

### Phase 2: Hub Alignment
- [ ] Migrate Hub background from Slate-900 → Zinc-950 scale
- [ ] Migrate Hub accent from Teal → Amber
- [ ] Update Hub font from Montserrat → Inter
- [ ] Update Hub card styles to match unified spec
- [ ] Update Hub button styles

### Phase 3: Component Library
- [ ] Extract shared Tailwind preset (`@joshlevylabs/tailwind-preset`)
- [ ] Create shared React component library (buttons, cards, inputs)
- [ ] Document component API and usage patterns

### Phase 4: Polish
- [ ] Unified loading/skeleton states
- [ ] Unified error states
- [ ] Unified empty states
- [ ] Animation library

---

## 14. Quick Reference — Design Tokens (Copy-Paste Ready)

### CSS Custom Properties
```css
:root {
  /* Backgrounds */
  --bg-primary: #09090b;
  --bg-surface: #111114;
  --bg-surface-light: #18181b;
  --bg-surface-hover: #1f1f23;
  --border: #27272a;
  --border-light: #3f3f46;

  /* Accent */
  --accent: #f59e0b;
  --accent-light: #fbbf24;
  --accent-dark: #d97706;
  --accent-muted: #78350f;

  /* Glow */
  --glow: #f97316;
  --glow-light: #fb923c;

  /* Cyber */
  --cyber: #06b6d4;
  --cyber-light: #22d3ee;

  /* Text */
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --text-faint: #52525b;
  --text-inverse: #09090b;

  /* Status */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

### Tailwind Shared Colors (for preset)
```js
module.exports = {
  colors: {
    dark: {
      50: '#18181b',
      100: '#141417',
      200: '#111114',
      300: '#0d0d10',
      400: '#0a0a0d',
      500: '#09090b',
    },
    accent: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    glow: {
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
    },
    cyber: {
      400: '#22d3ee',
      500: '#06b6d4',
    },
  },
}
```

---

*Built by Theo for Josh Levy Labs. The brand is the builder.*
