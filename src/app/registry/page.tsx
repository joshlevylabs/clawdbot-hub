"use client";

import { useState, useEffect, useRef } from "react";
import {
  Server,
  Globe,
  Bot,
  Wrench,
  Database,
  Plug,
  Search,
  ChevronRight,
  Copy,
  Check,
  Layers,
  Zap,
  Shield,
  FileCode,
  Terminal,
  Radio,
  Package,
  Monitor,
  Smartphone,
  DollarSign,
  ArrowDown,
  Filter,
  ChevronDown,
  X,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────

type ResourceStatus = "active" | "development" | "planned" | "deprecated";
type ProductId = "hub" | "lever" | "web" | "lyceum" | "frequency" | "all";
type TabId = "overview" | "mcps" | "apis" | "agents" | "tools" | "services" | "databases";

interface Resource {
  name: string;
  description: string;
  status: ResourceStatus;
  location: string;
  consumers: ProductId[];
  tags?: string[];
  details?: string;
  endpoint?: string;
  tools?: string[];
}

interface Agent {
  id: string;
  name: string;
  title: string;
  emoji: string;
  model: string;
  department: string;
  status: string;
  description: string;
  temperature: number;
  max_tokens: number;
  endpoint_enabled: boolean;
  updated_at: string;
}

interface AgentStats {
  totalAgents: number;
  totalConversations: number;
  totalMessages: number;
  totalMemories: number;
  perAgent: Record<string, {
    conversations: number;
    messages: number;
    memories: number;
    lastActivity: string | null;
  }>;
}

// ── Data ──────────────────────────────────────────────────────

const PRODUCTS: Record<ProductId, { name: string; color: string; short: string }> = {
  hub: { name: "JoshOS Hub", color: "#D4A020", short: "Hub" },
  lever: { name: "Lever", color: "#6366F1", short: "Lever" },
  web: { name: "joshlevylabs.com", color: "#22D3EE", short: "Web" },
  lyceum: { name: "The Lyceum", color: "#10B981", short: "Lyceum" },
  frequency: { name: "Builder's Frequency", color: "#F59E0B", short: "Freq" },
  all: { name: "All Products", color: "#8B8B80", short: "All" },
};

const TABS: { id: TabId; label: string; icon: React.ElementType; count: number; shortLabel?: string }[] = [
  { id: "overview", label: "Overview", icon: Layers, count: 0 },
  { id: "mcps", label: "MCP Servers", icon: Server, count: 1, shortLabel: "MCPs" },
  { id: "apis", label: "API Endpoints", icon: Globe, count: 53, shortLabel: "APIs" },
  { id: "agents", label: "AI Agents", icon: Bot, count: 30 },
  { id: "tools", label: "CLI Tools", icon: Wrench, count: 29, shortLabel: "Tools" },
  { id: "services", label: "External Services", icon: Plug, count: 8 },
  { id: "databases", label: "Databases", icon: Database, count: 2, shortLabel: "DBs" },
];

const MCP_SERVERS: Resource[] = [
  {
    name: "brand-guidelines",
    description: "Unified design tokens — colors, typography, spacing, components — queryable by any agent",
    status: "active",
    location: "~/clawd/mcp-servers/brand-guidelines/server.js",
    consumers: ["hub", "lever", "web", "lyceum", "frequency"],
    tags: ["design", "tokens", "brand"],
    tools: [
      "get_colors — Color palettes by category",
      "get_typography — Font families, weights, scale",
      "get_spacing — Spacing, radius, shadows",
      "get_component — Component specs (buttons, cards, inputs)",
      "get_product_info — Per-product design specs",
      "get_rules — Brand rules and anti-patterns",
      "get_tokens_css — CSS custom properties export",
      "get_tokens_tailwind — Tailwind config export",
      "lookup_color — Search colors by name/hex/usage",
      "get_full_palette — Complete color system dump",
    ],
    details: "Registered in mcporter config. Call via: mcporter call brand-guidelines.<tool> [args]",
  },
];

const API_GROUPS: { group: string; icon: React.ElementType; apis: Resource[] }[] = [
  {
    group: "Trading & Finance",
    icon: Zap,
    apis: [
      { name: "/api/real-time-trading", description: "Live trading signals, positions, and P&L data", status: "active", location: "src/app/api/real-time-trading/route.ts", consumers: ["hub", "lever"], tags: ["trading", "alpaca"] },
      { name: "/api/paper-trading", description: "Paper trading execution and simulation", status: "active", location: "src/app/api/paper-trading/route.ts", consumers: ["hub"], tags: ["trading", "alpaca"] },
      { name: "/api/signal-flow", description: "Signal pipeline flow data and per-symbol analysis", status: "active", location: "src/app/api/signal-flow/route.ts", consumers: ["hub"], tags: ["trading", "signals"] },
      { name: "/api/signal-flow/[symbol]", description: "Per-symbol signal flow breakdown", status: "active", location: "src/app/api/signal-flow/[symbol]/route.ts", consumers: ["hub"], tags: ["trading", "signals"] },
      { name: "/api/price-history", description: "Historical price data for charting", status: "active", location: "src/app/api/price-history/route.ts", consumers: ["hub", "lever"], tags: ["trading", "data"] },
      { name: "/api/markets", description: "Market overview and sector data", status: "active", location: "src/app/api/markets/route.ts", consumers: ["hub", "lever"], tags: ["trading", "markets"] },
      { name: "/api/alpaca-validation", description: "Validate Alpaca API credentials", status: "active", location: "src/app/api/alpaca-validation/route.ts", consumers: ["hub"], tags: ["trading", "auth"] },
    ],
  },
  {
    group: "Newsletter System",
    icon: FileCode,
    apis: [
      { name: "/api/newsletters", description: "CRUD for newsletter definitions", status: "active", location: "src/app/api/newsletters/route.ts", consumers: ["hub", "frequency"], tags: ["newsletter", "content"] },
      { name: "/api/newsletters/[id]", description: "Single newsletter operations", status: "active", location: "src/app/api/newsletters/[id]/route.ts", consumers: ["hub", "frequency"], tags: ["newsletter"] },
      { name: "/api/newsletters/[id]/issues", description: "Newsletter issue management", status: "active", location: "src/app/api/newsletters/[id]/issues/route.ts", consumers: ["hub", "frequency"], tags: ["newsletter", "issues"] },
      { name: "/api/newsletters/[id]/issues/[issueId]/generate", description: "AI-powered issue content generation", status: "active", location: "src/app/api/newsletters/[id]/issues/[issueId]/generate/route.ts", consumers: ["hub", "frequency"], tags: ["newsletter", "ai"] },
      { name: "/api/newsletters/[id]/issues/[issueId]/send", description: "Send newsletter issue to subscribers", status: "active", location: "src/app/api/newsletters/[id]/issues/[issueId]/send/route.ts", consumers: ["hub", "frequency"], tags: ["newsletter", "email"] },
      { name: "/api/newsletters/[id]/subscribers", description: "Subscriber list management", status: "active", location: "src/app/api/newsletters/[id]/subscribers/route.ts", consumers: ["hub", "frequency"], tags: ["newsletter", "subscribers"] },
      { name: "/api/newsletters/[id]/content-config", description: "Content block configuration", status: "active", location: "src/app/api/newsletters/[id]/content-config/route.ts", consumers: ["hub"], tags: ["newsletter", "config"] },
      { name: "/api/newsletters/contacts", description: "Global contact book management", status: "active", location: "src/app/api/newsletters/contacts/route.ts", consumers: ["hub", "frequency"], tags: ["newsletter", "contacts"] },
      { name: "/api/newsletters/contacts/import", description: "Bulk contact import (CSV)", status: "active", location: "src/app/api/newsletters/contacts/import/route.ts", consumers: ["hub"], tags: ["newsletter", "import"] },
      { name: "/api/newsletters/contacts/export", description: "Contact export (CSV)", status: "active", location: "src/app/api/newsletters/contacts/export/route.ts", consumers: ["hub"], tags: ["newsletter", "export"] },
      { name: "/api/newsletters/unsubscribe", description: "Public unsubscribe handler", status: "active", location: "src/app/api/newsletters/unsubscribe/route.ts", consumers: ["hub", "frequency", "web"], tags: ["newsletter", "public"] },
      { name: "/api/newsletters/stats", description: "Newsletter analytics and metrics", status: "active", location: "src/app/api/newsletters/stats/route.ts", consumers: ["hub"], tags: ["newsletter", "analytics"] },
      { name: "/api/newsletters/sources", description: "Content source management", status: "active", location: "src/app/api/newsletters/sources/route.ts", consumers: ["hub"], tags: ["newsletter", "content"] },
    ],
  },
  {
    group: "Agent System",
    icon: Bot,
    apis: [
      { name: "/api/agents", description: "Agent roster and configuration CRUD", status: "active", location: "src/app/api/agents/route.ts", consumers: ["hub"], tags: ["agents", "config"] },
      { name: "/api/agents/[name]", description: "Single agent profile and files", status: "active", location: "src/app/api/agents/[name]/route.ts", consumers: ["hub"], tags: ["agents"] },
      { name: "/api/agents/[name]/files/[filename]", description: "Agent file read/write (SOUL.md, MEMORY.md, etc.)", status: "active", location: "src/app/api/agents/[name]/files/[filename]/route.ts", consumers: ["hub"], tags: ["agents", "files"] },
      { name: "/api/agents/edit-chat", description: "In-Hub agent chat editing interface", status: "active", location: "src/app/api/agents/edit-chat/route.ts", consumers: ["hub"], tags: ["agents", "chat"] },
      { name: "/api/agents/migrate", description: "Agent config migration utilities", status: "active", location: "src/app/api/agents/migrate/route.ts", consumers: ["hub"], tags: ["agents", "migration"] },
    ],
  },
  {
    group: "Operations",
    icon: Terminal,
    apis: [
      { name: "/api/tasks", description: "Task board (Kanban) CRUD", status: "active", location: "src/app/api/tasks/route.ts", consumers: ["hub"], tags: ["tasks", "kanban"] },
      { name: "/api/task-notes", description: "Task notes and comments", status: "active", location: "src/app/api/task-notes/route.ts", consumers: ["hub"], tags: ["tasks", "notes"] },
      { name: "/api/priorities", description: "Joshua's daily priorities from morning brief", status: "active", location: "src/app/api/priorities/route.ts", consumers: ["hub", "lever"], tags: ["priorities", "brief"] },
      { name: "/api/initiatives", description: "Strategic initiatives tracking", status: "active", location: "src/app/api/initiatives/route.ts", consumers: ["hub"], tags: ["strategy"] },
      { name: "/api/verticals", description: "Business vertical definitions", status: "active", location: "src/app/api/verticals/route.ts", consumers: ["hub"], tags: ["strategy"] },
      { name: "/api/cron", description: "Cron job listing from Gateway", status: "active", location: "src/app/api/cron/route.ts", consumers: ["hub"], tags: ["cron", "gateway"] },
      { name: "/api/schedules", description: "Schedule management", status: "active", location: "src/app/api/schedules/route.ts", consumers: ["hub"], tags: ["schedules"] },
      { name: "/api/standup-schedules", description: "4x daily standup schedule config", status: "active", location: "src/app/api/standup-schedules/route.ts", consumers: ["hub"], tags: ["standups"] },
    ],
  },
  {
    group: "Content & Media",
    icon: Radio,
    apis: [
      { name: "/api/podcast", description: "Podcast episode management", status: "active", location: "src/app/api/podcast/route.ts", consumers: ["hub", "web", "frequency"], tags: ["podcast"] },
      { name: "/api/podcast/analytics", description: "Podcast analytics data", status: "active", location: "src/app/api/podcast/analytics/route.ts", consumers: ["hub"], tags: ["podcast", "analytics"] },
      { name: "/api/podcast/tts", description: "Text-to-speech for podcast generation", status: "active", location: "src/app/api/podcast/tts/route.ts", consumers: ["hub"], tags: ["podcast", "tts", "ai"] },
      { name: "/api/briefs/list", description: "Morning brief history", status: "active", location: "src/app/api/briefs/list/route.ts", consumers: ["hub"], tags: ["brief", "content"] },
      { name: "/api/weather", description: "Weather data for briefs and dashboard", status: "active", location: "src/app/api/weather/route.ts", consumers: ["hub", "lever"], tags: ["weather", "data"] },
    ],
  },
  {
    group: "Security & Auth",
    icon: Shield,
    apis: [
      { name: "/api/auth/login", description: "Password authentication", status: "active", location: "src/app/api/auth/login/route.ts", consumers: ["hub"], tags: ["auth"] },
      { name: "/api/auth/logout", description: "Session logout", status: "active", location: "src/app/api/auth/logout/route.ts", consumers: ["hub"], tags: ["auth"] },
      { name: "/api/vault", description: "Encrypted secret storage CRUD", status: "active", location: "src/app/api/vault/route.ts", consumers: ["hub"], tags: ["vault", "secrets"] },
      { name: "/api/vault/totp", description: "TOTP 2FA code generation", status: "active", location: "src/app/api/vault/totp/route.ts", consumers: ["hub"], tags: ["vault", "2fa"] },
      { name: "/api/vault/projects", description: "Vault project groupings", status: "active", location: "src/app/api/vault/projects/route.ts", consumers: ["hub"], tags: ["vault"] },
      { name: "/api/specs", description: "OpenAPI/spec introspection", status: "active", location: "src/app/api/specs/route.ts", consumers: ["hub"], tags: ["docs"] },
    ],
  },
  {
    group: "Faith & Family",
    icon: Zap,
    apis: [
      { name: "/api/faith/guide", description: "AI-powered faith guide responses", status: "active", location: "src/app/api/faith/guide/route.ts", consumers: ["hub", "lever"], tags: ["faith", "ai"] },
      { name: "/api/faith/guide/conversations", description: "Faith guide conversation history", status: "active", location: "src/app/api/faith/guide/conversations/route.ts", consumers: ["hub", "lever"], tags: ["faith", "history"] },
    ],
  },
];

// Removed hardcoded AGENT_CATEGORIES - now using live data from /api/agents

const CLI_TOOLS: Resource[] = [
  { name: "secrets.sh", description: "macOS Keychain secret retrieval for all services", status: "active", location: "~/clawd/tools/secrets.sh", consumers: ["all"], tags: ["secrets", "keychain"] },
  { name: "sync-org.py", description: "Pull agent configs from Supabase → local files", status: "active", location: "~/clawd/tools/sync-org.py", consumers: ["hub"], tags: ["agents", "sync"] },
  { name: "push-org.py", description: "Push local agent files → Supabase", status: "active", location: "~/clawd/tools/push-org.py", consumers: ["hub"], tags: ["agents", "sync"] },
  { name: "morning-brief-generator.sh", description: "Generate daily morning brief content", status: "active", location: "~/clawd/tools/morning-brief-generator.sh", consumers: ["hub", "lever"], tags: ["brief", "content"] },
  { name: "morning-brief-audio.sh", description: "TTS conversion for morning brief (ElevenLabs)", status: "active", location: "~/clawd/tools/morning-brief-audio.sh", consumers: ["hub"], tags: ["brief", "tts"] },
  { name: "morning-brief-emails.sh", description: "Email delivery for morning brief", status: "active", location: "~/clawd/tools/morning-brief-emails.sh", consumers: ["hub"], tags: ["brief", "email"] },
  { name: "standup/ (suite)", description: "4x daily standup orchestration — run-adhoc, interactive, post-dispatch", status: "active", location: "~/clawd/tools/standup/", consumers: ["hub"], tags: ["standups", "agents"] },
  { name: "fleet-tracker.sh", description: "Agent fleet status monitoring", status: "active", location: "~/clawd/tools/fleet-tracker.sh", consumers: ["hub"], tags: ["agents", "monitoring"] },
  { name: "sprint-monitor.sh", description: "Sub-agent sprint tracking and stall detection", status: "active", location: "~/clawd/tools/sprint-monitor.sh", consumers: ["hub"], tags: ["agents", "sprints"] },
  { name: "stall-detector.sh", description: "Detect stalled sub-agents and alert", status: "active", location: "~/clawd/tools/stall-detector.sh", consumers: ["hub"], tags: ["agents", "monitoring"] },
  { name: "paper-trader/", description: "Paper trading execution engine", status: "active", location: "~/clawd/tools/paper-trader/", consumers: ["hub"], tags: ["trading"] },
  { name: "cgs-trader/", description: "CGS trading strategy implementation", status: "active", location: "~/clawd/tools/cgs-trader/", consumers: ["hub"], tags: ["trading"] },
  { name: "generate-portfolio-chart.py", description: "Portfolio performance chart generation", status: "active", location: "~/clawd/tools/generate-portfolio-chart.py", consumers: ["hub", "lever"], tags: ["trading", "charts"] },
  { name: "faith-journey/", description: "Faith journey tracking and devotional tools", status: "active", location: "~/clawd/tools/faith-journey/", consumers: ["hub", "lever"], tags: ["faith"] },
  { name: "morning-prayer/", description: "Daily prayer generation and delivery", status: "active", location: "~/clawd/tools/morning-prayer/", consumers: ["hub", "lever"], tags: ["faith", "prayer"] },
  { name: "jillian/", description: "Marriage compass data and anniversary tools", status: "active", location: "~/clawd/tools/jillian/", consumers: ["lever"], tags: ["marriage", "family"] },
  { name: "family-event-reminder.sh", description: "Automated family event reminders", status: "active", location: "~/clawd/tools/family-event-reminder.sh", consumers: ["hub"], tags: ["family", "reminders"] },
  { name: "schedule-family-reminders.sh", description: "Schedule recurring family reminders via cron", status: "active", location: "~/clawd/tools/schedule-family-reminders.sh", consumers: ["hub"], tags: ["family", "cron"] },
  { name: "newsletter-charts/", description: "Chart generation for newsletter content", status: "active", location: "~/clawd/tools/newsletter-charts/", consumers: ["hub", "frequency"], tags: ["newsletter", "charts"] },
  { name: "newsletter-generation-template.md", description: "Template for AI newsletter content generation", status: "active", location: "~/clawd/tools/newsletter-generation-template.md", consumers: ["hub", "frequency"], tags: ["newsletter", "template"] },
  { name: "sync-podcast-episodes.sh", description: "Sync podcast episodes from platforms", status: "active", location: "~/clawd/tools/sync-podcast-episodes.sh", consumers: ["hub"], tags: ["podcast", "sync"] },
  { name: "sync-podcast-content.py", description: "Podcast content sync and metadata", status: "active", location: "~/clawd/tools/sync-podcast-content.py", consumers: ["hub"], tags: ["podcast", "sync"] },
  { name: "youtubeuploader/", description: "YouTube video upload automation", status: "active", location: "~/clawd/tools/youtubeuploader/", consumers: ["hub", "frequency"], tags: ["youtube", "upload"] },
  { name: "beehiiv/", description: "Beehiiv newsletter platform integration", status: "active", location: "~/clawd/tools/beehiiv/", consumers: ["hub", "frequency"], tags: ["beehiiv", "newsletter"] },
  { name: "sync-content.sh", description: "Content sync across platforms", status: "active", location: "~/clawd/tools/sync-content.sh", consumers: ["hub"], tags: ["content", "sync"] },
  { name: "moondev-algos/", description: "MoonDev algorithmic trading strategies", status: "active", location: "~/clawd/tools/moondev-algos/", consumers: ["hub"], tags: ["trading", "algos"] },
  { name: "auto-router.sh", description: "Automatic message routing for agents", status: "active", location: "~/clawd/tools/auto-router.sh", consumers: ["hub"], tags: ["agents", "routing"] },
  { name: "monitor-apple-review.sh", description: "Monitor Apple App Store review status", status: "active", location: "~/clawd/tools/monitor-apple-review.sh", consumers: ["lever"], tags: ["mobile", "appstore"] },
  { name: "update-apple-status.sh", description: "Update Apple submission status tracking", status: "active", location: "~/clawd/tools/update-apple-status.sh", consumers: ["lever"], tags: ["mobile", "appstore"] },
];

const EXTERNAL_SERVICES: Resource[] = [
  { name: "Supabase (Hub)", description: "Primary database — agents, tasks, vault, newsletters, standups", status: "active", location: "NEXT_PUBLIC_SUPABASE_URL", consumers: ["hub"], tags: ["database", "postgres"], details: "Service role key required for server-side operations" },
  { name: "Supabase (Paper Trading)", description: "Trading database — positions, signals, backtests, price history", status: "active", location: "NEXT_PUBLIC_PAPER_SUPABASE_URL", consumers: ["hub", "lever"], tags: ["database", "trading"] },
  { name: "Alpaca", description: "Paper trading API — order execution, position management", status: "active", location: "ALPACA_PAPER_API_KEY", consumers: ["hub"], tags: ["trading", "broker"], details: "Paper trading only. Uses ALPACA_PAPER_API_KEY + ALPACA_PAPER_SECRET_KEY" },
  { name: "Anthropic (Claude)", description: "LLM API — AI agent backbone, content generation", status: "active", location: "ANTHROPIC_API_KEY", consumers: ["all"], tags: ["ai", "llm"] },
  { name: "ElevenLabs", description: "Text-to-speech — Joshua's cloned voice for podcasts/briefs", status: "active", location: "macOS Keychain: elevenlabs-api-key", consumers: ["hub", "frequency"], tags: ["tts", "voice"], details: "Voice: Josh (clone). Model: eleven_v3. Retrieved via secrets.sh" },
  { name: "Vercel", description: "Hub deployment platform — production hosting", status: "active", location: "npx vercel --prod --yes", consumers: ["hub", "web"], tags: ["deploy", "hosting"] },
  { name: "SMTP (Email)", description: "Email delivery for newsletters and notifications", status: "active", location: "SMTP_USER", consumers: ["hub", "frequency"], tags: ["email"] },
  { name: "Clawdbot Gateway", description: "Agent runtime — cron jobs, sessions, channel routing", status: "active", location: "CLAWDBOT_GATEWAY_URL (localhost:18789)", consumers: ["all"], tags: ["gateway", "runtime"], details: "LaunchAgent service. Manages all agent sessions, cron jobs, and channel integrations" },
];

const PIPELINES: { name: string; description: string; steps: string[]; consumers: ProductId[] }[] = [
  {
    name: "The Tower (Hub Deploy)",
    description: "6-stage deployment pipeline for Hub changes",
    steps: ["Pre-Flight checks", "Git commit", "Git push", "Vercel build verify", "Live site verify", "Change QA"],
    consumers: ["hub"],
  },
  {
    name: "The Catapult (Lever Deploy)",
    description: "Mobile app deployment to TestFlight",
    steps: ["EAS build", "Submit to Apple", "Monitor review", "Notify on approval"],
    consumers: ["lever"],
  },
  {
    name: "SOT (Stick or Twist)",
    description: "Idea evaluation pipeline — scores business ideas on 8 dimensions",
    steps: ["Extract idea", "Run 8 scoring agents", "Generate HTML report", "Deliver via Telegram"],
    consumers: ["hub"],
  },
  {
    name: "SOT-Rev (Idea Optimizer)",
    description: "Reverse-engineered idea optimization before SOT scoring",
    steps: ["Extract idea", "Optimize pitch with scoring knowledge", "Run through full SOT", "Deliver both reports"],
    consumers: ["hub"],
  },
  {
    name: "Morning Brief",
    description: "Daily morning brief generation and delivery",
    steps: ["Check calendar + email + weather", "Generate priorities", "TTS audio generation", "Deliver to Telegram + Lever"],
    consumers: ["hub", "lever"],
  },
  {
    name: "4x Daily Standups",
    description: "Automated C-suite standup meetings",
    steps: ["Trigger cron (5am/12pm/8pm/10:30pm)", "Query all 8 agents", "Generate standup cards", "Deliver to Board Room group", "CEO decision buttons"],
    consumers: ["hub"],
  },
];

const REVENUE_STREAMS: { stream: string; platform: string; status: string; potential: string }[] = [
  { stream: "Today's Plays Subscription", platform: "Website + App", status: "built", potential: "$10-50/mo × subscribers" },
  { stream: "Watt Purchases", platform: "App", status: "built", potential: "Microtransactions" },
  { stream: "Marriage Compass Premium", platform: "Website + App", status: "built", potential: "Bundled" },
  { stream: "Newsletter Sponsorships", platform: "Beehiiv", status: "planned", potential: "$50-500/issue" },
  { stream: "Podcast Sponsorships", platform: "Spotify/YouTube", status: "planned", potential: "$100-1000/ep" },
  { stream: "Consulting", platform: "Website", status: "planned", potential: "$200-500/hr" },
];

// ── Components ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: ResourceStatus }) {
  const styles: Record<ResourceStatus, { bg: string; text: string; label: string }> = {
    active: { bg: "rgba(16, 185, 129, 0.15)", text: "#10B981", label: "Active" },
    development: { bg: "rgba(212, 160, 32, 0.15)", text: "#D4A020", label: "Dev" },
    planned: { bg: "rgba(99, 102, 241, 0.15)", text: "#6366F1", label: "Planned" },
    deprecated: { bg: "rgba(220, 38, 38, 0.15)", text: "#DC2626", label: "Deprecated" },
  };
  const s = styles[status];
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function ProductBadge({ id }: { id: ProductId }) {
  const p = PRODUCTS[id];
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border" style={{ color: p.color, borderColor: `${p.color}40`, backgroundColor: `${p.color}10` }}>
      {p.short}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-white/10 transition-colors"
      title={`Copy: ${text}`}
    >
      {copied ? <Check className="w-3 h-3" style={{ color: "#10B981" }} /> : <Copy className="w-3 h-3" style={{ color: "#626259" }} />}
    </button>
  );
}

const TRADING_DESK_MODELS = [
  { id: "claude-sonnet-4-5-20250414", label: "Claude Sonnet 4.5" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-haiku-4-5-20250414", label: "Claude Haiku 4.5" },
  { id: "claude-opus-4-6", label: "Claude Opus 4" },
];

function AgentCard({ agent, stats, onModelChange }: { agent: Agent; stats?: { conversations: number; messages: number; memories: number; lastActivity: string | null }; onModelChange?: (agentId: string, model: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Format model name (e.g., "anthropic/claude-sonnet-4" -> "Claude Sonnet 4")
  const formatModel = (model: string) => {
    const parts = model.split('/');
    const modelName = parts[parts.length - 1];
    return modelName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Format last activity
  const formatLastActivity = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Recent';
  };

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: "#1A1A24" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`} style={{ color: "#626259" }} />
        
        {/* Agent Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{agent.emoji}</span>
            <span className="text-sm font-semibold" style={{ color: "#F5F5F0" }}>{agent.name}</span>
            
            {/* Deployment Status */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${agent.endpoint_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[10px]" style={{ color: agent.endpoint_enabled ? "#10B981" : "#EF4444" }}>
                {agent.endpoint_enabled ? "Live" : "Offline"}
              </span>
            </div>
            
            {/* Department Badge */}
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "#D4A02020", color: "#D4A020" }}>
              {agent.department}
            </span>
          </div>
          
          <p className="text-xs mt-0.5" style={{ color: "#8B8B80" }}>{agent.title}</p>
          
          {/* Stats Summary */}
          <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: "#626259" }}>
            <span>{formatModel(agent.model)}</span>
            {stats && (
              <>
                <span>•</span>
                <span>{stats.conversations} conversations</span>
                <span>•</span>
                <span>Last: {formatLastActivity(stats.lastActivity)}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Endpoint */}
        <div className="text-[10px] text-right shrink-0" style={{ color: "#626259" }}>
          {agent.endpoint_enabled && (
            <code>/api/agents/{agent.id}/chat</code>
          )}
        </div>
      </button>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-3">
          <div className="pl-6 border-l-2 border-white/10">
            <div className="space-y-3 text-xs" style={{ color: "#B8B8AD" }}>
              
              {/* Model Configuration */}
              <div>
                <p className="font-semibold mb-1" style={{ color: "#8B8B80" }}>Model Configuration</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span>Model:</span>
                    {agent.department === 'trading-desk' && onModelChange ? (
                      <select
                        value={agent.model}
                        disabled={saving}
                        onChange={async (e) => {
                          setSaving(true);
                          await onModelChange(agent.id, e.target.value);
                          setSaving(false);
                        }}
                        className="px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: "#0D0D14", borderColor: "#D4A02040", color: "#D4A020" }}
                      >
                        {TRADING_DESK_MODELS.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ color: "#D4A020" }}>{formatModel(agent.model)}</span>
                    )}
                    {saving && <span className="text-[10px]" style={{ color: "#626259" }}>Saving…</span>}
                  </div>
                  <div>Temperature: <span style={{ color: "#D4A020" }}>{agent.temperature}</span></div>
                  <div>Max Tokens: <span style={{ color: "#D4A020" }}>{agent.max_tokens}</span></div>
                  <div>Status: <span style={{ color: "#D4A020" }}>{agent.status}</span></div>
                </div>
              </div>
              
              {/* Memory Stats */}
              {stats && (
                <div>
                  <p className="font-semibold mb-1" style={{ color: "#8B8B80" }}>Memory & Usage</p>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>{stats.conversations} <span style={{ color: "#626259" }}>conversations</span></div>
                    <div>{stats.messages} <span style={{ color: "#626259" }}>messages</span></div>
                    <div>{stats.memories} <span style={{ color: "#626259" }}>memories</span></div>
                  </div>
                </div>
              )}
              
              {/* Soul Prompt Preview */}
              <div>
                <p className="font-semibold mb-1" style={{ color: "#8B8B80" }}>Soul Prompt</p>
                <p className="text-[11px]" style={{ color: "#B8B8AD" }}>
                  {agent.description.length > 100 
                    ? `${agent.description.slice(0, 100)}...` 
                    : agent.description}
                </p>
              </div>
              
              {/* Endpoint */}
              {agent.endpoint_enabled && (
                <div>
                  <p className="font-semibold mb-1" style={{ color: "#8B8B80" }}>Endpoint</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#1A1A24", color: "#D4A020" }}>
                      /api/agents/{agent.id}/chat
                    </code>
                    <CopyBtn text={`/api/agents/${agent.id}/chat`} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceRow({ resource }: { resource: Resource }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: "#1A1A24" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`} style={{ color: "#626259" }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono font-medium" style={{ color: "#F5F5F0" }}>{resource.name}</code>
            <StatusBadge status={resource.status} />
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "#8B8B80" }}>{resource.description}</p>
        </div>
        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
          {resource.consumers.slice(0, 3).map((c) => <ProductBadge key={c} id={c} />)}
          {resource.consumers.length > 3 && <span className="text-[10px]" style={{ color: "#626259" }}>+{resource.consumers.length - 3}</span>}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 pl-11 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold" style={{ color: "#626259" }}>PATH</span>
            <code className="text-xs font-mono" style={{ color: "#B8B8AD" }}>{resource.location}</code>
            <CopyBtn text={resource.location} />
          </div>
          {resource.details && <p className="text-xs" style={{ color: "#8B8B80" }}>{resource.details}</p>}
          {resource.tools && (
            <div>
              <span className="text-[10px] font-semibold block mb-1" style={{ color: "#626259" }}>TOOLS</span>
              <div className="space-y-1">
                {resource.tools.map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: "#D4A020" }} />
                    <code className="text-xs font-mono" style={{ color: "#B8B8AD" }}>{t}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
          {resource.tags && (
            <div className="flex gap-1 flex-wrap">
              {resource.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "#1A1A24", color: "#626259" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function RegistryPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [search, setSearch] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowDeptDropdown(false);
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch agents and stats data
  useEffect(() => {
    async function fetchAgentsData() {
      try {
        const [agentsRes, statsRes] = await Promise.all([
          fetch('/api/agents'),
          fetch('/api/agents/stats')
        ]);

        const agentsData = await agentsRes.json();
        const statsData = await statsRes.json();

        setAgents(agentsData.agents || []);
        setAgentStats(statsData);
      } catch (error) {
        console.error('Failed to fetch agents data:', error);
      } finally {
        setAgentsLoading(false);
      }
    }

    fetchAgentsData();
  }, []);

  // Handle model change for trading desk agents
  const handleModelChange = async (agentId: string, model: string) => {
    try {
      const res = await fetch('/api/trading/advisor-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advisor_id: agentId, model }),
      });
      if (res.ok) {
        // Update local state
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, model } : a));
      }
    } catch (e) {
      console.error('Failed to update model:', e);
    }
  };

  const totalAPIs = API_GROUPS.reduce((sum, g) => sum + g.apis.length, 0);
  const totalAgents = agents.length;

  // Update counts
  TABS[2].count = totalAPIs;
  TABS[3].count = totalAgents;
  TABS[4].count = CLI_TOOLS.length;

  const filterResources = (resources: Resource[]) => {
    if (!search) return resources;
    const q = search.toLowerCase();
    return resources.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags?.some((t) => t.includes(q)) ||
        r.consumers.some((c) => PRODUCTS[c].name.toLowerCase().includes(q))
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #D4A020 0%, #B8860B 100%)", boxShadow: "0 0 16px rgba(212, 160, 32, 0.2)" }}>
            <Package className="w-5 h-5" style={{ color: "#0B0B11" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.02em" }}>Platform Registry</h1>
            <p className="text-xs" style={{ color: "#8B8B80" }}>Every resource, API, agent, and tool — one place to find and reference them all</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#626259" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources, APIs, agents, tools..."
            className="w-full h-10 pl-10 pr-4 rounded-xl text-sm transition-all focus:outline-none"
            style={{ backgroundColor: "#13131B", border: "1px solid #2A2A38", color: "#F5F5F0" }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0"
                style={{
                  backgroundColor: isActive ? "rgba(212, 160, 32, 0.12)" : "transparent",
                  color: isActive ? "#D4A020" : "#8B8B80",
                  border: isActive ? "1px solid rgba(212, 160, 32, 0.3)" : "1px solid transparent",
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                {tab.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: isActive ? "rgba(212, 160, 32, 0.2)" : "#1A1A24", color: isActive ? "#D4A020" : "#626259" }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="h-px" style={{ background: "linear-gradient(to right, transparent, #2A2A38, transparent)" }} />
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────── */}
      {activeTab === "overview" && (
        <>
          {/* Architecture card */}
          <div className="p-5 rounded-2xl border mb-6" style={{ backgroundColor: "#13131B", borderColor: "rgba(212, 160, 32, 0.15)" }}>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#D4A020" }}>JoshOS Hub = The Platform Layer</h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "#B8B8AD" }}>
              The Hub is where all backend capabilities are <strong style={{ color: "#F5F5F0" }}>built, tested, and exposed</strong>. 
              Every API, agent, MCP server, and CLI tool lives here. Consumer products — Lever, joshlevylabs.com, 
              The Lyceum, Builder&apos;s Frequency — connect to the Hub&apos;s resources. 
              <strong style={{ color: "#F5F5F0" }}> Nothing gets built twice.</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRODUCTS).filter(([k]) => k !== "all").map(([key, product]) => (
                <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ borderColor: `${product.color}30`, backgroundColor: `${product.color}08` }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: product.color }} />
                  <span className="text-xs font-medium" style={{ color: product.color }}>{product.name}</span>
                  {key === "hub" && <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "rgba(212, 160, 32, 0.15)", color: "#D4A020" }}>PLATFORM</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Architecture Diagram */}
          <div className="rounded-2xl border p-6 mb-6" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
            <div className="flex items-center justify-center gap-2 mb-5">
              <Database className="w-5 h-5" style={{ color: "#D4A020" }} />
              <span className="text-sm font-semibold" style={{ color: "#D4A020" }}>Supabase</span>
              <span className="text-xs ml-2" style={{ color: "#626259" }}>Auth · Profiles · Signals · Compass · Faith · Newsletters · Agents</span>
            </div>
            <div className="flex items-center justify-center mb-4">
              <ArrowDown className="w-4 h-4" style={{ color: "#2A2A38" }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl border" style={{ backgroundColor: "rgba(34, 211, 238, 0.05)", borderColor: "rgba(34, 211, 238, 0.2)" }}>
                <Globe className="w-7 h-7 mx-auto mb-2" style={{ color: "#22D3EE" }} />
                <p className="text-sm font-semibold" style={{ color: "#22D3EE" }}>joshlevylabs.com</p>
                <p className="text-[10px] mt-1" style={{ color: "#8B8B80" }}>The Brand</p>
              </div>
              <div className="text-center p-4 rounded-xl border" style={{ backgroundColor: "rgba(212, 160, 32, 0.05)", borderColor: "rgba(212, 160, 32, 0.2)" }}>
                <Monitor className="w-7 h-7 mx-auto mb-2" style={{ color: "#D4A020" }} />
                <p className="text-sm font-semibold" style={{ color: "#D4A020" }}>JoshOS Hub</p>
                <p className="text-[10px] mt-1" style={{ color: "#8B8B80" }}>Platform Layer</p>
              </div>
              <div className="text-center p-4 rounded-xl border" style={{ backgroundColor: "rgba(99, 102, 241, 0.05)", borderColor: "rgba(99, 102, 241, 0.2)" }}>
                <Smartphone className="w-7 h-7 mx-auto mb-2" style={{ color: "#6366F1" }} />
                <p className="text-sm font-semibold" style={{ color: "#6366F1" }}>Lever App</p>
                <p className="text-[10px] mt-1" style={{ color: "#8B8B80" }}>Consumer Mobile</p>
              </div>
            </div>
            <div className="flex items-center justify-center mt-4">
              <ArrowDown className="w-4 h-4" style={{ color: "#2A2A38" }} />
            </div>
            <div className="flex items-center justify-center gap-3 mt-2">
              <Package className="w-4 h-4" style={{ color: "#626259" }} />
              <span className="text-xs" style={{ color: "#626259" }}>@joshlevylabs/shared</span>
              <span style={{ color: "#343444" }}>·</span>
              <span className="text-xs" style={{ color: "#626259" }}>@joshlevylabs/ui</span>
              <span style={{ color: "#343444" }}>·</span>
              <span className="text-xs" style={{ color: "#626259" }}>Edge Functions</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: "MCP Servers", count: MCP_SERVERS.length, icon: Server, color: "#D4A020" },
              { label: "API Endpoints", count: totalAPIs, icon: Globe, color: "#22D3EE" },
              { label: "AI Agents", count: totalAgents, icon: Bot, color: "#6366F1" },
              { label: "CLI Tools", count: CLI_TOOLS.length, icon: Wrench, color: "#10B981" },
              { label: "Services", count: EXTERNAL_SERVICES.length, icon: Plug, color: "#F59E0B" },
              { label: "Pipelines", count: PIPELINES.length, icon: Zap, color: "#DC2626" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl border text-center" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                <stat.icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
                <p className="text-2xl font-bold" style={{ color: "#F5F5F0" }}>{stat.count}</p>
                <p className="text-[10px] font-medium" style={{ color: "#8B8B80" }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Pipelines */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#F5F5F0" }}>
              <Zap className="w-4 h-4" style={{ color: "#D4A020" }} />
              Automated Pipelines
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PIPELINES.map((pipeline) => (
                <div key={pipeline.name} className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold" style={{ color: "#F5F5F0" }}>{pipeline.name}</h4>
                    <div className="flex gap-1">
                      {pipeline.consumers.map((c) => <ProductBadge key={c} id={c} />)}
                    </div>
                  </div>
                  <p className="text-xs mb-3" style={{ color: "#8B8B80" }}>{pipeline.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {pipeline.steps.map((step, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "#1A1A24", color: "#B8B8AD" }}>{step}</span>
                        {i < pipeline.steps.length - 1 && <ChevronRight className="w-3 h-3" style={{ color: "#343444" }} />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Streams */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#F5F5F0" }}>
              <DollarSign className="w-4 h-4" style={{ color: "#10B981" }} />
              Revenue Streams
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {REVENUE_STREAMS.map((r) => (
                <div key={r.stream} className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium" style={{ color: "#F5F5F0" }}>{r.stream}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border" style={{
                      backgroundColor: r.status === "built" ? "rgba(16, 185, 129, 0.1)" : "rgba(99, 102, 241, 0.1)",
                      color: r.status === "built" ? "#10B981" : "#6366F1",
                      borderColor: r.status === "built" ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.2)",
                    }}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "#8B8B80" }}>{r.platform}</p>
                  <p className="text-xs font-medium mt-1" style={{ color: "#B8B8AD" }}>{r.potential}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── MCP TAB ──────────────────────────────────────── */}
      {activeTab === "mcps" && (
        <>
          <div className="p-4 rounded-xl border mb-4" style={{ backgroundColor: "rgba(212, 160, 32, 0.05)", borderColor: "rgba(212, 160, 32, 0.15)" }}>
            <p className="text-xs" style={{ color: "#B8B8AD" }}>
              MCP servers expose tools that any agent can call via <code className="font-mono" style={{ color: "#D4A020" }}>mcporter</code>. 
              Build new capabilities as MCP servers so all products can use them.
            </p>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
            {filterResources(MCP_SERVERS).map((r) => <ResourceRow key={r.name} resource={r} />)}
          </div>
          {MCP_SERVERS.length <= 1 && (
            <div className="mt-4 p-4 rounded-xl border border-dashed text-center" style={{ borderColor: "#2A2A38" }}>
              <p className="text-xs" style={{ color: "#626259" }}>
                Build more MCP servers in <code className="font-mono" style={{ color: "#8B8B80" }}>~/clawd/mcp-servers/</code> — 
                trading signals, content generation, faith tools, etc.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── API TAB ──────────────────────────────────────── */}
      {activeTab === "apis" && (
        <>
          <div className="p-4 rounded-xl border mb-4" style={{ backgroundColor: "rgba(34, 211, 238, 0.05)", borderColor: "rgba(34, 211, 238, 0.15)" }}>
            <p className="text-xs" style={{ color: "#B8B8AD" }}>
              All API routes live in <code className="font-mono" style={{ color: "#22D3EE" }}>src/app/api/</code>. 
              Consumer products call these endpoints. Hub is the single source of truth.
            </p>
          </div>
          {API_GROUPS.map((group) => {
            const filtered = filterResources(group.apis);
            if (filtered.length === 0) return null;
            const GroupIcon = group.icon;
            return (
              <div key={group.group} className="mb-4">
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 px-1" style={{ color: "#8B8B80" }}>
                  <GroupIcon className="w-3.5 h-3.5" style={{ color: "#D4A020" }} />
                  {group.group}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "#1A1A24" }}>{filtered.length}</span>
                </h3>
                <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  {filtered.map((r) => <ResourceRow key={r.name} resource={r} />)}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── AGENTS TAB ──────────────────────────────────── */}
      {activeTab === "agents" && (
        <>
          {agentsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm" style={{ color: "#8B8B80" }}>Loading agents...</div>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              {agentStats && (
                <div className="p-4 rounded-xl border mb-4" style={{ backgroundColor: "rgba(99, 102, 241, 0.05)", borderColor: "rgba(99, 102, 241, 0.15)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#6366F1" }}>
                        {agentStats.totalAgents} Agents Deployed
                      </p>
                      <p className="text-xs mt-1" style={{ color: "#B8B8AD" }}>
                        {agentStats.totalConversations.toLocaleString()} Total Conversations • {agentStats.totalMessages.toLocaleString()} Total Messages • {agentStats.totalMemories.toLocaleString()} Memories
                      </p>
                    </div>
                    <div className="text-xs" style={{ color: "#8B8B80" }}>
                      Configs: <code className="font-mono" style={{ color: "#6366F1" }}>~/clawd/agents/</code>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Pills */}
              {(() => {
                // Derive unique departments and statuses from agents
                const deptMap: Record<string, string> = {
                  'the-trading-desk': '📈 Trading Desk',
                  'faith-journey-guides': '🕊️ Faith Guides',
                  'judaism': '✡️ Judaism',
                  'christianity': '✝️ Christianity',
                  'islam': '☪️ Islam',
                  'hinduism': '🕉️ Hinduism',
                  'buddhism': '☸️ Buddhism',
                  'other-traditions': '🌍 Other Traditions',
                };
                const uniqueDepts = Array.from(new Set(agents.map(a => a.department || 'other')));
                const uniqueStatuses = Array.from(new Set(agents.map(a => a.endpoint_enabled ? 'enabled' : 'disabled')));
                const activeFilterCount = (departmentFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

                return (
                  <div ref={filterRef} className="flex flex-wrap items-center gap-2 mb-4">
                    <Filter className="w-3.5 h-3.5" style={{ color: "#626259" }} />

                    {/* Department Filter */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowDeptDropdown(!showDeptDropdown); setShowStatusDropdown(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={{
                          backgroundColor: departmentFilter !== 'all' ? "rgba(212, 160, 32, 0.12)" : "#1A1A24",
                          color: departmentFilter !== 'all' ? "#D4A020" : "#8B8B80",
                          border: departmentFilter !== 'all' ? "1px solid rgba(212, 160, 32, 0.3)" : "1px solid #2A2A38",
                        }}
                      >
                        {departmentFilter === 'all' ? 'Department' : (deptMap[departmentFilter] || departmentFilter)}
                        {departmentFilter !== 'all' ? (
                          <X className="w-3 h-3 ml-0.5 hover:opacity-70" onClick={(e) => { e.stopPropagation(); setDepartmentFilter('all'); setShowDeptDropdown(false); }} />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                      {showDeptDropdown && (
                        <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded-xl border overflow-hidden shadow-xl" style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38" }}>
                          <button
                            onClick={() => { setDepartmentFilter('all'); setShowDeptDropdown(false); }}
                            className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5"
                            style={{ color: departmentFilter === 'all' ? "#D4A020" : "#B8B8AD" }}
                          >
                            All Departments
                          </button>
                          {uniqueDepts.sort().map(dept => (
                            <button
                              key={dept}
                              onClick={() => { setDepartmentFilter(dept); setShowDeptDropdown(false); }}
                              className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5"
                              style={{ color: departmentFilter === dept ? "#D4A020" : "#B8B8AD" }}
                            >
                              {deptMap[dept] || dept.charAt(0).toUpperCase() + dept.slice(1).replace(/-/g, ' ')}
                              <span className="ml-1.5 text-[10px]" style={{ color: "#626259" }}>
                                ({agents.filter(a => (a.department || 'other') === dept).length})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowDeptDropdown(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={{
                          backgroundColor: statusFilter !== 'all' ? "rgba(99, 102, 241, 0.12)" : "#1A1A24",
                          color: statusFilter !== 'all' ? "#6366F1" : "#8B8B80",
                          border: statusFilter !== 'all' ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid #2A2A38",
                        }}
                      >
                        {statusFilter === 'all' ? 'Status' : (statusFilter === 'enabled' ? '🟢 Enabled' : '⏸️ Disabled')}
                        {statusFilter !== 'all' ? (
                          <X className="w-3 h-3 ml-0.5 hover:opacity-70" onClick={(e) => { e.stopPropagation(); setStatusFilter('all'); setShowStatusDropdown(false); }} />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                      {showStatusDropdown && (
                        <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-xl border overflow-hidden shadow-xl" style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38" }}>
                          <button
                            onClick={() => { setStatusFilter('all'); setShowStatusDropdown(false); }}
                            className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5"
                            style={{ color: statusFilter === 'all' ? "#D4A020" : "#B8B8AD" }}
                          >
                            All Statuses
                          </button>
                          {uniqueStatuses.map(status => (
                            <button
                              key={status}
                              onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }}
                              className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5"
                              style={{ color: statusFilter === status ? "#D4A020" : "#B8B8AD" }}
                            >
                              {status === 'enabled' ? '🟢 Enabled' : '⏸️ Disabled'}
                              <span className="ml-1.5 text-[10px]" style={{ color: "#626259" }}>
                                ({agents.filter(a => (a.endpoint_enabled ? 'enabled' : 'disabled') === status).length})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Clear All */}
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => { setDepartmentFilter('all'); setStatusFilter('all'); }}
                        className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium transition-colors hover:opacity-80"
                        style={{ color: "#626259" }}
                      >
                        Clear filters ({activeFilterCount})
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Group agents by department */}
              {(() => {
                // Filter agents by search, department, and status
                const filteredAgents = agents.filter(agent => {
                  // Department filter
                  if (departmentFilter !== 'all' && (agent.department || 'other') !== departmentFilter) return false;
                  // Status filter
                  if (statusFilter !== 'all') {
                    const agentStatus = agent.endpoint_enabled ? 'enabled' : 'disabled';
                    if (agentStatus !== statusFilter) return false;
                  }
                  // Search filter
                  if (!search) return true;
                  const q = search.toLowerCase();
                  return (
                    agent.name.toLowerCase().includes(q) ||
                    agent.title.toLowerCase().includes(q) ||
                    agent.description.toLowerCase().includes(q) ||
                    agent.department.toLowerCase().includes(q)
                  );
                });

                // Group by department with desired ordering
                const departmentOrder = [
                  "the-trading-desk",
                  "faith-journey-guides",
                  "judaism", 
                  "christianity",
                  "islam", 
                  "hinduism", 
                  "buddhism",
                  "other-traditions"
                ];

                const groupedAgents: Record<string, Agent[]> = {};
                filteredAgents.forEach(agent => {
                  const dept = agent.department || 'other';
                  if (!groupedAgents[dept]) {
                    groupedAgents[dept] = [];
                  }
                  groupedAgents[dept].push(agent);
                });

                // Sort departments by desired order, then alphabetically for others
                const sortedDepartments = Object.keys(groupedAgents).sort((a, b) => {
                  const aIndex = departmentOrder.indexOf(a);
                  const bIndex = departmentOrder.indexOf(b);
                  
                  if (aIndex !== -1 && bIndex !== -1) {
                    return aIndex - bIndex;
                  } else if (aIndex !== -1) {
                    return -1;
                  } else if (bIndex !== -1) {
                    return 1;
                  } else {
                    return a.localeCompare(b);
                  }
                });

                // Format department names for display
                const formatDepartmentName = (dept: string) => {
                  const deptMap: Record<string, string> = {
                    'the-trading-desk': '📈 The Trading Desk',
                    'faith-journey-guides': '🕊️ Faith Journey Guides',
                    'judaism': '🕊️ Faith Journey Guides — Judaism',
                    'christianity': '🕊️ Faith Journey Guides — Christianity', 
                    'islam': '🕊️ Faith Journey Guides — Islam',
                    'hinduism': '🕊️ Faith Journey Guides — Hinduism',
                    'buddhism': '🕊️ Faith Journey Guides — Buddhism',
                    'other-traditions': '🕊️ Faith Journey Guides — Other Traditions'
                  };
                  return deptMap[dept] || `🤖 ${dept.charAt(0).toUpperCase() + dept.slice(1).replace(/-/g, ' ')}`;
                };

                return sortedDepartments.map(department => {
                  const departmentAgents = groupedAgents[department];
                  if (departmentAgents.length === 0) return null;

                  return (
                    <div key={department} className="mb-4">
                      <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 px-1" style={{ color: "#8B8B80" }}>
                        <Bot className="w-3.5 h-3.5" style={{ color: "#D4A020" }} />
                        {formatDepartmentName(department)}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "#1A1A24" }}>{departmentAgents.length}</span>
                      </h3>
                      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                        {departmentAgents.map((agent) => (
                          <AgentCard 
                            key={agent.id} 
                            agent={agent} 
                            stats={agentStats?.perAgent[agent.id]}
                            onModelChange={handleModelChange}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </>
          )}
        </>
      )}

      {/* ── TOOLS TAB ──────────────────────────────────── */}
      {activeTab === "tools" && (
        <>
          <div className="p-4 rounded-xl border mb-4" style={{ backgroundColor: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.15)" }}>
            <p className="text-xs" style={{ color: "#B8B8AD" }}>
              CLI tools and scripts in <code className="font-mono" style={{ color: "#10B981" }}>~/clawd/tools/</code>. 
              Run directly or invoked by agents and cron jobs.
            </p>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
            {filterResources(CLI_TOOLS).map((r) => <ResourceRow key={r.name} resource={r} />)}
          </div>
        </>
      )}

      {/* ── SERVICES TAB ──────────────────────────────── */}
      {activeTab === "services" && (
        <>
          <div className="p-4 rounded-xl border mb-4" style={{ backgroundColor: "rgba(245, 158, 11, 0.05)", borderColor: "rgba(245, 158, 11, 0.15)" }}>
            <p className="text-xs" style={{ color: "#B8B8AD" }}>
              External service integrations. Credentials stored in macOS Keychain or <code className="font-mono" style={{ color: "#F59E0B" }}>.env.local</code>.
            </p>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
            {filterResources(EXTERNAL_SERVICES).map((r) => <ResourceRow key={r.name} resource={r} />)}
          </div>
        </>
      )}

      {/* ── DATABASES TAB ──────────────────────────────── */}
      {activeTab === "databases" && (
        <>
          <div className="p-4 rounded-xl border mb-4" style={{ backgroundColor: "rgba(99, 102, 241, 0.05)", borderColor: "rgba(99, 102, 241, 0.15)" }}>
            <p className="text-xs" style={{ color: "#B8B8AD" }}>
              Supabase (Postgres) databases. Hub DB is the operational store; Paper Trading DB handles all financial data.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <div className="flex items-center gap-3 mb-3">
                <Database className="w-5 h-5" style={{ color: "#D4A020" }} />
                <h3 className="text-sm font-semibold" style={{ color: "#F5F5F0" }}>Hub Database</h3>
                <StatusBadge status="active" />
              </div>
              <p className="text-xs mb-3" style={{ color: "#8B8B80" }}>Primary operational store for all Hub features</p>
              <div className="space-y-1.5 text-xs" style={{ color: "#B8B8AD" }}>
                <p>• <strong>agent_configs</strong> — Agent profiles, SOUL, IDENTITY</p>
                <p>• <strong>tasks</strong> — Kanban board items</p>
                <p>• <strong>vault_entries</strong> — Encrypted secrets, TOTP</p>
                <p>• <strong>newsletters</strong> — Newsletter definitions + issues</p>
                <p>• <strong>subscribers</strong> — Email subscriber lists</p>
                <p>• <strong>contacts</strong> — Global contact book</p>
                <p>• <strong>standup_*</strong> — Standup configs and history</p>
                <p>• <strong>initiatives</strong> — Strategic initiatives</p>
              </div>
              <div className="mt-3 pt-3 flex gap-1" style={{ borderTop: "1px solid #2A2A38" }}>
                <ProductBadge id="hub" />
              </div>
            </div>
            <div className="p-5 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <div className="flex items-center gap-3 mb-3">
                <Database className="w-5 h-5" style={{ color: "#22D3EE" }} />
                <h3 className="text-sm font-semibold" style={{ color: "#F5F5F0" }}>Paper Trading Database</h3>
                <StatusBadge status="active" />
              </div>
              <p className="text-xs mb-3" style={{ color: "#8B8B80" }}>Financial data, signals, and trading operations</p>
              <div className="space-y-1.5 text-xs" style={{ color: "#B8B8AD" }}>
                <p>• <strong>positions</strong> — Active and historical positions</p>
                <p>• <strong>signals</strong> — Trading signal pipeline data</p>
                <p>• <strong>price_history</strong> — OHLCV price data</p>
                <p>• <strong>backtests</strong> — Strategy backtest results</p>
                <p>• <strong>portfolio_snapshots</strong> — Daily portfolio snapshots</p>
                <p>• <strong>sector_data</strong> — Sector fear/greed metrics</p>
                <p>• <strong>strategy_configs</strong> — Trading strategy parameters</p>
              </div>
              <div className="mt-3 pt-3 flex gap-1" style={{ borderTop: "1px solid #2A2A38" }}>
                <ProductBadge id="hub" />
                <ProductBadge id="lever" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="text-center py-6 mt-8 border-t" style={{ borderColor: "#2A2A38" }}>
        <p className="text-[10px]" style={{ color: "#626259" }}>
          JoshOS Platform Registry — Build once, consume everywhere
        </p>
      </div>
    </div>
  );
}
