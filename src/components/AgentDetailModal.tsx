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
  Database
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

interface AgentDetailData {
  config: AgentConfig;
  memories: AgentMemory[];
  memoryCount: number;
  conversations: AgentConversation[];
  conversationCount: number;
}

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
}

type TabId = "overview" | "soul" | "memory" | "conversations" | "knowledge" | "integrations" | "config";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Bot },
  { id: "soul", label: "Soul Prompt", icon: Brain },
  { id: "memory", label: "Memory", icon: Database },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "integrations", label: "Integrations", icon: Plug },
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

export default function AgentDetailModal({ agent, onClose }: AgentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AgentDetailData | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/agents/${agent.name}/details`);
        if (!response.ok) {
          throw new Error('Failed to fetch agent details');
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching agent details:', err);
        setError('Failed to load agent details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [agent.name]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

      case "soul":
        const soulText = data.config.soul_prompt || data.config.description || "No soul prompt defined.";
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Soul Prompt</h3>
            <div className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: "#B8B8AD" }}>
                {soulText}
              </pre>
            </div>
          </div>
        );

      case "memory":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>
                Agent Memories ({data.memoryCount})
              </h3>
            </div>
            <div className="space-y-3 max-h-96 overflow-auto">
              {data.memories.length > 0 ? (
                data.memories.map((memory) => (
                  <div key={memory.id} className="p-3 rounded-lg border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "#D4A02020", color: "#D4A020" }}>
                        {memory.type}
                      </span>
                      <span className="text-xs" style={{ color: "#626259" }}>
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#B8B8AD" }}>{memory.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-center p-6" style={{ color: "#626259" }}>
                  <Database className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No memories found</p>
                </div>
              )}
            </div>
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
        const knowledgeSources = data.config.knowledge_sources;
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Knowledge Sources</h3>
            <div className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: "#B8B8AD" }}>
                {knowledgeSources ? JSON.stringify(knowledgeSources, null, 2) : "No knowledge sources configured."}
              </pre>
            </div>
          </div>
        );

      case "integrations":
        const integrations = data.config.integrations;
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8B8B80" }}>Integrations</h3>
            <div className="p-4 rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
              <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: "#B8B8AD" }}>
                {integrations ? JSON.stringify(integrations, null, 2) : "No integrations configured."}
              </pre>
            </div>
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

            {/* Tab Content */}
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}