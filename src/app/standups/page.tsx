"use client";

import { useState } from "react";
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Circle,
  Plus,
  Users,
  Clock,
  X,
} from "lucide-react";

interface ActionItem {
  text: string;
  completed: boolean;
  assignee: string;
}

interface TranscriptEntry {
  speaker: string;
  role: string;
  message: string;
}

interface Standup {
  id: string;
  date: string;
  topic: string;
  status: "completed" | "in-progress";
  participants: { name: string; role: string }[];
  duration: string;
  transcript: TranscriptEntry[];
  actionItems: ActionItem[];
}

const mockStandups: Standup[] = [
  {
    id: "1",
    date: "2026-01-27",
    topic: "Hub OS Overhaul Planning",
    status: "completed",
    participants: [
      { name: "Theo", role: "COO" },
      { name: "Atlas", role: "CTO" },
      { name: "Muse", role: "CMO" },
    ],
    duration: "12 min",
    transcript: [
      {
        speaker: "Theo",
        role: "COO",
        message: "Good morning team. Today's focus: the Hub OS overhaul. We need to clean up 6 deprecated apps and build 3 new OS-layer features. Atlas, what's the engineering plan?",
      },
      {
        speaker: "Atlas",
        role: "CTO",
        message: "I've reviewed the codebase. Faith, Family, Marriage, Moltbook, Tasks, and Skills can all be removed cleanly — no cross-dependencies with kept features. For the new pages: Org Chart, Fleet, and Standups. I'll have Forge handle the backend cleanup and Pixel build the frontends.",
      },
      {
        speaker: "Muse",
        role: "CMO",
        message: "The Org Chart should be the hero page — it tells our story. I'll work with Pixel on the visual design. Gradient cards, status indicators, model badges. Make it feel alive.",
      },
      {
        speaker: "Theo",
        role: "COO",
        message: "Agreed. Let's target deployment by end of day. Atlas, coordinate with Tower for the deploy pipeline. Muse, review the final UI before we push. Action items: Atlas — code cleanup and new page scaffolding. Muse — visual review. I'll handle deployment verification.",
      },
    ],
    actionItems: [
      { text: "Remove deprecated app directories and API routes", completed: true, assignee: "Atlas" },
      { text: "Build Org Chart page with hierarchy visualization", completed: true, assignee: "Pixel" },
      { text: "Build Fleet dashboard with model cards", completed: true, assignee: "Pixel" },
      { text: "Build Standups page with mock data", completed: true, assignee: "Pixel" },
      { text: "Visual review of all new pages", completed: false, assignee: "Muse" },
      { text: "Deploy via Tower pipeline", completed: false, assignee: "Theo" },
    ],
  },
  {
    id: "2",
    date: "2026-01-26",
    topic: "Trading Bot Performance Review",
    status: "completed",
    participants: [
      { name: "Theo", role: "COO" },
      { name: "Venture", role: "CRO" },
      { name: "Forge", role: "Backend Lead" },
    ],
    duration: "8 min",
    transcript: [
      {
        speaker: "Theo",
        role: "COO",
        message: "Let's review this week's paper trading performance. Venture, what are the numbers?",
      },
      {
        speaker: "Venture",
        role: "CRO",
        message: "The multi-strategy bot ran all 5 trading days. Adaptive dip on SPY triggered twice — both profitable. Trend following on QQQ had one false signal but the trailing stop limited losses. Net for the week: +0.8% across all strategies.",
      },
      {
        speaker: "Forge",
        role: "Backend Lead",
        message: "Infrastructure was solid. No API timeouts, all market data feeds clean. I did notice the CGS Fibonacci strategy hasn't triggered on GLD in 3 weeks — we might want to widen the retracement levels.",
      },
      {
        speaker: "Theo",
        role: "COO",
        message: "Good data. Let's run a backtest on GLD with wider Fib levels this week. Venture, prepare a monthly report. Forge, keep monitoring latency.",
      },
    ],
    actionItems: [
      { text: "Run GLD backtest with wider Fibonacci retracement levels", completed: true, assignee: "Forge" },
      { text: "Prepare monthly trading performance report", completed: false, assignee: "Venture" },
      { text: "Monitor API latency and set up alerts", completed: true, assignee: "Forge" },
    ],
  },
  {
    id: "3",
    date: "2026-01-24",
    topic: "Podcast Episode #4 Planning",
    status: "completed",
    participants: [
      { name: "Theo", role: "COO" },
      { name: "Muse", role: "CMO" },
      { name: "ScriptBot", role: "Content Lead" },
    ],
    duration: "10 min",
    transcript: [
      {
        speaker: "Theo",
        role: "COO",
        message: "Episode 4 of The Builder's Frequency. ScriptBot, what's the topic?",
      },
      {
        speaker: "ScriptBot",
        role: "Content Lead",
        message: "Based on engagement data, the 'AI for Builders' pillar is our strongest performer. I'm proposing: 'Building Your AI Team — Why Every Solo Founder Needs Agent Orchestration.' It ties directly into what we're doing with Clawdbot.",
      },
      {
        speaker: "Muse",
        role: "CMO",
        message: "Love it. Authentic story angle — we eat our own cooking. I'll plan 3 short clips for LinkedIn and YouTube Shorts. The org chart reveal could be a visual hook.",
      },
      {
        speaker: "Theo",
        role: "COO",
        message: "Perfect. ScriptBot, draft by Wednesday. Muse, storyboard the clips. Let's record Thursday.",
      },
    ],
    actionItems: [
      { text: "Draft Episode 4 script: AI Team for Solo Founders", completed: true, assignee: "ScriptBot" },
      { text: "Storyboard 3 short clips for social distribution", completed: true, assignee: "Muse" },
      { text: "Record episode on Thursday", completed: true, assignee: "Joshua" },
    ],
  },
];

function StandupCard({ standup }: { standup: Standup }) {
  const [expanded, setExpanded] = useState(false);
  const completedActions = standup.actionItems.filter((a) => a.completed).length;
  const totalActions = standup.actionItems.length;

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">{standup.topic}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatDate(standup.date)}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" /> {standup.participants.length} agents
              </span>
              <span className="text-xs text-slate-500">{standup.duration}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${(completedActions / totalActions) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">
                {completedActions}/{totalActions}
              </span>
            </div>
          </div>
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-800">
          {/* Participants */}
          <div className="px-4 py-3 bg-slate-900/30 border-b border-slate-800/50">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Participants</p>
            <div className="flex items-center gap-2 flex-wrap">
              {standup.participants.map((p) => (
                <span
                  key={p.name}
                  className="px-2.5 py-1 bg-slate-800/60 rounded-lg text-xs text-slate-300 border border-slate-700/50"
                >
                  {p.name} <span className="text-slate-500">· {p.role}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Transcript */}
          <div className="px-4 py-3 border-b border-slate-800/50">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Transcript</p>
            <div className="space-y-3">
              {standup.transcript.map((entry, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-slate-400">
                      {entry.speaker.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300">
                      {entry.speaker}{" "}
                      <span className="text-slate-600">· {entry.role}</span>
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">
                      {entry.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Action Items</p>
            <div className="space-y-2">
              {standup.actionItems.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-2 rounded-lg ${
                    item.completed ? "bg-emerald-500/5" : "bg-slate-800/20"
                  }`}
                >
                  {item.completed ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        item.completed ? "text-slate-500 line-through" : "text-slate-300"
                      }`}
                    >
                      {item.text}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">→ {item.assignee}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StandupsPage() {
  const [showNewModal, setShowNewModal] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Standups</h1>
            <p className="text-slate-500 text-sm">Agent standup meetings & action items</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          New Standup
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 text-center">
          <p className="text-2xl font-bold text-slate-100">{mockStandups.length}</p>
          <p className="text-xs text-slate-500 mt-1">This Week</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            {mockStandups.reduce((sum, s) => sum + s.actionItems.filter((a) => a.completed).length, 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Actions Done</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">
            {mockStandups.reduce((sum, s) => sum + s.actionItems.filter((a) => !a.completed).length, 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Pending</p>
        </div>
      </div>

      {/* Standup List */}
      <div className="space-y-3">
        {mockStandups.map((standup) => (
          <StandupCard key={standup.id} standup={standup} />
        ))}
      </div>

      {/* New Standup Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-100">New Standup</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Topic</label>
                <input
                  type="text"
                  placeholder="What's this standup about?"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Participants</label>
                <div className="flex flex-wrap gap-2">
                  {["Theo", "Atlas", "Muse", "Venture", "Forge", "ScriptBot"].map((name) => (
                    <button
                      key={name}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-primary-500 hover:text-primary-400 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <button className="w-full btn btn-primary text-sm py-2.5">
                Start Standup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
