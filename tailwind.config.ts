import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      colors: {
        // ── Warm backgrounds (remapped from cold slate) ──
        slate: {
          950: "#0B0B11",   // Obsidian — deepest background
          900: "#0B0B11",   // Obsidian — primary bg (was cold #0F172A)
          850: "#13131B",   // Carbon — elevated surfaces
          800: "#1A1A24",   // Surface Warm — secondary surfaces
          700: "#2A2A38",   // Border Warm — dividers, borders
          600: "#343444",   // Border Strong — stronger dividers
          500: "#626259",   // Smoke Dark — faint text
          400: "#8B8B80",   // Smoke — muted text
          300: "#B8B8AD",   // Smoke Light — secondary text
          200: "#F5F5F0",   // Warm White — primary text
          100: "#F5F5F0",   // Warm White
        },
        // ── Primary → Forge Gold ──
        primary: {
          900: "#8B6914",   // Forge Ember
          800: "#B8860B",   // Forge Dark
          700: "#B8860B",   // Forge Dark
          600: "#D4A020",   // Forge Gold — primary CTAs
          500: "#D4A020",   // Forge Gold
          400: "#F4D03F",   // Forge Light — hover states
          300: "#F4D03F",   // Forge Light
          200: "rgba(212, 160, 32, 0.2)",  // Subtle bg
          100: "rgba(212, 160, 32, 0.1)",  // Very subtle
        },
        // ── Accent → Deep Indigo ──
        accent: {
          900: "#312E81",   // Indigo Muted
          800: "#3730A3",   // Indigo Dark
          700: "#4F46E5",   // Deep Indigo — secondary CTAs
          600: "#4F46E5",   // Deep Indigo
          500: "#6366F1",   // Indigo Light
          400: "#6366F1",   // Indigo Light
          300: "#818CF8",   // Indigo Bright
          200: "rgba(79, 70, 229, 0.2)",
          100: "rgba(79, 70, 229, 0.1)",
        },
        // ── Signal Cyan ──
        cyan: {
          700: "#0891B2",
          600: "#22D3EE",
          500: "#22D3EE",
          400: "#67E8F9",
        },
        // ── Forge brand tokens (direct access) ──
        forge: {
          light: "#F4D03F",
          gold: "#D4A020",
          dark: "#B8860B",
          ember: "#8B6914",
        },
        indigo: {
          light: "#6366F1",
          primary: "#4F46E5",
          dark: "#3730A3",
          muted: "#312E81",
        },
        // ── Named backgrounds ──
        obsidian: "#0B0B11",
        carbon: "#13131B",
        surface: "#1A1A24",
        elevated: "#21212E",
        // ── Status colors ──
        status: {
          success: "#10B981",   // Momentum Green
          warning: "#F59E0B",   // Caution Amber
          error: "#DC2626",     // Alert Crimson
          info: "#3B82F6",      // Info Blue
        },
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'forge-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(212, 160, 32, 0.2)' },
          '50%': { boxShadow: '0 0 24px rgba(212, 160, 32, 0.4)' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'forge-glow': 'forge-glow 2s ease-in-out infinite',
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4)",
        "card-hover": "0 4px 8px rgba(0,0,0,0.3)",
        elevated: "0 8px 16px rgba(0,0,0,0.25)",
        "forge-glow": "0 0 24px rgba(212, 160, 32, 0.3)",
        "indigo-glow": "0 0 16px rgba(79, 70, 229, 0.25)",
      },
      borderRadius: {
        'brand': '12px',
        'card': '16px',
      },
    },
  },
  plugins: [],
};
export default config;
