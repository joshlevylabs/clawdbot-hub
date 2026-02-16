"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
  Wifi,
  WifiOff,
  X,
  Check,
  Loader2,
  Settings,
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
  department: string;
  color: string;
  files: string[];
}

type FileTab =
  | "SOUL.md"
  | "IDENTITY.md"
  | "USER.md"
  | "TOOLS.md"
  | "AGENTS.md"
  | "MEMORY.md"
  | "HEARTBEAT.md";

const ALL_FILE_TABS: FileTab[] = [
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

/* ─── Fallback Agent Data ─── */
const FALLBACK_AGENTS: Agent[] = [
  { id: "joshua",    name: "Joshua",    title: "CEO",            model: "Human",          emoji: "👑", status: "active",  department: "ceo",         color: "border-amber-500", files: ALL_FILE_TABS.slice() },
  { id: "theo",      name: "Theo",      title: "COO",            model: "Claude Opus 4",  emoji: "🔺", status: "active",  department: "coo",         color: "border-violet-500", files: ALL_FILE_TABS.slice() },
  { id: "atlas",     name: "Atlas",     title: "CTO",            model: "Claude Sonnet 4",emoji: "🗺️", status: "active",  department: "cto",         color: "border-cyan-500", files: ALL_FILE_TABS.slice() },
  { id: "muse",      name: "Muse",      title: "CMO",            model: "Claude Sonnet 4",emoji: "🎨", status: "active",  department: "cmo",         color: "border-pink-500", files: ALL_FILE_TABS.slice() },
  { id: "venture",   name: "Venture",   title: "CRO",            model: "Claude Sonnet 4",emoji: "💰", status: "standby", department: "cro",         color: "border-emerald-500", files: ALL_FILE_TABS.slice() },
  { id: "forge",     name: "Forge",     title: "Backend Lead",   model: "Sonnet 4",       emoji: "🔨", status: "active",  department: "engineering", color: "border-cyan-400", files: ALL_FILE_TABS.slice() },
  { id: "pixel",     name: "Pixel",     title: "Frontend Lead",  model: "Sonnet 4",       emoji: "✨", status: "idle",    department: "engineering", color: "border-cyan-400", files: ALL_FILE_TABS.slice() },
  { id: "sentinel",  name: "Sentinel",  title: "QA Lead",        model: "Haiku 3.5",      emoji: "🛡️", status: "standby", department: "engineering", color: "border-cyan-400", files: ALL_FILE_TABS.slice() },
  { id: "scriptbot", name: "ScriptBot", title: "Content Lead",   model: "Sonnet 4",       emoji: "📝", status: "active",  department: "content",     color: "border-pink-400", files: ALL_FILE_TABS.slice() },
  { id: "echo",      name: "Echo",      title: "Social Lead",    model: "Haiku 3.5",      emoji: "📣", status: "idle",    department: "content",     color: "border-pink-400", files: ALL_FILE_TABS.slice() },
  { id: "builder",   name: "Builder",   title: "Products Lead",  model: "Sonnet 4",       emoji: "🏗️", status: "standby", department: "growth",      color: "border-emerald-400", files: ALL_FILE_TABS.slice() },
  { id: "scout",     name: "Scout",     title: "Growth Lead",    model: "Haiku 3.5",      emoji: "🔍", status: "idle",    department: "growth",      color: "border-emerald-400", files: ALL_FILE_TABS.slice() },
  { id: "the-pit",   name: "The Pit",   title: "Trading Lead",   model: "Sonnet 4",       emoji: "📈", status: "active",  department: "trading",     color: "border-orange-500", files: ALL_FILE_TABS.slice() },
];

/* ─── Department color mapping ─── */
function getDeptColor(dept: string): string {
  const map: Record<string, string> = {
    ceo: "border-amber-500",
    executive: "border-amber-500",
    coo: "border-violet-500",
    operations: "border-violet-500",
    cto: "border-cyan-500",
    engineering: "border-cyan-400",
    cmo: "border-pink-500",
    content: "border-pink-400",
    marketing: "border-pink-500",
    cro: "border-emerald-500",
    growth: "border-emerald-400",
    revenue: "border-emerald-500",
    trading: "border-orange-500",
  };
  return map[dept.toLowerCase()] || "border-slate-500";
}

/* ─── Mock File Content Generator (fallback) ─── */
function getMockContent(agent: Agent, file: FileTab): string {
  return `# ${agent.name} — ${file}\n\n> ⚠️ API not connected. Showing placeholder content.\n\n- **Name:** ${agent.name}\n- **Title:** ${agent.title}\n- **Model:** ${agent.model}\n- **Emoji:** ${agent.emoji}\n- **Department:** ${agent.department}\n\nConnect the agent files API to see real content.`;
}

/* ─── Syntax Highlighting ─── */
function renderMarkdownLine(line: string): JSX.Element {
  if (/^#{1,3}\s/.test(line)) {
    const level = (line.match(/^#+/) || [""])[0].length;
    const text = line.replace(/^#+\s*/, "");
    const colors = [
      "",
      "text-blue-400 font-bold text-base",
      "text-sky-400 font-semibold",
      "text-sky-300 font-medium",
    ];
    return (
      <span>
        <span className="text-slate-600">{line.match(/^#+/)?.[0]} </span>
        <span className={colors[level] || "text-sky-300"}>{text}</span>
      </span>
    );
  }

  if (/^>\s/.test(line)) {
    return (
      <span>
        <span className="text-slate-600">&gt; </span>
        <span className="text-amber-300/80 italic">{line.slice(2)}</span>
      </span>
    );
  }

  if (/^-\s\[[ x]\]/.test(line)) {
    const checked = line.includes("[x]");
    const text = line.replace(/^-\s\[[ x]\]\s*/, "");
    return (
      <span>
        <span className="text-slate-500">- </span>
        <span className={checked ? "text-emerald-400" : "text-slate-500"}>
          {checked ? "[x]" : "[ ]"}
        </span>
        <span className="text-slate-300"> {text}</span>
      </span>
    );
  }

  if (/^-\s/.test(line)) {
    return (
      <span>
        <span className="text-slate-500">- </span>
        {renderInline(line.slice(2))}
      </span>
    );
  }

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

  return <span>{renderInline(line)}</span>;
}

function renderInline(text: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(
        <span key={key++} className="text-slate-300">
          {text.slice(lastIdx, match.index)}
        </span>
      );
    }
    parts.push(
      <span key={key++} className="text-amber-300 font-semibold">
        {match[1]}
      </span>
    );
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(
      <span key={key++} className="text-slate-300">
        {text.slice(lastIdx)}
      </span>
    );
  }

  return (
    <>
      {parts.length > 0 ? (
        parts
      ) : (
        <span className="text-slate-300">{text}</span>
      )}
    </>
  );
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
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dots[status]} ${status === "active" ? "animate-pulse" : ""}`}
      />
      {status}
    </span>
  );
}

/* ─── Edit Agent Modal ─── */
function EditAgentModal({
  agent,
  onClose,
  onSave,
}: {
  agent: Agent;
  onClose: () => void;
  onSave: (data: { name?: string; title?: string; model?: string; emoji?: string }) => void;
}) {
  const [formName, setFormName] = useState(agent.name);
  const [formTitle, setFormTitle] = useState(agent.title);
  const [formModel, setFormModel] = useState(agent.model);
  const [formEmoji, setFormEmoji] = useState(agent.emoji);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name: formName,
      title: formTitle,
      model: formModel,
      emoji: formEmoji,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-100">
            Edit Agent — {agent.name}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">
              Emoji
            </label>
            <input
              type="text"
              value={formEmoji}
              onChange={(e) => setFormEmoji(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">
              Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">
              Title
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">
              Model
            </label>
            <input
              type="text"
              value={formModel}
              onChange={(e) => setFormModel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-violet-500/50"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function WorkspacesPage() {
  const [agents, setAgents] = useState<Agent[]>(FALLBACK_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<Agent>(FALLBACK_AGENTS[1]);
  const [activeFile, setActiveFile] = useState<FileTab>("SOUL.md");
  const [searchQuery, setSearchQuery] = useState("");
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  // File content state
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Agent edit modal
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Check API availability and fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        const mapped: Agent[] = data.map(
          (a: {
            name: string;
            title: string;
            model: string;
            emoji: string;
            department: string;
            files: string[];
          }) => ({
            id: a.name.toLowerCase().replace(/\s+/g, "-"),
            name: a.name,
            title: a.title || "Agent",
            model: a.model || "Unknown",
            emoji: a.emoji || "🤖",
            status: "active" as AgentStatus,
            department: a.department || "unknown",
            color: getDeptColor(a.department || "unknown"),
            files: a.files,
          })
        );
        if (mapped.length > 0) {
          setAgents(mapped);
          setSelectedAgent((prev) => {
            const found = mapped.find((m) => m.id === prev.id);
            return found || mapped[0];
          });
        }
        setApiConnected(true);
        return true;
      } else {
        setApiConnected(false);
        return false;
      }
    } catch {
      setApiConnected(false);
      return false;
    }
  }, []);

  // Fetch file content
  const fetchFileContent = useCallback(
    async (agentId: string, filename: string) => {
      setFileLoading(true);
      setIsEditing(false);
      setSaveStatus("idle");
      try {
        const res = await fetch(
          `/api/agents/${encodeURIComponent(agentId)}/files/${encodeURIComponent(filename)}`
        );
        if (res.ok) {
          const data = await res.json();
          setFileContent(data.content);
          setFileLoading(false);
          return;
        }
      } catch {
        // Fall through to mock
      }
      // Fallback to mock content
      const agent = agents.find((a) => a.id === agentId) || selectedAgent;
      setFileContent(getMockContent(agent, filename as FileTab));
      setFileLoading(false);
    },
    [agents, selectedAgent]
  );

  // Initial load
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Fetch file content when agent or file changes
  useEffect(() => {
    if (selectedAgent) {
      fetchFileContent(selectedAgent.id, activeFile);
    }
  }, [selectedAgent, activeFile, fetchFileContent]);

  // Save file
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch(
        `/api/agents/${encodeURIComponent(selectedAgent.id)}/files/${encodeURIComponent(activeFile)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent }),
        }
      );
      if (res.ok) {
        setFileContent(editContent);
        setIsEditing(false);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
    setIsSaving(false);
  };

  // Edit agent metadata
  const handleEditAgent = async (data: {
    name?: string;
    title?: string;
    model?: string;
    emoji?: string;
  }) => {
    if (!editingAgent) return;
    try {
      const res = await fetch(
        `/api/agents/${encodeURIComponent(editingAgent.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (res.ok) {
        // Refresh agent list
        await fetchAgents();
        setEditingAgent(null);
      }
    } catch {
      // Silently fail for now
    }
  };

  // Start editing
  const startEditing = () => {
    setEditContent(fileContent);
    setIsEditing(true);
    setSaveStatus("idle");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSaveStatus("idle");
  };

  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q)
    );
  }, [searchQuery, agents]);

  const lines = (isEditing ? editContent : fileContent).split("\n");

  const fileTabs = useMemo(() => {
    if (
      selectedAgent.files &&
      selectedAgent.files.length > 0 &&
      apiConnected
    ) {
      return selectedAgent.files as FileTab[];
    }
    return ALL_FILE_TABS;
  }, [selectedAgent, apiConnected]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* ─── Agent Edit Modal ─── */}
      {editingAgent && (
        <EditAgentModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onSave={handleEditAgent}
        />
      )}

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <FolderCode className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Workspaces
            </h1>
            <p className="text-sm text-slate-400">
              Browse and edit agent configuration files
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* API status badge */}
          {apiConnected === false && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-amber-900/30 text-amber-400 border border-amber-700/30">
              <WifiOff className="w-3 h-3" />
              API not connected
            </span>
          )}
          {isEditing ? (
            <>
              <button
                onClick={cancelEditing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-slate-700/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-600 text-white border border-violet-500/50 hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEditing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-slate-700/80 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-emerald-400">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-red-400">
                  Save failed
                </span>
              )}
            </>
          )}
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
                <div key={agent.id} className="group relative">
                  <button
                    onClick={() => {
                      setSelectedAgent(agent);
                      setActiveFile("SOUL.md");
                      setIsEditing(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border-l-[3px] transition-all duration-150 ${
                      isSelected
                        ? `${agent.color} bg-slate-800/80`
                        : "border-transparent hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {agent.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm font-semibold truncate ${isSelected ? "text-white" : "text-slate-200"}`}
                          >
                            {agent.name}
                          </span>
                          <StatusBadge status={agent.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {agent.title}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
                          {agent.model}
                        </p>
                      </div>
                    </div>
                  </button>
                  {/* Edit Agent button — appears on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAgent(agent);
                    }}
                    className="absolute right-2 top-2 p-1.5 rounded-md bg-slate-800/80 border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700"
                    title="Edit agent properties"
                  >
                    <Settings className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
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
              {agents.length} agents •{" "}
              {agents.filter((a) => a.status === "active").length} active
            </p>
          </div>
        </div>

        {/* ─── Right Panel: File Viewer / Editor ─── */}
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 text-xs">
            <span className="text-slate-500">workspaces</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-slate-400">
              {selectedAgent.name.toLowerCase()}
            </span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-violet-400 font-medium">{activeFile}</span>
            {isEditing && (
              <span className="ml-2 text-[10px] text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-700/30">
                EDITING
              </span>
            )}
          </div>

          {/* File Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/60 overflow-x-auto scrollbar-thin">
            {fileTabs.map((file) => {
              const isActive = activeFile === file;
              const Icon = FILE_ICONS[file] || FileText;
              return (
                <button
                  key={file}
                  onClick={() => {
                    setActiveFile(file);
                    setIsEditing(false);
                  }}
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
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isEditing
                    ? "text-amber-300 bg-amber-900/30 border border-amber-700/30"
                    : "text-slate-600 bg-slate-800/50"
                }`}
              >
                {isEditing ? "EDIT MODE" : "READ ONLY"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-600">
              {fileLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
              )}
              <span>{lines.length} lines</span>
              <span>•</span>
              <span>UTF-8</span>
              <span>•</span>
              <span>Markdown</span>
            </div>
          </div>

          {/* Code Editor / Textarea Area */}
          <div className="flex-1 overflow-auto bg-slate-950">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full min-h-[500px] p-4 bg-slate-950 text-slate-300 font-mono text-[13px] leading-6 resize-none focus:outline-none"
                spellCheck={false}
              />
            ) : (
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
                        <span className="text-transparent select-none">
                          &nbsp;
                        </span>
                      ) : (
                        renderMarkdownLine(line)
                      )}
                    </div>
                  ))}
                  <div className="h-32" />
                </div>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/80 border-t border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-4 text-slate-500">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    selectedAgent.status === "active"
                      ? "bg-emerald-400 animate-pulse"
                      : selectedAgent.status === "idle"
                        ? "bg-slate-400"
                        : "bg-amber-400"
                  }`}
                />
                {selectedAgent.name} — {selectedAgent.title}
              </span>
              <span>{selectedAgent.model}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              {/* API Connection Status */}
              <span className="flex items-center gap-1">
                {apiConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500">Connected</span>
                  </>
                ) : apiConnected === false ? (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-500">Offline</span>
                  </>
                ) : (
                  <span>Checking...</span>
                )}
              </span>
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
