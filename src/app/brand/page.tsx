"use client";

/* ─────────────────────────────────────────────────────────────────
 *  Josh Levy Labs — Brand Guidelines v2.0
 *  "The Forge" — Where builders shape raw ideas into engineered products.
 *  Inspired by legendary design systems. Geometric precision meets warm humanity.
 * ───────────────────────────────────────────────────────────────── */

import { useState } from "react";
import {
  Palette,
  Type,
  Ruler,
  Component,
  Box,
  Sparkles,
  Layers,
  BookOpen,
  Info,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  Target,
  Grid,
  Waves,
  Building,
  Command
} from "lucide-react";

// ── Brand data interfaces ──────────────────────────────────────────

interface DesignPrinciple {
  principle: string;
  inspiration: string;
  application: string;
  lesson: string;
}

interface ProductInfo {
  name: string;
  description: string;
  stack: string;
  font: string;
  accentFamily: string;
  layout: string;
  logo: string;
  notes: string;
  repo?: string;
  website?: string;
}

interface ColorToken {
  name: string;
  hex: string;
  token: string;
  usage: string;
}

interface ColorPalette {
  [key: string]: ColorToken;
}

interface ColorGroup {
  label: string;
  colors: ColorToken[];
}

interface ChartColor {
  order: number;
  name: string;
  hex: string;
  token: string;
  usage: string;
}

interface TypographyFamily {
  name: string;
  description: string;
  usage: string;
  letterSpacing: string;
  characteristics: string;
}

interface TypographyWeight {
  value: number;
  name: string;
  usage: string;
}

interface TypographySize {
  px: number;
  rem: number;
  usage: string;
}

interface SpacingValue {
  value: number;
  name: string;
  usage: string;
}

interface BorderRadiusValue {
  value: number;
  name: string;
  usage: string;
}

interface ShadowDefinition {
  css: string;
  name: string;
  usage: string;
}

interface ButtonVariant {
  background: string;
  color: string;
  border: string;
  shadow: string;
  usage: string;
}

interface AnimationTiming {
  duration: string;
  easing: string;
  usage: string;
}

// ── Brand data (redesigned) ─────────────────────────────────────────

const BRAND_STORY = {
  essence: "The Forge — Where builders shape raw ideas into engineered products.",
  tagline: "Craft intentional tools.",
  personality: ["Geometric", "Warm-premium", "Constraint-focused", "Craft-obsessed", "Engineer-first"],
  philosophy: "Like molten metal taking shape on an anvil, every design decision is deliberate, precise, and purposeful. We don't chase trends. We forge timeless tools."
};

const DESIGN_PRINCIPLES: DesignPrinciple[] = [
  {
    principle: "Constraint IS the brand",
    inspiration: "Apple",
    application: "One primary font (Space Grotesk), one accent (Forge Gold), obsessive consistency across all touchpoints.",
    lesson: "Pick fewer things and own them completely."
  },
  {
    principle: "Gradients create dimensionality",
    inspiration: "Stripe", 
    application: "Forge Gold (#D4A020) to Dark Goldenrod (#B8860B) gradients communicate transformation and premium feel.",
    lesson: "Color gradients aren't decoration — they communicate motion, flow, transformation."
  },
  {
    principle: "Warm darks feel premium",
    inspiration: "Linear",
    application: "Obsidian (#0B0B11) with hint of deep blue, not cold gray. Warmth determines premium vs generic.",
    lesson: "The warmth of your darks determines whether your UI feels premium or generic."
  },
  {
    principle: "Named colors have stories",
    inspiration: "Porsche",
    application: "'Forge Gold', 'Deep Indigo', 'Obsidian' — every color has intention and meaning.",
    lesson: "Name your colors with purpose, not with hex codes."
  },
  {
    principle: "Less, but better",
    inspiration: "Dieter Rams / Braun",
    application: "Every design element serves a purpose. Decoration without function is removed.",
    lesson: "If a design element doesn't serve a purpose, remove it."
  },
  {
    principle: "Geometric simplicity = timelessness",
    inspiration: "Paul Rand / IBM",
    application: "All logos work at 16px AND 1600px. Simple geometric shapes only.",
    lesson: "Mathematical grid relationships. Visual clarity at every scale."
  },
  {
    principle: "System thinking over aesthetics",
    inspiration: "Massimo Vignelli / NYC Subway",
    application: "The design system IS the brand. Consistent application trumps individual flair.",
    lesson: "A design system IS the brand, not the logo."
  }
];

const LOGOS: { [key: string]: string } = {
  main: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M8 6L24 6C25.1046 6 26 6.89543 26 8V10H8V6Z" fill="currentColor"/>
    <path d="M8 14H18L22 26H12L8 14Z" fill="currentColor"/>
    <circle cx="22" cy="20" r="4" fill="currentColor"/>
  </svg>`,
  
  hub: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1" fill="none"/>
    <path d="M12 2V6M12 18V22M22 12H18M6 12H2" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  
  lever: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <polygon points="4,18 12,6 20,18" fill="currentColor"/>
    <line x1="2" y1="18" x2="22" y2="18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
  
  frequency: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="12" width="2" height="8" fill="currentColor"/>
    <rect x="7" y="8" width="2" height="12" fill="currentColor"/>
    <rect x="11" y="4" width="2" height="16" fill="currentColor"/>
    <rect x="15" y="10" width="2" height="10" fill="currentColor"/>
    <rect x="19" y="6" width="2" height="14" fill="currentColor"/>
  </svg>`,
  
  lyceum: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="6" y="6" width="3" height="16" fill="currentColor"/>
    <rect x="15" y="6" width="3" height="16" fill="currentColor"/>
    <rect x="4" y="4" width="16" height="3" fill="currentColor"/>
    <rect x="4" y="20" width="16" height="2" fill="currentColor"/>
  </svg>`
};

const PRODUCTS: Record<string, ProductInfo> = {
  hub: {
    name: "Clawdbot Hub",
    description: "Command center for the agent ecosystem",
    stack: "Next.js + Tailwind CSS",
    font: "Space Grotesk",
    accentFamily: "Forge Gold",
    layout: "sidebar",
    logo: "hub",
    notes: "Agent coordination hub with real-time monitoring and control interfaces."
  },
  lever: {
    name: "Lever",
    description: "Personal operating system for finance, faith, and focus",
    stack: "Expo + React Native + NativeWind",
    font: "System Default (SF Pro / Roboto)",
    accentFamily: "Forge Gold",
    layout: "bottom-tab-nav",
    logo: "lever",
    notes: "Mobile-first personal dashboard for life optimization and spiritual growth."
  },
  frequency: {
    name: "Builder's Frequency",
    description: "Weekly technical newsletter for engineering leaders",
    stack: "Beehiiv + Custom Design",
    font: "Space Grotesk",
    accentFamily: "Signal Cyan",
    layout: "newsletter",
    logo: "frequency",
    notes: "Curated technical insights delivered with precision and purpose."
  },
  lyceum: {
    name: "The Lyceum",
    description: "Industrial analytics platform for test equipment control",
    stack: "Tauri (Rust) + Next.js/React",
    font: "Space Grotesk",
    accentFamily: "Deep Indigo",
    layout: "desktop-app",
    logo: "lyceum",
    notes: "Agentic test automation for industrial equipment. Customers: Amazon, Meta, Oculus.",
    website: "https://www.thelyceum.io"
  }
};

const COLOR_GROUPS: Record<string, ColorGroup> = {
  forge: {
    label: "Forge Gold — Primary",
    colors: [
      { name: "Forge Light", hex: "#F4D03F", token: "forge-light", usage: "Hover states, light highlights" },
      { name: "Forge Gold", hex: "#D4A020", token: "forge-primary", usage: "Primary CTAs, active states, key highlights" },
      { name: "Forge Dark", hex: "#B8860B", token: "forge-dark", usage: "Borders, pressed states" },
      { name: "Forge Ember", hex: "#8B6914", token: "forge-ember", usage: "Subtle backgrounds, muted states" }
    ]
  },
  indigo: {
    label: "Deep Indigo — Secondary",
    colors: [
      { name: "Indigo Light", hex: "#6366F1", token: "indigo-light", usage: "Secondary highlights, info states" },
      { name: "Deep Indigo", hex: "#4F46E5", token: "indigo-primary", usage: "Secondary CTAs, premium accents" },
      { name: "Indigo Dark", hex: "#3730A3", token: "indigo-dark", usage: "Borders on indigo elements" },
      { name: "Indigo Muted", hex: "#312E81", token: "indigo-muted", usage: "Indigo subtle backgrounds" }
    ]
  },
  cyan: {
    label: "Signal Cyan — Accent",
    colors: [
      { name: "Signal Bright", hex: "#67E8F9", token: "cyan-light", usage: "Data highlights, tech accents" },
      { name: "Signal Cyan", hex: "#22D3EE", token: "cyan-primary", usage: "Data visualization, tech elements" },
      { name: "Signal Deep", hex: "#0891B2", token: "cyan-dark", usage: "Data borders, deep accents" }
    ]
  },
  backgrounds: {
    label: "Warm Backgrounds",
    colors: [
      { name: "Obsidian", hex: "#0B0B11", token: "bg-obsidian", usage: "Primary background (deepest, warm-tinted)" },
      { name: "Carbon", hex: "#13131B", token: "bg-carbon", usage: "Elevated surfaces (cards, panels)" },
      { name: "Surface Warm", hex: "#1A1A24", token: "bg-surface", usage: "Secondary surfaces, inputs" },
      { name: "Elevated Warm", hex: "#21212E", token: "bg-elevated", usage: "Hover states, pressed surfaces" },
      { name: "Border Warm", hex: "#2A2A38", token: "bg-border", usage: "Dividers, card borders" },
      { name: "Border Strong", hex: "#343444", token: "bg-border-strong", usage: "Stronger dividers, active borders" }
    ]
  },
  text: {
    label: "Text & Neutrals",
    colors: [
      { name: "Warm White", hex: "#F5F5F0", token: "text-primary", usage: "Primary text (warm, not blue-white)" },
      { name: "Smoke Light", hex: "#B8B8AD", token: "text-secondary", usage: "Secondary information, descriptions" },
      { name: "Smoke", hex: "#8B8B80", token: "text-muted", usage: "Hints, disabled states, meta text" },
      { name: "Smoke Dark", hex: "#626259", token: "text-faint", usage: "Disclaimers, timestamps, fine print" }
    ]
  },
  status: {
    label: "Status (Named)",
    colors: [
      { name: "Momentum Green", hex: "#10B981", token: "status-momentum", usage: "Success states, positive trends, growth" },
      { name: "Caution Amber", hex: "#F59E0B", token: "status-caution", usage: "Warnings, pending states" },
      { name: "Alert Crimson", hex: "#DC2626", token: "status-crimson", usage: "Errors, destructive actions, danger" },
      { name: "Info Blue", hex: "#3B82F6", token: "status-info", usage: "Informational states, neutral data" }
    ]
  }
};

const CHART_COLORS: ChartColor[] = [
  { order: 1, name: "Forge Gold", hex: "#D4A020", token: "chart-forge", usage: "Primary data series" },
  { order: 2, name: "Momentum Green", hex: "#10B981", token: "chart-momentum", usage: "Positive trends, growth metrics" },
  { order: 3, name: "Deep Indigo", hex: "#4F46E5", token: "chart-indigo", usage: "Secondary series, comparisons" },
  { order: 4, name: "Alert Crimson", hex: "#DC2626", token: "chart-crimson", usage: "Negative trends, alerts" },
  { order: 5, name: "Signal Cyan", hex: "#22D3EE", token: "chart-cyan", usage: "Technical metrics, data flow" },
  { order: 6, name: "Royal Purple", hex: "#7C3AED", token: "chart-purple", usage: "Rare fifth series, special metrics" }
];

const TYPOGRAPHY_FAMILIES: Record<string, TypographyFamily> = {
  display: {
    name: "Space Grotesk",
    description: "Geometric, techy, distinctive. NOT generic Inter for everything.",
    usage: "Headings, UI labels, buttons, navigation",
    letterSpacing: "-0.02em",
    characteristics: "Geometric sans-serif with technical precision"
  },
  body: {
    name: "Inter",
    description: "Clean, readable, battle-tested for body text.",
    usage: "Body text, paragraphs, descriptions",
    letterSpacing: "0em",
    characteristics: "Humanist sans-serif optimized for reading"
  },
  mono: {
    name: "JetBrains Mono",
    description: "For code, data, and technical content.",
    usage: "Code blocks, technical data, API responses",
    letterSpacing: "0em",
    characteristics: "Monospace with enhanced readability features"
  }
};

const TYPOGRAPHY_WEIGHTS: TypographyWeight[] = [
  { value: 400, name: "Regular", usage: "Body text, standard content" },
  { value: 500, name: "Medium", usage: "Emphasized body, form labels" },
  { value: 600, name: "Semibold", usage: "Subheadings, button text" },
  { value: 700, name: "Bold", usage: "Section headings, key metrics" },
  { value: 800, name: "Extrabold", usage: "Hero text, large display numbers" }
];

const TYPOGRAPHY_SCALE: Record<string, TypographySize> = {
  xs: { px: 12, rem: 0.75, usage: "Fine print, timestamps, code annotations" },
  sm: { px: 14, rem: 0.875, usage: "Secondary text, form labels, captions" },
  md: { px: 16, rem: 1.0, usage: "Body text (base size), standard content" },
  lg: { px: 18, rem: 1.125, usage: "Emphasized body text, large buttons" },
  xl: { px: 20, rem: 1.25, usage: "Subheadings, prominent labels" },
  "2xl": { px: 24, rem: 1.5, usage: "Section headings, card titles" },
  "3xl": { px: 32, rem: 2.0, usage: "Page headings, hero text" },
  "4xl": { px: 40, rem: 2.5, usage: "Display headings, large metrics" },
  "5xl": { px: 48, rem: 3.0, usage: "Hero displays, landing page text" }
};

const SPACING_SCALE: Record<string, SpacingValue> = {
  xxs: { value: 2, name: "Hairline", usage: "Fine borders, tight element gaps" },
  xs: { value: 4, name: "Tight", usage: "Related inline elements, icon gaps" },
  sm: { value: 8, name: "Standard", usage: "Row gaps, standard element margins" },
  md: { value: 16, name: "Comfortable", usage: "Card padding, input padding, sections" },
  lg: { value: 24, name: "Section", usage: "Section breaks, major element gaps" },
  xl: { value: 32, name: "Large", usage: "Page sections, major separations" },
  "2xl": { value: 48, name: "Hero", usage: "Hero sections, dramatic spacing" },
  "3xl": { value: 64, name: "Monumental", usage: "Landing pages, major page sections" }
};

const BORDER_RADIUS_SCALE: Record<string, BorderRadiusValue> = {
  xs: { value: 4, name: "Minimal", usage: "Progress bars, chart elements, badges" },
  sm: { value: 8, name: "Small", usage: "Small chips, tight UI elements" },
  md: { value: 12, name: "Standard", usage: "Buttons, inputs, standard cards" },
  lg: { value: 16, name: "Card", usage: "Primary cards, modals, panels" },
  xl: { value: 20, name: "Large", usage: "Bottom sheets, large containers" },
  "2xl": { value: 24, name: "Hero", usage: "Hero cards, major containers" },
  full: { value: 999, name: "Pill", usage: "Pills, avatars, progress tracks" }
};

const SHADOWS: Record<string, ShadowDefinition> = {
  card: { css: "0 1px 3px rgba(0,0,0,0.4)", name: "Card", usage: "Default card elevation, subtle depth" },
  cardHover: { css: "0 4px 8px rgba(0,0,0,0.3)", name: "Card Hover", usage: "Hovered cards, interactive elevation" },
  elevated: { css: "0 8px 16px rgba(0,0,0,0.25)", name: "Elevated", usage: "Modals, dropdowns, floating elements" },
  forgeGlow: { css: "0 0 24px rgba(212, 160, 32, 0.3)", name: "Forge Glow", usage: "Premium CTAs, accent highlights" },
  indigoGlow: { css: "0 0 16px rgba(79, 70, 229, 0.25)", name: "Indigo Glow", usage: "Secondary CTAs, info highlights" }
};

const BUTTON_VARIANTS: Record<string, ButtonVariant> = {
  primary: {
    background: "linear-gradient(135deg, #D4A020 0%, #B8860B 100%)",
    color: "#0B0B11",
    border: "none", 
    shadow: "0 0 12px rgba(212, 160, 32, 0.2)",
    usage: "Primary CTAs, main actions"
  },
  secondary: {
    background: "transparent",
    color: "#D4A020",
    border: "1px solid #D4A020",
    shadow: "none",
    usage: "Secondary actions, alternative paths"
  },
  indigo: {
    background: "linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)",
    color: "#F5F5F0",
    border: "none",
    shadow: "0 0 12px rgba(79, 70, 229, 0.2)",
    usage: "Secondary CTAs, premium actions"
  },
  destructive: {
    background: "#DC2626",
    color: "#F5F5F0",
    border: "none",
    shadow: "0 0 8px rgba(220, 38, 38, 0.15)",
    usage: "Destructive actions, delete, danger"
  },
  ghost: {
    background: "transparent",
    color: "#B8B8AD",
    border: "none",
    shadow: "none",
    usage: "Tertiary actions, subtle interactions"
  }
};

const ANIMATION_TIMING: Record<string, AnimationTiming> = {
  micro: { duration: "150ms", easing: "ease-out", usage: "Hover states, focus rings, micro-interactions" },
  quick: { duration: "200ms", easing: "ease-out", usage: "Button states, simple transitions" },
  standard: { duration: "300ms", easing: "ease-in-out", usage: "Page elements, modal reveals, tab switching" },
  gentle: { duration: "400ms", easing: "ease-in-out", usage: "Larger movements, panel slides" },
  emphasis: { duration: "600ms", easing: "ease-out", usage: "Page transitions, major state changes" }
};

// ── Utility ──────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-white/10 transition-colors"
      title={`Copy: ${text}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
      ) : (
        <Copy className="w-3.5 h-3.5" style={{ color: "#8B8B80" }} />
      )}
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <Icon className="w-6 h-6" style={{ color: "#D4A020" }} />
        <h2 className="text-2xl font-bold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em" }}>{title}</h2>
      </div>
      {subtitle && <p className="text-sm ml-9" style={{ color: "#8B8B80" }}>{subtitle}</p>}
    </div>
  );
}

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-12 ${className}`}>{children}</section>
  );
}

// ── Color Swatch ─────────────────────────────────────────────────

function ColorSwatch({
  hex,
  name,
  token,
  usage,
}: {
  hex: string;
  name: string;
  token: string;
  usage: string;
}) {
  const isLight = hex.startsWith("#F") || hex.startsWith("#E") || hex.startsWith("#D") || hex.startsWith("#C");

  return (
    <div className="group flex flex-col">
      <div
        className="w-full h-20 rounded-t-lg border flex items-end p-2 transition-all group-hover:scale-[1.02]"
        style={{ 
          backgroundColor: hex,
          borderColor: "#2A2A38"
        }}
      >
        <span
          className={`text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity ${
            isLight ? "text-black/70" : "text-white/70"
          }`}
        >
          {hex}
        </span>
      </div>
      <div className="border border-t-0 rounded-b-lg p-3 flex-1" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
        <div className="flex items-center justify-between gap-1">
          <code className="text-xs font-mono" style={{ color: "#D4A020" }}>{token}</code>
          <CopyButton text={hex} />
        </div>
        <p className="text-[11px] mt-1 leading-tight font-medium" style={{ color: "#F5F5F0" }}>{name}</p>
        <p className="text-[10px] mt-1 leading-tight" style={{ color: "#8B8B80" }}>{usage}</p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function BrandGuidelinesPage() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dna: true,
    principles: true,
    colors: true,
    typography: true,
    spacing: true,
    components: true,
    animation: true,
    products: true,
    rules: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-7xl mx-auto" style={{ backgroundColor: "#0B0B11", color: "#F5F5F0" }}>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center" 
            style={{ background: "linear-gradient(135deg, #D4A020 0%, #B8860B 100%)", boxShadow: "0 0 24px rgba(212, 160, 32, 0.3)" }}
            dangerouslySetInnerHTML={{ __html: LOGOS.main }}
          />
          <div>
            <h1 className="text-4xl font-bold" style={{ fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em", color: "#F5F5F0" }}>
              The Forge
            </h1>
            <p className="text-lg" style={{ color: "#D4A020", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
              {BRAND_STORY.tagline}
            </p>
          </div>
        </div>
        <p className="text-base max-w-3xl leading-relaxed" style={{ color: "#B8B8AD", fontFamily: "Inter, system-ui, sans-serif" }}>
          {BRAND_STORY.philosophy}
        </p>

        {/* Brand essence */}
        <div className="mt-6 p-6 rounded-2xl border" style={{ borderColor: "rgba(212, 160, 32, 0.2)", backgroundColor: "rgba(212, 160, 32, 0.05)" }}>
          <p className="text-lg italic mb-4" style={{ color: "#F4D03F", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
            &ldquo;{BRAND_STORY.essence}&rdquo;
          </p>
          <div className="flex flex-wrap gap-3">
            {BRAND_STORY.personality.map((trait) => (
              <span
                key={trait}
                className="px-3 py-1.5 rounded-full text-sm font-medium border"
                style={{ 
                  backgroundColor: "rgba(212, 160, 32, 0.1)", 
                  color: "#D4A020", 
                  borderColor: "rgba(212, 160, 32, 0.3)",
                  fontFamily: "Space Grotesk, system-ui, sans-serif"
                }}
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── BRAND DNA ──────────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("dna")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.dna ? (
            <ChevronDown className="w-5 h-5" style={{ color: "#8B8B80" }} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: "#8B8B80" }} />
          )}
          <Zap className="w-6 h-6" style={{ color: "#D4A020" }} />
          <h2 className="text-2xl font-bold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em" }}>Brand DNA</h2>
          <span className="text-xs ml-2" style={{ color: "#8B8B80" }}>Inspired by legends</span>
        </button>

        {expandedSections.dna && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#D4A020", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>🍎 Apple</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#B8B8AD" }}>
                Constraint IS the brand. One font (SF Pro). One radius (continuous corner). Obsessive consistency.
              </p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#6366F1", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>⚡ Stripe</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#B8B8AD" }}>
                Deep navy + electric violet + calculated gradients. Gradients communicate motion, flow, transformation.
              </p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#7C3AED", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>📐 Linear</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#B8B8AD" }}>
                Warm darks feel premium. Purple = premium craft tool. Warmth determines premium vs generic.
              </p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#F59E0B", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>🏎️ Porsche</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#B8B8AD" }}>
                Heritage + precision. Every color has a name and story. GT Silver, Racing Yellow, Guards Red.
              </p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#22D3EE", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>⚪ Dieter Rams</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#B8B8AD" }}>
                "Less, but better." Every element earns its place. No decoration without function.
              </p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#10B981", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>🔷 Paul Rand</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#B8B8AD" }}>
                Geometric simplicity = timelessness. Logos work at 16px AND 1600px. Mathematical grid relationships.
              </p>
            </div>
          </div>
        )}
      </Section>

      {/* ── DESIGN PRINCIPLES ─────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("principles")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.principles ? (
            <ChevronDown className="w-5 h-5" style={{ color: "#8B8B80" }} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: "#8B8B80" }} />
          )}
          <Target className="w-6 h-6" style={{ color: "#D4A020" }} />
          <h2 className="text-2xl font-bold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em" }}>Design Principles</h2>
          <span className="text-xs ml-2" style={{ color: "#8B8B80" }}>{DESIGN_PRINCIPLES.length} principles</span>
        </button>

        {expandedSections.principles && (
          <div className="space-y-4">
            {DESIGN_PRINCIPLES.map((principle, i) => (
              <div key={i} className="p-5 rounded-2xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
                      {principle.principle}
                    </h3>
                    <p className="text-sm mb-3 leading-relaxed" style={{ color: "#B8B8AD" }}>
                      {principle.application}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-2 py-1 rounded-md" style={{ backgroundColor: "rgba(212, 160, 32, 0.1)", color: "#D4A020" }}>
                        {principle.inspiration}
                      </span>
                      <span style={{ color: "#8B8B80" }}>
                        {principle.lesson}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── COLORS ─────────────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("colors")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.colors ? (
            <ChevronDown className="w-5 h-5" style={{ color: "#8B8B80" }} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: "#8B8B80" }} />
          )}
          <Palette className="w-6 h-6" style={{ color: "#D4A020" }} />
          <h2 className="text-2xl font-bold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em" }}>Colors</h2>
          <span className="text-xs ml-2" style={{ color: "#8B8B80" }}>
            {Object.values(COLOR_GROUPS).reduce((sum, g) => sum + g.colors.length, 0)} named tokens
          </span>
        </button>

        {expandedSections.colors && (
          <>
            {Object.entries(COLOR_GROUPS).map(([key, group]) => (
              <div key={key} className="mb-8">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#D4A020" }} />
                  {group.label}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {group.colors.map((c) => (
                    <ColorSwatch key={c.token} hex={c.hex} name={c.name} token={c.token} usage={c.usage} />
                  ))}
                </div>
              </div>
            ))}

            {/* Chart palette */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#D4A020" }} />
                Chart Palette (Ordered)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {CHART_COLORS.map((c) => (
                  <div key={c.token} className="flex flex-col items-center gap-2 p-3 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: c.hex }} />
                    <span className="text-xs font-bold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>{c.order}</span>
                    <code className="text-xs font-mono" style={{ color: "#D4A020" }}>{c.token}</code>
                    <p className="text-[10px] text-center" style={{ color: "#8B8B80" }}>{c.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ── TYPOGRAPHY ─────────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("typography")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.typography ? (
            <ChevronDown className="w-5 h-5" style={{ color: "#8B8B80" }} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: "#8B8B80" }} />
          )}
          <Type className="w-6 h-6" style={{ color: "#D4A020" }} />
          <h2 className="text-2xl font-bold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em" }}>Typography</h2>
        </button>

        {expandedSections.typography && (
          <>
            {/* Font families */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Font Families</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(TYPOGRAPHY_FAMILIES).map(([key, family]) => (
                  <div key={key} className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <div className="mb-3">
                      <p className="text-xs mb-1" style={{ color: "#8B8B80" }}>{family.usage}</p>
                      <p 
                        className="text-2xl font-semibold" 
                        style={{ 
                          color: "#F5F5F0", 
                          fontFamily: family.name === "Space Grotesk" ? "Space Grotesk, system-ui, sans-serif" : family.name === "Inter" ? "Inter, system-ui, sans-serif" : "JetBrains Mono, monospace",
                          letterSpacing: family.letterSpacing
                        }}
                      >
                        {family.name}
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "#B8B8AD" }}>
                      {family.description}
                    </p>
                    <p className="text-[10px] mt-2" style={{ color: "#8B8B80" }}>
                      {family.characteristics}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Type scale */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Type Scale (Musical Intervals)</h3>
              <div className="space-y-2">
                {Object.entries(TYPOGRAPHY_SCALE).map(([token, scale]) => (
                  <div
                    key={token}
                    className="flex items-center gap-4 p-3 rounded-lg border transition-colors hover:border-opacity-60"
                    style={{ borderColor: "rgba(42, 42, 56, 0.5)", backgroundColor: "transparent" }}
                  >
                    <code className="text-xs font-mono w-10 shrink-0" style={{ color: "#D4A020" }}>
                      {token}
                    </code>
                    <span
                      className="flex-1 truncate"
                      style={{ 
                        fontSize: `${scale.px}px`, 
                        lineHeight: 1.4, 
                        color: "#F5F5F0", 
                        fontFamily: "Space Grotesk, system-ui, sans-serif",
                        letterSpacing: "-0.01em"
                      }}
                    >
                      The quick brown fox — {scale.px}px ({scale.rem}rem)
                    </span>
                    <span className="text-xs shrink-0 hidden sm:block" style={{ color: "#8B8B80" }}>
                      {scale.usage}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weights */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Font Weights</h3>
              <div className="space-y-2">
                {TYPOGRAPHY_WEIGHTS.map((w) => (
                  <div
                    key={w.value}
                    className="flex items-center gap-4 p-3 rounded-lg border transition-colors hover:border-opacity-60"
                    style={{ borderColor: "rgba(42, 42, 56, 0.5)", backgroundColor: "transparent" }}
                  >
                    <code className="text-xs font-mono w-10 shrink-0" style={{ color: "#D4A020" }}>
                      {w.value}
                    </code>
                    <span
                      className="text-lg flex-1"
                      style={{ 
                        fontWeight: w.value,
                        color: "#F5F5F0",
                        fontFamily: "Space Grotesk, system-ui, sans-serif"
                      }}
                    >
                      {w.name} — Craft intentional tools.
                    </span>
                    <span className="text-xs shrink-0 hidden sm:block" style={{ color: "#8B8B80" }}>
                      {w.usage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ── SPACING & LAYOUT ───────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("spacing")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.spacing ? (
            <ChevronDown className="w-5 h-5" style={{ color: "#8B8B80" }} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: "#8B8B80" }} />
          )}
          <Ruler className="w-6 h-6" style={{ color: "#D4A020" }} />
          <h2 className="text-2xl font-bold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em" }}>Spacing & Layout</h2>
        </button>

        {expandedSections.spacing && (
          <>
            {/* Spacing scale */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
                Spacing Scale (8px Mathematical Grid)
              </h3>
              <div className="space-y-2">
                {Object.entries(SPACING_SCALE).map(([token, spacing]) => (
                  <div
                    key={token}
                    className="flex items-center gap-4 p-3 rounded-lg border"
                    style={{ borderColor: "rgba(42, 42, 56, 0.5)" }}
                  >
                    <code className="text-xs font-mono w-10 shrink-0" style={{ color: "#D4A020" }}>
                      {token}
                    </code>
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="h-4 rounded-sm transition-all"
                        style={{ 
                          width: `${Math.min(spacing.value * 2, 280)}px`,
                          backgroundColor: "rgba(212, 160, 32, 0.4)",
                          border: "1px solid rgba(212, 160, 32, 0.6)"
                        }}
                      />
                      <span className="text-xs font-semibold" style={{ color: "#F5F5F0" }}>{spacing.value}px</span>
                      <span className="text-xs" style={{ color: "#D4A020" }}>{spacing.name}</span>
                    </div>
                    <span className="text-xs shrink-0 hidden sm:block" style={{ color: "#8B8B80" }}>
                      {spacing.usage}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Border radius */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Border Radius (Continuous Corners)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-4">
                {Object.entries(BORDER_RADIUS_SCALE).map(([token, radius]) => (
                  <div key={token} className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 h-16 border-2"
                      style={{ 
                        backgroundColor: "rgba(212, 160, 32, 0.2)",
                        borderColor: "rgba(212, 160, 32, 0.5)",
                        borderRadius: `${Math.min(radius.value, 32)}px`
                      }}
                    />
                    <code className="text-xs font-mono" style={{ color: "#D4A020" }}>{token}</code>
                    <span className="text-[10px]" style={{ color: "#8B8B80" }}>{radius.value}px</span>
                    <span className="text-[10px] text-center font-medium" style={{ color: "#F5F5F0" }}>{radius.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shadows */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Elevation & Shadows</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(SHADOWS).map(([token, shadow]) => (
                  <div key={token} className="flex flex-col items-center gap-2 p-4">
                    <div
                      className="w-24 h-16 rounded-lg border"
                      style={{ 
                        backgroundColor: "#13131B",
                        borderColor: "#2A2A38",
                        boxShadow: shadow.css
                      }}
                    />
                    <code className="text-xs font-mono" style={{ color: "#D4A020" }}>{token}</code>
                    <span className="text-[10px] text-center font-medium" style={{ color: "#F5F5F0" }}>{shadow.name}</span>
                    <span className="text-[10px] text-center" style={{ color: "#8B8B80" }}>{shadow.usage}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ── COMPONENTS ─────────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("components")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.components ? (
            <ChevronDown className="w-5 h-5" style={{ color: "#8B8B80" }} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: "#8B8B80" }} />
          )}
          <Component className="w-6 h-6" style={{ color: "#D4A020" }} />
          <h2 className="text-2xl font-bold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em" }}>Components</h2>
        </button>

        {expandedSections.components && (
          <>
            {/* Buttons */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Button Variants</h3>
              <div className="flex flex-wrap gap-4 items-center p-6 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                {Object.entries(BUTTON_VARIANTS).map(([name, btn]) => (
                  <button
                    key={name}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background: btn.background,
                      color: btn.color,
                      border: btn.border,
                      boxShadow: btn.shadow,
                      fontFamily: "Space Grotesk, system-ui, sans-serif",
                      letterSpacing: "-0.01em"
                    }}
                  >
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs space-y-1" style={{ color: "#8B8B80" }}>
                {Object.entries(BUTTON_VARIANTS).map(([name, btn]) => (
                  <p key={name}>
                    <strong style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>{name}:</strong> {btn.usage}
                  </p>
                ))}
              </div>
            </div>

            {/* Cards */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Card System</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border transition-all hover:border-opacity-60" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Standard Card</h4>
                    <Grid className="w-4 h-4" style={{ color: "#8B8B80" }} />
                  </div>
                  <p className="text-sm" style={{ color: "#B8B8AD" }}>
                    Warm carbon background (#13131B) with geometric borders. 16px padding, 16px radius.
                  </p>
                  <div className="mt-3 pt-3 flex gap-2 text-[10px]" style={{ borderTop: "1px solid #2A2A38", color: "#8B8B80" }}>
                    <span>Carbon • Warm borders • Elevated surface</span>
                  </div>
                </div>

                <div 
                  className="p-4 rounded-2xl border transition-all hover:border-opacity-80"
                  style={{ 
                    backgroundColor: "#13131B", 
                    borderColor: "rgba(212, 160, 32, 0.2)",
                    boxShadow: "0 0 24px rgba(212, 160, 32, 0.1)"
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold" style={{ color: "#D4A020", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Premium Card</h4>
                    <Sparkles className="w-4 h-4" style={{ color: "#D4A020" }} />
                  </div>
                  <p className="text-sm" style={{ color: "#B8B8AD" }}>
                    Forge gold accent border with subtle glow. Reserved for key moments and premium features.
                  </p>
                  <div className="mt-3 pt-3 flex gap-2 text-[10px]" style={{ borderTop: "1px solid rgba(212, 160, 32, 0.1)", color: "rgba(212, 160, 32, 0.6)" }}>
                    <span>Forge accent • Glow shadow • Premium variant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Input System</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Default input state"
                    className="w-full h-10 px-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: "#1A1A24",
                      border: "1px solid #2A2A38",
                      color: "#F5F5F0",
                      fontFamily: "Inter, system-ui, sans-serif"
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Focused state (click me)"
                    className="w-full h-10 px-3 rounded-xl text-sm ring-2"
                    style={{ 
                      backgroundColor: "#1A1A24",
                      border: "1px solid #D4A020",
                      color: "#F5F5F0",
                      fontFamily: "Inter, system-ui, sans-serif",
                      ringColor: "rgba(212, 160, 32, 0.2)"
                    }}
                    readOnly
                  />
                </div>
                <div className="p-4 rounded-xl border" style={{ backgroundColor: "rgba(19, 19, 27, 0.5)", borderColor: "rgba(42, 42, 56, 0.5)" }}>
                  <p className="text-xs space-y-1" style={{ color: "#8B8B80" }}>
                    <span className="block" style={{ color: "#F5F5F0" }}>Surface Warm background (#1A1A24)</span>
                    <span className="block">Border: Warm border (#2A2A38)</span>
                    <span className="block">Focus: Forge gold border + ring</span>
                    <span className="block">Typography: Inter body font</span>
                    <span className="block">Geometry: 12px radius, 40px height</span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ── PRODUCTS ────────────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("products")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.products ? (
            <ChevronDown className="w-5 h-5" style={{ color: "#8B8B80" }} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: "#8B8B80" }} />
          )}
          <Layers className="w-6 h-6" style={{ color: "#D4A020" }} />
          <h2 className="text-2xl font-bold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em" }}>Product Ecosystem</h2>
        </button>

        {expandedSections.products && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PRODUCTS).map(([key, product]) => (
              <div
                key={key}
                className="p-5 rounded-2xl border transition-all hover:border-opacity-60"
                style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" 
                    style={{ backgroundColor: "rgba(212, 160, 32, 0.1)", color: "#D4A020" }}
                    dangerouslySetInnerHTML={{ __html: LOGOS[product.logo] }}
                  />
                  <div className="flex-1">
                    <h4 className="text-lg font-bold mb-1" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.01em" }}>
                      {product.name}
                    </h4>
                    <p className="text-sm" style={{ color: "#B8B8AD" }}>{product.description}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs">
                  <p style={{ color: "#8B8B80" }}>
                    <span style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Stack:</span> {product.stack}
                  </p>
                  <p style={{ color: "#8B8B80" }}>
                    <span style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Typography:</span> {product.font}
                  </p>
                  <p style={{ color: "#8B8B80" }}>
                    <span style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Accent:</span> {product.accentFamily}
                  </p>
                  <p style={{ color: "#8B8B80" }}>
                    <span style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Layout:</span> {product.layout}
                  </p>
                  {product.website && (
                    <p style={{ color: "#8B8B80" }}>
                      <span style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Website:</span> 
                      <a href={product.website} className="underline ml-1" style={{ color: "#22D3EE" }}>{product.website}</a>
                    </p>
                  )}
                </div>
                
                <p className="text-[11px] leading-relaxed mt-4 pt-3" style={{ color: "#8B8B80", borderTop: "1px solid #2A2A38" }}>
                  {product.notes}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── ANIMATION ──────────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("animation")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.animation ? (
            <ChevronDown className="w-5 h-5" style={{ color: "#8B8B80" }} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: "#8B8B80" }} />
          )}
          <Sparkles className="w-6 h-6" style={{ color: "#D4A020" }} />
          <h2 className="text-2xl font-bold" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em" }}>Animation & Motion</h2>
        </button>

        {expandedSections.animation && (
          <>
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Motion with Purpose</h3>
              <div className="space-y-2">
                {Object.entries(ANIMATION_TIMING).map(([name, timing]) => (
                  <div
                    key={name}
                    className="flex items-center gap-4 p-3 rounded-lg border"
                    style={{ borderColor: "rgba(42, 42, 56, 0.5)" }}
                  >
                    <code className="text-xs font-mono w-20 shrink-0" style={{ color: "#D4A020" }}>
                      {name}
                    </code>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-sm font-medium" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>{timing.duration}</span>
                      <span className="text-xs" style={{ color: "#8B8B80" }}>{timing.easing}</span>
                    </div>
                    <span className="text-xs hidden sm:block" style={{ color: "#8B8B80" }}>{timing.usage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live animation demos */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Live Demonstrations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div
                    className="w-12 h-12 rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, #D4A020 0%, #B8860B 100%)",
                      animation: "pulse 2s ease-in-out infinite alternate",
                      boxShadow: "0 0 24px rgba(212, 160, 32, 0.4)",
                    }}
                  />
                  <span className="text-xs font-medium" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Forge Glow</span>
                </div>
                <div className="flex flex-col items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div
                    className="w-12 h-12 rounded-xl border-2"
                    style={{
                      backgroundColor: "rgba(212, 160, 32, 0.2)",
                      borderColor: "rgba(212, 160, 32, 0.4)",
                      animation: "bounce 2s ease-in-out infinite",
                    }}
                  />
                  <span className="text-xs font-medium" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Geometric Bounce</span>
                </div>
                <div className="flex flex-col items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <svg width="120" height="12" className="overflow-visible">
                    <line
                      x1="0" y1="6" x2="120" y2="6"
                      stroke="#D4A020"
                      strokeWidth="2"
                      strokeDasharray="8 6"
                      strokeLinecap="round"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="24"
                        to="0"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    </line>
                  </svg>
                  <span className="text-xs font-medium" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>Data Flow</span>
                </div>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* Footer */}
      <div className="text-center py-8 border-t" style={{ borderColor: "#2A2A38" }}>
        <p className="text-xs" style={{ color: "#626259" }}>
          "The Forge" Brand System v2.0 —{" "}
          <code style={{ color: "rgba(212, 160, 32, 0.6)" }}>mcporter call brand-guidelines.get_full_palette</code>
        </p>
        <p className="text-[10px] mt-1" style={{ color: "#626259" }}>
          Geometric precision meets warm humanity. Inspired by legendary design systems.
        </p>
      </div>
    </div>
  );
}