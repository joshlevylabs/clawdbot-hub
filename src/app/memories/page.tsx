"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Search, Database, Tag, Clock, ChevronDown, ChevronRight, Trash2, RefreshCw } from "lucide-react";

interface Memory {
  id: string;
  agent_id: string;
  kind: string;
  content: string;
  summary?: string;
  source?: string;
  source_metadata?: Record<string, unknown>;
  importance: number;
  tags: string[];
  recalled_count: number;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total_memories: number;
  total_embeddings: number;
  avg_importance: number;
  by_kind: Record<string, number>;
  by_agent: Record<string, number>;
  with_summaries: number;
  with_tags: number;
  recalled_memories: number;
  recent_memories: number;
  agent_id: string;
}

interface SearchResult {
  id: string;
  agent_id: string;
  kind: string;
  content: string;
  summary?: string;
  similarity: number;
}

const AGENTS = [
  "chris-vermeulen",
  "warren-buffett",
  "peter-schiff",
  "raoul-pal",
  "ray-dalio",
  "peter-lynch",
];

const KIND_COLORS: Record<string, string> = {
  knowledge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  observation: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  decision: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  reflection: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  interaction: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
};

const AGENT_COLORS: Record<string, string> = {
  "chris-vermeulen": "text-yellow-400",
  "warren-buffett": "text-emerald-400",
  "peter-schiff": "text-orange-400",
  "raoul-pal": "text-cyan-400",
  "ray-dalio": "text-blue-400",
  "peter-lynch": "text-purple-400",
};

export default function MemoriesPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedKind, setSelectedKind] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"browse" | "search">("browse");

  const fetchStats = useCallback(async () => {
    try {
      const url = selectedAgent
        ? `/api/agent-memories/stats?agent_id=${selectedAgent}`
        : "/api/agent-memories/stats";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, [selectedAgent]);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/agent-memories?limit=100`;
      if (selectedAgent) url += `&agent_id=${selectedAgent}`;
      if (selectedKind) url += `&kind=${selectedKind}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedAgent, selectedKind]);

  useEffect(() => {
    fetchStats();
    fetchMemories();
  }, [fetchStats, fetchMemories]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch("/api/agent-memories/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          agent_id: selectedAgent || undefined,
          limit: 20,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this memory?")) return;
    try {
      const res = await fetch(`/api/agent-memories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        fetchStats();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncate = (text: string, maxLen: number) =>
    text.length > maxLen ? text.slice(0, maxLen) + "…" : text;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-[#D4A020]" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">
              Agent Memory
            </h1>
            <p className="text-sm text-slate-400">
              Knowledge, observations, and decisions stored by your agents
            </p>
          </div>
        </div>
        <button
          onClick={() => { fetchStats(); fetchMemories(); }}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Database className="w-3.5 h-3.5" /> Total Memories
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.total_memories.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Brain className="w-3.5 h-3.5" /> Embeddings
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.total_embeddings.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" /> Recent (24h)
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.recent_memories}
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Tag className="w-3.5 h-3.5" /> Avg Importance
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.avg_importance.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Kind breakdown */}
      {stats && Object.keys(stats.by_kind).length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">By Kind</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.by_kind).map(([kind, count]) => (
              <span
                key={kind}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  KIND_COLORS[kind] || "bg-slate-700 text-slate-300 border-slate-600"
                }`}
              >
                {kind}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Agent breakdown */}
      {stats && Object.keys(stats.by_agent).length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">By Agent</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(stats.by_agent)
              .sort((a, b) => b[1] - a[1])
              .map(([agent, count]) => (
                <button
                  key={agent}
                  onClick={() => setSelectedAgent(agent === selectedAgent ? "" : agent)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedAgent === agent
                      ? "bg-[#D4A020]/20 border border-[#D4A020]/40 text-[#D4A020]"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  <span className={`font-medium ${AGENT_COLORS[agent] || ""}`}>
                    {agent.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}
                  </span>
                  <span className="text-xs opacity-60 ml-2">{count}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/80 border border-slate-800 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("browse")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "browse"
              ? "bg-[#D4A020] text-black"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Browse Memories
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "search"
              ? "bg-[#D4A020] text-black"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Semantic Search
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#D4A020]"
        >
          <option value="">All Agents</option>
          {AGENTS.map((a) => (
            <option key={a} value={a}>
              {a.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}
            </option>
          ))}
        </select>
        <select
          value={selectedKind}
          onChange={(e) => setSelectedKind(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#D4A020]"
        >
          <option value="">All Kinds</option>
          {Object.keys(KIND_COLORS).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      {/* Browse Tab */}
      {activeTab === "browse" && (
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading memories…</div>
          ) : memories.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No memories found</p>
              <p className="text-slate-600 text-sm mt-1">
                Run the knowledge ingestion script to populate agent memories
              </p>
            </div>
          ) : (
            memories.map((mem) => (
              <div
                key={mem.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
              >
                <button
                  onClick={() => setExpandedMemory(expandedMemory === mem.id ? null : mem.id)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <div className="mt-0.5">
                    {expandedMemory === mem.id ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-medium text-sm ${AGENT_COLORS[mem.agent_id] || "text-slate-300"}`}>
                        {mem.agent_id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          KIND_COLORS[mem.kind] || "bg-slate-700 text-slate-300 border-slate-600"
                        }`}
                      >
                        {mem.kind}
                      </span>
                      {mem.importance > 0.7 && (
                        <span className="text-[10px] text-amber-400">★ high</span>
                      )}
                      <span className="text-[10px] text-slate-600 ml-auto">
                        {formatDate(mem.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {expandedMemory === mem.id ? mem.content : truncate(mem.content, 200)}
                    </p>
                  </div>
                </button>
                {expandedMemory === mem.id && (
                  <div className="px-4 pb-4 pl-11 space-y-2 border-t border-slate-800/50 pt-3">
                    {mem.summary && (
                      <div>
                        <span className="text-[10px] uppercase text-slate-600 font-medium">Summary</span>
                        <p className="text-xs text-slate-400">{mem.summary}</p>
                      </div>
                    )}
                    {mem.source && (
                      <div>
                        <span className="text-[10px] uppercase text-slate-600 font-medium">Source</span>
                        <p className="text-xs text-slate-500 font-mono">{mem.source}</p>
                      </div>
                    )}
                    {mem.tags && mem.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {mem.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-[10px] text-slate-600 pt-1">
                      <span>Importance: {mem.importance}</span>
                      <span>Recalled: {mem.recalled_count}×</span>
                      <span>ID: {mem.id.slice(0, 8)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(mem.id); }}
                        className="ml-auto text-red-500/60 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Search Tab */}
      {activeTab === "search" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search agent memories semantically…"
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#D4A020] placeholder-slate-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-5 py-3 bg-[#D4A020] hover:bg-[#B8891A] disabled:opacity-50 text-black font-medium text-sm rounded-lg transition-colors"
            >
              {isSearching ? "Searching…" : "Search"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-medium text-sm ${AGENT_COLORS[result.agent_id] || "text-slate-300"}`}>
                      {result.agent_id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        KIND_COLORS[result.kind] || "bg-slate-700 text-slate-300 border-slate-600"
                      }`}
                    >
                      {result.kind}
                    </span>
                    <span className="text-xs text-[#D4A020] ml-auto font-mono">
                      {(result.similarity * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{result.content}</p>
                  {result.summary && (
                    <p className="text-xs text-slate-500 mt-2 italic">{result.summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !isSearching && (
            <div className="text-center py-8 text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No results. Try a different query.</p>
              <p className="text-xs mt-1">Semantic search requires memories with embeddings.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
