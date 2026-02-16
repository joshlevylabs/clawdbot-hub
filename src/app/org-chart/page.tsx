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
  WifiOff,
  User,
  Brain,
  Wrench,
  Users,
  BookOpen,
  Heart,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

type Status = "active" | "idle" | "standby";
type Department = "ceo" | "coo" | "cto" | "cmo" | "cro";

interface OrgAgent {
  id: string;
  name: string;
  title: string;
  description: string;
  model: string;
  status: Status;
  icon: ReactNode;
  department: Department;
  emoji?: string;
  children?: OrgAgent[];
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

  // fallback: if no sections, treat all as personality
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

const DEPT_COLORS: Record<Department, {
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
  ceo: {
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
  coo: {
    accent: "text-violet-400",
    accentHex: "#a78bfa",
    border: "border-violet-500/30",
    bg: "bg-gradient-to-br from-violet-950/50 via-violet-900/20 to-slate-900/90",
    glow: "shadow-[0_0_30px_-5px_rgba(167,139,250,0.15)]",
    badge: "bg-violet-900/50 text-violet-300 border-violet-700/40",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    line: "stroke-violet-500/40",
    selectedBorder: "border-violet-400",
  },
  cto: {
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
  cmo: {
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
  cro: {
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

const STATUS_CONFIG: Record<Status, { color: string; ring: string; label: string; pulse: boolean }> = {
  active:  { color: "bg-emerald-500", ring: "ring-emerald-500/30", label: "Active",  pulse: true  },
  idle:    { color: "bg-amber-500",   ring: "ring-amber-500/30",   label: "Idle",    pulse: false },
  standby: { color: "bg-slate-500",   ring: "ring-slate-500/30",   label: "Standby", pulse: false },
};

/* ═══════════════════════════════════════════════════════════════
   Org Data
   ═══════════════════════════════════════════════════════════════ */

const ICON_SIZE_CL = "w-6 h-6";
const ICON_SIZE_TL = "w-5 h-5";

const orgTree: OrgAgent = {
  id: "ceo",
  name: "Joshua",
  title: "CEO",
  description: "Sets the vision. The builder.",
  model: "Human",
  status: "active",
  icon: <Zap className={`${ICON_SIZE_CL} text-amber-400`} />,
  department: "ceo",
  emoji: "👑",
  children: [
    {
      id: "coo",
      name: "Theo",
      title: "COO",
      description: "Orchestrates all operations. The right hand.",
      model: "Claude Opus 4",
      status: "active",
      icon: <Bot className={`${ICON_SIZE_CL} text-violet-400`} />,
      department: "coo",
      emoji: "🔺",
      children: [
        {
          id: "cto",
          name: "Atlas",
          title: "CTO",
          description: "Owns all code and infrastructure.",
          model: "Claude Sonnet 4",
          status: "active",
          icon: <Shield className={`${ICON_SIZE_CL} text-cyan-400`} />,
          department: "cto",
          emoji: "🗺️",
          children: [
            {
              id: "forge",
              name: "Forge",
              title: "Backend Lead",
              description: "APIs, databases, security",
              model: "Sonnet 4",
              status: "active",
              icon: <Code className={`${ICON_SIZE_TL} text-cyan-400`} />,
              department: "cto",
              emoji: "🔨",
            },
            {
              id: "pixel",
              name: "Pixel",
              title: "Frontend Lead",
              description: "UI/UX, CI/CD, deployment",
              model: "Sonnet 4",
              status: "idle",
              icon: <Layout className={`${ICON_SIZE_TL} text-cyan-400`} />,
              department: "cto",
              emoji: "✨",
            },
            {
              id: "sentinel",
              name: "Sentinel",
              title: "QA Lead",
              description: "Testing, code review, quality gates",
              model: "Haiku 3.5",
              status: "standby",
              icon: <TestTube className={`${ICON_SIZE_TL} text-cyan-400`} />,
              department: "cto",
              emoji: "🛡️",
            },
          ],
        },
        {
          id: "cmo",
          name: "Muse",
          title: "CMO",
          description: "Content, creative direction, brand.",
          model: "Claude Sonnet 4",
          status: "active",
          icon: <Palette className={`${ICON_SIZE_CL} text-rose-400`} />,
          department: "cmo",
          emoji: "🎨",
          children: [
            {
              id: "scriptbot",
              name: "ScriptBot",
              title: "Content Lead",
              description: "Podcast scripts, newsletter, blog posts",
              model: "Sonnet 4",
              status: "active",
              icon: <FileText className={`${ICON_SIZE_TL} text-rose-400`} />,
              department: "cmo",
              emoji: "📝",
            },
            {
              id: "echo",
              name: "Echo",
              title: "Social Lead",
              description: "Social scheduling, engagement, community",
              model: "Haiku 3.5",
              status: "idle",
              icon: <Share2 className={`${ICON_SIZE_TL} text-rose-400`} />,
              department: "cmo",
              emoji: "📣",
            },
          ],
        },
        {
          id: "cro",
          name: "Venture",
          title: "CRO",
          description: "Growth strategy, monetization.",
          model: "Claude Sonnet 4",
          status: "active",
          icon: <DollarSign className={`${ICON_SIZE_CL} text-emerald-400`} />,
          department: "cro",
          emoji: "💰",
          children: [
            {
              id: "builder",
              name: "Builder",
              title: "Products Lead",
              description: "Product ideation, feature dev, market fit",
              model: "Sonnet 4",
              status: "active",
              icon: <Rocket className={`${ICON_SIZE_TL} text-emerald-400`} />,
              department: "cro",
              emoji: "🏗️",
            },
            {
              id: "scout",
              name: "Scout",
              title: "Growth Lead",
              description: "User acquisition, community, analytics",
              model: "Haiku 3.5",
              status: "idle",
              icon: <Search className={`${ICON_SIZE_TL} text-emerald-400`} />,
              department: "cro",
              emoji: "🔍",
            },
            {
              id: "the-pit",
              name: "The Pit",
              title: "Trading Lead",
              description: "MRE pipeline, nightly optimization, signals",
              model: "Sonnet 4",
              status: "active",
              icon: <BarChart3 className={`${ICON_SIZE_TL} text-emerald-400`} />,
              department: "cro",
              emoji: "📈",
            },
          ],
        },
      ],
    },
  ],
};

function flattenAgents(node: OrgAgent): OrgAgent[] {
  const result: OrgAgent[] = [node];
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenAgents(child));
    }
  }
  return result;
}

const ALL_ORG_AGENTS = flattenAgents(orgTree);

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
   Card Components — Now Clickable
   ═══════════════════════════════════════════════════════════════ */

function ExecutiveCard({ agent, selected, onClick }: { agent: OrgAgent; selected: boolean; onClick: () => void }) {
  const dept = DEPT_COLORS[agent.department];
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
          {agent.icon}
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

function TeamLeadCard({ agent, selected, onClick }: { agent: OrgAgent; selected: boolean; onClick: () => void }) {
  const dept = DEPT_COLORS[agent.department];
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border-2 ${selected ? `${dept.selectedBorder} shadow-[0_0_15px_-3px_${dept.accentHex}40]` : "border-slate-800/60"} bg-slate-900/80 backdrop-blur-sm p-4 transition-all duration-200 hover:border-slate-700/80 hover:bg-slate-900/90 w-full text-left cursor-pointer`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 p-2 rounded-lg border ${dept.iconBg}`}>
          {agent.icon}
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
   Desktop Tree Layout
   ═══════════════════════════════════════════════════════════════ */

function DesktopTree({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineSegment[]>([]);

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

    connect("ceo", ["coo"], DEPT_COLORS.ceo.accentHex);
    connect("coo", ["cto", "cmo", "cro"], DEPT_COLORS.coo.accentHex);
    connect("cto", ["forge", "pixel", "sentinel"], DEPT_COLORS.cto.accentHex);
    connect("cmo", ["scriptbot", "echo"], DEPT_COLORS.cmo.accentHex);
    connect("cro", ["builder", "scout", "the-pit"], DEPT_COLORS.cro.accentHex);

    setLines(newLines);
  }, []);

  useEffect(() => {
    const timer = setTimeout(computeLines, 100);
    window.addEventListener("resize", computeLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", computeLines);
    };
  }, [computeLines]);

  const coo = orgTree.children![0];
  const cto = coo.children![0];
  const cmo = coo.children![1];
  const cro = coo.children![2];

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <ConnectorOverlay lines={lines} />

      <div className="flex justify-center mb-16 relative z-10">
        <div className="w-full max-w-md" data-node="ceo">
          <ExecutiveCard agent={orgTree} selected={selectedId === "ceo"} onClick={() => onSelect("ceo")} />
        </div>
      </div>

      <div className="flex justify-center mb-16 relative z-10">
        <div className="w-full max-w-md" data-node="coo">
          <ExecutiveCard agent={coo} selected={selectedId === "coo"} onClick={() => onSelect("coo")} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-16 relative z-10">
        <div data-node="cto">
          <ExecutiveCard agent={cto} selected={selectedId === "cto"} onClick={() => onSelect("cto")} />
        </div>
        <div data-node="cmo">
          <ExecutiveCard agent={cmo} selected={selectedId === "cmo"} onClick={() => onSelect("cmo")} />
        </div>
        <div data-node="cro">
          <ExecutiveCard agent={cro} selected={selectedId === "cro"} onClick={() => onSelect("cro")} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 relative z-10">
        <div className="space-y-3">
          {cto.children!.map((agent) => (
            <div key={agent.id} data-node={agent.id}>
              <TeamLeadCard agent={agent} selected={selectedId === agent.id} onClick={() => onSelect(agent.id)} />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {cmo.children!.map((agent) => (
            <div key={agent.id} data-node={agent.id}>
              <TeamLeadCard agent={agent} selected={selectedId === agent.id} onClick={() => onSelect(agent.id)} />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {cro.children!.map((agent) => (
            <div key={agent.id} data-node={agent.id}>
              <TeamLeadCard agent={agent} selected={selectedId === agent.id} onClick={() => onSelect(agent.id)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Mobile Layout
   ═══════════════════════════════════════════════════════════════ */

function MobileTree({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const coo = orgTree.children![0];
  const cto = coo.children![0];
  const cmo = coo.children![1];
  const cro = coo.children![2];

  const DeptSection = ({
    head,
    leads,
    dept,
  }: {
    head: OrgAgent;
    leads: OrgAgent[];
    dept: Department;
  }) => {
    const colors = DEPT_COLORS[dept];
    return (
      <div className="space-y-3">
        <ExecutiveCard agent={head} selected={selectedId === head.id} onClick={() => onSelect(head.id)} />
        <div className={`ml-4 pl-4 border-l-2 ${colors.border} space-y-3`}>
          {leads.map((l) => (
            <TeamLeadCard key={l.id} agent={l} selected={selectedId === l.id} onClick={() => onSelect(l.id)} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="lg:hidden space-y-6">
      <ExecutiveCard agent={orgTree} selected={selectedId === "ceo"} onClick={() => onSelect("ceo")} />
      <div className="ml-3 pl-4 border-l-2 border-violet-500/30 space-y-6">
        <ExecutiveCard agent={coo} selected={selectedId === "coo"} onClick={() => onSelect("coo")} />
        <DeptSection head={cto} leads={cto.children!} dept="cto" />
        <DeptSection head={cmo} leads={cmo.children!} dept="cmo" />
        <DeptSection head={cro} leads={cro.children!} dept="cro" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Status Legend & Stats Bar
   ═══════════════════════════════════════════════════════════════ */

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-6 px-5 py-3 bg-slate-950/60 rounded-xl border border-slate-800/60 backdrop-blur-sm">
      <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest">
        Status
      </span>
      {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG.active][]).map(
        ([key, cfg]) => (
          <div key={key} className="flex items-center gap-2">
            <StatusDot status={key} />
            <span className="text-xs text-slate-400 font-medium">{cfg.label}</span>
          </div>
        )
      )}
    </div>
  );
}

function StatsBar() {
  const allAgents = ALL_ORG_AGENTS;
  const activeCount = allAgents.filter((a) => a.status === "active").length;
  const idleCount = allAgents.filter((a) => a.status === "idle").length;
  const standbyCount = allAgents.filter((a) => a.status === "standby").length;

  const stats = [
    { label: "Total Agents", value: allAgents.length, color: "text-slate-100" },
    { label: "Active", value: activeCount, color: "text-emerald-400" },
    { label: "Idle", value: idleCount, color: "text-amber-400" },
    { label: "Standby", value: standbyCount, color: "text-slate-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-slate-950/60 rounded-xl border border-slate-800/60 px-4 py-3 text-center"
        >
          <div className={`text-2xl font-bold ${s.color} tabular-nums`}>{s.value}</div>
          <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Form Components for Workspace Panel
   ═══════════════════════════════════════════════════════════════ */

function FormInput({ label, value, onChange, placeholder, small }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; small?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${small ? "w-20" : "w-full"} px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors`}
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
   File-specific Form Renderers
   ═══════════════════════════════════════════════════════════════ */

function IdentityForm({ data, onChange }: { data: IdentityFields; onChange: (d: IdentityFields) => void }) {
  const agentNames = ALL_ORG_AGENTS.map((a) => a.name);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Name" value={data.name} onChange={(v) => onChange({ ...data, name: v })} />
        <FormInput label="Title" value={data.title} onChange={(v) => onChange({ ...data, title: v })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Model"
          value={data.model}
          onChange={(v) => onChange({ ...data, model: v })}
          options={["Claude Opus 4", "Claude Sonnet 4", "Haiku 3.5", "Gemini 2 Flash", "GPT-5 Mini"]}
        />
        <FormInput label="Emoji" value={data.emoji} onChange={(v) => onChange({ ...data, emoji: v })} small />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Department"
          value={data.department}
          onChange={(v) => onChange({ ...data, department: v })}
          options={["Executive", "Engineering", "Marketing", "Revenue"]}
        />
        <FormSelect
          label="Reports To"
          value={data.reportsTo}
          onChange={(v) => onChange({ ...data, reportsTo: v })}
          options={agentNames}
        />
      </div>
      <FormInput label="Direct Reports" value={data.directReports} onChange={(v) => onChange({ ...data, directReports: v })} placeholder="Comma-separated agent names" />
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
   Workspace Panel
   ═══════════════════════════════════════════════════════════════ */

type FormData =
  | { type: "IDENTITY.md"; data: IdentityFields }
  | { type: "SOUL.md"; data: SoulFields }
  | { type: "USER.md"; data: UserFields }
  | { type: "TOOLS.md"; data: ToolsFields }
  | { type: "AGENTS.md"; data: AgentsFields }
  | { type: "MEMORY.md"; data: MemoryFields }
  | { type: "HEARTBEAT.md"; data: HeartbeatFields };

function WorkspacePanel({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const agent = ALL_ORG_AGENTS.find((a) => a.id === agentId);
  const dept = agent ? DEPT_COLORS[agent.department] : DEPT_COLORS.cto;

  const [activeTab, setActiveTab] = useState<FileTab>("IDENTITY.md");
  const [loading, setLoading] = useState(false);
  const [apiOffline, setApiOffline] = useState(false);
  const [rawContent, setRawContent] = useState("");
  const [formData, setFormData] = useState<FormData | null>(null);
  const [originalContent, setOriginalContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch file content
  const fetchFile = useCallback(async (tab: FileTab) => {
    setLoading(true);
    setApiOffline(false);
    setSaveStatus("idle");
    setHasChanges(false);

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
    setApiOffline(true);
    setRawContent("");
    setOriginalContent("");
    setFormData(null);
    setLoading(false);
  }, [agentId]);

  const parseIntoForm = (tab: FileTab, content: string) => {
    switch (tab) {
      case "IDENTITY.md":
        setFormData({ type: "IDENTITY.md", data: parseIdentityMd(content) });
        break;
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
  }, [activeTab, fetchFile]);

  // Serialize form data to markdown
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

  // Save
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
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
        setSaveStatus("saved");
        setOriginalContent(content);
        setHasChanges(false);
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
    setSaving(false);
  };

  // Update form data and track changes
  const updateFormData = (newData: FormData) => {
    setFormData(newData);
    setHasChanges(true);
  };

  if (!agent) return null;

  return (
    <div className={`bg-slate-900 border-l-2 ${dept.selectedBorder} flex flex-col h-full`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{agent.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">{agent.name}</h2>
                <StatusDot status={agent.status} size="md" />
              </div>
              <p className={`text-sm ${dept.accent}`}>{agent.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200 lg:block hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ModelBadge model={agent.model} />
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-slate-800/60 overflow-x-auto flex-shrink-0">
        {ALL_FILE_TABS.map((tab) => {
          const meta = FILE_TAB_META[tab];
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                isActive
                  ? "text-violet-300 border-violet-400 bg-slate-950/50"
                  : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/30"
              }`}
              title={meta.label}
            >
              <span className="text-sm">{meta.emoji}</span>
              <span className="hidden xl:inline">{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <WorkspaceSkeleton />
        ) : apiOffline ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <WifiOff className="w-10 h-10 text-amber-500/60 mb-3" />
            <p className="text-sm text-amber-400 font-medium">API Offline</p>
            <p className="text-xs text-slate-500 mt-1">
              Cannot load workspace files. Check that the API is running.
            </p>
          </div>
        ) : formData ? (
          <div>
            {formData.type === "IDENTITY.md" && (
              <IdentityForm data={formData.data} onChange={(d) => updateFormData({ type: "IDENTITY.md", data: d })} />
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
      {formData && !apiOffline && (
        <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {hasChanges && "Unsaved changes"}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-red-400">Save failed</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-600 to-violet-500 text-white transition-all hover:from-violet-500 hover:to-violet-400 disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* Mobile close */}
      <div className="lg:hidden px-5 py-3 border-t border-slate-800/60">
        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          Close Panel
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Playbook Section (same as before, extracted)
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
   Main Page
   ═══════════════════════════════════════════════════════════════ */

export default function OrgChartPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
  }, []);

  return (
    <div className="space-y-8">
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

      {/* Legend + Stats */}
      <div className="space-y-4 max-w-6xl mx-auto">
        <StatusLegend />
        <StatsBar />
      </div>

      {/* Main Split Layout */}
      <div className={`flex flex-col lg:flex-row gap-0 lg:gap-0 transition-all duration-300 ${selectedId ? "max-w-full" : "max-w-6xl mx-auto"}`}>
        {/* Left: Org Chart */}
        <div className={`transition-all duration-300 ${selectedId ? "lg:w-[62%] lg:pr-4" : "w-full"} ${selectedId ? "max-w-none mx-auto lg:mx-0" : "max-w-6xl mx-auto"}`}>
          <DesktopTree selectedId={selectedId} onSelect={handleSelect} />
          <MobileTree selectedId={selectedId} onSelect={handleSelect} />
        </div>

        {/* Right: Workspace Panel */}
        {selectedId && (
          <>
            {/* Desktop: side panel */}
            <div className="hidden lg:block lg:w-[38%] sticky top-0 h-[calc(100vh-2rem)] rounded-xl overflow-hidden border border-slate-800/60">
              <WorkspacePanel agentId={selectedId} onClose={handleClose} />
            </div>
            {/* Mobile: stacked below */}
            <div className="lg:hidden mt-6 rounded-xl overflow-hidden border border-slate-800/60" style={{ minHeight: "60vh" }}>
              <WorkspacePanel agentId={selectedId} onClose={handleClose} />
            </div>
          </>
        )}

        {/* Empty State */}
        {!selectedId && (
          <div className="hidden" />
        )}
      </div>

      {/* Playbook Section — Below the split */}
      <div className="max-w-6xl mx-auto">
        <PlaybookSection />
      </div>
    </div>
  );
}
