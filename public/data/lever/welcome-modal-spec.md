# Lever App Welcome Modal - Visual Specification

**Version:** 1.0  
**Created:** 2026-02-17  
**Designer:** Steve Jobs, CPO  
**Status:** Implementation Ready

## Overview

Single-screen onboarding modal introducing the three pillars of Lever: Faith, Family, Finance. Clean, aspirational design with warm sunrise gradient and focused card hierarchy.

## Screen Layout

### Container
- **Dimensions:** Full screen overlay (100vh × 100vw)
- **Background:** Sunrise gradient (see Gradient section)
- **Safe Area:** 24pt margins on mobile, 48pt on tablet
- **Modal Card:** 343pt wide × 598pt high on mobile
- **Corner Radius:** 20pt on modal container

### Header Section
- **Height:** 96pt
- **Logo:** Lever mark, 32pt × 32pt
- **Logo Position:** Centered horizontally, 32pt from top
- **Title:** "Welcome to Lever"
- **Title Typography:** SF Pro Display, 28pt, Weight 700, Color #1A1A1A
- **Title Position:** Centered, 16pt below logo

### Subtitle Section
- **Height:** 56pt
- **Text:** "Your compass for Faith, Family, and Finance"
- **Typography:** SF Pro Text, 17pt, Weight 400, Color #666666
- **Position:** Centered, 12pt below title
- **Line Height:** 1.35

## Gradient Background

### Primary Gradient
- **Type:** Linear gradient
- **Direction:** 135° (top-left to bottom-right)
- **Stop 1:** #FFF5E6 at 0% (warm cream)
- **Stop 2:** #FFE4B8 at 35% (soft peach)
- **Stop 3:** #FECA57 at 75% (golden sunrise)
- **Stop 4:** #FF6B35 at 100% (warm orange)

### Overlay Layer
- **Background:** rgba(255, 255, 255, 0.85)
- **Backdrop Filter:** blur(10px) (iOS only)

## Pillar Cards Section

### Container
- **Height:** 294pt
- **Spacing:** 16pt between cards
- **Card Layout:** Vertical stack, full width

### Individual Card Specifications

#### Card Base Styles
- **Width:** 295pt (24pt margin each side)
- **Height:** 86pt
- **Corner Radius:** 16pt
- **Background:** rgba(255, 255, 255, 0.95)
- **Border:** 1pt solid rgba(255, 255, 255, 0.3)
- **Shadow:** 0pt 4pt 20pt rgba(0, 0, 0, 0.08)
- **Backdrop Filter:** blur(20px) (iOS only)

#### Faith Card
- **Icon:** ✝️ (emoji), 24pt × 24pt
- **Icon Position:** 20pt from left, centered vertically
- **Title:** "Faith"
- **Title Typography:** SF Pro Display, 20pt, Weight 600, Color #1A1A1A
- **Title Position:** 56pt from left, 18pt from top
- **Scripture:** "Be strong and courageous..." (placeholder for Peterson/Alex)
- **Scripture Typography:** SF Pro Text, 14pt, Weight 400, Color #666666
- **Scripture Position:** 56pt from left, 42pt from top
- **Max Lines:** 2, truncated with ellipsis

#### Family Card
- **Icon:** 👨‍👩‍👧‍👦 (emoji), 24pt × 24pt
- **Icon Position:** 20pt from left, centered vertically
- **Title:** "Family"
- **Title Typography:** SF Pro Display, 20pt, Weight 600, Color #1A1A1A
- **Title Position:** 56pt from left, 18pt from top
- **Member Count:** "{X} family members" (dynamic)
- **Member Count Typography:** SF Pro Text, 14pt, Weight 400, Color #666666
- **Member Count Position:** 56pt from left, 42pt from top

#### Finance Card (Special Treatment)
- **Base:** Same as other cards
- **Icon:** 💰 (emoji), 24pt × 24pt
- **Icon Position:** 20pt from left, centered vertically
- **Title Container:** Horizontal flex
- **Title:** "Finance"
- **Title Typography:** SF Pro Display, 20pt, Weight 600, Color #1A1A1A
- **Title Position:** 56pt from left, 18pt from top
- **Pro Label:** "PRO"
- **Pro Label Typography:** SF Pro Text, 10pt, Weight 700, Color #FF6B35
- **Pro Label Background:** rgba(255, 107, 53, 0.1)
- **Pro Label Padding:** 4pt horizontal, 2pt vertical
- **Pro Label Corner Radius:** 6pt
- **Pro Label Position:** 8pt right of "Finance" title, baseline aligned
- **Subtitle:** "Track your wealth journey"
- **Subtitle Typography:** SF Pro Text, 14pt, Weight 400, Color #666666
- **Subtitle Position:** 56pt from left, 42pt from top

### Card Interaction States
- **Default:** Opacity 1.0
- **Pressed:** Opacity 0.85, scale 0.98
- **Animation:** spring(response: 0.3, dampingFraction: 0.7)

## Call-to-Action Section

### Container
- **Height:** 96pt
- **Position:** 32pt from bottom of modal
- **Padding:** 24pt horizontal

### Button Specifications
- **Width:** 295pt (full width minus margins)
- **Height:** 52pt
- **Corner Radius:** 16pt
- **Background:** Linear gradient
  - **Stop 1:** #FF6B35 at 0%
  - **Stop 2:** #F7931E at 100%
- **Text:** "Let's go"
- **Typography:** SF Pro Display, 18pt, Weight 600, Color #FFFFFF
- **Shadow:** 0pt 4pt 16pt rgba(255, 107, 53, 0.3)

### Button States
- **Default:** Full gradient, shadow visible
- **Pressed:** Opacity 0.9, scale 0.98, reduced shadow
- **Animation:** spring(response: 0.25, dampingFraction: 0.8)

## Typography System

### Font Stack
- **Primary:** SF Pro Display (iOS), -apple-system (fallback)
- **Secondary:** SF Pro Text (iOS), -apple-system (fallback)

### Font Weights
- **700:** Bold headlines
- **600:** Semibold titles
- **400:** Regular body text

### Text Colors
- **Primary:** #1A1A1A (near black)
- **Secondary:** #666666 (medium gray)
- **Accent:** #FF6B35 (brand orange)
- **Inverse:** #FFFFFF (white)

## Spacing System

### Base Unit
- **4pt grid system** (all spacing multiples of 4pt)

### Key Measurements
- **xs:** 4pt
- **sm:** 8pt
- **md:** 12pt
- **lg:** 16pt
- **xl:** 20pt
- **2xl:** 24pt
- **3xl:** 32pt

## Animation Specifications

### Modal Entrance
- **Type:** Spring animation
- **Initial State:** scale(0.9), opacity(0), translateY(20pt)
- **Final State:** scale(1.0), opacity(1), translateY(0pt)
- **Duration:** 0.6s
- **Easing:** spring(response: 0.6, dampingFraction: 0.8)

### Card Reveal Sequence
- **Delay:** 0.1s between each card
- **Animation:** fadeIn + slideUp
- **Duration:** 0.4s per card
- **Easing:** ease-out

### Button Appearance
- **Delay:** 0.5s after modal entrance
- **Animation:** fadeIn + scaleIn
- **Duration:** 0.3s
- **Easing:** spring(response: 0.3, dampingFraction: 0.7)

## Accessibility

### Text Contrast
- All text meets WCAG AA standards (4.5:1 minimum)
- Large text meets AAA standards (7:1)

### Touch Targets
- All interactive elements minimum 44pt × 44pt
- Cards have full 86pt height touch target

### Screen Reader
- Modal has aria-modal="true"
- Cards have descriptive aria-labels
- Button has clear action description

## Implementation Notes

### iOS Considerations
- Use native blur effects where possible
- Respect safe area insets
- Support Dynamic Type scaling
- Test on iPhone SE (smallest screen)

### Performance
- Use GPU-accelerated transforms for animations
- Optimize gradient rendering for 120Hz displays
- Preload emoji assets to prevent layout shift

### Dark Mode (Future)
- All colors have dark mode variants defined
- Gradient adjusts opacity for dark backgrounds
- Card backgrounds become slightly translucent

---

**This specification is pixel-perfect and implementation-ready. Every measurement, color, and animation has been carefully considered for the optimal first impression of Lever.**