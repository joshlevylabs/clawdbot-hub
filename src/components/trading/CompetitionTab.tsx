"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Brain, Shield, TrendingUp, TrendingDown, Target, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { getAgentDisplayName, getAgentConfig } from "@/lib/agent-config";
import { AgentBadge } from "@/components/AgentBadge";

interface CompetitionScore {
  id: string;
  season_id: string;
  agent_id: string;
  total_return: number;
  max_drawdown: number;
  daily_volatility: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  win_rate: number;
  payoff_ratio: number;
  avg_hold_days: number;
  trade_count: number;
  turnover: number;
  rule_violations: number;
  bull_return: number;
  bear_return: number;
  sideways_return: number;
  regime_consistency: number;
  composite_score: number;
  rank: number;
  reflection_count: number;
  observation_count: number;
  lesson_count: number;
  memory_depth_score: number;
  adaptation_score: number;
  tier: "premier" | "development";
  capital_allocation: number;
  computed_at: string;
}

interface CompetitionSeason {
  id: string;
  season_number: number;
  name: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | "cancelled";
  config: any;
  created_at: string;
}

interface CompetitionData {
  activeSeason: CompetitionSeason | null;
  scores: CompetitionScore[];
  seasons: CompetitionSeason[];
}

const MEDALS = ["🥇", "🥈", "🥉"];

function ScoreBar({ value, max = 100, color = "#D4A020", label }: { value: number; max?: number; color?: string; label?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-[#8B8B80] w-16">{label}</span>}
      <div className="flex-1 h-2 bg-[#1a1a18] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-[#C8C8B4] w-10 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

function AgentCard({ score, rank, expanded, onToggle }: { score: CompetitionScore; rank: number; expanded: boolean; onToggle: () => void }) {
  const config = getAgentConfig(score.agent_id);
  const displayName = getAgentDisplayName(score.agent_id);
  const isPremier = score.tier === "premier";
  const medal = rank <= 3 ? MEDALS[rank - 1] : `#${rank}`;

  const returnColor = score.total_return >= 0 ? "#4ADE80" : "#EF4444";
  const compositeColor = score.composite_score >= 60 ? "#4ADE80" : score.composite_score >= 40 ? "#D4A020" : "#EF4444";

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all duration-300 ${
        isPremier
          ? "border-[#D4A020]/40 bg-gradient-to-br from-[#1a1a18] to-[#2a2218]"
          : "border-[#333330] bg-[#1a1a18]"
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#252520] transition-colors"
      >
        <span className="text-2xl">{medal}</span>
        <div className="flex-1 flex items-center gap-2">
          <AgentBadge accountId={score.agent_id} compact />
          <div className="text-left">
            <div className="font-semibold text-[#C8C8B4]">{displayName}</div>
            <div className="text-xs text-[#8B8B80]">
              {isPremier ? "🏅 Premier" : "🔧 Development"} · ${(score.capital_allocation / 1000).toFixed(0)}K
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="hidden sm:flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-xs text-[#8B8B80]">Score</div>
            <div className="font-bold font-mono" style={{ color: compositeColor }}>
              {score.composite_score.toFixed(1)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#8B8B80]">Return</div>
            <div className="font-mono" style={{ color: returnColor }}>
              {score.total_return >= 0 ? "+" : ""}{score.total_return.toFixed(2)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#8B8B80]">Sharpe</div>
            <div className="font-mono text-[#C8C8B4]">{score.sharpe_ratio.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#8B8B80]">DD</div>
            <div className="font-mono text-[#EF4444]">{score.max_drawdown.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#8B8B80]">Memory</div>
            <div className="font-mono text-[#818CF8]">{score.memory_depth_score.toFixed(0)}</div>
          </div>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-[#8B8B80]" /> : <ChevronDown className="w-4 h-4 text-[#8B8B80]" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#333330] pt-3 space-y-4">
          {/* Composite Score Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-[#D4A020] mb-2 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> Composite Score Breakdown
            </h4>
            <div className="space-y-1.5">
              <ScoreBar value={Math.min(100, Math.max(0, (score.total_return + 5) * 10))} color="#4ADE80" label="Return" />
              <ScoreBar value={Math.min(100, Math.max(0, score.sharpe_ratio * 25 + 50))} color="#60A5FA" label="Sharpe" />
              <ScoreBar value={Math.min(100, Math.max(0, score.sortino_ratio * 25 + 50))} color="#34D399" label="Sortino" />
              <ScoreBar value={100 - score.max_drawdown * 10} color="#F87171" label="DD Pen." />
              <ScoreBar value={score.regime_consistency ?? 50} color="#FBBF24" label="Regime" />
              <ScoreBar value={score.memory_depth_score} color="#818CF8" label="Memory" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Win Rate" value={`${(score.win_rate * 100).toFixed(0)}%`} icon={<Target className="w-3.5 h-3.5" />} />
            <StatBox label="Payoff Ratio" value={score.payoff_ratio.toFixed(2)} icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <StatBox label="Trades" value={score.trade_count.toString()} icon={<Zap className="w-3.5 h-3.5" />} />
            <StatBox label="Violations" value={score.rule_violations.toString()} icon={<Shield className="w-3.5 h-3.5" />} color={score.rule_violations > 0 ? "#EF4444" : "#4ADE80"} />
          </div>

          {/* Regime Performance */}
          <div>
            <h4 className="text-sm font-semibold text-[#D4A020] mb-2 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Regime Performance
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <RegimeBox label="🐂 Bull" value={score.bull_return} />
              <RegimeBox label="🐻 Bear" value={score.bear_return} />
              <RegimeBox label="↔️ Sideways" value={score.sideways_return} />
            </div>
          </div>

          {/* Memory Depth */}
          <div>
            <h4 className="text-sm font-semibold text-[#D4A020] mb-2 flex items-center gap-1">
              <Brain className="w-3.5 h-3.5" /> Memory & Adaptation
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#252520] rounded-lg p-2 text-center">
                <div className="text-[#818CF8] font-bold text-lg">{score.reflection_count}</div>
                <div className="text-[#8B8B80]">Reflections</div>
              </div>
              <div className="bg-[#252520] rounded-lg p-2 text-center">
                <div className="text-[#60A5FA] font-bold text-lg">{score.observation_count}</div>
                <div className="text-[#8B8B80]">Observations</div>
              </div>
              <div className="bg-[#252520] rounded-lg p-2 text-center">
                <div className="text-[#34D399] font-bold text-lg">{score.lesson_count}</div>
                <div className="text-[#8B8B80]">Lessons</div>
              </div>
              <div className="bg-[#252520] rounded-lg p-2 text-center">
                <div className="text-[#FBBF24] font-bold text-lg">{score.adaptation_score.toFixed(0)}</div>
                <div className="text-[#8B8B80]">Adaptation</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="bg-[#252520] rounded-lg p-2 flex items-center gap-2">
      <div className="text-[#8B8B80]">{icon}</div>
      <div>
        <div className="text-xs text-[#8B8B80]">{label}</div>
        <div className="font-mono text-sm" style={{ color: color || "#C8C8B4" }}>{value}</div>
      </div>
    </div>
  );
}

function RegimeBox({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? "#4ADE80" : value < 0 ? "#EF4444" : "#8B8B80";
  return (
    <div className="bg-[#252520] rounded-lg p-2 text-center">
      <div className="text-xs text-[#8B8B80] mb-1">{label}</div>
      <div className="font-mono text-sm font-bold" style={{ color }}>
        {value >= 0 ? "+" : ""}{(value * 100).toFixed(2)}%
      </div>
    </div>
  );
}

function SeasonHeader({ season }: { season: CompetitionSeason }) {
  const daysSinceStart = Math.floor(
    (Date.now() - new Date(season.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isActive = season.status === "active";

  return (
    <div className={`rounded-xl p-4 border ${isActive ? "border-[#D4A020]/40 bg-gradient-to-r from-[#2a2218] to-[#1a1a18]" : "border-[#333330] bg-[#1a1a18]"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-[#D4A020]" />
          <div>
            <h2 className="text-lg font-bold text-[#C8C8B4]">{season.name}</h2>
            <div className="text-xs text-[#8B8B80]">
              {season.start_date} → {season.end_date || "ongoing"} · Day {daysSinceStart}
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isActive ? "bg-[#D4A020]/20 text-[#D4A020]" : "bg-[#333330] text-[#8B8B80]"
        }`}>
          {isActive ? "🔴 LIVE" : "✅ Completed"}
        </div>
      </div>
    </div>
  );
}

function NoSeasonView() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Trophy className="w-16 h-16 text-[#333330] mb-4" />
      <h2 className="text-xl font-bold text-[#C8C8B4] mb-2">No Active Competition</h2>
      <p className="text-[#8B8B80] max-w-md">
        Start a new season to see agents compete head-to-head with composite scoring, 
        regime-aware evaluation, and memory-driven adaptation.
      </p>
      <div className="mt-6 bg-[#1a1a18] border border-[#333330] rounded-lg p-4 text-left text-xs font-mono text-[#8B8B80]">
        <div className="text-[#D4A020] mb-1"># Start a new season:</div>
        <div>cd ~/clawd/tools/paper-trader</div>
        <div>python competition/season_manager.py start --name &quot;Season 1: The Gauntlet&quot;</div>
      </div>
    </div>
  );
}

function ScoringWeightsCard() {
  const weights = [
    { label: "Total Return", weight: "25%", color: "#4ADE80", icon: "📈" },
    { label: "Sharpe Ratio", weight: "20%", color: "#60A5FA", icon: "⚡" },
    { label: "Sortino Ratio", weight: "10%", color: "#34D399", icon: "🛡️" },
    { label: "Max Drawdown", weight: "-15%", color: "#F87171", icon: "📉" },
    { label: "Rule Violations", weight: "-10%", color: "#EF4444", icon: "🚨" },
    { label: "Regime Consistency", weight: "10%", color: "#FBBF24", icon: "🌍" },
    { label: "Memory Depth", weight: "10%", color: "#818CF8", icon: "🧠" },
  ];

  return (
    <div className="bg-[#1a1a18] border border-[#333330] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[#D4A020] mb-3 flex items-center gap-1">
        <Target className="w-3.5 h-3.5" /> Scoring Formula
      </h3>
      <div className="space-y-1.5">
        {weights.map((w) => (
          <div key={w.label} className="flex items-center gap-2 text-xs">
            <span>{w.icon}</span>
            <span className="text-[#8B8B80] flex-1">{w.label}</span>
            <span className="font-mono font-bold" style={{ color: w.color }}>{w.weight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TierExplanation() {
  return (
    <div className="bg-[#1a1a18] border border-[#333330] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[#D4A020] mb-3 flex items-center gap-1">
        <Medal className="w-3.5 h-3.5" /> Tier System
      </h3>
      <div className="space-y-3 text-xs">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span>🏅</span>
            <span className="font-semibold text-[#D4A020]">Premier Tier</span>
          </div>
          <div className="text-[#8B8B80] pl-5">
            Score ≥60, DD &lt;8%, positive return. $100K base + $10K/consecutive season.
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span>🔧</span>
            <span className="font-semibold text-[#8B8B80]">Development Tier</span>
          </div>
          <div className="text-[#8B8B80] pl-5">
            Score &lt;60 or DD &gt;8% or negative return. $50K flat capital.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompetitionTab() {
  const [data, setData] = useState<CompetitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch("/api/trading/competition?view=leaderboard");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A020]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-[#EF4444]">
        Error loading competition data: {error}
      </div>
    );
  }

  if (!data?.activeSeason) {
    return <NoSeasonView />;
  }

  const { activeSeason, scores } = data;

  // Summary stats
  const avgScore = scores.length > 0 ? scores.reduce((s, a) => s + a.composite_score, 0) / scores.length : 0;
  const premierCount = scores.filter((s) => s.tier === "premier").length;
  const totalTrades = scores.reduce((s, a) => s + a.trade_count, 0);

  return (
    <div className="space-y-4">
      {/* Season Header */}
      <SeasonHeader season={activeSeason} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1a1a18] border border-[#333330] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#D4A020]">{scores.length}</div>
          <div className="text-xs text-[#8B8B80]">Agents Competing</div>
        </div>
        <div className="bg-[#1a1a18] border border-[#333330] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#C8C8B4]">{avgScore.toFixed(1)}</div>
          <div className="text-xs text-[#8B8B80]">Avg Score</div>
        </div>
        <div className="bg-[#1a1a18] border border-[#333330] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#D4A020]">{premierCount}</div>
          <div className="text-xs text-[#8B8B80]">Premier Tier</div>
        </div>
        <div className="bg-[#1a1a18] border border-[#333330] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#C8C8B4]">{totalTrades}</div>
          <div className="text-xs text-[#8B8B80]">Total Trades</div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Leaderboard — 3 cols */}
        <div className="lg:col-span-3 space-y-3">
          <h3 className="text-sm font-semibold text-[#D4A020] flex items-center gap-1">
            <Trophy className="w-4 h-4" /> Leaderboard
          </h3>
          {scores.map((score) => (
            <AgentCard
              key={score.agent_id}
              score={score}
              rank={score.rank}
              expanded={expandedAgent === score.agent_id}
              onToggle={() => setExpandedAgent(expandedAgent === score.agent_id ? null : score.agent_id)}
            />
          ))}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          <ScoringWeightsCard />
          <TierExplanation />
        </div>
      </div>
    </div>
  );
}
