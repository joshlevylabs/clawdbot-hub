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
  Sparkles,
  Layers,
  Copy,
  Check,
  Zap,
  Target,
  Grid,
  BarChart3,
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
    name: "JoshOS Hub",
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

// ── Tab definitions ──────────────────────────────────────────────

type TabId = "dna" | "colors" | "typography" | "spacing" | "components" | "products" | "animation" | "dataviz";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
  shortLabel?: string;
}

const TABS: TabDef[] = [
  { id: "dna", label: "Brand DNA", icon: Zap, shortLabel: "DNA" },
  { id: "colors", label: "Colors", icon: Palette },
  { id: "typography", label: "Typography", icon: Type, shortLabel: "Type" },
  { id: "spacing", label: "Spacing & Layout", icon: Ruler, shortLabel: "Spacing" },
  { id: "components", label: "Components", icon: Component, shortLabel: "UI" },
  { id: "products", label: "Products", icon: Layers },
  { id: "animation", label: "Animation", icon: Sparkles, shortLabel: "Motion" },
  { id: "dataviz", label: "Data Visualization", icon: BarChart3, shortLabel: "Charts" },
];

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
  const [activeTab, setActiveTab] = useState<TabId>("dna");

  return (
    <div style={{ backgroundColor: "#0B0B11", color: "#F5F5F0" }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center" 
            style={{ background: "linear-gradient(135deg, #D4A020 0%, #B8860B 100%)", boxShadow: "0 0 24px rgba(212, 160, 32, 0.3)" }}
            dangerouslySetInnerHTML={{ __html: LOGOS.main }}
          />
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "Space Grotesk, system-ui, sans-serif", letterSpacing: "-0.02em", color: "#F5F5F0" }}>
              The Forge
            </h1>
            <p className="text-base sm:text-lg" style={{ color: "#D4A020", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
              {BRAND_STORY.tagline}
            </p>
          </div>
        </div>
        <p className="text-sm sm:text-base max-w-3xl leading-relaxed" style={{ color: "#B8B8AD", fontFamily: "Inter, system-ui, sans-serif" }}>
          {BRAND_STORY.philosophy}
        </p>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pb-1 pt-2 mb-6" style={{ backgroundColor: "#0B0B11" }}>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0"
                style={{
                  backgroundColor: isActive ? "rgba(212, 160, 32, 0.15)" : "transparent",
                  color: isActive ? "#D4A020" : "#8B8B80",
                  border: isActive ? "1px solid rgba(212, 160, 32, 0.3)" : "1px solid transparent",
                  fontFamily: "Space Grotesk, system-ui, sans-serif",
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="h-px" style={{ background: "linear-gradient(to right, transparent, #2A2A38, transparent)" }} />
      </div>

      {/* ── BRAND DNA TAB ──────────────────────────────────────── */}
      {activeTab === "dna" && (
        <>
          {/* Brand essence */}
          <div className="mb-8 p-5 rounded-2xl border" style={{ borderColor: "rgba(212, 160, 32, 0.2)", backgroundColor: "rgba(212, 160, 32, 0.05)" }}>
            <p className="text-base sm:text-lg italic mb-4" style={{ color: "#F4D03F", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
              &ldquo;{BRAND_STORY.essence}&rdquo;
            </p>
            <div className="flex flex-wrap gap-2">
              {BRAND_STORY.personality.map((trait) => (
                <span
                  key={trait}
                  className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border"
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

          {/* Inspirations */}
          <Section>
            <SectionHeader icon={Zap} title="Inspirations" subtitle="Standing on the shoulders of design legends" />
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
                  &ldquo;Less, but better.&rdquo; Every element earns its place. No decoration without function.
                </p>
              </div>
              <div className="p-4 rounded-2xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                <h3 className="text-sm font-bold mb-2" style={{ color: "#10B981", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>🔷 Paul Rand</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#B8B8AD" }}>
                  Geometric simplicity = timelessness. Logos work at 16px AND 1600px. Mathematical grid relationships.
                </p>
              </div>
            </div>
          </Section>

          {/* Design Principles */}
          <Section>
            <SectionHeader icon={Target} title="Design Principles" subtitle={`${DESIGN_PRINCIPLES.length} forged principles`} />
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
          </Section>
        </>
      )}

      {/* ── COLORS TAB ─────────────────────────────────────────── */}
      {activeTab === "colors" && (
        <>
          <SectionHeader icon={Palette} title="Colors" subtitle={`${Object.values(COLOR_GROUPS).reduce((sum, g) => sum + g.colors.length, 0)} named tokens`} />
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

      {/* ── TYPOGRAPHY TAB ─────────────────────────────────────── */}
      {activeTab === "typography" && (
        <>
          {/* Font families */}
          <SectionHeader icon={Type} title="Font Families" subtitle="Three typefaces, each with purpose" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

          {/* Type scale */}
          <Section>
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
          </Section>

          {/* Weights */}
          <Section>
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
          </Section>
        </>
      )}

      {/* ── SPACING TAB ────────────────────────────────────────── */}
      {activeTab === "spacing" && (
        <>
          {/* Spacing scale */}
          <Section>
            <SectionHeader icon={Ruler} title="Spacing Scale" subtitle="8px mathematical grid" />
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
          </Section>

          {/* Border radius */}
          <Section>
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
          </Section>

          {/* Shadows */}
          <Section>
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
          </Section>
        </>
      )}

      {/* ── COMPONENTS TAB ─────────────────────────────────────── */}
      {activeTab === "components" && (
        <>
          {/* Buttons */}
          <Section>
            <SectionHeader icon={Component} title="Button Variants" subtitle="Every action has a visual weight" />
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
          </Section>

          {/* Cards */}
          <Section>
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
          </Section>

          {/* Inputs */}
          <Section>
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
                    boxShadow: "0 0 0 2px rgba(212, 160, 32, 0.2)"
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
          </Section>
        </>
      )}

      {/* ── PRODUCTS TAB ────────────────────────────────────────── */}
      {activeTab === "products" && (
        <>
          {/* Brand Assets — Logo & Icon */}
          <Section>
            <SectionHeader icon={Layers} title="Brand Identity" subtitle="Josh Levy Labs — Logo & Icon" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Dark background — white logo */}
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#2A2A38" }}>
                <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: "#2A2A38", backgroundColor: "#13131B" }}>
                  <span className="text-xs font-medium" style={{ color: "#8B8B80" }}>Logo — Dark Background</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(212, 160, 32, 0.1)", color: "#D4A020" }}>Primary</span>
                </div>
                <div className="flex items-center justify-center p-12" style={{ backgroundColor: "#0B0B11" }}>
                  <img src="/brand/joshuaOSlogo-white.png" alt="JoshOS Logo (White)" className="w-40 h-40 object-contain" />
                </div>
                <div className="p-3 border-t text-[11px]" style={{ borderColor: "#2A2A38", backgroundColor: "#13131B", color: "#8B8B80" }}>
                  364×364 PNG · White on dark · <code className="px-1 py-0.5 rounded" style={{ backgroundColor: "#1A1A24" }}>/brand/joshuaOSlogo-white.png</code>
                </div>
              </div>

              {/* Light background — black logo */}
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#2A2A38" }}>
                <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: "#2A2A38", backgroundColor: "#13131B" }}>
                  <span className="text-xs font-medium" style={{ color: "#8B8B80" }}>Logo — Light Background</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(139, 139, 128, 0.1)", color: "#8B8B80" }}>Alternate</span>
                </div>
                <div className="flex items-center justify-center p-12" style={{ backgroundColor: "#F5F5F0" }}>
                  <img src="/brand/joshuaOSlogo-black.png" alt="JoshOS Logo (Black)" className="w-40 h-40 object-contain" />
                </div>
                <div className="p-3 border-t text-[11px]" style={{ borderColor: "#2A2A38", backgroundColor: "#13131B", color: "#8B8B80" }}>
                  364×364 PNG · Black on light · <code className="px-1 py-0.5 rounded" style={{ backgroundColor: "#1A1A24" }}>/brand/joshuaOSlogo-black.png</code>
                </div>
              </div>

              {/* Favicon / Tab Icon */}
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#2A2A38" }}>
                <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: "#2A2A38", backgroundColor: "#13131B" }}>
                  <span className="text-xs font-medium" style={{ color: "#8B8B80" }}>Favicon — Browser Tab</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34, 211, 238, 0.1)", color: "#22D3EE" }}>Active</span>
                </div>
                <div className="flex items-center justify-center gap-8 p-8" style={{ backgroundColor: "#0B0B11" }}>
                  <div className="text-center">
                    <img src="/favicon/favicon-96x96.png" alt="Favicon 96px" className="w-12 h-12 object-contain mx-auto mb-2" />
                    <span className="text-[10px]" style={{ color: "#8B8B80" }}>96×96</span>
                  </div>
                  <div className="text-center">
                    <img src="/favicon/web-app-manifest-192x192.png" alt="Favicon 192px" className="w-16 h-16 object-contain mx-auto mb-2" />
                    <span className="text-[10px]" style={{ color: "#8B8B80" }}>192×192</span>
                  </div>
                  <div className="text-center">
                    <img src="/favicon/apple-touch-icon.png" alt="Apple Touch Icon" className="w-16 h-16 object-contain mx-auto mb-2 rounded-xl" />
                    <span className="text-[10px]" style={{ color: "#8B8B80" }}>Apple Touch</span>
                  </div>
                </div>
                <div className="p-3 border-t text-[11px]" style={{ borderColor: "#2A2A38", backgroundColor: "#13131B", color: "#8B8B80" }}>
                  ICO + SVG + PNG · Applied to Chrome tab bar · <code className="px-1 py-0.5 rounded" style={{ backgroundColor: "#1A1A24" }}>/favicon/</code>
                </div>
              </div>

              {/* Usage Guidelines */}
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#2A2A38" }}>
                <div className="p-3 border-b" style={{ borderColor: "#2A2A38", backgroundColor: "#13131B" }}>
                  <span className="text-xs font-medium" style={{ color: "#8B8B80" }}>Usage Guidelines</span>
                </div>
                <div className="p-6 space-y-3" style={{ backgroundColor: "#13131B" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#22C55E" }} />
                    <p className="text-sm" style={{ color: "#B8B8AD" }}>Use <strong style={{ color: "#F5F5F0" }}>white logo</strong> on dark backgrounds (#0B0B11, #13131B)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#22C55E" }} />
                    <p className="text-sm" style={{ color: "#B8B8AD" }}>Use <strong style={{ color: "#F5F5F0" }}>black logo</strong> on light backgrounds (#F5F5F0, white)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#D4A020" }} />
                    <p className="text-sm" style={{ color: "#B8B8AD" }}>Minimum clear space: <strong style={{ color: "#F5F5F0" }}>1× logo width</strong> on all sides</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#EF4444" }} />
                    <p className="text-sm" style={{ color: "#B8B8AD" }}>Never stretch, rotate, add effects, or change colors</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#D4A020" }} />
                    <p className="text-sm" style={{ color: "#B8B8AD" }}>The &ldquo;J&rdquo; orbital ring is the <strong style={{ color: "#F5F5F0" }}>core brand mark</strong> — use standalone when space is limited</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <SectionHeader icon={Layers} title="Product Ecosystem" subtitle="Unified brand across 4 products" />
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
        </>
      )}

      {/* ── ANIMATION TAB ──────────────────────────────────────── */}
      {activeTab === "animation" && (
        <>
          <Section>
            <SectionHeader icon={Sparkles} title="Motion with Purpose" subtitle="Every animation earns its place" />
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
          </Section>

          {/* Live animation demos */}
          <Section>
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
          </Section>
        </>
      )}

      {activeTab === "dataviz" && (
        <>
          {/* Philosophy */}
          <Section>
            <SectionHeader icon={BarChart3} title="Data Visualization" subtitle="Charts are data-first — visual clarity over decoration" />
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#B8B8AD" }}>
              Every chart uses the same grid, axis, and color language across the entire platform. Consistency builds trust in the data.
            </p>
          </Section>

          {/* Canvas / Grid Tokens */}
          <Section>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
              Canvas &amp; Grid Tokens
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Chart Background", hex: "#0B0B11", token: "obsidian", desc: "Same as page — charts feel embedded" },
                { label: "Grid Lines", hex: "#1A1A24", token: "surface-warm", desc: "Subtle, never competes with data" },
                { label: "Axis Lines", hex: "#2A2A38", token: "border-warm", desc: "Structural frame for the chart" },
                { label: "Axis Labels", hex: "#8B8B80", token: "smoke", desc: "Muted so data dominates" },
                { label: "Tooltip Background", hex: "#13131B", token: "carbon", desc: "Dark tooltip, warm border" },
                { label: "Reference Line", hex: "#343444", token: "border-strong", desc: "Dashed 4 4 for baselines" },
              ].map((item) => (
                <div key={item.token} className="p-3 rounded-lg border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: item.hex, borderColor: "#2A2A38" }} />
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "#F5F5F0" }}>{item.label}</div>
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-mono" style={{ color: "#D4A020" }}>{item.hex}</code>
                        <CopyButton text={item.hex} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px]" style={{ color: "#8B8B80" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Line Chart Spec */}
          <Section>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
              📈 Line Charts
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Live demo */}
              <div className="p-4 rounded-xl border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                <div className="text-xs font-medium mb-3" style={{ color: "#B8B8AD" }}>Live Preview</div>
                <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet">
                  {/* Grid */}
                  {[0, 30, 60, 90, 120].map((y) => (
                    <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#1A1A24" strokeWidth="1" />
                  ))}
                  {/* Primary line — Forge Gold */}
                  <path d="M 0 90 C 50 85, 80 70, 120 55 S 200 30, 260 35 S 340 25, 400 20" stroke="#D4A020" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M 0 90 C 50 85, 80 70, 120 55 S 200 30, 260 35 S 340 25, 400 20 L 400 120 L 0 120 Z" fill="url(#brandGoldGrad)" />
                  {/* Secondary line — Deep Indigo */}
                  <path d="M 0 80 C 60 78, 100 75, 160 65 S 240 55, 300 50 S 360 45, 400 40" stroke="#4F46E5" strokeWidth="2" fill="none" strokeLinecap="round" />
                  {/* Tertiary line — Signal Cyan */}
                  <path d="M 0 100 C 70 95, 140 90, 200 85 S 280 70, 340 65 S 380 60, 400 55" stroke="#22D3EE" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="4 3" />
                  <defs>
                    <linearGradient id="brandGoldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4A020" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#D4A020" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 rounded" style={{ backgroundColor: "#D4A020" }} /><span className="text-[10px]" style={{ color: "#B8B8AD" }}>Primary</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 rounded" style={{ backgroundColor: "#4F46E5" }} /><span className="text-[10px]" style={{ color: "#B8B8AD" }}>Secondary</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 rounded" style={{ backgroundColor: "#22D3EE", borderTop: "1px dashed" }} /><span className="text-[10px]" style={{ color: "#B8B8AD" }}>Tertiary</span></div>
                </div>
              </div>
              {/* Spec table */}
              <div className="space-y-2">
                {[
                  { prop: "Primary Line", value: "#D4A020", note: "Forge Gold — main metric" },
                  { prop: "Secondary Line", value: "#4F46E5", note: "Deep Indigo — comparison" },
                  { prop: "Tertiary Line", value: "#22D3EE", note: "Signal Cyan — overlay" },
                  { prop: "Stroke Width", value: "2px", note: "Consistent across all lines" },
                  { prop: "Curve", value: "monotoneX", note: "Smooth but faithful to data" },
                  { prop: "Dots", value: "none", note: "Only on hover/active states" },
                  { prop: "Area Fill", value: "20% → 0%", note: "Gradient of line color, top to bottom" },
                ].map((row) => (
                  <div key={row.prop} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: "rgba(19, 19, 27, 0.5)" }}>
                    <span className="text-xs font-medium w-28 shrink-0" style={{ color: "#F5F5F0" }}>{row.prop}</span>
                    <code className="text-xs font-mono w-24 shrink-0" style={{ color: "#D4A020" }}>{row.value}</code>
                    <span className="text-[11px]" style={{ color: "#8B8B80" }}>{row.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Bar Chart Spec */}
          <Section>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
              📊 Bar Charts
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                <div className="text-xs font-medium mb-3" style={{ color: "#B8B8AD" }}>Live Preview</div>
                <svg width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="xMidYMid meet">
                  {[0, 50, 100].map((y) => (
                    <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#1A1A24" strokeWidth="1" />
                  ))}
                  <rect x="10" y="30" width="35" height="70" rx="4" fill="#D4A020" opacity="0.85" />
                  <rect x="55" y="45" width="35" height="55" rx="4" fill="#D4A020" opacity="0.85" />
                  <rect x="100" y="15" width="35" height="85" rx="4" fill="#10B981" opacity="0.85" />
                  <rect x="145" y="50" width="35" height="50" rx="4" fill="#4F46E5" opacity="0.85" />
                  <rect x="190" y="60" width="35" height="40" rx="4" fill="#EF4444" opacity="0.85" />
                  <rect x="235" y="25" width="35" height="75" rx="4" fill="#D4A020" opacity="0.85" />
                  {/* Threshold line */}
                  <line x1="0" y1="40" x2="300" y2="40" stroke="#D4A020" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
                </svg>
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#D4A020" }} /><span className="text-[10px]" style={{ color: "#B8B8AD" }}>Primary</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#10B981" }} /><span className="text-[10px]" style={{ color: "#B8B8AD" }}>Positive</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#EF4444" }} /><span className="text-[10px]" style={{ color: "#B8B8AD" }}>Negative</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#4F46E5" }} /><span className="text-[10px]" style={{ color: "#B8B8AD" }}>Secondary</span></div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { prop: "Primary Fill", value: "#D4A020", note: "Forge Gold" },
                  { prop: "Secondary Fill", value: "#4F46E5", note: "Deep Indigo" },
                  { prop: "Positive", value: "#10B981", note: "Emerald — gains" },
                  { prop: "Negative", value: "#EF4444", note: "Red — losses" },
                  { prop: "Border Radius", value: "4px", note: "Slightly rounded top corners" },
                  { prop: "Opacity", value: "0.85", note: "Slight transparency, 1.0 on hover" },
                  { prop: "Threshold", value: "#D4A020 6 4", note: "Forge Gold dashed for thresholds" },
                ].map((row) => (
                  <div key={row.prop} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: "rgba(19, 19, 27, 0.5)" }}>
                    <span className="text-xs font-medium w-28 shrink-0" style={{ color: "#F5F5F0" }}>{row.prop}</span>
                    <code className="text-xs font-mono w-24 shrink-0" style={{ color: "#D4A020" }}>{row.value}</code>
                    <span className="text-[11px]" style={{ color: "#8B8B80" }}>{row.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Candlestick */}
          <Section>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
              🕯️ Candlestick Charts
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                <div className="text-xs font-medium mb-3" style={{ color: "#B8B8AD" }}>Live Preview</div>
                <svg width="100%" height="100" viewBox="0 0 280 100" preserveAspectRatio="xMidYMid meet">
                  {[0, 50, 100].map((y) => (
                    <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="#1A1A24" strokeWidth="1" />
                  ))}
                  {/* Green candles */}
                  <line x1="25" y1="10" x2="25" y2="80" stroke="#10B981" strokeWidth="1" />
                  <rect x="18" y="30" width="14" height="35" fill="#10B981" opacity="0.9" />
                  <line x1="65" y1="15" x2="65" y2="70" stroke="#10B981" strokeWidth="1" />
                  <rect x="58" y="25" width="14" height="30" fill="#10B981" opacity="0.9" />
                  <line x1="145" y1="20" x2="145" y2="85" stroke="#10B981" strokeWidth="1" />
                  <rect x="138" y="35" width="14" height="30" fill="#10B981" opacity="0.9" />
                  <line x1="225" y1="5" x2="225" y2="60" stroke="#10B981" strokeWidth="1" />
                  <rect x="218" y="15" width="14" height="30" fill="#10B981" opacity="0.9" />
                  {/* Red candles */}
                  <line x1="105" y1="25" x2="105" y2="90" stroke="#EF4444" strokeWidth="1" />
                  <rect x="98" y="35" width="14" height="40" fill="#EF4444" opacity="0.9" />
                  <line x1="185" y1="30" x2="185" y2="95" stroke="#EF4444" strokeWidth="1" />
                  <rect x="178" y="40" width="14" height="35" fill="#EF4444" opacity="0.9" />
                  <line x1="265" y1="15" x2="265" y2="75" stroke="#EF4444" strokeWidth="1" />
                  <rect x="258" y="25" width="14" height="35" fill="#EF4444" opacity="0.9" />
                </svg>
              </div>
              <div className="space-y-2">
                {[
                  { prop: "Bullish (Up)", value: "#10B981", note: "Emerald — body, border, and wick" },
                  { prop: "Bearish (Down)", value: "#EF4444", note: "Red — body, border, and wick" },
                  { prop: "Body Opacity", value: "0.9", note: "Slight transparency for layered feel" },
                  { prop: "Wick Width", value: "1px", note: "Always 1px, same color as body" },
                ].map((row) => (
                  <div key={row.prop} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: "rgba(19, 19, 27, 0.5)" }}>
                    <span className="text-xs font-medium w-28 shrink-0" style={{ color: "#F5F5F0" }}>{row.prop}</span>
                    <code className="text-xs font-mono w-24 shrink-0" style={{ color: "#D4A020" }}>{row.value}</code>
                    <span className="text-[11px]" style={{ color: "#8B8B80" }}>{row.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Multi-Series Palette */}
          <Section>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
              🎨 Multi-Series Palette
            </h3>
            <p className="text-xs mb-4" style={{ color: "#8B8B80" }}>
              When a chart has multiple series (e.g., 8 strategies), use this ordered palette. Designed for maximum distinguishability on dark backgrounds.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "Forge Gold", hex: "#D4A020", usage: "Primary / Series 1" },
                { name: "Deep Indigo", hex: "#4F46E5", usage: "Series 2" },
                { name: "Emerald", hex: "#10B981", usage: "Series 3 / Positive" },
                { name: "Signal Cyan", hex: "#22D3EE", usage: "Series 4" },
                { name: "Amber", hex: "#F59E0B", usage: "Series 5" },
                { name: "Violet", hex: "#8B5CF6", usage: "Series 6" },
                { name: "Rose", hex: "#F43F5E", usage: "Series 7" },
                { name: "Teal", hex: "#14B8A6", usage: "Series 8" },
              ].map((c, i) => (
                <div key={c.hex} className="p-3 rounded-lg border text-center" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="w-full h-8 rounded-md mb-2" style={{ backgroundColor: c.hex, opacity: 0.85 }} />
                  <div className="text-xs font-semibold" style={{ color: "#F5F5F0" }}>{c.name}</div>
                  <div className="flex items-center justify-center gap-1">
                    <code className="text-[10px] font-mono" style={{ color: "#D4A020" }}>{c.hex}</code>
                    <CopyButton text={c.hex} />
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#8B8B80" }}>#{i + 1} — {c.usage}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Moving Averages */}
          <Section>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#F5F5F0", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
              📉 Moving Average Colors
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "MA5 (Fast)", hex: "#D4A020" },
                { label: "MA20 (Medium)", hex: "#4F46E5" },
                { label: "MA50 (Slow)", hex: "#22D3EE" },
                { label: "MA100 (Very Slow)", hex: "#8B5CF6" },
              ].map((ma) => (
                <div key={ma.label} className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="w-10 h-1 rounded-full" style={{ backgroundColor: ma.hex }} />
                  <div>
                    <div className="text-xs font-medium" style={{ color: "#F5F5F0" }}>{ma.label}</div>
                    <div className="flex items-center gap-1">
                      <code className="text-[10px] font-mono" style={{ color: "#D4A020" }}>{ma.hex}</code>
                      <CopyButton text={ma.hex} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Don'ts */}
          <Section>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#EF4444", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
              🚫 Chart Don&apos;ts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Never use cold blue grids (#1e293b, #334155) — use warm #1A1A24",
                "Never use #94a3b8 (cold slate) for axis labels — use warm #8B8B80",
                "Never use different grid colors across charts — #1A1A24 everywhere",
                "Never mix Forge Gold with arbitrary yellows (#fbbf24) — use #D4A020",
                "Never use rainbow colors for sequential data — use the ordered palette",
                "Never show dots on line charts by default — only on hover/active",
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: "rgba(239, 68, 68, 0.05)" }}>
                  <span className="text-red-400 text-xs mt-0.5">✕</span>
                  <span className="text-xs" style={{ color: "#B8B8AD" }}>{rule}</span>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Footer */}
      <div className="text-center py-8 border-t mt-8" style={{ borderColor: "#2A2A38" }}>
        <p className="text-xs" style={{ color: "#626259" }}>
          &ldquo;The Forge&rdquo; Brand System v2.0 —{" "}
          <code style={{ color: "rgba(212, 160, 32, 0.6)" }}>mcporter call brand-guidelines.get_full_palette</code>
        </p>
        <p className="text-[10px] mt-1" style={{ color: "#626259" }}>
          Geometric precision meets warm humanity. Inspired by legendary design systems.
        </p>
      </div>
    </div>
  );
}