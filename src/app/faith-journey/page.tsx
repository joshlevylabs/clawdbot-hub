"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  MessageSquare,
  GraduationCap,
  Scroll,
  RefreshCw,
  Heart,
  Calendar,
  Clock,
  User,
  MessageCircle,
  Mail,
  Database,
  AlertTriangle,
  Star,
  TrendingUp,
} from "lucide-react";

// ===== Types =====

interface DashboardData {
  overview: {
    totalUsers: number;
    activeGuides: number;
    totalLessons: number;
    totalPrayers: number;
  };
  users: Array<{
    id: string;
    email: string;
    guideName: string;
    tradition: string;
    onboardingDate: string;
    lastActive: string;
  }>;
  guides: {
    traditions: Array<{
      id: string;
      name: string;
      displayName: string;
      shortName: string;
      description: string;
      expert: {
        name: string;
        title: string;
        avatar: string;
      };
      color: string;
      iconEmoji: string;
    }>;
    conversations: Array<{
      id: string;
      userId: string;
      guideName: string;
      messageCount: number;
      lastMessageDate: string;
      status: string;
      createdAt: string;
    }>;
  };
  lessons: Array<{
    id: string;
    title: string;
    tradition: string;
    difficulty: string;
    completionCount: number;
    date: string;
    createdAt: string;
  }>;
  texts: Array<{
    id: string;
    title: string;
    tradition: string;
    type: 'library' | 'daily';
    dateCreated: string;
  }>;
  conversations: Array<{
    id: string;
    userId: string;
    guideName: string;
    messageCount: number;
    lastMessageDate: string;
    status: string;
    createdAt: string;
  }>;
  timestamp: string;
}

type ActiveTab = "users" | "guides" | "lessons" | "texts" | "conversations";

// ===== Formatting =====

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric",
    hour: "numeric", 
    minute: "2-digit"
  });
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// ===== Components =====

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend = "neutral",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-400";
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${trendColor}`} />
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${trendColor}`}>{value}</p>
      {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700/50 text-center">
      <Icon className="w-8 h-8 text-slate-600 mx-auto mb-3" />
      <h3 className="text-slate-400 font-medium mb-1">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
  );
}

// ===== Main Page =====

export default function FaithJourneyPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("users");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/faith/dashboard");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      const dashboardData: DashboardData = await res.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
    { key: "users", label: "Users", icon: Users },
    { key: "guides", label: "Guides & Agents", icon: MessageSquare },
    { key: "lessons", label: "Lessons", icon: GraduationCap },
    { key: "texts", label: "Religious Texts", icon: Scroll },
    { key: "conversations", label: "Conversations", icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0B0B11" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b px-4 lg:px-6 py-4" 
           style={{ 
             backgroundColor: "#0B0B11", 
             borderColor: "#2A2A38",
             backdropFilter: "blur(8px)"
           }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5" style={{ color: "#D4A020" }} />
              Faith Journey
            </h1>
            <span className="text-xs px-2 py-1 rounded-full" 
                  style={{ backgroundColor: "rgba(212, 160, 32, 0.2)", color: "#D4A020" }}>
              Admin Dashboard
            </span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
            style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#B8860B";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#D4A020";
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? "rgba(212, 160, 32, 0.15)" : "transparent",
                  color: isActive ? "#D4A020" : "#8B8B80",
                  border: isActive ? "1px solid rgba(212, 160, 32, 0.3)" : "1px solid transparent",
                }}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#D4A020" }} />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex items-center justify-center py-24">
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-300">{error}</p>
              <button 
                onClick={loadData} 
                className="mt-4 px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && !error && data && (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label="Total Users"
                value={data.overview.totalUsers}
                subValue="Onboarded users"
                trend={data.overview.totalUsers > 0 ? "up" : "neutral"}
              />
              <StatCard
                icon={MessageSquare}
                label="Active Guides"
                value={data.overview.activeGuides}
                subValue="Last 7 days"
                trend={data.overview.activeGuides > 0 ? "up" : "neutral"}
              />
              <StatCard
                icon={GraduationCap}
                label="Total Lessons"
                value={data.overview.totalLessons}
                subValue="Available content"
                trend="neutral"
              />
              <StatCard
                icon={Scroll}
                label="Total Prayers"
                value={data.overview.totalPrayers}
                subValue="Library + daily"
                trend="neutral"
              />
            </div>

            {/* Tab Content */}
            
            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" style={{ color: "#D4A020" }} />
                  Onboarded Users ({data.users.length})
                </h2>
                {data.users.length === 0 ? (
                  <EmptyState 
                    icon={Users}
                    title="No users yet"
                    description="Users will appear here once they complete onboarding in the Faith Journey app."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                          <th className="text-left py-2 px-2">Email</th>
                          <th className="text-left py-2 px-2">Guide Name</th>
                          <th className="text-left py-2 px-2">Tradition</th>
                          <th className="text-left py-2 px-2">Onboarding</th>
                          <th className="text-left py-2 px-2">Last Active</th>
                          <th className="text-left py-2 px-2">Days Since</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.users.map((user) => {
                          const daysAgo = daysSince(user.lastActive);
                          const isRecentlyActive = daysAgo <= 7;
                          return (
                            <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-slate-600" />
                                  <span className="text-slate-300">{user.email}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-slate-300 font-medium">{user.guideName}</td>
                              <td className="py-3 px-2">
                                <span className="text-xs px-2 py-1 rounded-lg border"
                                      style={{ 
                                        backgroundColor: "rgba(212, 160, 32, 0.1)", 
                                        borderColor: "rgba(212, 160, 32, 0.3)",
                                        color: "#D4A020" 
                                      }}>
                                  {user.tradition}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-slate-400 text-sm">{formatDate(user.onboardingDate)}</td>
                              <td className="py-3 px-2 text-slate-400 text-sm">{formatDateTime(user.lastActive)}</td>
                              <td className="py-3 px-2">
                                <span className={`text-sm ${isRecentlyActive ? "text-emerald-400" : "text-slate-500"}`}>
                                  {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Guides & Agents Tab */}
            {activeTab === "guides" && (
              <div className="space-y-6">
                {/* Tradition Experts */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Faith Tradition Experts ({data.guides.traditions.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.guides.traditions.map((tradition) => (
                      <div key={tradition.id} 
                           className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{tradition.iconEmoji}</span>
                          <div>
                            <h3 className="font-medium text-slate-200">{tradition.shortName}</h3>
                            <p className="text-xs text-slate-500">{tradition.expert.title}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{tradition.expert.name}</p>
                        <p className="text-xs text-slate-600 line-clamp-2">{tradition.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Conversations */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Active Guide Conversations ({data.guides.conversations.length})
                  </h2>
                  {data.guides.conversations.length === 0 ? (
                    <EmptyState 
                      icon={MessageSquare}
                      title="No active conversations"
                      description="Guide conversations will appear here once users start chatting."
                    />
                  ) : (
                    <div className="space-y-3">
                      {data.guides.conversations.slice(0, 5).map((conv) => (
                        <div key={conv.id} 
                             className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <User className="w-4 h-4 text-slate-600" />
                              <div>
                                <span className="text-slate-300 font-medium">{conv.guideName}</span>
                                <span className="text-xs text-slate-600 ml-2">
                                  {conv.messageCount} messages
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">
                                {formatDateTime(conv.lastMessageDate)}
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                conv.status === 'active' 
                                  ? 'bg-emerald-900/30 text-emerald-400' 
                                  : 'bg-slate-900/30 text-slate-400'
                              }`}>
                                {conv.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lessons Tab */}
            {activeTab === "lessons" && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" style={{ color: "#D4A020" }} />
                  Available Lessons ({data.lessons.length})
                </h2>
                {data.lessons.length === 0 ? (
                  <EmptyState 
                    icon={GraduationCap}
                    title="No lessons yet"
                    description="Faith lessons will appear here once content is added to the system."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                          <th className="text-left py-2 px-2">Title</th>
                          <th className="text-left py-2 px-2">Tradition</th>
                          <th className="text-left py-2 px-2">Difficulty</th>
                          <th className="text-right py-2 px-2">Completions</th>
                          <th className="text-left py-2 px-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lessons.slice(0, 20).map((lesson) => (
                          <tr key={lesson.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-3 px-2">
                              <span className="text-slate-300 font-medium">{lesson.title}</span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-xs px-2 py-1 rounded-lg border"
                                    style={{ 
                                      backgroundColor: "rgba(212, 160, 32, 0.1)", 
                                      borderColor: "rgba(212, 160, 32, 0.3)",
                                      color: "#D4A020" 
                                    }}>
                                {lesson.tradition}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                lesson.difficulty === 'easy' 
                                  ? 'bg-emerald-900/30 text-emerald-400' 
                                  : lesson.difficulty === 'hard'
                                  ? 'bg-red-900/30 text-red-400'
                                  : 'bg-amber-900/30 text-amber-400'
                              }`}>
                                {lesson.difficulty}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Star className="w-3 h-3 text-slate-600" />
                                <span className="text-slate-400">{lesson.completionCount}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-slate-400 text-sm">{formatDate(lesson.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Religious Texts Tab */}
            {activeTab === "texts" && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <Scroll className="w-5 h-5" style={{ color: "#D4A020" }} />
                  Religious Texts & Prayers ({data.texts.length})
                </h2>
                {data.texts.length === 0 ? (
                  <EmptyState 
                    icon={Scroll}
                    title="No texts yet"
                    description="Prayers and religious texts will appear here once content is added."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                          <th className="text-left py-2 px-2">Title</th>
                          <th className="text-left py-2 px-2">Tradition</th>
                          <th className="text-left py-2 px-2">Type</th>
                          <th className="text-left py-2 px-2">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.texts.slice(0, 20).map((text) => (
                          <tr key={text.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-3 px-2">
                              <span className="text-slate-300 font-medium">{text.title}</span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-xs px-2 py-1 rounded-lg border"
                                    style={{ 
                                      backgroundColor: "rgba(212, 160, 32, 0.1)", 
                                      borderColor: "rgba(212, 160, 32, 0.3)",
                                      color: "#D4A020" 
                                    }}>
                                {text.tradition}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                text.type === 'library' 
                                  ? 'bg-blue-900/30 text-blue-400' 
                                  : 'bg-purple-900/30 text-purple-400'
                              }`}>
                                {text.type}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-slate-400 text-sm">{formatDate(text.dateCreated)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Conversations Tab */}
            {activeTab === "conversations" && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" style={{ color: "#D4A020" }} />
                  Recent Conversations ({data.conversations.length})
                </h2>
                {data.conversations.length === 0 ? (
                  <EmptyState 
                    icon={MessageCircle}
                    title="No conversations yet"
                    description="Guide conversations will appear here once users start engaging."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                          <th className="text-left py-2 px-2">Guide</th>
                          <th className="text-left py-2 px-2">User</th>
                          <th className="text-right py-2 px-2">Messages</th>
                          <th className="text-left py-2 px-2">Status</th>
                          <th className="text-left py-2 px-2">Last Message</th>
                          <th className="text-left py-2 px-2">Started</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.conversations
                          .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime())
                          .slice(0, 20)
                          .map((conv) => (
                            <tr key={conv.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                              <td className="py-3 px-2">
                                <span className="text-slate-300 font-medium">{conv.guideName}</span>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-slate-600" />
                                  <span className="text-slate-400 font-mono text-sm">
                                    {conv.userId.slice(0, 8)}...
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <MessageCircle className="w-3 h-3 text-slate-600" />
                                  <span className="text-slate-400">{conv.messageCount}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  conv.status === 'active' 
                                    ? 'bg-emerald-900/30 text-emerald-400' 
                                    : conv.status === 'committed'
                                    ? 'bg-blue-900/30 text-blue-400'
                                    : 'bg-slate-900/30 text-slate-400'
                                }`}>
                                  {conv.status}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-slate-400 text-sm">{formatDateTime(conv.lastMessageDate)}</td>
                              <td className="py-3 px-2 text-slate-400 text-sm">{formatDate(conv.createdAt)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Timestamp */}
            <div className="text-center">
              <p className="text-xs text-slate-600">
                Last updated: {formatDateTime(data.timestamp)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}