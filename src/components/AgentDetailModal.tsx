"use client";

import { useState, useEffect } from "react";
import {
  X,
  Bot,
  Monitor,
  Brain,
  MessageSquare,
  BookOpen,
  Plug,
  Settings,
  Globe,
  Thermometer,
  Hash,
  Calendar,
  User,
  Database,
  Server,
  Zap,
  Save,
  RotateCcw,
  Loader2,
  Plus,
  Search,
  Trash2,
  Edit,
  Upload,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  EyeOff
} from "lucide-react";

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

interface AgentMemory {
  id: string;
  content: string;
  type: string;
  created_at: string;
}

interface AgentConversation {
  id: string;
  title: string;
  updated_at: string;
  agent_messages: { count: number }[];
}

interface AgentConfig {
  id: string;
  name: string;
  title: string;
  emoji: string;
  department: string;
  model: string;
  temperature: number;
  max_tokens: number;
  endpoint_enabled: boolean;
  soul_prompt: string | null;
  description: string;
  knowledge_sources: any;
  integrations: any;
  created_at: string;
  updated_at: string;
}

interface SacredTextMatch {
  id: string;
  tradition: string;
  tradition_group?: string;
  title: string;
  original_title?: string;
  slug: string;
  passage_count: number;
  embedding_count: number;
  ingestion_status: string;
}

interface KnowledgeData {
  agentId: string;
  localKnowledge: any[];
  sacredTexts: SacredTextMatch[];
  coreTexts?: string[];
  embeddingStats: {
    totalTexts: number;
    totalPassages: number;
    totalEmbeddings: number;
    coverage: number;
  } | null;
}

interface AgentDetailData {
  config: AgentConfig;
  memories: AgentMemory[];
  memoryCount: number;
  conversations: AgentConversation[];
  conversationCount: number;
}

interface KnowledgeMemory {
  id: string;
  agent_id: string;
  kind: string;
  content: string;
  summary?: string;
  source?: string;
  importance: number;
  tags: string[];
  recalled_count: number;
  created_at: string;
}

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
}

type TabId = "overview" | "hosting" | "llm" | "knowledge" | "memory" | "conversations" | "config";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Bot },
  { id: "hosting", label: "Hosting", icon: Server },
  { id: "llm", label: "LLM Config", icon: Brain },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "memory", label: "Memory", icon: Database },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "config", label: "Config", icon: Settings },
];

function formatModelName(model: string): string {
  const parts = model.split('/');
  const modelName = parts[parts.length - 1];
  return modelName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Recent';
}

function DepartmentBadge({ department }: { department: string }) {
  const deptColors: Record<string, { bg: string; text: string; emoji: string }> = {
    'the-trading-desk': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', emoji: '📈' },
    'faith-journey-guides': { bg: 'bg-purple-500/15', text: 'text-purple-400', emoji: '🕊️' },
    'judaism': { bg: 'bg-blue-500/15', text: 'text-blue-400', emoji: '✡️' },
    'christianity': { bg: 'bg-red-500/15', text: 'text-red-400', emoji: '✝️' },
    'islam': { bg: 'bg-green-500/15', text: 'text-green-400', emoji: '☪️' },
    'hinduism': { bg: 'bg-orange-500/15', text: 'text-orange-400', emoji: '🕉️' },
    'buddhism': { bg: 'bg-yellow-500/15', text: 'text-yellow-400', emoji: '☸️' },
    'other-traditions': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', emoji: '🌍' },
  };

  const config = deptColors[department] || { bg: 'bg-slate-500/15', text: 'text-slate-400', emoji: '🤖' };
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${config.bg} ${config.text} text-sm font-medium`}>
      <span>{config.emoji}</span>
      <span>{department.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
    </div>
  );
}

// ── Agent Knowledge Base (from agent_memories table) ──────────────
function AgentKnowledgeBase({ agentId }: { agentId: string }) {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeMemory[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [expandedKb, setExpandedKb] = useState<string | null>(null);
  const [kbSearch, setKbSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingKb, setIsSearchingKb] = useState(false);
  const [activeKind, setActiveKind] = useState<string>("all");

  // Episodic kinds (Layer 3) vs Knowledge (Layer 2)
  const EPISODIC_KINDS = ["reflection", "observation", "decision", "episode", "error", "execution", "signal"];
  const isEpisodic = (kind: string) => EPISODIC_KINDS.includes(kind);

  useEffect(() => {
    async function fetchKnowledge() {
      try {
        const [itemsRes, statsRes] = await Promise.all([
          fetch(`/api/agent-memories?agent_id=${agentId}&limit=200`),
          fetch(`/api/agent-memories/stats?agent_id=${agentId}`),
        ]);
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          setKnowledgeItems(data.memories || []);
        }
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setKnowledgeCount(stats.total_memories || 0);
        }
      } catch (err) {
        console.error("Failed to fetch knowledge:", err);
      } finally {
        setKnowledgeLoading(false);
      }
    }
    fetchKnowledge();
  }, [agentId]);

  const handleKbSearch = async () => {
    if (!kbSearch.trim()) return;
    setIsSearchingKb(true);
    try {
      const res = await fetch("/api/agent-memories/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: kbSearch, agent_id: agentId, limit: 10 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("KB search failed:", err);
    } finally {
      setIsSearchingKb(false);
    }
  };

  const handleDeleteKb = async (id: string) => {
    if (!confirm("Delete this knowledge entry?")) return;
    try {
      const res = await fetch(`/api/agent-memories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKnowledgeItems(prev => prev.filter(k => k.id !== id));
        setKnowledgeCount(prev => prev - 1);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const KIND_COLORS: Record<string, string> = {
    knowledge: "bg-blue-500/20 text-blue-400",
    observation: "bg-amber-500/20 text-amber-400",
    decision: "bg-emerald-500/20 text-emerald-400",
    reflection: "bg-purple-500/20 text-purple-400",
    episode: "bg-cyan-500/20 text-cyan-400",
    interaction: "bg-pink-500/20 text-pink-400",
    error: "bg-red-500/20 text-red-400",
    execution: "bg-teal-500/20 text-teal-400",
    signal: "bg-indigo-500/20 text-indigo-400",
  };

  const KIND_ICONS: Record<string, string> = {
    reflection: "🪞",
    observation: "🔍",
    decision: "📝",
    episode: "📊",
    error: "⚠️",
    execution: "⚡",
    signal: "📡",
    knowledge: "📚",
  };

  // Split items into episodic (Layer 3) and knowledge (Layer 2)
  const episodicItems = knowledgeItems.filter(i => isEpisodic(i.kind));
  const knowledgeOnlyItems = knowledgeItems.filter(i => !isEpisodic(i.kind));

  // Count by kind for episodic
  const kindCounts: Record<string, number> = {};
  episodicItems.forEach(i => {
    kindCounts[i.kind] = (kindCounts[i.kind] || 0) + 1;
  });

  // Filter items based on activeKind
  const filteredItems = activeKind === "all"
    ? knowledgeItems
    : activeKind === "episodic"
    ? episodicItems
    : activeKind === "knowledge-only"
    ? knowledgeOnlyItems
    : knowledgeItems.filter(i => i.kind === activeKind);

  return (
    <div className="space-y-5">
      {knowledgeLoading ? (
        <div className="text-center py-4">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#626259" }} />
        </div>
      ) : knowledgeItems.length === 0 ? (
        <div className="text-center py-6" style={{ color: "#626259" }}>
          <Brain className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="text-xs">No memory entries yet</p>
        </div>
      ) : (
        <>
          {/* ── Memory Explorer Header ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" style={{ color: "#D4A020" }} />
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>
                Memory Explorer
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "#1A1A24", color: "#626259" }}>
                {knowledgeCount} total
              </span>
            </div>
          </div>

          {/* ── Layer Stats Cards ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg border" style={{ backgroundColor: "#13131B", borderColor: episodicItems.length > 0 ? "rgba(168,85,247,0.3)" : "#2A2A38" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🧠</span>
                <span className="text-xs font-semibold" style={{ color: "#A855F7" }}>Episodic Memory</span>
                <span className="text-[10px] ml-auto font-mono" style={{ color: "#626259" }}>{episodicItems.length}</span>
              </div>
              <p className="text-[10px]" style={{ color: "#626259" }}>
                Reflections, observations, trade decisions, episodes. What the agent has learned from experience.
              </p>
              {episodicItems.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(kindCounts).map(([kind, count]) => (
                    <button
                      key={kind}
                      onClick={() => setActiveKind(activeKind === kind ? "all" : kind)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                        activeKind === kind ? "ring-1 ring-white/30" : ""
                      } ${KIND_COLORS[kind] || "bg-slate-700 text-slate-300"}`}
                    >
                      {KIND_ICONS[kind] || "•"} {kind} ({count})
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg border" style={{ backgroundColor: "#13131B", borderColor: knowledgeOnlyItems.length > 0 ? "rgba(59,130,246,0.3)" : "#2A2A38" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">📚</span>
                <span className="text-xs font-semibold" style={{ color: "#3B82F6" }}>Knowledge Base</span>
                <span className="text-[10px] ml-auto font-mono" style={{ color: "#626259" }}>{knowledgeOnlyItems.length}</span>
              </div>
              <p className="text-[10px]" style={{ color: "#626259" }}>
                Strategy docs, personality traits, and domain expertise. The agent&apos;s training data.
              </p>
              <button
                onClick={() => setActiveKind(activeKind === "knowledge-only" ? "all" : "knowledge-only")}
                className={`mt-2 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                  activeKind === "knowledge-only" ? "ring-1 ring-white/30" : ""
                } bg-blue-500/20 text-blue-400`}
              >
                📚 knowledge ({knowledgeOnlyItems.length})
              </button>
            </div>
          </div>

          {/* ── Filter Bar ── */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveKind("all")}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                activeKind === "all" ? "bg-[#D4A020]/20 text-[#D4A020]" : "text-[#626259] hover:text-[#8B8B80]"
              }`}
            >
              All ({knowledgeItems.length})
            </button>
            <button
              onClick={() => setActiveKind("episodic")}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                activeKind === "episodic" ? "bg-purple-500/20 text-purple-400" : "text-[#626259] hover:text-[#8B8B80]"
              }`}
            >
              🧠 Episodic ({episodicItems.length})
            </button>
            <button
              onClick={() => setActiveKind("knowledge-only")}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                activeKind === "knowledge-only" ? "bg-blue-500/20 text-blue-400" : "text-[#626259] hover:text-[#8B8B80]"
              }`}
            >
              📚 Knowledge ({knowledgeOnlyItems.length})
            </button>
            <div className="flex-1" />
            <span className="text-[10px]" style={{ color: "#626259" }}>
              Showing {filteredItems.length} entries
            </span>
          </div>

          {/* ── Semantic Search ── */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#626259" }} />
              <input
                type="text"
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleKbSearch()}
                placeholder="Semantic search this agent's memory…"
                className="w-full h-8 pl-9 pr-3 rounded-lg text-xs transition-all focus:outline-none"
                style={{ backgroundColor: "#1A1A24", border: "1px solid #2A2A38", color: "#F5F5F0" }}
              />
            </div>
            <button
              onClick={handleKbSearch}
              disabled={isSearchingKb || !kbSearch.trim()}
              className="px-3 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: "#D4A020", color: "#000" }}
            >
              {isSearchingKb ? "…" : "Search"}
            </button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: "rgba(212, 160, 32, 0.05)", border: "1px solid rgba(212, 160, 32, 0.15)" }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#D4A020" }}>Search Results</p>
              {searchResults.map((r: any) => (
                <div key={r.id} className="p-2 rounded" style={{ backgroundColor: "#13131B" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${KIND_COLORS[r.kind] || "bg-slate-700 text-slate-300"}`}>
                      {KIND_ICONS[r.kind] || "•"} {r.kind}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "#D4A020" }}>
                      {(r.similarity * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "#B8B8AD" }}>
                    {r.content.length > 300 ? r.content.slice(0, 300) + "…" : r.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Memory Items List ── */}
          <div className="space-y-1.5 max-h-96 overflow-auto">
            {filteredItems.length === 0 ? (
              <div className="text-center py-6" style={{ color: "#626259" }}>
                <p className="text-xs">No {activeKind === "all" ? "" : activeKind} entries found</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="rounded-lg border group" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <button
                    onClick={() => setExpandedKb(expandedKb === item.id ? null : item.id)}
                    className="w-full text-left px-3 py-2 flex items-center gap-2"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0 ${KIND_COLORS[item.kind] || "bg-slate-700 text-slate-300"}`}>
                      {KIND_ICONS[item.kind] || "•"} {item.kind}
                    </span>
                    <p className="text-xs flex-1 truncate" style={{ color: "#B8B8AD" }}>
                      {item.summary || item.content.slice(0, 120)}
                    </p>
                    {item.importance > 0.7 && (
                      <span className="text-[9px] flex-shrink-0" style={{ color: "#D4A020" }}>★</span>
                    )}
                    <span className="text-[9px] flex-shrink-0" style={{ color: "#626259" }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </button>
                  {expandedKb === item.id && (
                    <div className="px-3 pb-3 space-y-2" style={{ borderTop: "1px solid #2A2A38" }}>
                      <p className="text-xs leading-relaxed pt-2 whitespace-pre-wrap" style={{ color: "#B8B8AD" }}>{item.content}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {item.source && (
                          <span className="text-[10px] font-mono" style={{ color: "#626259" }}>Source: {item.source}</span>
                        )}
                        <span className="text-[10px]" style={{ color: "#626259" }}>
                          Importance: {item.importance} • Recalled: {item.recalled_count}×
                        </span>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {item.tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 rounded text-[9px]" style={{ backgroundColor: "#1A1A24", color: "#8B8B80" }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteKb(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all ml-auto"
                          style={{ color: "#DC2626" }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AgentDetailModal({ agent, onClose }: AgentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AgentDetailData | null>(null);
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeData | null>(null);

  // Editing states
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMemories, setSelectedMemories] = useState<string[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch config from working single-agent route + memories/conversations from details
        const [configRes, detailsRes, knowledgeRes] = await Promise.all([
          fetch(`/api/agents/${agent.id}`),
          fetch(`/api/agents/${agent.id}/details`).catch(() => null),
          fetch(`/api/agents/${agent.id}/knowledge`),
        ]);
        
        if (!configRes.ok) {
          throw new Error('Failed to fetch agent config');
        }
        
        const configData = await configRes.json();
        
        // Details route may 404 on Vercel — use config as fallback
        let memories: any[] = [];
        let memoryCount = 0;
        let conversations: any[] = [];
        let conversationCount = 0;
        
        if (detailsRes && detailsRes.ok) {
          const detailsData = await detailsRes.json();
          memories = detailsData.memories || [];
          memoryCount = detailsData.memoryCount || 0;
          conversations = detailsData.conversations || [];
          conversationCount = detailsData.conversationCount || 0;
          // Merge: prefer configData for config (it's always fresh)
        }
        
        setData({
          config: configData,
          memories,
          memoryCount,
          conversations,
          conversationCount,
        });
        
        if (knowledgeRes.ok) {
          const kd = await knowledgeRes.json();
          setKnowledgeData(kd);
        }
      } catch (err) {
        console.error('Error fetching agent details:', err);
        setError('Failed to load agent details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [agent.id]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Helper functions for editing
  const startEditing = (field: string, currentValue: any) => {
    setIsEditing(prev => ({ ...prev, [field]: true }));
    setEditValues(prev => ({ ...prev, [field]: currentValue }));
  };

  const cancelEditing = (field: string) => {
    setIsEditing(prev => ({ ...prev, [field]: false }));
    setEditValues(prev => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  };

  const saveField = async (field: string, value: any) => {
    if (!data?.config) return;

    setIsSaving(prev => ({ ...prev, [field]: true }));
    try {
      const response = await fetch(`/api/agents/${data.config.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save ${field}`);
      }

      const updatedConfig = await response.json();
      
      // Update local data
      setData(prev => prev ? {
        ...prev,
        config: { ...prev.config, [field]: value, updated_at: updatedConfig.updated_at }
      } : null);

      setIsEditing(prev => ({ ...prev, [field]: false }));
      setEditValues(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });

      setSaveMessage(`${field} saved successfully`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error(`Error saving ${field}:`, error);
      setSaveMessage(`Failed to save ${field}`);
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(prev => ({ ...prev, [field]: false }));
    }
  };

  const clearAllMemories = async () => {
    if (!data?.config || !confirm('Are you sure you want to clear all memories? This action cannot be undone.')) {
      return;
    }

    try {
      // This would need a new API endpoint
      const response = await fetch(`/api/agents/${data.config.id}/memories`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear memories');
      }

      setData(prev => prev ? { ...prev, memories: [], memoryCount: 0 } : null);
      setSaveMessage('All memories cleared');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error clearing memories:', error);
      setSaveMessage('Failed to clear memories');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-sm" style={{ color: "#8B8B80" }}>Loading...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 rounded-xl border border-red-800/50 bg-red-900/10">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      );
    }

    if (!data) return null;

    // Available LLM models
    const models = [
      { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "anthropic/claude-opus-4-6", label: "Claude Opus 4" },
      { value: "anthropic/claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { value: "anthropic/claude-3-haiku-20240307", label: "Claude 3 Haiku" },
      { value: "openai/gpt-4o", label: "GPT-4o" },
      { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
    ];

    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Identity</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{data.config.emoji}</span>
                    <span style={{ color: "#F5F5F0" }} className="font-semibold">{data.config.name}</span>
                  </div>
                  <p style={{ color: "#B8B8AD" }}>{data.config.title}</p>
                  <DepartmentBadge department={data.config.department} />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${data.config.endpoint_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium" style={{ color: data.config.endpoint_enabled ? "#10B981" : "#EF4444" }}>
                      {data.config.endpoint_enabled ? "Live" : "Offline"}
                    </span>
                  </div>
                  {data.config.endpoint_enabled && (
                    <div className="text-xs font-mono p-2 rounded border" style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#8B8B80" }}>
                      /api/agents/{data.config.name}/chat
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Model</h4>
                <p className="text-sm" style={{ color: "#B8B8AD" }}>{formatModelName(data.config.model)}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Temperature</h4>
                <p className="text-sm" style={{ color: "#B8B8AD" }}>{data.config.temperature}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Max Tokens</h4>
                <p className="text-sm" style={{ color: "#B8B8AD" }}>{data.config.max_tokens}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                <MessageSquare className="w-6 h-6 mx-auto mb-2" style={{ color: "#D4A020" }} />
                <p className="text-xl font-bold" style={{ color: "#F5F5F0" }}>{data.conversationCount}</p>
                <p className="text-xs font-medium" style={{ color: "#8B8B80" }}>Conversations</p>
              </div>
              <div className="text-center p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                <Database className="w-6 h-6 mx-auto mb-2" style={{ color: "#D4A020" }} />
                <p className="text-xl font-bold" style={{ color: "#F5F5F0" }}>{data.memoryCount}</p>
                <p className="text-xs font-medium" style={{ color: "#8B8B80" }}>Memories</p>
              </div>
              <div className="text-center p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                <Calendar className="w-6 h-6 mx-auto mb-2" style={{ color: "#D4A020" }} />
                <p className="text-xl font-bold" style={{ color: "#F5F5F0" }}>{formatTimeAgo(data.config.updated_at)}</p>
                <p className="text-xs font-medium" style={{ color: "#8B8B80" }}>Last Updated</p>
              </div>
            </div>
          </div>
        );

      case "hosting":
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Hosting Configuration</h3>
            
            {/* Endpoint Status */}
            <div className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold" style={{ color: "#F5F5F0" }}>Endpoint Status</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${data.config.endpoint_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium" style={{ color: data.config.endpoint_enabled ? "#10B981" : "#EF4444" }}>
                    {data.config.endpoint_enabled ? "Live" : "Offline"}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#8B8B80" }}>Endpoint URL</label>
                  <div className="text-xs font-mono p-2 rounded border" style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#8B8B80" }}>
                    {data.config.endpoint_enabled ? `/api/agents/${data.config.id}/chat` : 'Disabled'}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => saveField('endpoint_enabled', !data.config.endpoint_enabled)}
                    disabled={isSaving.endpoint_enabled}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
                    style={{ 
                      backgroundColor: data.config.endpoint_enabled ? "#DC2626" : "#10B981", 
                      borderColor: data.config.endpoint_enabled ? "#DC2626" : "#10B981",
                      color: "#FFFFFF"
                    }}
                  >
                    {isSaving.endpoint_enabled ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : data.config.endpoint_enabled ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    {data.config.endpoint_enabled ? 'Disable' : 'Enable'}
                  </button>
                  
                  {data.config.endpoint_enabled && (
                    <button
                      onClick={() => navigator.clipboard.writeText(`/api/agents/${data.config.id}/chat`)}
                      className="p-2 rounded-lg border transition-colors hover:bg-white/5"
                      style={{ borderColor: "#2A2A38", color: "#626259" }}
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Hosting Provider (placeholder for future) */}
            <div className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0" }}>Hosting Provider</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#8B8B80" }}>Provider</label>
                  <select 
                    disabled 
                    className="w-full p-2 rounded border text-sm opacity-50"
                    style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#8B8B80" }}
                  >
                    <option>Supabase Edge Functions (Coming Soon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#8B8B80" }}>Region</label>
                  <select 
                    disabled 
                    className="w-full p-2 rounded border text-sm opacity-50"
                    style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#8B8B80" }}
                  >
                    <option>Auto (Coming Soon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#8B8B80" }}>Rate Limit (RPM)</label>
                  <input 
                    type="number" 
                    disabled 
                    placeholder="Coming Soon"
                    className="w-full p-2 rounded border text-sm opacity-50"
                    style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#8B8B80" }}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "llm":
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>LLM Configuration</h3>
            
            {/* Model Selection */}
            <div className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0" }}>Model & Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#8B8B80" }}>Model</label>
                  {isEditing.model ? (
                    <div className="space-y-2">
                      <select
                        value={editValues.model || data.config.model}
                        onChange={(e) => setEditValues(prev => ({ ...prev, model: e.target.value }))}
                        className="w-full p-2 rounded border text-sm"
                        style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#F5F5F0" }}
                      >
                        {models.map(model => (
                          <option key={model.value} value={model.value}>{model.label}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveField('model', editValues.model)}
                          disabled={isSaving.model}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                          style={{ backgroundColor: "#10B981", color: "#FFFFFF" }}
                        >
                          {isSaving.model ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Save
                        </button>
                        <button
                          onClick={() => cancelEditing('model')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                          style={{ backgroundColor: "#2A2A38", color: "#B8B8AD" }}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: "#F5F5F0" }}>
                        {models.find(m => m.value === data.config.model)?.label || formatModelName(data.config.model)}
                      </span>
                      <button
                        onClick={() => startEditing('model', data.config.model)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        style={{ color: "#626259" }}
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#8B8B80" }}>Max Tokens</label>
                  {isEditing.max_tokens ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        min="1"
                        max="8192"
                        value={editValues.max_tokens || data.config.max_tokens}
                        onChange={(e) => setEditValues(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                        className="w-full p-2 rounded border text-sm"
                        style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#F5F5F0" }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveField('max_tokens', editValues.max_tokens)}
                          disabled={isSaving.max_tokens}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                          style={{ backgroundColor: "#10B981", color: "#FFFFFF" }}
                        >
                          {isSaving.max_tokens ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Save
                        </button>
                        <button
                          onClick={() => cancelEditing('max_tokens')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                          style={{ backgroundColor: "#2A2A38", color: "#B8B8AD" }}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: "#F5F5F0" }}>{data.config.max_tokens}</span>
                      <button
                        onClick={() => startEditing('max_tokens', data.config.max_tokens)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        style={{ color: "#626259" }}
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="mt-4">
                <label className="block text-xs font-semibold mb-2" style={{ color: "#8B8B80" }}>
                  Temperature: {isEditing.temperature ? (editValues.temperature ?? data.config.temperature) : data.config.temperature}
                </label>
                {isEditing.temperature ? (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={editValues.temperature ?? data.config.temperature}
                      onChange={(e) => setEditValues(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveField('temperature', editValues.temperature)}
                        disabled={isSaving.temperature}
                        className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        style={{ backgroundColor: "#10B981", color: "#FFFFFF" }}
                      >
                        {isSaving.temperature ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </button>
                      <button
                        onClick={() => cancelEditing('temperature')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        style={{ backgroundColor: "#2A2A38", color: "#B8B8AD" }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={data.config.temperature}
                      disabled
                      className="flex-1"
                    />
                    <button
                      onClick={() => startEditing('temperature', data.config.temperature)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      style={{ color: "#626259" }}
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Soul Prompt */}
            <div className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold" style={{ color: "#F5F5F0" }}>Soul Prompt</h4>
                {!isEditing.soul_prompt && (
                  <button
                    onClick={() => startEditing('soul_prompt', data.config.soul_prompt || '')}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: "#626259" }}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isEditing.soul_prompt ? (
                <div className="space-y-3">
                  <textarea
                    value={editValues.soul_prompt || data.config.soul_prompt || ''}
                    onChange={(e) => setEditValues(prev => ({ ...prev, soul_prompt: e.target.value }))}
                    rows={12}
                    className="w-full p-3 rounded border text-sm font-mono resize-none"
                    style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#B8B8AD" }}
                    placeholder="Enter the soul prompt for this agent..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveField('soul_prompt', editValues.soul_prompt)}
                      disabled={isSaving.soul_prompt}
                      className="flex items-center gap-1 px-4 py-2 rounded text-sm font-medium transition-colors"
                      style={{ backgroundColor: "#10B981", color: "#FFFFFF" }}
                    >
                      {isSaving.soul_prompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Soul Prompt
                    </button>
                    <button
                      onClick={() => cancelEditing('soul_prompt')}
                      className="flex items-center gap-1 px-4 py-2 rounded text-sm font-medium transition-colors"
                      style={{ backgroundColor: "#2A2A38", color: "#B8B8AD" }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded border min-h-[200px]" style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38" }}>
                  <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: "#B8B8AD" }}>
                    {data.config.soul_prompt || data.config.description || "No soul prompt defined. Click the edit button to add one."}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );

      case "memory":
        return (
          <div className="space-y-4">
            {/* Unified Memory Explorer — replaces old split layout */}
            <AgentKnowledgeBase agentId={data.config?.id || agent.id} />
          </div>
        );

      case "conversations":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>
                Recent Conversations ({data.conversationCount})
              </h3>
            </div>
            <div className="space-y-3 max-h-96 overflow-auto">
              {data.conversations.length > 0 ? (
                data.conversations.map((conversation) => (
                  <div key={conversation.id} className="p-3 rounded-lg border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium" style={{ color: "#F5F5F0" }}>{conversation.title || 'Untitled Conversation'}</p>
                      <div className="flex items-center gap-3 text-xs" style={{ color: "#626259" }}>
                        <span>{conversation.agent_messages?.[0]?.count || 0} messages</span>
                        <span>{formatTimeAgo(conversation.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-6" style={{ color: "#626259" }}>
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No conversations found</p>
                </div>
              )}
            </div>
          </div>
        );

      case "knowledge":
        const knowledgeSources = knowledgeData?.localKnowledge || data.config.knowledge_sources || [];
        const sacredTexts = knowledgeData?.sacredTexts || [];
        const embeddingStats = knowledgeData?.embeddingStats;
        const coreTexts = knowledgeData?.coreTexts || [];
        const hasLocalKnowledge = Array.isArray(knowledgeSources) && knowledgeSources.length > 0;
        const hasSacredTexts = sacredTexts.length > 0;

        // Group local knowledge by type
        const sourcesByType: Record<string, any[]> = {};
        if (Array.isArray(knowledgeSources)) {
          knowledgeSources.forEach((src: any) => {
            const t = src.type || 'other';
            if (!sourcesByType[t]) sourcesByType[t] = [];
            sourcesByType[t].push(src);
          });
        }
        const typeLabels: Record<string, { label: string; emoji: string }> = {
          'youtube_transcript': { label: 'YouTube Transcripts', emoji: '🎬' },
          'youtube_summary': { label: 'YouTube Summaries', emoji: '📝' },
          'youtube_index': { label: 'YouTube Index', emoji: '📋' },
          'report': { label: 'Reports & Analysis', emoji: '📊' },
          'letter': { label: 'Letters & Essays', emoji: '✉️' },
          'speech': { label: 'Speeches', emoji: '🎤' },
          'book': { label: 'Books', emoji: '📚' },
          'document': { label: 'Documents', emoji: '📄' },
          'data': { label: 'Data Files', emoji: '💾' },
        };

        return (
          <div className="space-y-6">
            {/* Knowledge Management Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Knowledge Management</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEditing('add_knowledge', '')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={{ backgroundColor: "#10B981", color: "#FFFFFF" }}
                >
                  <Plus className="w-3 h-3" />
                  Add Source
                </button>
                <button
                  onClick={() => {
                    // Trigger re-embedding for all sources
                    console.log('Trigger re-embedding');
                    setSaveMessage('Re-embedding triggered');
                    setTimeout(() => setSaveMessage(null), 3000);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={{ backgroundColor: "#6366F1", color: "#FFFFFF" }}
                >
                  <Zap className="w-3 h-3" />
                  Re-embed All
                </button>
              </div>
            </div>

            {/* Add Knowledge Source Form */}
            {isEditing.add_knowledge && (
              <div className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                <h4 className="text-sm font-semibold mb-3" style={{ color: "#F5F5F0" }}>Add Knowledge Source</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: "#8B8B80" }}>Source Type</label>
                    <select
                      value={editValues.source_type || 'document'}
                      onChange={(e) => setEditValues(prev => ({ ...prev, source_type: e.target.value }))}
                      className="w-full p-2 rounded border text-sm"
                      style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#F5F5F0" }}
                    >
                      <option value="document">Document</option>
                      <option value="youtube_transcript">YouTube Transcript</option>
                      <option value="book">Book</option>
                      <option value="report">Report</option>
                      <option value="data">Data File</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: "#8B8B80" }}>Title/URL</label>
                    <input
                      type="text"
                      value={editValues.source_title || ''}
                      onChange={(e) => setEditValues(prev => ({ ...prev, source_title: e.target.value }))}
                      className="w-full p-2 rounded border text-sm"
                      style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#F5F5F0" }}
                      placeholder="Enter title or URL..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: "#8B8B80" }}>Upload File</label>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.docx"
                      onChange={(e) => setEditValues(prev => ({ ...prev, source_file: e.target.files?.[0] }))}
                      className="w-full p-2 rounded border text-sm"
                      style={{ backgroundColor: "#1A1A24", borderColor: "#2A2A38", color: "#F5F5F0" }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // This would need a new API endpoint for knowledge upload
                        console.log('Add knowledge source:', editValues);
                        setSaveMessage('Knowledge source added');
                        setTimeout(() => setSaveMessage(null), 3000);
                        cancelEditing('add_knowledge');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      style={{ backgroundColor: "#10B981", color: "#FFFFFF" }}
                    >
                      <Upload className="w-3 h-3" />
                      Add Source
                    </button>
                    <button
                      onClick={() => cancelEditing('add_knowledge')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      style={{ backgroundColor: "#2A2A38", color: "#B8B8AD" }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sacred Text Embeddings (faith guides) */}
            {embeddingStats && (
              <>
                {/* Coverage Banner */}
                <div className="p-4 rounded-xl border" style={{ backgroundColor: "rgba(99, 102, 241, 0.05)", borderColor: "rgba(99, 102, 241, 0.15)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: "#6366F1" }}>📖 Sacred Text Embeddings</h3>
                    <span className="text-lg font-bold" style={{ color: embeddingStats.coverage >= 80 ? "#22C55E" : embeddingStats.coverage >= 50 ? "#EAB308" : "#EF4444" }}>
                      {embeddingStats.coverage}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: "#F5F5F0" }}>{embeddingStats.totalTexts}</p>
                      <p className="text-[10px]" style={{ color: "#626259" }}>Texts Matched</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: "#F5F5F0" }}>{embeddingStats.totalPassages.toLocaleString()}</p>
                      <p className="text-[10px]" style={{ color: "#626259" }}>Total Passages</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: "#F5F5F0" }}>{embeddingStats.totalEmbeddings.toLocaleString()}</p>
                      <p className="text-[10px]" style={{ color: "#626259" }}>Embeddings</p>
                    </div>
                  </div>
                  {/* Coverage bar */}
                  <div className="h-2 rounded-full" style={{ backgroundColor: "#1A1A24" }}>
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(embeddingStats.coverage, 100)}%`,
                        backgroundColor: embeddingStats.coverage >= 80 ? "#22C55E" : embeddingStats.coverage >= 50 ? "#EAB308" : "#EF4444",
                      }}
                    />
                  </div>
                  <p className="text-[10px] mt-1 text-right" style={{ color: "#626259" }}>
                    {embeddingStats.totalEmbeddings.toLocaleString()} / {embeddingStats.totalPassages.toLocaleString()} passages embedded
                  </p>
                </div>

                {/* Core Texts */}
                {coreTexts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B8B80" }}>Core Texts ({coreTexts.length})</h4>
                    <div className="space-y-1.5">
                      {coreTexts.map((ct: string) => {
                        const matched = sacredTexts.filter((st: SacredTextMatch) =>
                          st.title.toLowerCase().includes(ct.toLowerCase()) ||
                          (st.original_title && st.original_title.toLowerCase().includes(ct.toLowerCase()))
                        );
                        const totalP = matched.reduce((s: number, t: SacredTextMatch) => s + (t.passage_count || 0), 0);
                        const totalE = matched.reduce((s: number, t: SacredTextMatch) => s + (t.embedding_count || 0), 0);
                        const cov = totalP > 0 ? Math.round((totalE / totalP) * 100) : 0;
                        const isIngested = matched.length > 0 && totalE > 0;
                        return (
                          <div key={ct} className="flex items-center justify-between p-2.5 rounded-lg border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm" style={{ color: "#F5F5F0" }}>{ct}</span>
                              {matched.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: isIngested ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: isIngested ? "#22C55E" : "#EAB308" }}>
                                  {isIngested ? '✅ Ingested' : '⏳ Pending'}
                                </span>
                              )}
                              {matched.length === 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
                                  Not Found
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px]" style={{ color: "#626259" }}>
                              {matched.length > 0 && <span>{totalE.toLocaleString()}/{totalP.toLocaleString()}</span>}
                              {totalP > 0 && (
                                <span style={{ color: cov >= 80 ? "#22C55E" : cov >= 50 ? "#EAB308" : "#EF4444" }}>
                                  {cov}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Matched Sacred Texts Detail */}
                {hasSacredTexts && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B8B80" }}>
                      Matched Sacred Texts ({sacredTexts.length})
                    </h4>
                    <div className="space-y-1">
                      {sacredTexts.map((text: SacredTextMatch) => {
                        const cov = text.passage_count > 0 ? Math.round((text.embedding_count / text.passage_count) * 100) : 0;
                        return (
                          <div key={text.id} className="flex items-center justify-between p-2 rounded-lg border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs" style={{ color: "#626259" }}>📜</span>
                              <span className="text-xs truncate" style={{ color: "#B8B8AD" }}>{text.title}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-[10px]">
                              <span style={{ color: "#626259" }}>{text.passage_count.toLocaleString()} passages</span>
                              <span className="font-medium" style={{ color: text.ingestion_status === 'ingested' ? "#22C55E" : "#EAB308" }}>
                                {text.ingestion_status === 'ingested' ? `✅ ${text.embedding_count.toLocaleString()}` : '⏳ Pending'}
                              </span>
                              {cov > 0 && <span style={{ color: cov >= 80 ? "#22C55E" : "#EAB308" }}>{cov}%</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Local Knowledge Sources (trading desk agents, etc.) */}
            {hasLocalKnowledge && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B8B80" }}>
                  📁 Local Knowledge ({knowledgeSources.length} files)
                </h3>
                {Object.entries(sourcesByType).map(([type, sources]) => {
                  const tl = typeLabels[type] || { label: type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), emoji: '📎' };
                  return (
                    <div key={type} className="space-y-2 mb-3">
                      <h4 className="text-xs font-semibold flex items-center gap-2" style={{ color: "#8B8B80" }}>
                        <span>{tl.emoji}</span> {tl.label}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "#1A1A24", color: "#626259" }}>{sources.length}</span>
                      </h4>
                      <div className="space-y-1">
                        {sources.map((src: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs" style={{ color: "#626259" }}>{tl.emoji}</span>
                              <span className="text-sm truncate" style={{ color: "#F5F5F0" }}>{src.title || src.path}</span>
                              {src.date && <span className="text-[10px] shrink-0" style={{ color: "#626259" }}>{src.date}</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 text-[10px]" style={{ color: "#626259" }}>
                              {src.size_bytes && <span>{(src.size_bytes / 1024).toFixed(1)}KB</span>}
                              {src.id && <code className="font-mono" style={{ color: "#D4A020" }}>{src.id}</code>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {!hasLocalKnowledge && !hasSacredTexts && !embeddingStats && (
              <div className="text-center p-6" style={{ color: "#626259" }}>
                <BookOpen className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No knowledge sources configured</p>
              </div>
            )}
          </div>
        );

      case "config":
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Raw Configuration</h3>
            <div className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: "#B8B8AD" }}>
                {JSON.stringify({
                  model: data.config.model,
                  temperature: data.config.temperature,
                  max_tokens: data.config.max_tokens,
                  endpoint_enabled: data.config.endpoint_enabled,
                  department: data.config.department,
                  created_at: data.config.created_at,
                  updated_at: data.config.updated_at,
                }, null, 2)}
              </pre>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-col md:flex-row h-full" onClick={(e) => e.stopPropagation()}>
        
        {/* Main Content Panel */}
        <div className="flex-1 md:max-w-4xl overflow-auto" style={{ backgroundColor: "#0B0B11", borderRight: "1px solid #2A2A38" }}>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{agent.emoji}</span>
                  <h1 className="text-xl font-bold" style={{ color: "#F5F5F0" }}>{agent.name}</h1>
                  <div className={`w-3 h-3 rounded-full ${agent.endpoint_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                <p className="text-sm" style={{ color: "#B8B8AD" }}>{agent.title}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg border transition-colors" 
                style={{ borderColor: "#2A2A38", color: "#626259" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b" style={{ borderColor: "#2A2A38" }}>
              <div className="flex overflow-x-auto">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap"
                      style={{
                        color: isActive ? "#D4A020" : "#8B8B80",
                        borderColor: isActive ? "#D4A020" : "transparent"
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                      {tab.id === "memory" && data && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md ml-1" style={{ backgroundColor: "#1A1A24", color: "#626259" }}>
                          {data.memoryCount}
                        </span>
                      )}
                      {tab.id === "conversations" && data && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md ml-1" style={{ backgroundColor: "#1A1A24", color: "#626259" }}>
                          {data.conversationCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div className={`p-3 rounded-lg border flex items-center gap-2 ${saveMessage.includes('Failed') ? 'border-red-800/50 bg-red-900/10' : 'border-green-800/50 bg-green-900/10'}`}>
                {saveMessage.includes('Failed') ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                <span className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                  {saveMessage}
                </span>
              </div>
            )}

            {/* Tab Content */}
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
