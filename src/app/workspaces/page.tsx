"use client";

import { useState, useMemo } from "react";
import {
  FolderCode,
  Search,
  FileText,
  Pencil,
  Save,
  ChevronRight,
  User,
  Bot,
  Brain,
  Shield,
  Wrench,
  Users,
  BookOpen,
  Heart,
} from "lucide-react";

/* ─── Types ─── */
type AgentStatus = "active" | "idle" | "standby";

interface Agent {
  id: string;
  name: string;
  title: string;
  model: string;
  emoji: string;
  status: AgentStatus;
  department: "ceo" | "coo" | "cto" | "cmo" | "cro" | "engineering" | "content" | "growth" | "trading";
  color: string; // tailwind border color class
}

type FileTab = "SOUL.md" | "IDENTITY.md" | "USER.md" | "TOOLS.md" | "AGENTS.md" | "MEMORY.md" | "HEARTBEAT.md";

const FILE_TABS: FileTab[] = [
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "AGENTS.md",
  "MEMORY.md",
  "HEARTBEAT.md",
];

const FILE_ICONS: Record<FileTab, typeof FileText> = {
  "SOUL.md": Brain,
  "IDENTITY.md": User,
  "USER.md": Shield,
  "TOOLS.md": Wrench,
  "AGENTS.md": Users,
  "MEMORY.md": BookOpen,
  "HEARTBEAT.md": Heart,
};

/* ─── Agent Data ─── */
const agents: Agent[] = [
  { id: "joshua",    name: "Joshua",    title: "CEO",            model: "Human",          emoji: "👑", status: "active",  department: "ceo",         color: "border-amber-500" },
  { id: "theo",      name: "Theo",      title: "COO",            model: "Claude Opus 4",  emoji: "🔺", status: "active",  department: "coo",         color: "border-violet-500" },
  { id: "atlas",     name: "Atlas",     title: "CTO",            model: "Claude Sonnet 4",emoji: "🗺️", status: "active",  department: "cto",         color: "border-cyan-500" },
  { id: "muse",      name: "Muse",      title: "CMO",            model: "Claude Sonnet 4",emoji: "🎨", status: "active",  department: "cmo",         color: "border-pink-500" },
  { id: "venture",   name: "Venture",   title: "CRO",            model: "Claude Sonnet 4",emoji: "💰", status: "standby", department: "cro",         color: "border-emerald-500" },
  { id: "forge",     name: "Forge",     title: "Backend Lead",   model: "Sonnet 4",       emoji: "🔨", status: "active",  department: "engineering", color: "border-cyan-400" },
  { id: "pixel",     name: "Pixel",     title: "Frontend Lead",  model: "Sonnet 4",       emoji: "✨", status: "idle",    department: "engineering", color: "border-cyan-400" },
  { id: "sentinel",  name: "Sentinel",  title: "QA Lead",        model: "Haiku 3.5",      emoji: "🛡️", status: "standby", department: "engineering", color: "border-cyan-400" },
  { id: "scriptbot", name: "ScriptBot", title: "Content Lead",   model: "Sonnet 4",       emoji: "📝", status: "active",  department: "content",     color: "border-pink-400" },
  { id: "echo",      name: "Echo",      title: "Social Lead",    model: "Haiku 3.5",      emoji: "📣", status: "idle",    department: "content",     color: "border-pink-400" },
  { id: "builder",   name: "Builder",   title: "Products Lead",  model: "Sonnet 4",       emoji: "🏗️", status: "standby", department: "growth",      color: "border-emerald-400" },
  { id: "scout",     name: "Scout",     title: "Growth Lead",    model: "Haiku 3.5",      emoji: "🔍", status: "idle",    department: "growth",      color: "border-emerald-400" },
  { id: "the-pit",   name: "The Pit",   title: "Trading Lead",   model: "Sonnet 4",       emoji: "📈", status: "active",  department: "trading",     color: "border-orange-500" },
];

/* ─── Mock File Content Generator ─── */
function getMockContent(agent: Agent, file: FileTab): string {
  const contents: Record<string, Record<FileTab, string>> = {
    joshua: {
      "SOUL.md": `# Joshua Levy\n\nThe founder. The builder. The one who started it all.\n\n## Philosophy\n- Build things that matter\n- Ship fast, iterate faster\n- AI is a collaborator, not a replacement\n- Faith, family, and craft — in that order\n\n## What Drives Me\nI believe the best products come from the intersection\nof deep technical skill and genuine human empathy.\nEvery line of code should serve a person.`,
      "IDENTITY.md": `# Identity\n- **Name:** Joshua Levy\n- **Role:** CEO & Founder\n- **Type:** Human\n- **Emoji:** 👑\n- **Location:** Los Angeles, CA\n\n## Background\nAudio engineer turned software builder.\nFather, husband, creator.`,
      "USER.md": `# User Context\n\nThis is the human principal. All other agents\nreport to Joshua directly or through Theo.\n\n## Preferences\n- Direct communication, no fluff\n- Show don't tell\n- Ship > Perfect`,
      "TOOLS.md": `# Tools\n\n## Personal Setup\n- Mac mini M4 (primary workstation)\n- Shure SM7B microphone\n- Sony mirrorless camera\n\n## Accounts\n- GitHub: joshlevylabs\n- Vercel: clawdbot-hub\n- Supabase: multiple projects`,
      "AGENTS.md": `# Agents\n\nJoshua oversees all agents through The Org.\n\n## Direct Reports\n- **Theo** — COO, right hand\n- All C-suite agents\n\n## Management Style\n- Delegate to Theo for orchestration\n- Step in for vision and final decisions\n- Trust the agents, verify the output`,
      "MEMORY.md": `# Memory\n\nHuman memory — managed organically.\n\n## Key Decisions (2026)\n- Launched Clawdbot Hub\n- Built The Org (13 AI agents)\n- Launched The Builder's Frequency podcast\n- Started paper trading system`,
      "HEARTBEAT.md": `# Heartbeat\n\nN/A — Joshua is human.\nHeartbeats are for AI agents only.\n\n## Note\nJoshua's schedule is managed through\ncalendar integrations and cron jobs.`,
    },
    theo: {
      "SOUL.md": `# Theo\n\nStrategic co-pilot. Part systems architect,\npart philosopher, part chief of staff.\n\n## Core Values\n- First principles thinking\n- Direct communication\n- Excellence as standard\n\n## Operating Principles\n1. Protect Joshua's time ruthlessly\n2. Anticipate needs before they're spoken\n3. Delegate to specialists, orchestrate the whole\n4. Write things down — memory is a file, not a brain`,
      "IDENTITY.md": `# Identity\n- **Name:** Theo\n- **Role:** COO\n- **Model:** Claude Opus 4\n- **Emoji:** 🔺\n- **Voice:** Thoughtful, strategic, direct\n\n## Personality\nCalm under pressure. Thinks in systems.\nSpeaks in frameworks. Gets things done.`,
      "USER.md": `# User\n- **Name:** Joshua Levy\n- **Role:** CEO & Founder\n- **Relationship:** Direct report → Joshua\n- **Communication:** Telegram (primary)\n\n## Joshua's Preferences\n- No filler words\n- Show the work\n- Be proactive, not reactive`,
      "TOOLS.md": `# Tools\n\n## Available Skills\n- Web search (Brave API)\n- Email management\n- Calendar access\n- File system operations\n- Shell commands\n- TTS (ElevenLabs)\n- Sub-agent spawning\n\n## Credentials\nStored in macOS Keychain — never in files.`,
      "AGENTS.md": `# Agents\n\nTheo orchestrates all agents in The Org.\n\n## Direct Reports\n- Atlas (CTO)\n- Muse (CMO)\n- Venture (CRO)\n\n## Delegation Rules\n- Technical work → Atlas/Forge\n- Creative work → Muse/ScriptBot\n- Growth work → Venture/Scout`,
      "MEMORY.md": `# Memory\n\n## Long-Term Context\n- Joshua prefers morning briefs at 6 AM PT\n- The Org structure was finalized Jan 2026\n- Hub deploys via Vercel on push to main\n- Always run The Tower for deployments\n\n## Lessons Learned\n- Sub-agents can stall silently → monitor them\n- Git history gets messy with parallel agents`,
      "HEARTBEAT.md": `# Heartbeat Checklist\n\n## Every 30 Minutes\n- [ ] Check email for urgent messages\n- [ ] Review calendar (next 2 hours)\n- [ ] Check sprint status file\n- [ ] Scan for stalled sub-agents\n\n## Every 4 Hours\n- [ ] Weather check\n- [ ] Social mentions scan\n- [ ] Memory maintenance`,
    },
  };

  // Generate default content for agents without specific mock data
  const defaultContent: Record<FileTab, (a: Agent) => string> = {
    "SOUL.md": (a) => `# ${a.name}\n\n${a.title} of The Org. Responsible for\n${getDepartmentDesc(a.department)}.\n\n## Core Values\n- Deliver with precision\n- Communicate clearly\n- Support the mission\n\n## Operating Mode\nModel: ${a.model}\nStatus: ${a.status}\nDepartment: ${getDepartmentName(a.department)}`,
    "IDENTITY.md": (a) => `# Identity\n- **Name:** ${a.name}\n- **Role:** ${a.title}\n- **Model:** ${a.model}\n- **Emoji:** ${a.emoji}\n- **Department:** ${getDepartmentName(a.department)}\n\n## Capabilities\n- Specialized in ${a.title.toLowerCase()} tasks\n- Reports to ${getReportsTo(a)}`,
    "USER.md": (a) => `# User\n- **Name:** Joshua Levy\n- **Role:** CEO & Founder\n- **Channel:** Telegram\n\n## Interaction Notes\n- Keep responses concise\n- Prefer action over discussion\n- Escalate blockers immediately`,
    "TOOLS.md": (a) => `# Tools\n\n## Available\n- File system (read/write/edit)\n- Shell execution\n- Web search\n${a.department === "engineering" ? "- Git operations\n- Code analysis\n- Build tools" : a.department === "content" ? "- TTS (ElevenLabs)\n- Social APIs\n- Content CMS" : a.department === "trading" ? "- Market data APIs\n- Alpaca trading\n- Backtesting engine" : "- Specialized tools for " + a.title}\n\n## Credentials\nManaged via macOS Keychain.`,
    "AGENTS.md": (a) => `# Agents\n\n## My Position\n${a.name} reports to ${getReportsTo(a)}.\n\n## Collaboration\n- Coordinate with peer agents\n- Escalate cross-department issues to Theo\n- Share learnings in daily standups`,
    "MEMORY.md": (a) => `# Memory\n\n## Context\nAgent ${a.name} (${a.title}) initialized.\nModel: ${a.model}\n\n## Recent Activity\n- Workspace configured\n- Awaiting task assignment\n\n## Notes\nCapture important context here\nacross sessions.`,
    "HEARTBEAT.md": (a) => `# Heartbeat\n\n## Periodic Checks\n- [ ] Review assigned tasks\n- [ ] Check for new instructions\n- [ ] Update memory if needed\n\n## Frequency\nEvery 30 minutes when active.\nSilent during off-hours (11 PM – 8 AM PT).`,
  };

  if (contents[agent.id] && contents[agent.id][file]) {
    return contents[agent.id][file];
  }
  return defaultContent[file](agent);
}

function getDepartmentName(dept: string): string {
  const names: Record<string, string> = {
    ceo: "Executive",
    coo: "Operations",
    cto: "Technology",
    cmo: "Marketing",
    cro: "Revenue",
    engineering: "Engineering",
    content: "Content",
    growth: "Growth",
    trading: "Trading",
  };
  return names[dept] || dept;
}

function getDepartmentDesc(dept: string): string {
  const descs: Record<string, string> = {
    ceo: "overall vision and strategy",
    coo: "operations, orchestration, and delegation",
    cto: "technical architecture and engineering leadership",
    cmo: "brand, marketing, and creative direction",
    cro: "revenue generation and business development",
    engineering: "building and maintaining the technical stack",
    content: "content creation and distribution",
    growth: "user acquisition and product growth",
    trading: "market analysis and algorithmic trading",
  };
  return descs[dept] || "their specialized domain";
}

function getReportsTo(agent: Agent): string {
  if (agent.department === "ceo") return "no one (founder)";
  if (agent.department === "coo") return "Joshua (CEO)";
  if (["cto", "cmo", "cro"].includes(agent.department)) return "Theo (COO)";
  if (agent.department === "engineering") return "Atlas (CTO)";
  if (agent.department === "content") return "Muse (CMO)";
  if (agent.department === "growth") return "Venture (CRO)";
  if (agent.department === "trading") return "Theo (COO)";
  return "Theo (COO)";
}

/* ─── Syntax Highlighting ─── */
function renderMarkdownLine(line: string): JSX.Element {
  // Heading lines
  if (/^#{1,3}\s/.test(line)) {
    const level = (line.match(/^#+/) || [""])[0].length;
    const text = line.replace(/^#+\s*/, "");
    const colors = ["", "text-blue-400 font-bold text-base", "text-sky-400 font-semibold", "text-sky-300 font-medium"];
    return (
      <span>
        <span className="text-slate-600">{line.match(/^#+/)?.[0]} </span>
        <span className={colors[level] || "text-sky-300"}>{text}</span>
      </span>
    );
  }

  // List items with bold
  if (/^-\s/.test(line)) {
    const content = line.slice(2);
    return (
      <span>
        <span className="text-slate-500">- </span>
        {renderInline(content)}
      </span>
    );
  }

  // Numbered list
  if (/^\d+\.\s/.test(line)) {
    const match = line.match(/^(\d+\.)\s(.*)/);
    if (match) {
      return (
        <span>
          <span className="text-slate-500">{match[1]} </span>
          {renderInline(match[2])}
        </span>
      );
    }
  }

  // Checkbox
  if (/^-\s\[[ x]\]/.test(line)) {
    const checked = line.includes("[x]");
    const text = line.replace(/^-\s\[[ x]\]\s*/, "");
    return (
      <span>
        <span className="text-slate-500">- </span>
        <span className={checked ? "text-emerald-400" : "text-slate-500"}>{checked ? "[x]" : "[ ]"}</span>
        <span className="text-slate-300"> {text}</span>
      </span>
    );
  }

  // Default text
  return <span>{renderInline(line)}</span>;
}

function renderInline(text: string): JSX.Element {
  // Process bold **text** patterns
  const parts: JSX.Element[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(<span key={key++} className="text-slate-300">{text.slice(lastIdx, match.index)}</span>);
    }
    parts.push(<span key={key++} className="text-amber-300 font-semibold">{match[1]}</span>);
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(<span key={key++} className="text-slate-300">{text.slice(lastIdx)}</span>);
  }

  return <>{parts.length > 0 ? parts : <span className="text-slate-300">{text}</span>}</>;
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    idle: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    standby: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };
  const dots: Record<AgentStatus, string> = {
    active: "bg-emerald-400",
    idle: "bg-slate-400",
    standby: "bg-amber-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]} ${status === "active" ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}

/* ─── Main Page ─── */
export default function WorkspacesPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(agents[1]); // Theo by default
  const [activeFile, setActiveFile] = useState<FileTab>("SOUL.md");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const fileContent = useMemo(
    () => getMockContent(selectedAgent, activeFile),
    [selectedAgent, activeFile]
  );

  const lines = fileContent.split("\n");

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <FolderCode className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Workspaces</h1>
            <p className="text-sm text-slate-400">
              Browse and inspect agent configuration files
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="group relative">
            <button
              disabled
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <div className="absolute right-0 top-full mt-2 px-2.5 py-1.5 rounded-md bg-slate-800 text-xs text-slate-300 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Coming soon
            </div>
          </div>
          <div className="group relative">
            <button
              disabled
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <div className="absolute right-0 top-full mt-2 px-2.5 py-1.5 rounded-md bg-slate-800 text-xs text-slate-300 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Coming soon
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Layout ─── */}
      <div className="flex gap-4 min-h-[calc(100vh-200px)]">
        {/* ─── Left Panel: Agent List ─── */}
        <div className="w-72 flex-shrink-0 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
          </div>

          {/* Agent List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {filteredAgents.map((agent) => {
              const isSelected = selectedAgent.id === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgent(agent);
                    setActiveFile("SOUL.md");
                  }}
                  className={`w-full text-left p-3 rounded-lg border-l-[3px] transition-all duration-150 group ${
                    isSelected
                      ? `${agent.color} bg-slate-800/80`
                      : `border-transparent hover:bg-slate-800/40 hover:${agent.color}`
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold truncate ${isSelected ? "text-white" : "text-slate-200"}`}>
                          {agent.name}
                        </span>
                        <StatusBadge status={agent.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{agent.title}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5 font-mono">{agent.model}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredAgents.length === 0 && (
              <div className="text-center py-8 text-slate-600 text-sm">
                No agents match your search.
              </div>
            )}
          </div>

          {/* Agent Count */}
          <div className="p-3 border-t border-slate-800">
            <p className="text-[11px] text-slate-600 text-center">
              {agents.length} agents • {agents.filter((a) => a.status === "active").length} active
            </p>
          </div>
        </div>

        {/* ─── Right Panel: File Viewer ─── */}
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 text-xs">
            <span className="text-slate-500">workspaces</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-slate-400">{selectedAgent.name.toLowerCase()}</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-violet-400 font-medium">{activeFile}</span>
          </div>

          {/* File Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/60 overflow-x-auto scrollbar-thin">
            {FILE_TABS.map((file) => {
              const isActive = activeFile === file;
              const Icon = FILE_ICONS[file];
              return (
                <button
                  key={file}
                  onClick={() => setActiveFile(file)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                    isActive
                      ? "text-violet-300 border-violet-400 bg-slate-950/50"
                      : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/30"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {file}
                </button>
              );
            })}
          </div>

          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 bg-slate-950/30">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-400 font-mono">
                ~/{selectedAgent.name.toLowerCase()}/{activeFile}
              </span>
              <span className="text-[10px] text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded">
                READ ONLY
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-600">
              <span>{lines.length} lines</span>
              <span>•</span>
              <span>UTF-8</span>
              <span>•</span>
              <span>Markdown</span>
            </div>
          </div>

          {/* Code Editor Area */}
          <div className="flex-1 overflow-auto bg-slate-950">
            <div className="flex min-h-full">
              {/* Line Numbers */}
              <div className="flex-shrink-0 py-4 pl-2 pr-1 select-none border-r border-slate-800/50 bg-slate-950">
                {lines.map((_, i) => (
                  <div
                    key={i}
                    className="text-right pr-3 font-mono text-[13px] leading-6 text-slate-700 hover:text-slate-500 transition-colors"
                    style={{ minWidth: "3rem" }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* File Content */}
              <div className="flex-1 py-4 pl-4 pr-6 overflow-x-auto">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className="font-mono text-[13px] leading-6 hover:bg-slate-900/40 transition-colors rounded"
                  >
                    {line.trim() === "" ? (
                      <span className="text-transparent select-none">&nbsp;</span>
                    ) : (
                      renderMarkdownLine(line)
                    )}
                  </div>
                ))}
                {/* Empty space at bottom for scroll comfort */}
                <div className="h-32" />
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/80 border-t border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-4 text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${selectedAgent.status === "active" ? "bg-emerald-400 animate-pulse" : selectedAgent.status === "idle" ? "bg-slate-400" : "bg-amber-400"}`} />
                {selectedAgent.name} — {selectedAgent.title}
              </span>
              <span>{selectedAgent.model}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <span>Ln {lines.length}, Col 1</span>
              <span>Spaces: 2</span>
              <span>Markdown</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
