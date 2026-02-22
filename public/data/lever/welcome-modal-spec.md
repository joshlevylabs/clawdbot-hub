# Lever Welcome Modal - Visual Specification

**Version:** 1.0  
**Status:** Implementation Ready  
**Target:** SwiftUI/React Native Implementation  
**Updated:** February 20, 2026  

## Overview

Single-screen welcome modal introducing users to Lever's three pillars: Faith, Family, Finance. Warm, inviting design with sunrise gradient background and clean card-based layout.

---

## Screen Layout

### Container Specifications
- **Full screen modal** (no dismiss X)
- **Safe area aware** - respects device notches and home indicators
- **Vertical scrolling enabled** if content exceeds screen height
- **Background:** Full-bleed gradient (see colors below)

### Vertical Stack Hierarchy
1. **Top Spacer:** 60pt from safe area top
2. **Lever Wordmark:** 40pt height
3. **Spacer:** 48pt
4. **Three Pillar Cards:** 16pt spacing between cards
5. **Spacer:** 32pt
6. **CTA Button:** 52pt height
7. **Bottom Spacer:** 40pt from safe area bottom

---

## Color Palette

### Background Gradient
```
Linear Gradient (Top to Bottom):
- Stop 0%: #FFB347 (Warm Gold)
- Stop 50%: #FFA07A (Light Salmon) 
- Stop 100%: #87CEEB (Sky Blue)
```

### Card Colors
```
Card Background: #FFFFFF (White)
Card Border: #F0F0F0 (Light Gray)
Card Shadow: #000000 @ 8% opacity
```

### Text Colors
```
Primary Text: #2C2C2E (Near Black)
Secondary Text: #8E8E93 (System Gray)
Pro Label: #FF6B35 (Orange Red)
CTA Button Background: #2C2C2E (Near Black)
CTA Button Text: #FFFFFF (White)
```

---

## Typography

### Font Family
- **Primary:** SF Pro Display (iOS) / System (Android)
- **Weight Hierarchy:** See individual elements below

### Wordmark
- **Font:** SF Pro Display, Heavy (800)
- **Size:** 28pt
- **Color:** #FFFFFF (White)
- **Letter Spacing:** -0.5pt
- **Text:** "LEVER"

### Card Hook Text
- **Font:** SF Pro Display, Semibold (600)
- **Size:** 18pt
- **Color:** #2C2C2E
- **Line Height:** 22pt

### Card Preview Text
- **Font:** SF Pro Text, Regular (400)
- **Size:** 14pt
- **Color:** #8E8E93
- **Line Height:** 18pt

### Pro Label
- **Font:** SF Pro Text, Medium (500)
- **Size:** 11pt
- **Color:** #FF6B35
- **Text:** "PRO"
- **Transform:** Uppercase

### CTA Button
- **Font:** SF Pro Display, Semibold (600)
- **Size:** 17pt
- **Color:** #FFFFFF
- **Text:** "Let's go"

---

## Lever Wordmark

### Positioning
- **Horizontal:** Center aligned
- **Vertical:** 60pt from safe area top
- **Dimensions:** Auto width × 40pt height

### Visual Treatment
- **Drop Shadow:** #000000 @ 20% opacity, 0pt x-offset, 2pt y-offset, 4pt blur
- **Accessibility:** Logo alt text = "Lever"

---

## Pillar Cards

### Card Container
- **Dimensions:** Screen width - 32pt margins (16pt each side)
- **Height:** 88pt (fixed)
- **Corner Radius:** 12pt
- **Background:** #FFFFFF
- **Border:** 1pt solid #F0F0F0
- **Shadow:** #000000 @ 8% opacity, 0pt x-offset, 2pt y-offset, 8pt blur

### Card Internal Layout
```
[16pt padding]
├── Icon (24×24pt) + Hook Text + Pro Label (if Finance)
│   └── Horizontal stack, 12pt spacing, center aligned vertically
├── [8pt spacing]
└── Preview Content Area
    └── [16pt trailing padding for balance]
```

### Card Interactions
- **Tap Target:** Full card area
- **Tap Action:** Navigate to respective pillar screen
- **Visual Feedback:** Scale down to 0.96 on press, spring back on release
- **Accessibility:** Properly labeled for VoiceOver/TalkBack

---

## Faith Card

### Icon Placeholder
- **Size:** 24×24pt
- **Style:** SF Symbol "heart.fill" or custom faith icon
- **Color:** #FF6B35 (Orange Red)

### Hook Text
- **Content:** "Strengthen your faith"
- **Typography:** Card hook style (18pt Semibold)

### Preview Content
- **Content:** "[Scripture text - TBD by Peterson & Alex]"
- **Typography:** Card preview style (14pt Regular, Gray)
- **Max Lines:** 2 lines with ellipsis truncation
- **Note:** Scripture selection deferred to Peterson & Alex (no CEO review)

---

## Family Card

### Icon Placeholder
- **Size:** 24×24pt
- **Style:** SF Symbol "house.fill" or custom family icon
- **Color:** #34C759 (System Green)

### Hook Text
- **Content:** "Connect with family"
- **Typography:** Card hook style (18pt Semibold)

### Preview Content
- **Dynamic Content:** "{X} family members" (replace X with actual count)
- **Fallback:** "Add your family members" (if count = 0)
- **Typography:** Card preview style (14pt Regular, Gray)

---

## Finance Card

### Icon Placeholder  
- **Size:** 24×24pt
- **Style:** SF Symbol "chart.line.uptrend.xyaxis" or custom finance icon
- **Color:** #007AFF (System Blue)

### Hook Text + Pro Label Layout
```
Horizontal Stack:
├── "Manage your money" (18pt Semibold)
├── [8pt spacer]
└── "PRO" Badge
    ├── Background: #FF6B35 @ 12% opacity
    ├── Corner Radius: 4pt
    ├── Padding: 4pt horizontal, 2pt vertical
    └── Text: 11pt Medium, #FF6B35
```

### Preview Content
- **Content:** "Track expenses, investments & goals"
- **Typography:** Card preview style (14pt Regular, Gray)
- **Max Lines:** 2 lines with ellipsis truncation

---

## CTA Button

### Positioning
- **Horizontal:** Center aligned
- **Margins:** 24pt from screen edges
- **Vertical:** 32pt below cards

### Button Specifications
- **Dimensions:** Screen width - 48pt margins × 52pt height
- **Corner Radius:** 26pt (pill shape)
- **Background:** #2C2C2E (Near Black)
- **Text:** "Let's go" (17pt Semibold, White)

### Interaction States
- **Normal:** Background #2C2C2E
- **Pressed:** Background #1C1C1E (darker)
- **Disabled:** Background #8E8E93 (should not occur in this flow)

### Accessibility
- **Label:** "Continue to main app"
- **Hint:** "Dismisses welcome screen and opens main interface"

---

## Responsive Behavior

### Small Screens (iPhone SE, etc.)
- Reduce top/bottom spacers by 30% if needed
- Enable vertical scrolling
- Maintain minimum 16pt margins throughout

### Large Screens (iPad, etc.)
- Maximum content width: 375pt (iPhone size)
- Center content horizontally
- Add side margins as needed

### Dark Mode
- **Not supported in V1** - welcome modal always uses light theme
- Background gradient remains unchanged for brand consistency
- All text remains high contrast against white cards

---

## Animation Specifications

### Modal Entry
- **Duration:** 0.6 seconds
- **Easing:** Spring (damping: 0.8, response: 0.5)
- **Behavior:** Slide up from bottom with subtle bounce

### Modal Exit (on CTA tap)
- **Duration:** 0.4 seconds  
- **Easing:** Ease-in-out
- **Behavior:** Fade out with slight scale down (0.95)

### Card Hover/Press (Mobile)
- **Scale:** 0.96 (pressed state)
- **Duration:** 0.1 seconds
- **Spring Back:** 0.3 seconds with bounce

---

## Implementation Notes

### Asset Requirements
1. **Lever wordmark** - Vector format (SVG/PDF) at @3x resolution
2. **Pillar icons** - 24×24pt at @3x (72×72px) in vector format
3. **Gradient implementation** - Use platform native linear gradient APIs

### Data Binding
- **Family member count** - Bind to user's family list length
- **Scripture text** - Static content, await Peterson & Alex selection
- **Pro label visibility** - Always show (aspirational, not feature-gated)

### Accessibility
- **VoiceOver support** - All elements properly labeled
- **Dynamic Type** - Text scales with system preferences
- **Reduced Motion** - Honor system setting, use crossfade instead of spring animations

### Analytics Events
```
welcome_modal_shown: {} 
faith_card_tapped: {}
family_card_tapped: {}
finance_card_tapped: {}
cta_button_tapped: {}
modal_dismissed: {method: "cta_button"}
```

---

## Approval Status

- [x] CEO Approved: Single screen design direction
- [x] CEO Approved: Include Pro label on finance card  
- [ ] Pending: Scripture selection (Peterson & Alex, no CEO review)

---

**Ready for Implementation:** ✅  
**Engineering Handoff:** This spec contains all measurements, colors, and behaviors needed for pixel-perfect implementation.