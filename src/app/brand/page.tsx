"use client";

/* ─────────────────────────────────────────────────────────────────
 *  Josh Levy Labs — Brand Guidelines
 *  Visual reference for every design token served by the Brand MCP.
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
} from "lucide-react";

// ── Brand data (mirrored from MCP brand-data.js) ─────────────────

interface ProductInfo {
  name: string;
  stack: string;
  font: string;
  fontMigrationTarget?: string;
  accentFamily: string;
  accentMigrationTarget?: string;
  layout: string;
  status: string;
  notes: string;
}

const PRODUCTS: Record<string, ProductInfo> = {
  hub: {
    name: "Clawdbot Hub",
    stack: "Next.js + Tailwind CSS",
    font: "Montserrat",
    fontMigrationTarget: "Inter",
    accentFamily: "teal",
    accentMigrationTarget: "amber",
    layout: "sidebar",
    status: "migrating",
    notes:
      "Currently uses Slate backgrounds + Teal accent. Migration target: Zinc backgrounds + Amber accent.",
  },
  web: {
    name: "joshlevylabs.com",
    stack: "Next.js + Tailwind CSS",
    font: "Inter",
    accentFamily: "amber",
    layout: "sticky-top-nav",
    status: "aligned",
    notes: "Reference implementation. Already uses Inter + Amber + Zinc.",
  },
  mobile: {
    name: "Lever Mobile",
    stack: "Expo + NativeWind",
    font: "System Default",
    accentFamily: "amber",
    layout: "bottom-tab-nav",
    status: "aligned",
    notes: "Already uses Zinc + Amber. Tokens in constants/theme.ts.",
  },
};

const COLOR_GROUPS = {
  backgrounds: {
    label: "Backgrounds",
    colors: [
      { token: "background", hex: "#09090b", usage: "Primary background (deepest)" },
      { token: "surface", hex: "#111114", usage: "Elevated surfaces (cards, tab bars)" },
      { token: "surface-light", hex: "#18181b", usage: "Secondary cards, inputs" },
      { token: "surface-hover", hex: "#1f1f23", usage: "Hover/pressed states" },
      { token: "border", hex: "#27272a", usage: "Dividers, card borders" },
      { token: "border-light", hex: "#3f3f46", usage: "Stronger dividers" },
    ],
  },
  accent: {
    label: "Accent (Amber)",
    colors: [
      { token: "accent-primary", hex: "#f59e0b", tailwind: "amber-500", usage: "Primary CTAs, active states" },
      { token: "accent-light", hex: "#fbbf24", tailwind: "amber-400", usage: "Premium highlights, hover" },
      { token: "accent-dark", hex: "#d97706", tailwind: "amber-600", usage: "Borders on accent elements" },
      { token: "accent-muted", hex: "#78350f", tailwind: "amber-900", usage: "Subtle accent backgrounds" },
    ],
  },
  glow: {
    label: "Glow (Orange)",
    colors: [
      { token: "glow-400", hex: "#fb923c", usage: "Secondary highlights" },
      { token: "glow-500", hex: "#f97316", usage: "Gradients, border glows" },
      { token: "glow-600", hex: "#ea580c", usage: "Deep glow effects" },
    ],
  },
  cyber: {
    label: "Cyber (Cyan)",
    colors: [
      { token: "cyber-400", hex: "#22d3ee", usage: "Tech-feel accents" },
      { token: "cyber-500", hex: "#06b6d4", usage: "Info states, links" },
    ],
  },
  text: {
    label: "Text",
    colors: [
      { token: "text-primary", hex: "#fafafa", usage: "Primary text" },
      { token: "text-secondary", hex: "#a1a1aa", usage: "Secondary info" },
      { token: "text-muted", hex: "#71717a", usage: "Hints, disabled" },
      { token: "text-faint", hex: "#52525b", usage: "Disclaimers, timestamps" },
      { token: "text-inverse", hex: "#09090b", usage: "Text on accent backgrounds" },
    ],
  },
  status: {
    label: "Status / Semantic",
    colors: [
      { token: "success", hex: "#22c55e", usage: "Positive, buy signals" },
      { token: "warning", hex: "#f59e0b", usage: "Warnings" },
      { token: "error", hex: "#ef4444", usage: "Errors, sell signals" },
      { token: "info", hex: "#3b82f6", usage: "Informational" },
    ],
  },
  chart: {
    label: "Chart Palette",
    colors: [
      { token: "chart-1", hex: "#f59e0b", usage: "Primary series" },
      { token: "chart-2", hex: "#22c55e", usage: "Positive / secondary" },
      { token: "chart-3", hex: "#3b82f6", usage: "Tertiary" },
      { token: "chart-4", hex: "#ef4444", usage: "Negative / alerts" },
      { token: "chart-5", hex: "#06b6d4", usage: "Quaternary" },
      { token: "chart-6", hex: "#a855f7", usage: "Fifth series" },
    ],
  },
  signalFlow: {
    label: "Signal Flow Tiers",
    colors: [
      { token: "tier-3plus", hex: "#34d399", usage: "≥3/8 — High consensus" },
      { token: "tier-2", hex: "#60a5fa", usage: "2/8 — Medium consensus" },
      { token: "tier-1", hex: "#cbd5e1", usage: "1/8 — Low consensus" },
    ],
  },
};

const TYPOGRAPHY = {
  families: {
    unified: "Inter",
    mono: "JetBrains Mono",
  },
  weights: [
    { name: "Normal", value: 400, usage: "Body text" },
    { name: "Medium", value: 500, usage: "Emphasized body, labels" },
    { name: "Semibold", value: 600, usage: "Subheadings, buttons" },
    { name: "Bold", value: 700, usage: "Headings, key metrics" },
    { name: "Extrabold", value: 800, usage: "Hero text, large numbers" },
  ],
  scale: [
    { token: "xs", px: 12, usage: "Fine print, timestamps" },
    { token: "sm", px: 14, usage: "Secondary text, labels" },
    { token: "md", px: 16, usage: "Body text (base)" },
    { token: "lg", px: 18, usage: "Emphasized body" },
    { token: "xl", px: 20, usage: "Subheadings" },
    { token: "2xl", px: 24, usage: "Section headings" },
    { token: "3xl", px: 32, usage: "Page headings" },
    { token: "4xl", px: 40, usage: "Hero headings" },
  ],
};

const SPACING = [
  { token: "xxs", value: 2, usage: "Hairline gaps" },
  { token: "xs", value: 4, usage: "Tight — related inline" },
  { token: "sm", value: 8, usage: "Standard — row gaps" },
  { token: "md", value: 16, usage: "Comfortable — card padding" },
  { token: "lg", value: 24, usage: "Section gaps" },
  { token: "xl", value: 32, usage: "Section breaks" },
  { token: "2xl", value: 48, usage: "Hero sections" },
  { token: "3xl", value: 64, usage: "Splash / centering" },
];

const BORDER_RADII = [
  { token: "xs", value: 4, usage: "Progress bars, chart bars" },
  { token: "sm", value: 8, usage: "Badges, small chips" },
  { token: "md", value: 12, usage: "Buttons, inputs" },
  { token: "lg", value: 16, usage: "Primary cards, modals" },
  { token: "xl", value: 20, usage: "Bottom sheets" },
  { token: "full", value: 999, usage: "Pills, avatars" },
];

const SHADOWS = [
  { token: "card", css: "0 1px 3px rgba(0,0,0,0.3)", usage: "Default card" },
  { token: "card-hover", css: "0 4px 6px rgba(0,0,0,0.3)", usage: "Hovered cards" },
  { token: "elevated", css: "0 4px 8px rgba(0,0,0,0.3)", usage: "Modals, floating" },
  { token: "glow", css: "0 0 20px rgba(249,115,22,0.4)", usage: "Accent glow" },
  { token: "glow-sm", css: "0 0 10px rgba(249,115,22,0.3)", usage: "Subtle glow" },
  { token: "success-glow", css: "0 0 12px rgba(34,197,94,0.15)", usage: "Positive P&L" },
  { token: "danger-glow", css: "0 0 12px rgba(239,68,68,0.15)", usage: "Negative P&L" },
];

const BUTTON_VARIANTS = [
  { name: "Primary", bg: "#f59e0b", text: "#09090b", border: "none" },
  { name: "Secondary", bg: "transparent", text: "#f59e0b", border: "1px solid #f59e0b" },
  { name: "Ghost", bg: "transparent", text: "#a1a1aa", border: "none" },
  { name: "Destructive", bg: "#ef4444", text: "#ffffff", border: "none" },
  { name: "Tech", bg: "linear-gradient(to right, #d97706, #ea580c)", text: "#ffffff", border: "none" },
];

const ANIMATION_TIMING = [
  { name: "Micro", duration: "150ms", easing: "ease-out", usage: "Hover, focus" },
  { name: "Standard", duration: "300ms", easing: "ease-out", usage: "Transitions" },
  { name: "Emphasis", duration: "500ms", easing: "ease-in-out", usage: "Page transitions" },
  { name: "Dramatic", duration: "1000ms+", easing: "custom", usage: "Data flow, hero" },
];

const RULES = {
  personality: ["Precise", "Premium", "Builder-focused", "Warm tech", "Minimal but not sparse"],
  tagline: "Build what matters.",
  colorDonts: [
    "Don't use pure white (#ffffff) — use #fafafa",
    "Don't use pure black (#000000) — use #09090b",
    "Don't mix amber and teal as competing accents",
    "Don't use saturated colors for large surfaces",
  ],
  animationRules: [
    "Use animation to guide attention",
    "Respect prefers-reduced-motion",
    "Never animate just for decoration",
    "Avoid durations > 1s for interactive elements",
    "No blocking animation in mobile",
  ],
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
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
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
        <Icon className="w-6 h-6 text-amber-500" />
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-slate-400 ml-9">{subtitle}</p>}
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
  token,
  usage,
  tailwind,
}: {
  hex: string;
  token: string;
  usage: string;
  tailwind?: string;
}) {
  const isLight =
    hex.startsWith("#f") ||
    hex.startsWith("#e") ||
    hex.startsWith("#d") ||
    hex.startsWith("#c") ||
    hex.startsWith("#b") ||
    hex.startsWith("#a");

  return (
    <div className="group flex flex-col">
      <div
        className="w-full h-20 rounded-t-lg border border-zinc-800 flex items-end p-2 transition-all group-hover:scale-[1.02]"
        style={{ backgroundColor: hex }}
      >
        <span
          className={`text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity ${
            isLight ? "text-black/70" : "text-white/70"
          }`}
        >
          {hex}
        </span>
      </div>
      <div className="bg-zinc-900 border border-t-0 border-zinc-800 rounded-b-lg p-3 flex-1">
        <div className="flex items-center justify-between gap-1">
          <code className="text-xs font-mono text-amber-400">{token}</code>
          <CopyButton text={hex} />
        </div>
        <p className="text-[11px] text-slate-500 mt-1 leading-tight">{usage}</p>
        {tailwind && (
          <span className="text-[10px] text-slate-600 font-mono">{tailwind}</span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function BrandGuidelinesPage() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Brand Guidelines</h1>
            <p className="text-sm text-slate-400">
              Josh Levy Labs — Unified Design System
            </p>
          </div>
        </div>
        <p className="text-slate-500 text-sm mt-3 max-w-2xl">
          Single source of truth for all design tokens across the Hub, joshlevylabs.com,
          and Lever mobile. Served programmatically via the{" "}
          <code className="text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded text-xs">
            brand-guidelines
          </code>{" "}
          MCP server.
        </p>

        {/* Brand essence */}
        <div className="mt-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-amber-200/90 text-sm italic">
            &ldquo;{RULES.tagline}&rdquo;
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {RULES.personality.map((trait) => (
              <span
                key={trait}
                className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── COLORS ─────────────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("colors")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.colors ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
          <Palette className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-white">Colors</h2>
          <span className="text-xs text-slate-500 ml-2">
            {Object.values(COLOR_GROUPS).reduce((sum, g) => sum + g.colors.length, 0)} tokens
          </span>
        </button>

        {expandedSections.colors &&
          Object.entries(COLOR_GROUPS).map(([key, group]) => (
            <div key={key} className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {group.label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {group.colors.map((c) => (
                  <ColorSwatch key={c.token} {...c} />
                ))}
              </div>
            </div>
          ))}
      </Section>

      {/* ── TYPOGRAPHY ─────────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("typography")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.typography ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
          <Type className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-white">Typography</h2>
        </button>

        {expandedSections.typography && (
          <>
            {/* Font families */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Font Families</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                  <p className="text-xs text-slate-500 mb-2">Primary (Unified Target)</p>
                  <p className="text-2xl text-white" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
                    Inter — Aa Bb Cc 123
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                  <p className="text-xs text-slate-500 mb-2">Monospace</p>
                  <p className="text-2xl text-white font-mono">
                    JetBrains Mono — 0Oo 1Il
                  </p>
                </div>
              </div>
            </div>

            {/* Type scale */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Type Scale</h3>
              <div className="space-y-2">
                {TYPOGRAPHY.scale.map((s) => (
                  <div
                    key={s.token}
                    className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                  >
                    <code className="text-xs font-mono text-amber-400 w-10 shrink-0">
                      {s.token}
                    </code>
                    <span
                      className="text-white flex-1 truncate"
                      style={{ fontSize: `${s.px}px`, lineHeight: 1.4 }}
                    >
                      The quick brown fox — {s.px}px
                    </span>
                    <span className="text-xs text-slate-500 shrink-0 hidden sm:block">
                      {s.usage}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weights */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Font Weights</h3>
              <div className="space-y-2">
                {TYPOGRAPHY.weights.map((w) => (
                  <div
                    key={w.value}
                    className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                  >
                    <code className="text-xs font-mono text-amber-400 w-10 shrink-0">
                      {w.value}
                    </code>
                    <span
                      className="text-white text-lg flex-1"
                      style={{ fontWeight: w.value }}
                    >
                      {w.name} — Build what matters.
                    </span>
                    <span className="text-xs text-slate-500 shrink-0 hidden sm:block">
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
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
          <Ruler className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-white">Spacing & Layout</h2>
        </button>

        {expandedSections.spacing && (
          <>
            {/* Spacing scale */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                Spacing Scale (8px base grid)
              </h3>
              <div className="space-y-2">
                {SPACING.map((s) => (
                  <div
                    key={s.token}
                    className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800/50"
                  >
                    <code className="text-xs font-mono text-amber-400 w-10 shrink-0">
                      {s.token}
                    </code>
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="h-4 rounded-sm bg-amber-500/40 border border-amber-500/60 transition-all"
                        style={{ width: `${Math.min(s.value * 2, 280)}px` }}
                      />
                      <span className="text-xs text-slate-400">{s.value}px</span>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0 hidden sm:block">
                      {s.usage}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Border radius */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Border Radius</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {BORDER_RADII.map((r) => (
                  <div key={r.token} className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 h-16 bg-amber-500/20 border-2 border-amber-500/50"
                      style={{ borderRadius: `${Math.min(r.value, 32)}px` }}
                    />
                    <code className="text-xs font-mono text-amber-400">{r.token}</code>
                    <span className="text-[10px] text-slate-500">{r.value}px</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shadows */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Shadows</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {SHADOWS.map((s) => (
                  <div key={s.token} className="flex flex-col items-center gap-2 p-4">
                    <div
                      className="w-24 h-16 rounded-lg bg-zinc-800 border border-zinc-700"
                      style={{ boxShadow: s.css }}
                    />
                    <code className="text-xs font-mono text-amber-400">{s.token}</code>
                    <span className="text-[10px] text-slate-500 text-center">{s.usage}</span>
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
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
          <Component className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-white">Components</h2>
        </button>

        {expandedSections.components && (
          <>
            {/* Buttons */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Buttons</h3>
              <div className="flex flex-wrap gap-4 items-center p-6 rounded-xl border border-zinc-800 bg-zinc-900">
                {BUTTON_VARIANTS.map((btn) => (
                  <button
                    key={btn.name}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background: btn.bg,
                      color: btn.text,
                      border: btn.border,
                    }}
                  >
                    {btn.name}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["sm", "md", "lg"].map((size, i) => {
                  const heights = { sm: 32, md: 40, lg: 48 };
                  const fonts = { sm: 12, md: 14, lg: 16 };
                  return (
                    <div key={size} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/50">
                      <code className="text-xs font-mono text-amber-400">{size}</code>
                      <button
                        className="px-4 rounded-xl font-semibold bg-amber-500 text-zinc-950"
                        style={{
                          height: `${heights[size as keyof typeof heights]}px`,
                          fontSize: `${fonts[size as keyof typeof fonts]}px`,
                        }}
                      >
                        Button {size}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Card</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-zinc-800 bg-[#111114] hover:border-zinc-700 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Card Title</h4>
                    <span className="text-xs text-slate-500">⋮</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Standard card with 16px padding, surface background, zinc-800 border, 16px radius.
                  </p>
                  <div className="mt-3 pt-3 border-t border-zinc-800 flex gap-2">
                    <span className="text-xs text-slate-500">bg: #111114</span>
                    <span className="text-xs text-slate-500">border: #27272a</span>
                    <span className="text-xs text-slate-500">radius: 16px</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-amber-500/20 bg-[#111114] hover:border-amber-500/40 transition-all"
                  style={{ boxShadow: "0 0 20px rgba(249,115,22,0.1)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-amber-400">Accent Card</h4>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-slate-400">
                    Premium card variant with amber border and glow shadow.
                  </p>
                  <div className="mt-3 pt-3 border-t border-amber-500/10 flex gap-2">
                    <span className="text-xs text-amber-500/60">glow shadow</span>
                    <span className="text-xs text-amber-500/60">amber border</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Inputs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Default input"
                    className="w-full h-10 px-3 rounded-xl bg-[#18181b] border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Focused state (click me)"
                    className="w-full h-10 px-3 rounded-xl bg-[#18181b] border border-amber-500 text-sm text-white placeholder:text-zinc-500 ring-2 ring-amber-500/20"
                    readOnly
                  />
                </div>
                <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/50">
                  <p className="text-xs text-slate-500 space-y-1">
                    <span className="block">Background: #18181b (surface-light)</span>
                    <span className="block">Border: #27272a (border)</span>
                    <span className="block">Focus border: #f59e0b (accent-primary)</span>
                    <span className="block">Focus ring: rgba(245, 158, 11, 0.2)</span>
                    <span className="block">Height: 40px / Radius: 12px</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation colors */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Navigation States</h3>
              <div className="flex items-center gap-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  <span className="text-sm text-amber-500 font-medium">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-400">Hover</span>
                </div>
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm text-zinc-500">Inactive</span>
                </div>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ── ANIMATION ──────────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("animation")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.animation ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
          <Sparkles className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-white">Animation & Motion</h2>
        </button>

        {expandedSections.animation && (
          <>
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Timing</h3>
              <div className="space-y-2">
                {ANIMATION_TIMING.map((a) => (
                  <div
                    key={a.name}
                    className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800/50"
                  >
                    <code className="text-xs font-mono text-amber-400 w-20 shrink-0">
                      {a.name}
                    </code>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-sm text-white">{a.duration}</span>
                      <span className="text-xs text-slate-500">{a.easing}</span>
                    </div>
                    <span className="text-xs text-slate-500 hidden sm:block">{a.usage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live animation demos */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Live Demos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                  <div
                    className="w-12 h-12 rounded-xl bg-amber-500"
                    style={{
                      animation: "pulse 2s ease-in-out infinite alternate",
                      boxShadow: "0 0 20px rgba(249,115,22,0.4)",
                    }}
                  />
                  <span className="text-xs text-slate-500">Glow Pulse</span>
                </div>
                <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                  <div
                    className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40"
                    style={{
                      animation: "bounce 2s ease-in-out infinite",
                    }}
                  />
                  <span className="text-xs text-slate-500">Float</span>
                </div>
                <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                  <svg width="120" height="12" className="overflow-visible">
                    <line
                      x1="0" y1="6" x2="120" y2="6"
                      stroke="#f59e0b"
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
                  <span className="text-xs text-slate-500">Data Flow</span>
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
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
          <Layers className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-white">Products</h2>
        </button>

        {expandedSections.products && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(PRODUCTS).map(([key, prod]) => (
              <div
                key={key}
                className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      prod.status === "aligned" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <h4 className="text-sm font-semibold text-white">{prod.name}</h4>
                </div>
                <div className="space-y-1.5 text-xs text-slate-400">
                  <p>
                    <span className="text-slate-500">Stack:</span> {prod.stack}
                  </p>
                  <p>
                    <span className="text-slate-500">Font:</span> {prod.font}
                    {prod.fontMigrationTarget && (
                      <span className="text-amber-500/70"> → {prod.fontMigrationTarget}</span>
                    )}
                  </p>
                  <p>
                    <span className="text-slate-500">Accent:</span> {prod.accentFamily}
                    {prod.accentMigrationTarget && (
                      <span className="text-amber-500/70"> → {prod.accentMigrationTarget}</span>
                    )}
                  </p>
                  <p>
                    <span className="text-slate-500">Layout:</span> {prod.layout}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 leading-relaxed border-t border-zinc-800 pt-3">
                  {prod.notes}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── RULES ──────────────────────────────────────────────── */}
      <Section>
        <button
          onClick={() => toggleSection("rules")}
          className="flex items-center gap-2 w-full text-left mb-6"
        >
          {expandedSections.rules ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
          <Info className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-white">Rules & Don&apos;ts</h2>
        </button>

        {expandedSections.rules && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <h3 className="text-sm font-semibold text-red-400 mb-3">Color Don&apos;ts</h3>
              <ul className="space-y-2">
                {RULES.colorDonts.map((rule, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-red-500 shrink-0">✕</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3">Animation Rules</h3>
              <ul className="space-y-2">
                {RULES.animationRules.map((rule, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-emerald-500 shrink-0">✓</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Section>

      {/* Footer */}
      <div className="text-center py-8 border-t border-zinc-800">
        <p className="text-xs text-slate-600">
          MCP Server:{" "}
          <code className="text-amber-500/60">mcporter call brand-guidelines.get_full_palette</code>
        </p>
      </div>
    </div>
  );
}
