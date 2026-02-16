"use client";

import {
  Zap,
  Bot,
  Shield,
  Palette,
  DollarSign,
  Code,
  Layout,
  TestTube,
  FileText,
  Share2,
  Rocket,
  Search,
  BarChart3,
  Network,
  ChevronDown,
  ChevronRight,
  Timer,
  ArrowRight,
  Cpu,
  X,
  Plus,
  Trash2,
  Save,
  Loader2,
  Check,
  User,
  Brain,
  Wrench,
  Users,
  BookOpen,
  Heart,
  Info,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

type Status = "active" | "idle" | "standby";
type DepartmentKey = "Executive" | "Engineering" | "Marketing" | "Revenue";

interface AgentState {
  id: string;
  name: string;
  title: string;
  emoji: string;
  model: string;
  status: Status;
  department: DepartmentKey;
  description: string;
  reportsTo: string | null;
  directReports: string[];
}

interface CascadeChange {
  agentId: string;
  agentName: string;
  field: string;
  oldValue: string;
  newValue: string;
}

type FileTab =
  | "IDENTITY.md"
  | "SOUL.md"
  | "USER.md"
  | "TOOLS.md"
  | "AGENTS.md"
  | "MEMORY.md"
  | "HEARTBEAT.md";

const ALL_FILE_TABS: FileTab[] = [
  "IDENTITY.md",
  "SOUL.md",
  "USER.md",
  "TOOLS.md",
  "AGENTS.md",
  "MEMORY.md",
  "HEARTBEAT.md",
];

const FILE_TAB_META: Record<FileTab, { emoji: string; label: string; icon: typeof FileText }> = {
  "IDENTITY.md": { emoji: "👤", label: "Identity", icon: User },
  "SOUL.md": { emoji: "🧬", label: "Soul", icon: Brain },
  "USER.md": { emoji: "👥", label: "User", icon: Users },
  "TOOLS.md": { emoji: "🔧", label: "Tools", icon: Wrench },
  "AGENTS.md": { emoji: "📋", label: "Agents", icon: Users },
  "MEMORY.md": { emoji: "🧠", label: "Memory", icon: BookOpen },
  "HEARTBEAT.md": { emoji: "💓", label: "Heartbeat", icon: Heart },
};

const MODEL_OPTIONS = ["Claude Opus 4", "Claude Sonnet 4", "Haiku 3.5", "Gemini 2 Flash"];
const STATUS_OPTIONS: Status[] = ["active", "idle", "standby"];
const DEPARTMENT_OPTIONS: DepartmentKey[] = ["Executive", "Engineering", "Marketing", "Revenue"];

/* ═══════════════════════════════════════════════════════════════
   Markdown Parse/Serialize Helpers
   ═══════════════════════════════════════════════════════════════ */

function parseKeyValueMd(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const m = line.trim().match(/^-?\s*\*\*(.+?)[:：]\*\*\s*(.*)$/);
    if (m) {
      result[m[1].trim()] = m[2].trim();
    }
  }
  return result;
}

function parseBulletList(content: string, afterHeader?: string): string[] {
  const lines = content.split("\n");
  let started = !afterHeader;
  const items: string[] = [];
  for (const line of lines) {
    if (afterHeader && /^#{1,4}\s/.test(line) && line.toLowerCase().includes(afterHeader.toLowerCase())) {
      started = true;
      continue;
    }
    if (started && afterHeader && /^#{1,4}\s/.test(line) && !line.toLowerCase().includes(afterHeader.toLowerCase())) {
      break;
    }
    if (started) {
      const m = line.trim().match(/^[-*]\s+(.+)$/);
      if (m) items.push(m[1]);
    }
  }
  return items;
}

function parseCheckboxList(content: string): Array<{ checked: boolean; text: string }> {
  const items: Array<{ checked: boolean; text: string }> = [];
  for (const line of content.split("\n")) {
    const m = line.trim().match(/^-\s*\[([ xX])\]\s*(.+)$/);
    if (m) {
      items.push({ checked: m[1] !== " ", text: m[2] });
    }
  }
  return items;
}

function parseSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let currentHeader = "";
  let currentContent: string[] = [];

  for (const line of content.split("\n")) {
    const hMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (hMatch) {
      if (currentHeader) {
        sections[currentHeader] = currentContent.join("\n").trim();
      }
      currentHeader = hMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentHeader) {
    sections[currentHeader] = currentContent.join("\n").trim();
  }
  return sections;
}

/* ── Identity ── */
interface IdentityFields {
  name: string;
  title: string;
  model: string;
  emoji: string;
  department: string;
  reportsTo: string;
  directReports: string;
  roleDescription: string;
}

function parseIdentityMd(content: string): IdentityFields {
  const kv = parseKeyValueMd(content);
  return {
    name: kv["Name"] || "",
    title: kv["Title"] || kv["Role"] || "",
    model: kv["Model"] || "",
    emoji: kv["Emoji"] || "",
    department: kv["Department"] || "",
    reportsTo: kv["Reports To"] || kv["Reports to"] || "",
    directReports: kv["Direct Reports"] || kv["Direct reports"] || "",
    roleDescription: kv["Role Description"] || kv["Description"] || "",
  };
}

function serializeIdentityMd(f: IdentityFields): string {
  const lines = ["# Identity", ""];
  if (f.name) lines.push(`- **Name:** ${f.name}`);
  if (f.title) lines.push(`- **Title:** ${f.title}`);
  if (f.model) lines.push(`- **Model:** ${f.model}`);
  if (f.emoji) lines.push(`- **Emoji:** ${f.emoji}`);
  if (f.department) lines.push(`- **Department:** ${f.department}`);
  if (f.reportsTo) lines.push(`- **Reports To:** ${f.reportsTo}`);
  if (f.directReports) lines.push(`- **Direct Reports:** ${f.directReports}`);
  if (f.roleDescription) {
    lines.push("");
    lines.push("## Role Description");
    lines.push("");
    lines.push(f.roleDescription);
  }
  lines.push("");
  return lines.join("\n");
}

/* ── Soul ── */
interface SoulFields {
  personalitySummary: string;
  communicationStyle: string;
  keyPhrases: string[];
  coreValues: string[];
}

function parseSoulMd(content: string): SoulFields {
  const sections = parseSections(content);
  const sectionKeys = Object.keys(sections);

  let personalitySummary = "";
  let communicationStyle = "";
  let keyPhrases: string[] = [];
  let coreValues: string[] = [];

  for (const key of sectionKeys) {
    const kl = key.toLowerCase();
    if (kl.includes("personality") || kl.includes("summary") || kl.includes("soul")) {
      personalitySummary = sections[key];
    } else if (kl.includes("communication") || kl.includes("style")) {
      communicationStyle = sections[key];
    } else if (kl.includes("phrase") || kl.includes("catchphrase")) {
      keyPhrases = parseBulletList(sections[key]);
      if (keyPhrases.length === 0) keyPhrases = sections[key].split("\n").filter(Boolean);
    } else if (kl.includes("value")) {
      coreValues = parseBulletList(sections[key]);
      if (coreValues.length === 0) coreValues = sections[key].split("\n").filter(Boolean);
    }
  }

  if (!personalitySummary && sectionKeys.length === 0) {
    personalitySummary = content;
  }

  return { personalitySummary, communicationStyle, keyPhrases, coreValues };
}

function serializeSoulMd(f: SoulFields): string {
  const lines = ["# Soul", ""];
  if (f.personalitySummary) {
    lines.push("## Personality");
    lines.push("");
    lines.push(f.personalitySummary);
    lines.push("");
  }
  if (f.communicationStyle) {
    lines.push("## Communication Style");
    lines.push("");
    lines.push(f.communicationStyle);
    lines.push("");
  }
  if (f.keyPhrases.length > 0) {
    lines.push("## Key Phrases");
    lines.push("");
    for (const p of f.keyPhrases) lines.push(`- ${p}`);
    lines.push("");
  }
  if (f.coreValues.length > 0) {
    lines.push("## Core Values");
    lines.push("");
    for (const v of f.coreValues) lines.push(`- ${v}`);
    lines.push("");
  }
  return lines.join("\n");
}

/* ── User ── */
interface UserFields {
  serves: string;
  timezone: string;
  location: string;
  notes: string;
}

function parseUserMd(content: string): UserFields {
  const kv = parseKeyValueMd(content);
  const sections = parseSections(content);
  return {
    serves: kv["Serves"] || kv["User"] || kv["Human"] || "Joshua",
    timezone: kv["Timezone"] || kv["TZ"] || "",
    location: kv["Location"] || "",
    notes: sections["Notes"] || kv["Notes"] || "",
  };
}

function serializeUserMd(f: UserFields): string {
  const lines = ["# User", ""];
  lines.push(`- **Serves:** ${f.serves}`);
  if (f.timezone) lines.push(`- **Timezone:** ${f.timezone}`);
  if (f.location) lines.push(`- **Location:** ${f.location}`);
  if (f.notes) {
    lines.push("");
    lines.push("## Notes");
    lines.push("");
    lines.push(f.notes);
  }
  lines.push("");
  return lines.join("\n");
}

/* ── Tools ── */
interface ToolsFields {
  availableTools: Record<string, boolean>;
  customSections: Array<{ title: string; content: string }>;
}

const COMMON_TOOLS = [
  "web_search", "exec", "browser", "read", "write", "edit",
  "web_fetch", "image", "tts", "message", "canvas", "nodes",
];

function parseToolsMd(content: string): ToolsFields {
  const tools: Record<string, boolean> = {};
  for (const t of COMMON_TOOLS) tools[t] = false;

  const contentLower = content.toLowerCase();
  for (const t of COMMON_TOOLS) {
    if (contentLower.includes(t)) tools[t] = true;
  }

  const sections = parseSections(content);
  const customSections: Array<{ title: string; content: string }> = [];
  for (const [title, body] of Object.entries(sections)) {
    if (!title.toLowerCase().includes("tool")) {
      customSections.push({ title, content: body });
    }
  }

  return { availableTools: tools, customSections };
}

function serializeToolsMd(f: ToolsFields): string {
  const lines = ["# Tools", ""];
  lines.push("## Available Tools");
  lines.push("");
  const enabled = Object.entries(f.availableTools).filter(([, v]) => v).map(([k]) => k);
  if (enabled.length > 0) {
    for (const t of enabled) lines.push(`- ${t}`);
  } else {
    lines.push("_No tools configured_");
  }
  lines.push("");
  for (const s of f.customSections) {
    if (s.title || s.content) {
      lines.push(`## ${s.title}`);
      lines.push("");
      lines.push(s.content);
      lines.push("");
    }
  }
  return lines.join("\n");
}

/* ── Agents ── */
interface AgentsFields {
  delegationRules: string;
  conventions: string;
  subAgents: string[];
}

function parseAgentsMd(content: string): AgentsFields {
  const sections = parseSections(content);
  let delegationRules = "";
  let conventions = "";
  let subAgents: string[] = [];

  for (const [key, val] of Object.entries(sections)) {
    const kl = key.toLowerCase();
    if (kl.includes("delegat")) delegationRules = val;
    else if (kl.includes("convention")) conventions = val;
    else if (kl.includes("sub-agent") || kl.includes("subagent") || kl.includes("spawn")) {
      subAgents = parseBulletList(val);
      if (subAgents.length === 0) subAgents = val.split("\n").filter(Boolean);
    }
  }

  if (!delegationRules && !conventions && subAgents.length === 0) {
    delegationRules = content;
  }

  return { delegationRules, conventions, subAgents };
}

function serializeAgentsMd(f: AgentsFields): string {
  const lines = ["# Agents", ""];
  if (f.delegationRules) {
    lines.push("## Delegation Rules");
    lines.push("");
    lines.push(f.delegationRules);
    lines.push("");
  }
  if (f.conventions) {
    lines.push("## Conventions");
    lines.push("");
    lines.push(f.conventions);
    lines.push("");
  }
  if (f.subAgents.length > 0) {
    lines.push("## Sub-agents");
    lines.push("");
    for (const a of f.subAgents) lines.push(`- ${a}`);
    lines.push("");
  }
  return lines.join("\n");
}

/* ── Memory ── */
interface MemoryFields {
  lessonsLearned: string[];
  keyContext: string[];
  rawNotes: string;
}

function parseMemoryMd(content: string): MemoryFields {
  const lessonsLearned = parseBulletList(content, "Lessons Learned");
  const keyContext = parseBulletList(content, "Key Context");
  const sections = parseSections(content);

  let rawNotes = "";
  for (const [key, val] of Object.entries(sections)) {
    const kl = key.toLowerCase();
    if (kl.includes("notes") || kl.includes("raw") || kl.includes("other")) {
      rawNotes = val;
    }
  }

  if (lessonsLearned.length === 0 && keyContext.length === 0 && !rawNotes) {
    rawNotes = content;
  }

  return { lessonsLearned, keyContext, rawNotes };
}

function serializeMemoryMd(f: MemoryFields): string {
  const lines = ["# Memory", ""];
  lines.push(`_Last Updated: ${new Date().toISOString().split("T")[0]}_`);
  lines.push("");
  if (f.lessonsLearned.length > 0) {
    lines.push("## Lessons Learned");
    lines.push("");
    for (const l of f.lessonsLearned) lines.push(`- ${l}`);
    lines.push("");
  }
  if (f.keyContext.length > 0) {
    lines.push("## Key Context");
    lines.push("");
    for (const k of f.keyContext) lines.push(`- ${k}`);
    lines.push("");
  }
  if (f.rawNotes) {
    lines.push("## Notes");
    lines.push("");
    lines.push(f.rawNotes);
    lines.push("");
  }
  return lines.join("\n");
}

/* ── Heartbeat ── */
interface HeartbeatFields {
  currentStatus: string;
  checklist: Array<{ checked: boolean; text: string }>;
  active: boolean;
}

function parseHeartbeatMd(content: string): HeartbeatFields {
  const sections = parseSections(content);
  let currentStatus = "";
  for (const [key, val] of Object.entries(sections)) {
    const kl = key.toLowerCase();
    if (kl.includes("status") || kl.includes("current")) {
      currentStatus = val;
    }
  }

  const checklist = parseCheckboxList(content);
  const isActive = !content.toLowerCase().includes("active: false") &&
                   !content.toLowerCase().includes("inactive");

  if (!currentStatus && checklist.length === 0) {
    currentStatus = content;
  }

  return { currentStatus, checklist, active: isActive };
}

function serializeHeartbeatMd(f: HeartbeatFields): string {
  const lines = ["# Heartbeat", ""];
  lines.push(`Active: ${f.active ? "true" : "false"}`);
  lines.push("");
  if (f.currentStatus) {
    lines.push("## Current Status");
    lines.push("");
    lines.push(f.currentStatus);
    lines.push("");
  }
  if (f.checklist.length > 0) {
    lines.push("## Checklist");
    lines.push("");
    for (const item of f.checklist) {
      lines.push(`- [${item.checked ? "x" : " "}] ${item.text}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/* ═══════════════════════════════════════════════════════════════
   Theme constants
   ═══════════════════════════════════════════════════════════════ */

const DEPT_COLORS: Record<DepartmentKey, {
  accent: string;
  accentHex: string;
  border: string;
  bg: string;
  glow: string;
  badge: string;
  iconBg: string;
  line: string;
  selectedBorder: string;
}> = {
  Executive: {
    accent: "text-amber-400",
    accentHex: "#fbbf24",
    border: "border-amber-500/30",
    bg: "bg-gradient-to-br from-amber-950/50 via-amber-900/20 to-slate-900/90",
    glow: "shadow-[0_0_30px_-5px_rgba(251,191,36,0.15)]",
    badge: "bg-amber-900/50 text-amber-300 border-amber-700/40",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    line: "stroke-amber-500/40",
    selectedBorder: "border-amber-400",
  },
  Engineering: {
    accent: "text-cyan-400",
    accentHex: "#22d3ee",
    border: "border-cyan-500/30",
    bg: "bg-gradient-to-br from-cyan-950/50 via-cyan-900/20 to-slate-900/90",
    glow: "shadow-[0_0_30px_-5px_rgba(34,211,238,0.15)]",
    badge: "bg-cyan-900/50 text-cyan-300 border-cyan-700/40",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    line: "stroke-cyan-500/40",
    selectedBorder: "border-cyan-400",
  },
  Marketing: {
    accent: "text-rose-400",
    accentHex: "#fb7185",
    border: "border-rose-500/30",
    bg: "bg-gradient-to-br from-rose-950/50 via-rose-900/20 to-slate-900/90",
    glow: "shadow-[0_0_30px_-5px_rgba(251,113,133,0.15)]",
    badge: "bg-rose-900/50 text-rose-300 border-rose-700/40",
    iconBg: "bg-rose-500/10 border-rose-500/20",
    line: "stroke-rose-500/40",
    selectedBorder: "border-rose-400",
  },
  Revenue: {
    accent: "text-emerald-400",
    accentHex: "#34d399",
    border: "border-emerald-500/30",
    bg: "bg-gradient-to-br from-emerald-950/50 via-emerald-900/20 to-slate-900/90",
    glow: "shadow-[0_0_30px_-5px_rgba(52,211,153,0.15)]",
    badge: "bg-emerald-900/50 text-emerald-300 border-emerald-700/40",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    line: "stroke-emerald-500/40",
    selectedBorder: "border-emerald-400",
  },
};

// Special colors for COO (uses violet but dept is Executive)
const COO_COLORS = {
  accent: "text-violet-400",
  accentHex: "#a78bfa",
  border: "border-violet-500/30",
  bg: "bg-gradient-to-br from-violet-950/50 via-violet-900/20 to-slate-900/90",
  glow: "shadow-[0_0_30px_-5px_rgba(167,139,250,0.15)]",
  badge: "bg-violet-900/50 text-violet-300 border-violet-700/40",
  iconBg: "bg-violet-500/10 border-violet-500/20",
  line: "stroke-violet-500/40",
  selectedBorder: "border-violet-400",
};

function getAgentColors(agent: AgentState) {
  // COO gets special violet styling
  if (agent.id === "coo") return COO_COLORS;
  return DEPT_COLORS[agent.department] || DEPT_COLORS.Engineering;
}

const STATUS_CONFIG: Record<Status, { color: string; ring: string; label: string; pulse: boolean }> = {
  active:  { color: "bg-emerald-500", ring: "ring-emerald-500/30", label: "Active",  pulse: true  },
  idle:    { color: "bg-amber-500",   ring: "ring-amber-500/30",   label: "Idle",    pulse: false },
  standby: { color: "bg-slate-500",   ring: "ring-slate-500/30",   label: "Standby", pulse: false },
};

/* ═══════════════════════════════════════════════════════════════
   Default Org Data — initial state
   ═══════════════════════════════════════════════════════════════ */

function getDefaultAgents(): Record<string, AgentState> {
  return {
    ceo: {
      id: "ceo", name: "Joshua", title: "CEO", emoji: "👑",
      model: "Human", status: "active", department: "Executive",
      description: "Sets the vision. The builder.",
      reportsTo: null, directReports: ["coo"],
    },
    coo: {
      id: "coo", name: "Theo", title: "COO", emoji: "🔺",
      model: "Claude Opus 4", status: "active", department: "Executive",
      description: "Orchestrates all operations. The right hand.",
      reportsTo: "ceo", directReports: ["cto", "cmo", "cro"],
    },
    cto: {
      id: "cto", name: "Atlas", title: "CTO", emoji: "🗺️",
      model: "Claude Sonnet 4", status: "active", department: "Engineering",
      description: "Owns all code and infrastructure.",
      reportsTo: "coo", directReports: ["forge", "pixel", "sentinel"],
    },
    forge: {
      id: "forge", name: "Forge", title: "Backend Lead", emoji: "🔨",
      model: "Sonnet 4", status: "active", department: "Engineering",
      description: "APIs, databases, security",
      reportsTo: "cto", directReports: [],
    },
    pixel: {
      id: "pixel", name: "Pixel", title: "Frontend Lead", emoji: "✨",
      model: "Sonnet 4", status: "idle", department: "Engineering",
      description: "UI/UX, CI/CD, deployment",
      reportsTo: "cto", directReports: [],
    },
    sentinel: {
      id: "sentinel", name: "Sentinel", title: "QA Lead", emoji: "🛡️",
      model: "Haiku 3.5", status: "standby", department: "Engineering",
      description: "Testing, code review, quality gates",
      reportsTo: "cto", directReports: [],
    },
    cmo: {
      id: "cmo", name: "Muse", title: "CMO", emoji: "🎨",
      model: "Claude Sonnet 4", status: "active", department: "Marketing",
      description: "Content, creative direction, brand.",
      reportsTo: "coo", directReports: ["scriptbot", "echo"],
    },
    scriptbot: {
      id: "scriptbot", name: "ScriptBot", title: "Content Lead", emoji: "📝",
      model: "Sonnet 4", status: "active", department: "Marketing",
      description: "Podcast scripts, newsletter, blog posts",
      reportsTo: "cmo", directReports: [],
    },
    echo: {
      id: "echo", name: "Echo", title: "Social Lead", emoji: "📣",
      model: "Haiku 3.5", status: "idle", department: "Marketing",
      description: "Social scheduling, engagement, community",
      reportsTo: "cmo", directReports: [],
    },
    cro: {
      id: "cro", name: "Venture", title: "CRO", emoji: "💰",
      model: "Claude Sonnet 4", status: "active", department: "Revenue",
      description: "Growth strategy, monetization.",
      reportsTo: "coo", directReports: ["builder", "scout", "the-pit"],
    },
    builder: {
      id: "builder", name: "Builder", title: "Products Lead", emoji: "🏗️",
      model: "Sonnet 4", status: "active", department: "Revenue",
      description: "Product ideation, feature dev, market fit",
      reportsTo: "cro", directReports: [],
    },
    scout: {
      id: "scout", name: "Scout", title: "Growth Lead", emoji: "🔍",
      model: "Haiku 3.5", status: "idle", department: "Revenue",
      description: "User acquisition, community, analytics",
      reportsTo: "cro", directReports: [],
    },
    "the-pit": {
      id: "the-pit", name: "The Pit", title: "Trading Lead", emoji: "📈",
      model: "Sonnet 4", status: "active", department: "Revenue",
      description: "MRE pipeline, nightly optimization, signals",
      reportsTo: "cro", directReports: [],
    },
  };
}

/* ═══════════════════════════════════════════════════════════════
   Icon helpers — derive icon from agent data
   ═══════════════════════════════════════════════════════════════ */

const ICON_SIZE_CL = "w-6 h-6";
const ICON_SIZE_TL = "w-5 h-5";

function getAgentIcon(agent: AgentState, isCLevel: boolean): ReactNode {
  const sz = isCLevel ? ICON_SIZE_CL : ICON_SIZE_TL;
  const colors = getAgentColors(agent);
  const iconClass = `${sz} ${colors.accent}`;

  const iconMap: Record<string, ReactNode> = {
    ceo: <Zap className={iconClass} />,
    coo: <Bot className={iconClass} />,
    cto: <Shield className={iconClass} />,
    cmo: <Palette className={iconClass} />,
    cro: <DollarSign className={iconClass} />,
    forge: <Code className={iconClass} />,
    pixel: <Layout className={iconClass} />,
    sentinel: <TestTube className={iconClass} />,
    scriptbot: <FileText className={iconClass} />,
    echo: <Share2 className={iconClass} />,
    builder: <Rocket className={iconClass} />,
    scout: <Search className={iconClass} />,
    "the-pit": <BarChart3 className={iconClass} />,
  };

  return iconMap[agent.id] || <Bot className={iconClass} />;
}

const C_LEVEL_IDS = new Set(["ceo", "coo", "cto", "cmo", "cro"]);

function isCLevel(id: string): boolean {
  return C_LEVEL_IDS.has(id);
}

/* ═══════════════════════════════════════════════════════════════
   Cascading Update Logic
   ═══════════════════════════════════════════════════════════════ */

interface PendingChanges {
  name?: string;
  title?: string;
  emoji?: string;
  model?: string;
  status?: Status;
  department?: DepartmentKey;
  description?: string;
  reportsTo?: string | null;
  directReports?: string[];
}

function calculateCascades(
  agentId: string,
  changes: PendingChanges,
  currentAgents: Record<string, AgentState>,
  cascadeModel: boolean,
  cascadeDepartment: boolean,
): CascadeChange[] {
  const cascades: CascadeChange[] = [];
  const agent = currentAgents[agentId];
  if (!agent) return cascades;

  // Rule 1: Reports To changed
  if (changes.reportsTo !== undefined && changes.reportsTo !== agent.reportsTo) {
    const oldParent = agent.reportsTo;
    const newParent = changes.reportsTo;

    // Remove from old parent's directReports
    if (oldParent && currentAgents[oldParent]) {
      const oldParentAgent = currentAgents[oldParent];
      if (oldParentAgent.directReports.includes(agentId)) {
        cascades.push({
          agentId: oldParent,
          agentName: oldParentAgent.name,
          field: "directReports",
          oldValue: oldParentAgent.directReports.join(", "),
          newValue: oldParentAgent.directReports.filter(id => id !== agentId).join(", "),
        });
      }
    }

    // Add to new parent's directReports
    if (newParent && currentAgents[newParent]) {
      const newParentAgent = currentAgents[newParent];
      if (!newParentAgent.directReports.includes(agentId)) {
        cascades.push({
          agentId: newParent,
          agentName: newParentAgent.name,
          field: "directReports",
          oldValue: newParentAgent.directReports.join(", "),
          newValue: [...newParentAgent.directReports, agentId].join(", "),
        });
      }
    }
  }

  // Rule 2: Direct Reports changed
  if (changes.directReports !== undefined) {
    const oldDR = agent.directReports;
    const newDR = changes.directReports;

    // Added reports
    const added = newDR.filter(id => !oldDR.includes(id));
    for (const addedId of added) {
      if (currentAgents[addedId]) {
        const addedAgent = currentAgents[addedId];
        // Set their reportsTo to this agent
        cascades.push({
          agentId: addedId,
          agentName: addedAgent.name,
          field: "reportsTo",
          oldValue: addedAgent.reportsTo ? currentAgents[addedAgent.reportsTo]?.name || addedAgent.reportsTo : "None",
          newValue: changes.name || agent.name,
        });
        // Remove from old parent
        if (addedAgent.reportsTo && addedAgent.reportsTo !== agentId && currentAgents[addedAgent.reportsTo]) {
          const oldP = currentAgents[addedAgent.reportsTo];
          cascades.push({
            agentId: addedAgent.reportsTo,
            agentName: oldP.name,
            field: "directReports",
            oldValue: oldP.directReports.join(", "),
            newValue: oldP.directReports.filter(id => id !== addedId).join(", "),
          });
        }
      }
    }

    // Removed reports
    const removed = oldDR.filter(id => !newDR.includes(id));
    for (const removedId of removed) {
      if (currentAgents[removedId]) {
        const removedAgent = currentAgents[removedId];
        cascades.push({
          agentId: removedId,
          agentName: removedAgent.name,
          field: "reportsTo",
          oldValue: agent.name,
          newValue: "None",
        });
      }
    }
  }

  // Rule 4: Model changed on C-level with cascade enabled
  if (cascadeModel && changes.model && changes.model !== agent.model) {
    const allReports = getAllReportsRecursive(agentId, currentAgents);
    for (const reportId of allReports) {
      const reportAgent = currentAgents[reportId];
      if (reportAgent && reportAgent.model !== changes.model) {
        cascades.push({
          agentId: reportId,
          agentName: reportAgent.name,
          field: "model",
          oldValue: reportAgent.model,
          newValue: changes.model,
        });
      }
    }
  }

  // Rule 5: Department changed with cascade
  if (cascadeDepartment && changes.department && changes.department !== agent.department) {
    const allReports = getAllReportsRecursive(agentId, currentAgents);
    for (const reportId of allReports) {
      const reportAgent = currentAgents[reportId];
      if (reportAgent && reportAgent.department !== changes.department) {
        cascades.push({
          agentId: reportId,
          agentName: reportAgent.name,
          field: "department",
          oldValue: reportAgent.department,
          newValue: changes.department,
        });
      }
    }
  }

  return cascades;
}

function getAllReportsRecursive(agentId: string, agents: Record<string, AgentState>): string[] {
  const result: string[] = [];
  const agent = agents[agentId];
  if (!agent) return result;

  for (const reportId of agent.directReports) {
    result.push(reportId);
    result.push(...getAllReportsRecursive(reportId, agents));
  }
  return result;
}

function applyCascades(
  agents: Record<string, AgentState>,
  agentId: string,
  changes: PendingChanges,
  cascades: CascadeChange[],
): Record<string, AgentState> {
  const updated = { ...agents };

  // Apply direct changes to the agent
  updated[agentId] = { ...updated[agentId], ...changes };

  // Apply cascading changes
  for (const cascade of cascades) {
    if (!updated[cascade.agentId]) continue;
    const agent = { ...updated[cascade.agentId] };

    switch (cascade.field) {
      case "reportsTo":
        if (cascade.newValue === "None") {
          agent.reportsTo = null;
        } else {
          // Find agent by name to get ID
          const parentId = Object.values(updated).find(a => a.name === cascade.newValue)?.id;
          agent.reportsTo = parentId || null;
        }
        break;
      case "directReports":
        agent.directReports = cascade.newValue ? cascade.newValue.split(", ").filter(Boolean) : [];
        break;
      case "model":
        agent.model = cascade.newValue;
        break;
      case "department":
        agent.department = cascade.newValue as DepartmentKey;
        break;
    }

    updated[cascade.agentId] = agent;
  }

  return updated;
}

/* ═══════════════════════════════════════════════════════════════
   Build tree from flat map for rendering
   ═══════════════════════════════════════════════════════════════ */

interface TreeNode {
  agent: AgentState;
  children: TreeNode[];
}

function buildTree(agents: Record<string, AgentState>): TreeNode | null {
  // Find root (reportsTo === null)
  const root = Object.values(agents).find(a => a.reportsTo === null);
  if (!root) return null;

  function buildNode(agent: AgentState): TreeNode {
    const children = agent.directReports
      .map(id => agents[id])
      .filter(Boolean)
      .map(buildNode);
    return { agent, children };
  }

  return buildNode(root);
}

/* ═══════════════════════════════════════════════════════════════
   Fallback Data — used when API is offline (e.g. Vercel)
   ═══════════════════════════════════════════════════════════════ */

function buildFallbackIdentity(agent: AgentState, agents: Record<string, AgentState>): string {
  const reportsToName = agent.reportsTo ? agents[agent.reportsTo]?.name || "" : "—";
  const drNames = agent.directReports.map(id => agents[id]?.name || id).join(", ") || "None";
  return [
    "# Identity", "",
    `- **Name:** ${agent.name}`,
    `- **Title:** ${agent.title}`,
    `- **Model:** ${agent.model}`,
    `- **Emoji:** ${agent.emoji || ""}`,
    `- **Department:** ${agent.department}`,
    `- **Reports To:** ${reportsToName}`,
    `- **Direct Reports:** ${drNames}`,
    "", "## Role Description", "", agent.description, "",
  ].join("\n");
}

function buildFallbackSoul(agent: AgentState): string {
  return [
    "# Soul", "", "## Personality", "",
    `${agent.name} is a dedicated ${agent.title.toLowerCase()} focused on delivering excellence.`,
    "", "## Communication Style", "",
    "Direct and professional. Prefers concise, actionable communication.",
    "", "## Core Values", "",
    "- Excellence in execution", "- Team collaboration", "- Continuous improvement", "",
  ].join("\n");
}

function buildFallbackUser(): string {
  return ["# User", "", "- **Serves:** Joshua", "- **Timezone:** America/Los_Angeles", "- **Location:** Los Angeles, CA", ""].join("\n");
}

function buildFallbackTools(agent: AgentState): string {
  const tools = ["read", "write", "edit", "exec", "web_search", "web_fetch"];
  if (agent.department === "Marketing") tools.push("tts", "message", "image");
  if (agent.department === "Engineering") tools.push("browser", "canvas");
  if (agent.id === "coo") tools.push("message", "nodes", "tts", "browser", "canvas", "image");
  return ["# Tools", "", "## Available Tools", "", ...tools.map(t => `- ${t}`), ""].join("\n");
}

function buildFallbackAgents(agent: AgentState, agents: Record<string, AgentState>): string {
  const children = agent.directReports.map(id => agents[id]?.name || id);
  return [
    "# Agents", "", "## Delegation Rules", "",
    children.length > 0
      ? `Delegates work to: ${children.join(", ")}. Routes tasks based on domain expertise.`
      : "Individual contributor. No sub-agents.",
    "",
  ].join("\n");
}

function buildFallbackMemory(): string {
  return ["# Memory", "", `_Last Updated: ${new Date().toISOString().split("T")[0]}_`, "", "## Notes", "", "No memory entries yet.", ""].join("\n");
}

function buildFallbackHeartbeat(agent: AgentState): string {
  return [
    "# Heartbeat", "", `Active: ${agent.status === "active" ? "true" : "false"}`, "",
    "## Current Status", "",
    `${agent.status === "active" ? "Online and operational." : agent.status === "idle" ? "Idle — waiting for tasks." : "On standby."}`,
    "",
  ].join("\n");
}

function getFallbackContent(agentId: string, tab: FileTab, agents: Record<string, AgentState>): string {
  const agent = agents[agentId];
  if (!agent) return "";
  switch (tab) {
    case "IDENTITY.md": return buildFallbackIdentity(agent, agents);
    case "SOUL.md": return buildFallbackSoul(agent);
    case "USER.md": return buildFallbackUser();
    case "TOOLS.md": return buildFallbackTools(agent);
    case "AGENTS.md": return buildFallbackAgents(agent, agents);
    case "MEMORY.md": return buildFallbackMemory();
    case "HEARTBEAT.md": return buildFallbackHeartbeat(agent);
  }
}

/* ═══════════════════════════════════════════════════════════════
   Helper: Model Badge
   ═══════════════════════════════════════════════════════════════ */

function ModelBadge({ model }: { model: string }) {
  let classes = "bg-slate-800/60 text-slate-300 border-slate-700/50";
  if (model === "Human")
    classes = "bg-amber-900/40 text-amber-300 border-amber-700/40";
  else if (model.includes("Opus"))
    classes = "bg-violet-900/40 text-violet-300 border-violet-700/40";
  else if (model.includes("Sonnet"))
    classes = "bg-blue-900/40 text-blue-300 border-blue-700/40";
  else if (model.includes("Haiku"))
    classes = "bg-teal-900/40 text-teal-300 border-teal-700/40";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide border ${classes}`}
    >
      {model}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Helper: Status Dot
   ═══════════════════════════════════════════════════════════════ */

function StatusDot({ status, size = "sm" }: { status: Status; size?: "sm" | "md" }) {
  const cfg = STATUS_CONFIG[status];
  const sz = size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";
  return (
    <span className="relative inline-flex">
      {cfg.pulse && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-40 animate-ping`}
        />
      )}
      <span className={`relative inline-flex rounded-full ${sz} ${cfg.color} ring-2 ${cfg.ring}`} />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Toast Notification System
   ═══════════════════════════════════════════════════════════════ */

interface ToastData {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastIdCounter = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-slide-in-right ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-700/50 text-emerald-300"
              : "bg-red-950/90 border-red-700/50 text-red-300"
          }`}
        >
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} className="ml-2 text-slate-400 hover:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Card Components (state-driven)
   ═══════════════════════════════════════════════════════════════ */

function ExecutiveCard({ agent, selected, onClick }: { agent: AgentState; selected: boolean; onClick: () => void }) {
  const dept = getAgentColors(agent);
  const icon = getAgentIcon(agent, true);
  return (
    <button
      onClick={onClick}
      className={`relative rounded-2xl border-2 ${selected ? `${dept.selectedBorder} shadow-[0_0_20px_-3px_${dept.accentHex}40]` : dept.border} ${dept.bg} ${dept.glow} p-6 transition-all duration-300 hover:scale-[1.01] w-full text-left cursor-pointer`}
    >
      <div
        className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent ${dept.accent.replace("text-", "via-")} to-transparent opacity-40`}
      />
      <div className="flex items-start gap-4">
        <div className={`shrink-0 p-3 rounded-xl border ${dept.iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            {agent.emoji && <span className="text-lg">{agent.emoji}</span>}
            <h3 className="font-bold text-lg text-slate-100 tracking-tight">
              {agent.name}
            </h3>
            <span className={`text-sm font-semibold ${dept.accent}`}>
              {agent.title}
            </span>
            <StatusDot status={agent.status} size="md" />
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">
            {agent.description}
          </p>
          <ModelBadge model={agent.model} />
        </div>
      </div>
    </button>
  );
}

function TeamLeadCard({ agent, selected, onClick }: { agent: AgentState; selected: boolean; onClick: () => void }) {
  const dept = getAgentColors(agent);
  const icon = getAgentIcon(agent, false);
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border-2 ${selected ? `${dept.selectedBorder} shadow-[0_0_15px_-3px_${dept.accentHex}40]` : "border-slate-800/60"} bg-slate-900/80 backdrop-blur-sm p-4 transition-all duration-200 hover:border-slate-700/80 hover:bg-slate-900/90 w-full text-left cursor-pointer`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 p-2 rounded-lg border ${dept.iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {agent.emoji && <span className="text-sm">{agent.emoji}</span>}
            <h4 className="font-semibold text-sm text-slate-200">{agent.name}</h4>
            <StatusDot status={agent.status} />
          </div>
          <p className={`text-xs font-medium ${dept.accent} opacity-80 mb-1`}>
            {agent.title}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mb-2">
            {agent.description}
          </p>
          <ModelBadge model={agent.model} />
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SVG Connector Lines
   ═══════════════════════════════════════════════════════════════ */

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

function ConnectorOverlay({ lines }: { lines: LineSegment[] }) {
  if (lines.length === 0) return null;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {lines.map((seg, i) => (
        <g key={i}>
          <line
            x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
            stroke={seg.color} strokeWidth="2" opacity="0.15" filter="url(#line-glow)"
          />
          <line
            x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
            stroke={seg.color} strokeWidth="1.5" opacity="0.35" strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Desktop Tree Layout — STATE DRIVEN
   ═══════════════════════════════════════════════════════════════ */

function DesktopTree({ agents, selectedId, onSelect }: { agents: Record<string, AgentState>; selectedId: string | null; onSelect: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineSegment[]>([]);

  const tree = useMemo(() => buildTree(agents), [agents]);

  const computeLines = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const newLines: LineSegment[] = [];

    const getAnchor = (el: Element, position: "bottom" | "top") => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - rootRect.left,
        y: position === "bottom" ? r.bottom - rootRect.top : r.top - rootRect.top,
      };
    };

    const connect = (parentId: string, childIds: string[], color: string) => {
      const parentEl = root.querySelector(`[data-node="${parentId}"]`);
      if (!parentEl) return;
      const parentAnchor = getAnchor(parentEl, "bottom");

      const childAnchors = childIds
        .map((id) => {
          const el = root.querySelector(`[data-node="${id}"]`);
          if (!el) return null;
          return getAnchor(el, "top");
        })
        .filter(Boolean) as { x: number; y: number }[];

      if (childAnchors.length === 0) return;
      const midY = parentAnchor.y + (childAnchors[0].y - parentAnchor.y) / 2;
      newLines.push({ x1: parentAnchor.x, y1: parentAnchor.y, x2: parentAnchor.x, y2: midY, color });

      if (childAnchors.length === 1) {
        newLines.push({ x1: parentAnchor.x, y1: midY, x2: childAnchors[0].x, y2: childAnchors[0].y, color });
      } else {
        const leftX = Math.min(...childAnchors.map((a) => a.x));
        const rightX = Math.max(...childAnchors.map((a) => a.x));
        newLines.push({ x1: leftX, y1: midY, x2: rightX, y2: midY, color });
        for (const child of childAnchors) {
          newLines.push({ x1: child.x, y1: midY, x2: child.x, y2: child.y, color });
        }
      }
    };

    // Dynamically connect based on state
    for (const agent of Object.values(agents)) {
      if (agent.directReports.length > 0) {
        const colors = getAgentColors(agent);
        connect(agent.id, agent.directReports, colors.accentHex);
      }
    }

    setLines(newLines);
  }, [agents]);

  useEffect(() => {
    const timer = setTimeout(computeLines, 100);
    window.addEventListener("resize", computeLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", computeLines);
    };
  }, [computeLines]);

  if (!tree) return null;

  // Build display structure from tree
  const ceoAgent = tree.agent;
  const cooNode = tree.children.find(c => c.agent.id === "coo") || tree.children[0];
  if (!cooNode) {
    // Just CEO, no children
    return (
      <div ref={containerRef} className="relative hidden lg:block">
        <ConnectorOverlay lines={lines} />
        <div className="flex justify-center mb-16 relative z-10">
          <div className="w-full max-w-md" data-node={ceoAgent.id}>
            <ExecutiveCard agent={ceoAgent} selected={selectedId === ceoAgent.id} onClick={() => onSelect(ceoAgent.id)} />
          </div>
        </div>
      </div>
    );
  }

  const cooAgent = cooNode.agent;
  // C-level executives (children of COO)
  const cLevelNodes = cooNode.children;

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <ConnectorOverlay lines={lines} />

      {/* CEO */}
      <div className="flex justify-center mb-16 relative z-10">
        <div className="w-full max-w-md" data-node={ceoAgent.id}>
          <ExecutiveCard agent={ceoAgent} selected={selectedId === ceoAgent.id} onClick={() => onSelect(ceoAgent.id)} />
        </div>
      </div>

      {/* COO */}
      <div className="flex justify-center mb-16 relative z-10">
        <div className="w-full max-w-md" data-node={cooAgent.id}>
          <ExecutiveCard agent={cooAgent} selected={selectedId === cooAgent.id} onClick={() => onSelect(cooAgent.id)} />
        </div>
      </div>

      {/* C-Level executives */}
      {cLevelNodes.length > 0 && (
        <div className={`grid gap-6 mb-16 relative z-10`} style={{ gridTemplateColumns: `repeat(${cLevelNodes.length}, 1fr)` }}>
          {cLevelNodes.map(node => (
            <div key={node.agent.id} data-node={node.agent.id}>
              <ExecutiveCard agent={node.agent} selected={selectedId === node.agent.id} onClick={() => onSelect(node.agent.id)} />
            </div>
          ))}
        </div>
      )}

      {/* Team leads (children of C-levels) */}
      {cLevelNodes.length > 0 && (
        <div className="grid gap-6 relative z-10" style={{ gridTemplateColumns: `repeat(${cLevelNodes.length}, 1fr)` }}>
          {cLevelNodes.map(node => (
            <div key={node.agent.id} className="space-y-3">
              {node.children.map(leaf => (
                <div key={leaf.agent.id} data-node={leaf.agent.id}>
                  <TeamLeadCard agent={leaf.agent} selected={selectedId === leaf.agent.id} onClick={() => onSelect(leaf.agent.id)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Mobile Layout — STATE DRIVEN
   ═══════════════════════════════════════════════════════════════ */

function MobileTree({ agents, selectedId, onSelect }: { agents: Record<string, AgentState>; selectedId: string | null; onSelect: (id: string) => void }) {
  const tree = useMemo(() => buildTree(agents), [agents]);
  if (!tree) return null;

  const cooNode = tree.children[0];

  function RenderNode({ node, depth }: { node: TreeNode; depth: number }) {
    const colors = getAgentColors(node.agent);
    const isExec = isCLevel(node.agent.id);

    return (
      <div className={depth > 0 ? `ml-3 pl-4 border-l-2 ${colors.border}` : ""}>
        <div className="space-y-3">
          {isExec ? (
            <ExecutiveCard agent={node.agent} selected={selectedId === node.agent.id} onClick={() => onSelect(node.agent.id)} />
          ) : (
            <TeamLeadCard agent={node.agent} selected={selectedId === node.agent.id} onClick={() => onSelect(node.agent.id)} />
          )}
          {node.children.map(child => (
            <RenderNode key={child.agent.id} node={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="lg:hidden space-y-6">
      <ExecutiveCard agent={tree.agent} selected={selectedId === tree.agent.id} onClick={() => onSelect(tree.agent.id)} />
      {cooNode && (
        <div className="ml-3 pl-4 border-l-2 border-violet-500/30 space-y-6">
          <ExecutiveCard agent={cooNode.agent} selected={selectedId === cooNode.agent.id} onClick={() => onSelect(cooNode.agent.id)} />
          {cooNode.children.map(cNode => (
            <RenderNode key={cNode.agent.id} node={cNode} depth={1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Status Legend & Compact Stats Bar
   ═══════════════════════════════════════════════════════════════ */

function StatsAndLegendBar({ agents }: { agents: Record<string, AgentState> }) {
  const allAgents = Object.values(agents);
  const activeCount = allAgents.filter((a) => a.status === "active").length;
  const idleCount = allAgents.filter((a) => a.status === "idle").length;
  const standbyCount = allAgents.filter((a) => a.status === "standby").length;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 bg-slate-950/60 rounded-xl border border-slate-800/60 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-slate-100 tabular-nums">{allAgents.length}</span>
        <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Agents</span>
      </div>
      <div className="w-px h-4 bg-slate-700/60" />
      <div className="flex items-center gap-1.5">
        <StatusDot status="active" />
        <span className="text-sm font-bold text-emerald-400 tabular-nums">{activeCount}</span>
        <span className="text-[11px] text-slate-500 font-medium">Active</span>
      </div>
      <div className="flex items-center gap-1.5">
        <StatusDot status="idle" />
        <span className="text-sm font-bold text-amber-400 tabular-nums">{idleCount}</span>
        <span className="text-[11px] text-slate-500 font-medium">Idle</span>
      </div>
      <div className="flex items-center gap-1.5">
        <StatusDot status="standby" />
        <span className="text-sm font-bold text-slate-400 tabular-nums">{standbyCount}</span>
        <span className="text-[11px] text-slate-500 font-medium">Standby</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Form Components for Workspace Panel
   ═══════════════════════════════════════════════════════════════ */

function FormInput({ label, value, onChange, placeholder, small, error }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; small?: boolean; error?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${small ? "w-20" : "w-full"} px-3 py-2 bg-slate-800 border ${error ? "border-red-500" : "border-slate-700"} rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors`}
      />
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-violet-500 transition-colors appearance-none cursor-pointer"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function FormTagInput({ label, tags, onChange }: {
  label: string; tags: string[]; onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput("");
    }
  };
  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };
  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded-full text-xs text-slate-200">
            {tag}
            <button onClick={() => removeTag(i)} className="text-slate-400 hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder="Add and press Enter..."
          className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <button onClick={addTag} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5 text-slate-300" />
        </button>
      </div>
    </div>
  );
}

function FormEditableList({ label, items, onChange }: {
  label: string; items: string[]; onChange: (items: string[]) => void;
}) {
  const addItem = () => onChange([...items, ""]);
  const updateItem = (idx: number, val: string) => {
    const updated = [...items];
    updated[idx] = val;
    onChange(updated);
  };
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">{label}</label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 group">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <button
              onClick={() => removeItem(i)}
              className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addItem}
        className="mt-2 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add item
      </button>
    </div>
  );
}

function FormCheckboxList({ label, items, onChange }: {
  label: string;
  items: Array<{ checked: boolean; text: string }>;
  onChange: (items: Array<{ checked: boolean; text: string }>) => void;
}) {
  const addItem = () => onChange([...items, { checked: false, text: "" }]);
  const updateItem = (idx: number, field: "checked" | "text", val: boolean | string) => {
    const updated = [...items];
    if (field === "checked") updated[idx] = { ...updated[idx], checked: val as boolean };
    else updated[idx] = { ...updated[idx], text: val as string };
    onChange(updated);
  };
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">{label}</label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => updateItem(i, "checked", e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500/30 cursor-pointer"
            />
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateItem(i, "text", e.target.value)}
              className={`flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-violet-500 transition-colors ${item.checked ? "line-through opacity-60" : ""}`}
            />
            <button
              onClick={() => removeItem(i)}
              className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addItem}
        className="mt-2 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add item
      </button>
    </div>
  );
}

function FormToggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-slate-700"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function FormToolsChecklist({ tools, onChange }: {
  tools: Record<string, boolean>;
  onChange: (tools: Record<string, boolean>) => void;
}) {
  const toggle = (tool: string) => {
    onChange({ ...tools, [tool]: !tools[tool] });
  };
  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Available Tools</label>
      <div className="grid grid-cols-2 gap-1.5">
        {COMMON_TOOLS.map((tool) => (
          <button
            key={tool}
            onClick={() => toggle(tool)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              tools[tool]
                ? "bg-violet-900/40 text-violet-300 border border-violet-600/40"
                : "bg-slate-800/60 text-slate-500 border border-slate-700/40 hover:text-slate-300"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${tools[tool] ? "bg-violet-400" : "bg-slate-600"}`} />
            {tool}
          </button>
        ))}
      </div>
    </div>
  );
}

function FormCustomSections({ sections, onChange }: {
  sections: Array<{ title: string; content: string }>;
  onChange: (sections: Array<{ title: string; content: string }>) => void;
}) {
  const addSection = () => onChange([...sections, { title: "", content: "" }]);
  const updateSection = (idx: number, field: "title" | "content", val: string) => {
    const updated = [...sections];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange(updated);
  };
  const removeSection = (idx: number) => onChange(sections.filter((_, i) => i !== idx));

  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Custom Tool Notes</label>
      <div className="space-y-3">
        {sections.map((sec, i) => (
          <div key={i} className="border border-slate-700/50 rounded-lg p-3 space-y-2 group relative">
            <button
              onClick={() => removeSection(i)}
              className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              value={sec.title}
              onChange={(e) => updateSection(i, "title", e.target.value)}
              placeholder="Section title"
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <textarea
              value={sec.content}
              onChange={(e) => updateSection(i, "content", e.target.value)}
              placeholder="Notes..."
              rows={3}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>
        ))}
      </div>
      <button
        onClick={addSection}
        className="mt-2 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add section
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Multi-Select Chips for Direct Reports
   ═══════════════════════════════════════════════════════════════ */

function MultiSelectChips({ label, selected, options, onChange }: {
  label: string;
  selected: string[];
  options: Array<{ id: string; name: string }>;
  onChange: (selected: string[]) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const available = options.filter(o => !selected.includes(o.id));

  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selected.map(id => {
          const opt = options.find(o => o.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-violet-900/30 border border-violet-600/30 rounded-full text-xs text-violet-300">
              {opt?.name || id}
              <button onClick={() => onChange(selected.filter(s => s !== id))} className="text-violet-400 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        {selected.length === 0 && (
          <span className="text-xs text-slate-500 italic">None</span>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add report
        </button>
        {showDropdown && available.length > 0 && (
          <div className="absolute top-6 left-0 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 max-h-40 overflow-y-auto min-w-[160px]">
            {available.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  onChange([...selected, opt.id]);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {opt.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   File-specific Form Renderers
   ═══════════════════════════════════════════════════════════════ */

function IdentityForm({ data, onChange, agents, currentAgentId }: {
  data: IdentityFields;
  onChange: (d: IdentityFields) => void;
  agents: Record<string, AgentState>;
  currentAgentId: string;
}) {
  const allAgentsList = Object.values(agents).filter(a => a.id !== currentAgentId);
  const reportsToOptions = allAgentsList.map(a => a.name);
  const drOptions = allAgentsList.map(a => ({ id: a.id, name: a.name }));
  const currentDR = data.directReports ? data.directReports.split(", ").map(name => {
    const found = Object.values(agents).find(a => a.name === name.trim());
    return found?.id || "";
  }).filter(Boolean) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Name" value={data.name} onChange={(v) => onChange({ ...data, name: v })} error={!data.name} />
        <FormInput label="Title" value={data.title} onChange={(v) => onChange({ ...data, title: v })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Model"
          value={data.model}
          onChange={(v) => onChange({ ...data, model: v })}
          options={[...MODEL_OPTIONS, "Human", "Sonnet 4", "GPT-5 Mini"]}
        />
        <FormInput label="Emoji" value={data.emoji} onChange={(v) => onChange({ ...data, emoji: v })} small />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Department"
          value={data.department}
          onChange={(v) => onChange({ ...data, department: v })}
          options={DEPARTMENT_OPTIONS}
        />
        <FormSelect
          label="Reports To"
          value={data.reportsTo}
          onChange={(v) => onChange({ ...data, reportsTo: v })}
          options={reportsToOptions}
        />
      </div>
      <FormSelect
        label="Status"
        value={agents[currentAgentId]?.status || "active"}
        onChange={() => {/* status handled via agent state */}}
        options={STATUS_OPTIONS}
      />
      <MultiSelectChips
        label="Direct Reports"
        selected={currentDR}
        options={drOptions}
        onChange={(ids) => {
          const names = ids.map(id => agents[id]?.name || id).join(", ");
          onChange({ ...data, directReports: names });
        }}
      />
      <FormTextarea label="Role Description" value={data.roleDescription} onChange={(v) => onChange({ ...data, roleDescription: v })} rows={4} placeholder="Describe this agent's role and responsibilities..." />
    </div>
  );
}

function SoulForm({ data, onChange }: { data: SoulFields; onChange: (d: SoulFields) => void }) {
  return (
    <div className="space-y-4">
      <FormTextarea label="Personality Summary" value={data.personalitySummary} onChange={(v) => onChange({ ...data, personalitySummary: v })} rows={5} placeholder="Describe this agent's personality and approach..." />
      <FormTextarea label="Communication Style" value={data.communicationStyle} onChange={(v) => onChange({ ...data, communicationStyle: v })} rows={3} placeholder="How does this agent communicate?" />
      <FormTagInput label="Key Phrases" tags={data.keyPhrases} onChange={(v) => onChange({ ...data, keyPhrases: v })} />
      <FormEditableList label="Core Values" items={data.coreValues} onChange={(v) => onChange({ ...data, coreValues: v })} />
    </div>
  );
}

function UserForm({ data, onChange }: { data: UserFields; onChange: (d: UserFields) => void }) {
  return (
    <div className="space-y-4">
      <FormInput label="Serves" value={data.serves} onChange={(v) => onChange({ ...data, serves: v })} placeholder="Joshua" />
      <FormSelect
        label="Timezone"
        value={data.timezone}
        onChange={(v) => onChange({ ...data, timezone: v })}
        options={["America/Los_Angeles", "America/New_York", "America/Chicago", "America/Denver", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney", "UTC"]}
      />
      <FormInput label="Location" value={data.location} onChange={(v) => onChange({ ...data, location: v })} placeholder="City, State" />
      <FormTextarea label="Notes" value={data.notes} onChange={(v) => onChange({ ...data, notes: v })} rows={4} />
    </div>
  );
}

function ToolsForm({ data, onChange }: { data: ToolsFields; onChange: (d: ToolsFields) => void }) {
  return (
    <div className="space-y-4">
      <FormToolsChecklist tools={data.availableTools} onChange={(v) => onChange({ ...data, availableTools: v })} />
      <FormCustomSections sections={data.customSections} onChange={(v) => onChange({ ...data, customSections: v })} />
    </div>
  );
}

function AgentsForm({ data, onChange }: { data: AgentsFields; onChange: (d: AgentsFields) => void }) {
  return (
    <div className="space-y-4">
      <FormTextarea label="Delegation Rules" value={data.delegationRules} onChange={(v) => onChange({ ...data, delegationRules: v })} rows={5} placeholder="How and when should this agent delegate work?" />
      <FormTextarea label="Conventions" value={data.conventions} onChange={(v) => onChange({ ...data, conventions: v })} rows={4} placeholder="Team conventions and standards..." />
      <FormEditableList label="Sub-agents" items={data.subAgents} onChange={(v) => onChange({ ...data, subAgents: v })} />
    </div>
  );
}

function MemoryForm({ data, onChange }: { data: MemoryFields; onChange: (d: MemoryFields) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Last Updated:</span>
        <span className="font-mono text-slate-400">{new Date().toISOString().split("T")[0]}</span>
      </div>
      <FormEditableList label="Lessons Learned" items={data.lessonsLearned} onChange={(v) => onChange({ ...data, lessonsLearned: v })} />
      <FormEditableList label="Key Context" items={data.keyContext} onChange={(v) => onChange({ ...data, keyContext: v })} />
      <FormTextarea label="Raw Notes" value={data.rawNotes} onChange={(v) => onChange({ ...data, rawNotes: v })} rows={6} placeholder="Freeform notes..." />
    </div>
  );
}

function HeartbeatForm({ data, onChange }: { data: HeartbeatFields; onChange: (d: HeartbeatFields) => void }) {
  return (
    <div className="space-y-4">
      <FormToggle label="Active" checked={data.active} onChange={(v) => onChange({ ...data, active: v })} />
      <FormTextarea label="Current Status" value={data.currentStatus} onChange={(v) => onChange({ ...data, currentStatus: v })} rows={3} placeholder="What is this agent currently doing?" />
      <FormCheckboxList label="Checklist" items={data.checklist} onChange={(v) => onChange({ ...data, checklist: v })} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Loading Skeleton
   ═══════════════════════════════════════════════════════════════ */

function WorkspaceSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-4 w-48 bg-slate-800 rounded" />
      <div className="h-3 w-32 bg-slate-800/60 rounded" />
      <div className="space-y-3 mt-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 bg-slate-800/40 rounded" />
            <div className="h-9 w-full bg-slate-800/30 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Changes Summary Modal
   ═══════════════════════════════════════════════════════════════ */

function ChangesSummaryModal({
  agent,
  directChanges,
  cascades,
  onConfirm,
  onCancel,
}: {
  agent: AgentState;
  directChanges: Array<{ field: string; oldValue: string; newValue: string }>;
  cascades: CascadeChange[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const colors = getAgentColors(agent);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-700" style={{ borderTopWidth: "3px", borderTopColor: colors.accentHex, borderTopStyle: "solid" }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Changes Summary</h3>
                <p className="text-sm text-slate-400">
                  Agent: {agent.emoji} {agent.name} ({agent.title})
                </p>
              </div>
            </div>
          </div>

          {/* Direct Changes */}
          <div className="px-6 py-4 space-y-3">
            {directChanges.length > 0 && (
              <div>
                <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Direct Changes</h4>
                <div className="space-y-1.5">
                  {directChanges.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400 font-medium">{c.field}:</span>
                      <span className="text-red-400/70 line-through">{c.oldValue}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="text-emerald-400">{c.newValue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cascading Changes */}
            {cascades.length > 0 && (
              <div>
                <h4 className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-2">
                  ⚡ Cascading Changes ({cascades.length})
                </h4>
                <div className="space-y-1.5 ml-2">
                  {cascades.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-amber-300/80">
                      <span className="text-amber-500">→</span>
                      <span className="font-medium">{c.agentName}:</span>
                      <span className="text-slate-400">{c.field}</span>
                      <span className="text-red-400/60 text-xs line-through">{c.oldValue}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="text-amber-300 text-xs">{c.newValue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {directChanges.length === 0 && cascades.length === 0 && (
              <p className="text-sm text-slate-500 italic">No changes detected.</p>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 transition-all"
            >
              Apply All Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Delete Confirmation Modal
   ═══════════════════════════════════════════════════════════════ */

function DeleteConfirmModal({
  agent,
  agents,
  onConfirm,
  onCancel,
}: {
  agent: AgentState;
  agents: Record<string, AgentState>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const parentName = agent.reportsTo ? agents[agent.reportsTo]?.name || "unknown" : "none";
  const childNames = agent.directReports.map(id => agents[id]?.name || id);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-red-700/50 rounded-xl shadow-2xl max-w-md w-full">
          <div className="px-6 py-4 border-b border-slate-700" style={{ borderTopWidth: "3px", borderTopColor: "#ef4444", borderTopStyle: "solid" }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Remove Agent</h3>
                <p className="text-sm text-slate-400">
                  {agent.emoji} {agent.name} ({agent.title})
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 space-y-3">
            <p className="text-sm text-slate-300">
              Are you sure you want to remove <strong>{agent.name}</strong>?
            </p>
            {childNames.length > 0 && (
              <div className="text-sm text-amber-400">
                <p className="font-semibold mb-1">Their direct reports will be reassigned to {parentName}:</p>
                <ul className="ml-4 space-y-0.5 text-amber-300/80">
                  {childNames.map(name => (
                    <li key={name}>→ {name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition-colors">
              Remove Agent
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Discard Changes Confirmation
   ═══════════════════════════════════════════════════════════════ */

function DiscardConfirmModal({ onDiscard, onCancel }: { onDiscard: () => void; onCancel: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-amber-700/50 rounded-xl shadow-2xl max-w-sm w-full">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-slate-100">Unsaved Changes</h3>
            </div>
            <p className="text-sm text-slate-300">
              You have unsaved changes. Discard them?
            </p>
          </div>
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors">
              Keep Editing
            </button>
            <button onClick={onDiscard} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 transition-colors">
              Discard
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Workspace Panel (Overlay/Drawer) — CASCADING EDITS
   ═══════════════════════════════════════════════════════════════ */

type FormData =
  | { type: "IDENTITY.md"; data: IdentityFields }
  | { type: "SOUL.md"; data: SoulFields }
  | { type: "USER.md"; data: UserFields }
  | { type: "TOOLS.md"; data: ToolsFields }
  | { type: "AGENTS.md"; data: AgentsFields }
  | { type: "MEMORY.md"; data: MemoryFields }
  | { type: "HEARTBEAT.md"; data: HeartbeatFields };

function WorkspacePanel({
  agentId,
  agents,
  onClose,
  onAgentsUpdate,
  onDeleteAgent,
  addToast,
  isNewAgent,
}: {
  agentId: string;
  agents: Record<string, AgentState>;
  onClose: () => void;
  onAgentsUpdate: (updated: Record<string, AgentState>) => void;
  onDeleteAgent: (id: string) => void;
  addToast: (message: string, type: "success" | "error") => void;
  isNewAgent?: boolean;
}) {
  const agent = agents[agentId];
  const dept = agent ? getAgentColors(agent) : DEPT_COLORS.Engineering;

  const [activeTab, setActiveTab] = useState<FileTab>("IDENTITY.md");
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [rawContent, setRawContent] = useState("");
  const [formData, setFormData] = useState<FormData | null>(null);
  const [originalContent, setOriginalContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(isNewAgent || false);
  const [dirtyTabs, setDirtyTabs] = useState<Set<FileTab>>(new Set());
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [pendingDirectChanges, setPendingDirectChanges] = useState<Array<{ field: string; oldValue: string; newValue: string }>>([]);
  const [pendingCascades, setPendingCascades] = useState<CascadeChange[]>([]);
  const [cascadeModelToReports, setCascadeModelToReports] = useState(false);
  const [cascadeDeptToReports, setCascadeDeptToReports] = useState(false);

  // Original identity for diff detection
  const [originalIdentity, setOriginalIdentity] = useState<IdentityFields | null>(null);

  const fetchFile = useCallback(async (tab: FileTab) => {
    setLoading(true);
    setUsingFallback(false);

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/files/${encodeURIComponent(tab)}`);
      if (res.ok) {
        const data = await res.json();
        const content = data.content as string;
        setRawContent(content);
        setOriginalContent(content);
        parseIntoForm(tab, content);
        setLoading(false);
        return;
      }
    } catch {
      // API offline
    }

    const fallback = getFallbackContent(agentId, tab, agents);
    setRawContent(fallback);
    setOriginalContent(fallback);
    setUsingFallback(true);
    parseIntoForm(tab, fallback);
    setLoading(false);
  }, [agentId, agents]);

  const parseIntoForm = (tab: FileTab, content: string) => {
    switch (tab) {
      case "IDENTITY.md": {
        const parsed = parseIdentityMd(content);
        setFormData({ type: "IDENTITY.md", data: parsed });
        setOriginalIdentity(parsed);
        break;
      }
      case "SOUL.md":
        setFormData({ type: "SOUL.md", data: parseSoulMd(content) });
        break;
      case "USER.md":
        setFormData({ type: "USER.md", data: parseUserMd(content) });
        break;
      case "TOOLS.md":
        setFormData({ type: "TOOLS.md", data: parseToolsMd(content) });
        break;
      case "AGENTS.md":
        setFormData({ type: "AGENTS.md", data: parseAgentsMd(content) });
        break;
      case "MEMORY.md":
        setFormData({ type: "MEMORY.md", data: parseMemoryMd(content) });
        break;
      case "HEARTBEAT.md":
        setFormData({ type: "HEARTBEAT.md", data: parseHeartbeatMd(content) });
        break;
    }
  };

  useEffect(() => {
    fetchFile(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, agentId]);

  const serializeFormData = useCallback((): string => {
    if (!formData) return rawContent;
    switch (formData.type) {
      case "IDENTITY.md": return serializeIdentityMd(formData.data);
      case "SOUL.md": return serializeSoulMd(formData.data);
      case "USER.md": return serializeUserMd(formData.data);
      case "TOOLS.md": return serializeToolsMd(formData.data);
      case "AGENTS.md": return serializeAgentsMd(formData.data);
      case "MEMORY.md": return serializeMemoryMd(formData.data);
      case "HEARTBEAT.md": return serializeHeartbeatMd(formData.data);
    }
  }, [formData, rawContent]);

  // Build changes for the summary modal
  const prepareSave = () => {
    if (!formData || !agent) return;

    const directChanges: Array<{ field: string; oldValue: string; newValue: string }> = [];
    let pendingAgentChanges: PendingChanges = {};

    if (formData.type === "IDENTITY.md" && originalIdentity) {
      const d = formData.data;
      const o = originalIdentity;

      if (d.name !== o.name) {
        directChanges.push({ field: "Name", oldValue: o.name, newValue: d.name });
        pendingAgentChanges.name = d.name;
      }
      if (d.title !== o.title) {
        directChanges.push({ field: "Title", oldValue: o.title, newValue: d.title });
        pendingAgentChanges.title = d.title;
      }
      if (d.model !== o.model) {
        directChanges.push({ field: "Model", oldValue: o.model, newValue: d.model });
        pendingAgentChanges.model = d.model;
      }
      if (d.emoji !== o.emoji) {
        directChanges.push({ field: "Emoji", oldValue: o.emoji, newValue: d.emoji });
        pendingAgentChanges.emoji = d.emoji;
      }
      if (d.department !== o.department) {
        directChanges.push({ field: "Department", oldValue: o.department, newValue: d.department });
        pendingAgentChanges.department = d.department as DepartmentKey;
      }
      if (d.reportsTo !== o.reportsTo) {
        directChanges.push({ field: "Reports To", oldValue: o.reportsTo, newValue: d.reportsTo });
        const newParentId = Object.values(agents).find(a => a.name === d.reportsTo)?.id || null;
        pendingAgentChanges.reportsTo = newParentId;
      }
      if (d.directReports !== o.directReports) {
        directChanges.push({ field: "Direct Reports", oldValue: o.directReports, newValue: d.directReports });
        const drIds = d.directReports.split(",").map(n => {
          const found = Object.values(agents).find(a => a.name === n.trim());
          return found?.id || "";
        }).filter(Boolean);
        pendingAgentChanges.directReports = drIds;
      }
      if (d.roleDescription !== o.roleDescription) {
        directChanges.push({ field: "Description", oldValue: o.roleDescription.slice(0, 50) + "...", newValue: d.roleDescription.slice(0, 50) + "..." });
        pendingAgentChanges.description = d.roleDescription;
      }
    }

    // Calculate cascades
    const cascades = calculateCascades(agentId, pendingAgentChanges, agents, cascadeModelToReports, cascadeDeptToReports);

    setPendingDirectChanges(directChanges);
    setPendingCascades(cascades);
    setShowChangesModal(true);
  };

  const confirmSave = async () => {
    setShowChangesModal(false);
    setSaving(true);

    // Build full pending changes for state update
    if (formData?.type === "IDENTITY.md" && originalIdentity) {
      const d = formData.data;
      const pendingAgentChanges: PendingChanges = {};

      if (d.name !== originalIdentity.name) pendingAgentChanges.name = d.name;
      if (d.title !== originalIdentity.title) pendingAgentChanges.title = d.title;
      if (d.model !== originalIdentity.model) pendingAgentChanges.model = d.model;
      if (d.emoji !== originalIdentity.emoji) pendingAgentChanges.emoji = d.emoji;
      if (d.department !== originalIdentity.department) pendingAgentChanges.department = d.department as DepartmentKey;
      if (d.reportsTo !== originalIdentity.reportsTo) {
        const newParentId = Object.values(agents).find(a => a.name === d.reportsTo)?.id || null;
        pendingAgentChanges.reportsTo = newParentId;
      }
      if (d.directReports !== originalIdentity.directReports) {
        const drIds = d.directReports.split(",").map(n => {
          const found = Object.values(agents).find(a => a.name === n.trim());
          return found?.id || "";
        }).filter(Boolean);
        pendingAgentChanges.directReports = drIds;
      }
      if (d.roleDescription !== originalIdentity.roleDescription) pendingAgentChanges.description = d.roleDescription;

      // Apply changes + cascades to agent state
      const cascades = calculateCascades(agentId, pendingAgentChanges, agents, cascadeModelToReports, cascadeDeptToReports);
      const updated = applyCascades(agents, agentId, pendingAgentChanges, cascades);
      onAgentsUpdate(updated);

      // Update the original identity to reflect new state
      setOriginalIdentity({ ...formData.data });
    }

    // Try API save
    const content = serializeFormData();
    try {
      await fetch(
        `/api/agents/${encodeURIComponent(agentId)}/files/${encodeURIComponent(activeTab)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
    } catch {
      // fire and forget
    }

    setHasChanges(false);
    setDirtyTabs(prev => {
      const next = new Set(prev);
      next.delete(activeTab);
      return next;
    });
    setCascadeModelToReports(false);
    setCascadeDeptToReports(false);
    setSaving(false);
    addToast(`${agent?.name || "Agent"} saved successfully`, "success");
  };

  // Non-identity tab save (no cascading)
  const handleSimpleSave = async () => {
    setSaving(true);
    const content = serializeFormData();
    try {
      const res = await fetch(
        `/api/agents/${encodeURIComponent(agentId)}/files/${encodeURIComponent(activeTab)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      if (res.ok) {
        setOriginalContent(content);
      }
    } catch {
      // fire and forget
    }

    setHasChanges(false);
    setDirtyTabs(prev => {
      const next = new Set(prev);
      next.delete(activeTab);
      return next;
    });
    setSaving(false);
    addToast(`${agent?.name || "Agent"} ${activeTab} saved`, "success");
  };

  const handleSave = () => {
    if (activeTab === "IDENTITY.md") {
      prepareSave();
    } else {
      handleSimpleSave();
    }
  };

  const updateFormData = (newData: FormData) => {
    setFormData(newData);
    setHasChanges(true);
    setDirtyTabs(prev => new Set(prev).add(activeTab));
  };

  const handleCloseAttempt = () => {
    if (hasChanges || dirtyTabs.size > 0) {
      setShowDiscardModal(true);
    } else {
      onClose();
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    onDeleteAgent(agentId);
    addToast(`${agent?.name || "Agent"} removed`, "success");
  };

  if (!agent) return null;

  // Determine if this is a C-level agent (for cascade options)
  const showModelCascade = isCLevel(agentId) && formData?.type === "IDENTITY.md" && originalIdentity && formData.data.model !== originalIdentity.model;
  const showDeptCascade = formData?.type === "IDENTITY.md" && originalIdentity && formData.data.department !== originalIdentity.department && agent.directReports.length > 0;

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-md">
      {/* Header with department accent */}
      <div
        className="px-5 py-4 border-b border-slate-800/60 flex-shrink-0"
        style={{ borderTopColor: dept.accentHex, borderTopWidth: "3px", borderTopStyle: "solid" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{agent.emoji}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100 truncate">{agent.name}</h2>
                <StatusDot status={agent.status} size="md" />
              </div>
              <p className={`text-sm ${dept.accent}`}>{agent.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Delete button */}
            {agentId !== "ceo" && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg hover:bg-red-900/30 transition-colors text-slate-500 hover:text-red-400"
                title="Remove agent"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleCloseAttempt}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unsaved changes warning */}
        {(hasChanges || dirtyTabs.size > 0) && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-amber-950/30 border border-amber-700/30 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">Unsaved changes</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <ModelBadge model={agent.model} />
          {usingFallback && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-900/30 text-amber-400/80 border border-amber-700/30" title="Data loaded from local defaults — API unreachable">
              <Info className="w-3 h-3" />
              local data
            </span>
          )}
          {isNewAgent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-900/30 text-emerald-400/80 border border-emerald-700/30">
              <Plus className="w-3 h-3" />
              new agent
            </span>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-slate-800/60 overflow-x-auto flex-shrink-0 scrollbar-none">
        {ALL_FILE_TABS.map((tab) => {
          const meta = FILE_TAB_META[tab];
          const isActive = activeTab === tab;
          const isDirty = dirtyTabs.has(tab);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
                isActive
                  ? "text-violet-300 border-violet-400 bg-slate-950/50"
                  : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/30"
              }`}
              title={meta.label}
            >
              <span className="text-sm">{meta.emoji}</span>
              <span className="text-[11px]">{meta.label}</span>
              {isDirty && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Cascade options (show when relevant) */}
      {(showModelCascade || showDeptCascade) && (
        <div className="px-5 py-3 border-b border-slate-800/60 bg-amber-950/10 space-y-2">
          {showModelCascade && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cascadeModelToReports}
                onChange={(e) => setCascadeModelToReports(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/30"
              />
              <span className="text-xs text-amber-300">Apply model change to all team members</span>
            </label>
          )}
          {showDeptCascade && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cascadeDeptToReports}
                onChange={(e) => setCascadeDeptToReports(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/30"
              />
              <span className="text-xs text-amber-300">Apply department change to all reports</span>
            </label>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <WorkspaceSkeleton />
        ) : formData ? (
          <div>
            {formData.type === "IDENTITY.md" && (
              <IdentityForm data={formData.data} onChange={(d) => updateFormData({ type: "IDENTITY.md", data: d })} agents={agents} currentAgentId={agentId} />
            )}
            {formData.type === "SOUL.md" && (
              <SoulForm data={formData.data} onChange={(d) => updateFormData({ type: "SOUL.md", data: d })} />
            )}
            {formData.type === "USER.md" && (
              <UserForm data={formData.data} onChange={(d) => updateFormData({ type: "USER.md", data: d })} />
            )}
            {formData.type === "TOOLS.md" && (
              <ToolsForm data={formData.data} onChange={(d) => updateFormData({ type: "TOOLS.md", data: d })} />
            )}
            {formData.type === "AGENTS.md" && (
              <AgentsForm data={formData.data} onChange={(d) => updateFormData({ type: "AGENTS.md", data: d })} />
            )}
            {formData.type === "MEMORY.md" && (
              <MemoryForm data={formData.data} onChange={(d) => updateFormData({ type: "MEMORY.md", data: d })} />
            )}
            {formData.type === "HEARTBEAT.md" && (
              <HeartbeatForm data={formData.data} onChange={(d) => updateFormData({ type: "HEARTBEAT.md", data: d })} />
            )}
          </div>
        ) : null}
      </div>

      {/* Save Bar */}
      {formData && (
        <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {hasChanges && <span className="text-amber-400">Unsaved changes</span>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              hasChanges
                ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400"
                : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-40"
            }`}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save
          </button>
        </div>
      )}

      {/* Modals */}
      {showChangesModal && agent && (
        <ChangesSummaryModal
          agent={agent}
          directChanges={pendingDirectChanges}
          cascades={pendingCascades}
          onConfirm={confirmSave}
          onCancel={() => setShowChangesModal(false)}
        />
      )}

      {showDeleteModal && agent && (
        <DeleteConfirmModal
          agent={agent}
          agents={agents}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {showDiscardModal && (
        <DiscardConfirmModal
          onDiscard={() => {
            setShowDiscardModal(false);
            setHasChanges(false);
            setDirtyTabs(new Set());
            onClose();
          }}
          onCancel={() => setShowDiscardModal(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Drawer Wrapper — Overlay pattern with backdrop
   ═══════════════════════════════════════════════════════════════ */

function DrawerOverlay({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[540px] max-w-[90vw] hidden lg:flex transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ boxShadow: visible ? "-8px 0 30px rgba(0,0,0,0.5)" : "none" }}
      >
        {children}
      </div>
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-transform duration-300 ease-in-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          height: "85vh",
          borderTopLeftRadius: "1rem",
          borderTopRightRadius: "1rem",
          overflow: "hidden",
          boxShadow: visible ? "0 -8px 30px rgba(0,0,0,0.5)" : "none",
        }}
      >
        <div className="flex justify-center py-2 bg-slate-900/95">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>
        {children}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Add Agent Modal
   ═══════════════════════════════════════════════════════════════ */

function AddAgentModal({
  agents,
  onAdd,
  onCancel,
}: {
  agents: Record<string, AgentState>;
  onAdd: (agent: AgentState) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState("");
  const [emoji, setEmoji] = useState("🤖");
  const [model, setModel] = useState("Claude Sonnet 4");
  const [department, setDepartment] = useState<DepartmentKey>("Engineering");
  const [error, setError] = useState("");

  const parentOptions = Object.values(agents).map(a => ({ id: a.id, name: a.name }));

  const handleAdd = () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (!title.trim()) { setError("Title is required"); return; }
    if (!parentId) { setError("Parent agent is required"); return; }

    const id = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (agents[id]) { setError("Agent ID already exists"); return; }

    const newAgent: AgentState = {
      id,
      name: name.trim(),
      title: title.trim(),
      emoji,
      model,
      status: "standby",
      department,
      description: "",
      reportsTo: parentId,
      directReports: [],
    };

    onAdd(newAgent);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-violet-700/50 rounded-xl shadow-2xl max-w-md w-full">
          <div className="px-6 py-4 border-b border-slate-700" style={{ borderTopWidth: "3px", borderTopColor: "#8b5cf6", borderTopStyle: "solid" }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">➕</span>
              <h3 className="text-lg font-bold text-slate-100">Add New Agent</h3>
            </div>
          </div>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="px-3 py-2 bg-red-950/50 border border-red-700/40 rounded-lg text-xs text-red-400">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Name" value={name} onChange={setName} error={!name.trim() && !!error} placeholder="e.g. Axiom" />
              <FormInput label="Title" value={title} onChange={setTitle} placeholder="e.g. Data Lead" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="Model" value={model} onChange={setModel} options={MODEL_OPTIONS} />
              <FormInput label="Emoji" value={emoji} onChange={setEmoji} small />
            </div>
            <FormSelect label="Department" value={department} onChange={(v) => setDepartment(v as DepartmentKey)} options={DEPARTMENT_OPTIONS} />
            <FormSelect
              label="Reports To (Parent)"
              value={parentOptions.find(p => p.id === parentId)?.name || ""}
              onChange={(v) => {
                const found = parentOptions.find(p => p.name === v);
                setParentId(found?.id || "");
              }}
              options={parentOptions.map(p => p.name)}
            />
          </div>
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 transition-all">
              Add Agent
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Playbook Section
   ═══════════════════════════════════════════════════════════════ */

function CollapsibleSection({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-800/30 transition-colors text-left"
      >
        <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-800/40">
          {children}
        </div>
      )}
    </div>
  );
}

const TIERS = [
  {
    tier: 1, label: "Direct", time: "< 5 min",
    desc: "Theo handles directly. Questions, lookups, quick edits.",
    cost: "~$0.01–0.05",
    gradient: "from-violet-900/30 via-violet-950/20 to-slate-900/40",
    accent: "text-violet-400", border: "border-violet-500/20",
  },
  {
    tier: 2, label: "Single Agent", time: "5–30 min",
    desc: "One sub-agent, one job. Feature work, content, analysis.",
    cost: "~$0.05–0.50",
    gradient: "from-cyan-900/30 via-cyan-950/20 to-slate-900/40",
    accent: "text-cyan-400", border: "border-cyan-500/20",
  },
  {
    tier: 3, label: "The Forge", time: "30 min – 2 hrs",
    desc: "Parallel agents, coordinated sprint. Multi-file features.",
    cost: "~$0.50–5.00",
    gradient: "from-amber-900/30 via-amber-950/20 to-slate-900/40",
    accent: "text-amber-400", border: "border-amber-500/20",
  },
  {
    tier: 4, label: "Overnight Sprint", time: "2+ hrs",
    desc: "Full Forge protocol. Major builds.",
    cost: "~$5–20",
    gradient: "from-rose-900/30 via-rose-950/20 to-slate-900/40",
    accent: "text-rose-400", border: "border-rose-500/20",
  },
];

function ExecutionTiers() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
      {TIERS.map((t) => (
        <div key={t.tier} className={`rounded-xl border ${t.border} bg-gradient-to-br ${t.gradient} p-4 transition-all hover:scale-[1.01]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold ${t.accent} bg-slate-950/50 px-2 py-0.5 rounded-md`}>
              Tier {t.tier}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">{t.time}</span>
          </div>
          <h4 className="text-sm font-semibold text-slate-200 mb-1">{t.label}</h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">{t.desc}</p>
          <div className="text-[11px] text-slate-500 font-mono">
            Cost: <span className={t.accent}>{t.cost}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const ROUTES = [
  { task: "Build / Fix code", agents: ["Atlas", "CTO"], color: "text-cyan-400" },
  { task: "Write content", agents: ["Muse", "ScriptBot"], color: "text-rose-400" },
  { task: "Post social", agents: ["Muse", "Echo"], color: "text-rose-400" },
  { task: "Trading / optimize", agents: ["Venture", "The Pit"], color: "text-emerald-400" },
  { task: "Test / audit", agents: ["Atlas", "Sentinel"], color: "text-cyan-400" },
  { task: "Design / UI", agents: ["Atlas", "Pixel"], color: "text-cyan-400" },
  { task: "Research / question", agents: ["Theo (direct)"], color: "text-violet-400" },
];

function AutoRouter() {
  return (
    <div className="mt-3 overflow-x-auto">
      <div className="min-w-[400px] space-y-1.5">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
          <span>Task Pattern</span>
          <span />
          <span>Routed To</span>
        </div>
        {ROUTES.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-3 py-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40 hover:bg-slate-900/60 transition-colors">
            <span className="text-sm text-slate-300 font-medium">{r.task}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <span className={`text-sm font-semibold ${r.color}`}>{r.agents.join(" → ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MODELS = [
  { icon: "🧠", name: "Opus", pricing: "$15 / $75 per 1M", role: "Reasoning (Theo only)", gradient: "from-violet-900/30 to-slate-900/40", border: "border-violet-500/20", accent: "text-violet-400", bar: "bg-violet-500", barWidth: "100%" },
  { icon: "⚡", name: "Sonnet", pricing: "$3 / $15 per 1M", role: "Workhorse (most agents)", gradient: "from-blue-900/30 to-slate-900/40", border: "border-blue-500/20", accent: "text-blue-400", bar: "bg-blue-500", barWidth: "60%" },
  { icon: "💨", name: "Haiku", pricing: "$0.25 / $1.25 per 1M", role: "Lightweight (monitoring, social, QA)", gradient: "from-teal-900/30 to-slate-900/40", border: "border-teal-500/20", accent: "text-teal-400", bar: "bg-teal-500", barWidth: "20%" },
  { icon: "🔥", name: "Flash", pricing: "$0.075 / $0.30 per 1M", role: "Bulk processing", gradient: "from-orange-900/30 to-slate-900/40", border: "border-orange-500/20", accent: "text-orange-400", bar: "bg-orange-500", barWidth: "8%" },
];

function ModelStrategy() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      {MODELS.map((m) => (
        <div key={m.name} className={`rounded-xl border ${m.border} bg-gradient-to-r ${m.gradient} p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{m.icon}</span>
            <h4 className={`text-sm font-bold ${m.accent}`}>{m.name}</h4>
          </div>
          <p className="text-xs text-slate-400 mb-1">{m.role}</p>
          <p className="text-[11px] text-slate-500 font-mono mb-3">{m.pricing}</p>
          <div className="h-1.5 rounded-full bg-slate-800/60 overflow-hidden">
            <div className={`h-full rounded-full ${m.bar} opacity-60`} style={{ width: m.barWidth }} />
          </div>
          <p className="text-[10px] text-slate-600 mt-1 text-right">Relative cost</p>
        </div>
      ))}
    </div>
  );
}

function PlaybookSection() {
  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        <h2 className="text-lg font-bold text-slate-300 tracking-tight whitespace-nowrap">
          How Work Gets Done
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </div>

      <CollapsibleSection
        title="Execution Tiers"
        subtitle="How tasks are sized and routed by complexity"
        icon={<Timer className="w-4 h-4 text-violet-400" />}
        defaultOpen
      >
        <ExecutionTiers />
      </CollapsibleSection>

      <CollapsibleSection
        title="Auto-Router"
        subtitle="Task pattern → agent mapping"
        icon={<ArrowRight className="w-4 h-4 text-violet-400" />}
      >
        <AutoRouter />
      </CollapsibleSection>

      <CollapsibleSection
        title="Model Strategy"
        subtitle="Cost tiers and model assignments"
        icon={<Cpu className="w-4 h-4 text-violet-400" />}
      >
        <ModelStrategy />
      </CollapsibleSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Page — REACTIVE STATE
   ═══════════════════════════════════════════════════════════════ */

export default function OrgChartPage() {
  const [agents, setAgents] = useState<Record<string, AgentState>>(getDefaultAgents);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isNewAgent, setIsNewAgent] = useState(false);

  // Try to fetch from API on mount
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === "object" && Object.keys(data).length > 0) {
            // Merge with defaults
            const merged = { ...getDefaultAgents() };
            for (const [id, agentData] of Object.entries(data)) {
              if (typeof agentData === "object" && agentData !== null) {
                const ad = agentData as Partial<AgentState>;
                if (merged[id]) {
                  merged[id] = { ...merged[id], ...ad };
                }
              }
            }
            setAgents(merged);
          }
        }
      } catch {
        // Use defaults
      }
    }
    fetchAgents();
  }, []);

  const addToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleSelect = useCallback((id: string) => {
    setIsNewAgent(false);
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setIsNewAgent(false);
  }, []);

  const handleAgentsUpdate = useCallback((updated: Record<string, AgentState>) => {
    setAgents(updated);
  }, []);

  const handleDeleteAgent = useCallback((id: string) => {
    setAgents(prev => {
      const updated = { ...prev };
      const agent = updated[id];
      if (!agent) return prev;

      // Reassign direct reports to parent
      if (agent.reportsTo && updated[agent.reportsTo]) {
        const parent = { ...updated[agent.reportsTo] };
        parent.directReports = [
          ...parent.directReports.filter(rid => rid !== id),
          ...agent.directReports,
        ];
        updated[agent.reportsTo] = parent;
      }

      // Update children's reportsTo
      for (const childId of agent.directReports) {
        if (updated[childId]) {
          updated[childId] = { ...updated[childId], reportsTo: agent.reportsTo };
        }
      }

      delete updated[id];
      return updated;
    });
    setSelectedId(null);
  }, []);

  const handleAddAgent = useCallback((newAgent: AgentState) => {
    setAgents(prev => {
      const updated = { ...prev };
      updated[newAgent.id] = newAgent;

      // Add to parent's directReports
      if (newAgent.reportsTo && updated[newAgent.reportsTo]) {
        const parent = { ...updated[newAgent.reportsTo] };
        if (!parent.directReports.includes(newAgent.id)) {
          parent.directReports = [...parent.directReports, newAgent.id];
        }
        updated[newAgent.reportsTo] = parent;
      }

      return updated;
    });
    setShowAddModal(false);
    setIsNewAgent(true);
    setSelectedId(newAgent.id);
    addToast(`${newAgent.name} added to org chart`, "success");
  }, [addToast]);

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* CSS for animations — inline style tag for app router compatibility */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      ` }} />

      {/* Header */}
      <div className="flex items-center gap-4 max-w-6xl mx-auto">
        <div className="w-11 h-11 bg-primary-600/20 rounded-xl flex items-center justify-center border border-primary-500/10">
          <Network className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Org Chart
          </h1>
          <p className="text-sm text-slate-500">
            Agent hierarchy &amp; workspaces — click any agent to manage
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto">
        <StatsAndLegendBar agents={agents} />
      </div>

      {/* Org Chart */}
      <div className="max-w-6xl mx-auto">
        <DesktopTree agents={agents} selectedId={selectedId} onSelect={handleSelect} />
        <MobileTree agents={agents} selectedId={selectedId} onSelect={handleSelect} />

        {/* Add Agent Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-violet-300 bg-violet-950/30 border border-violet-700/30 hover:bg-violet-900/30 hover:border-violet-600/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Agent
          </button>
        </div>
      </div>

      {/* Drawer */}
      <DrawerOverlay open={selectedId !== null} onClose={handleClose}>
        {selectedId && agents[selectedId] && (
          <WorkspacePanel
            agentId={selectedId}
            agents={agents}
            onClose={handleClose}
            onAgentsUpdate={handleAgentsUpdate}
            onDeleteAgent={handleDeleteAgent}
            addToast={addToast}
            isNewAgent={isNewAgent}
          />
        )}
      </DrawerOverlay>

      {/* Add Agent Modal */}
      {showAddModal && (
        <AddAgentModal
          agents={agents}
          onAdd={handleAddAgent}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* Playbook */}
      <div className="max-w-6xl mx-auto">
        <PlaybookSection />
      </div>
    </div>
  );
}