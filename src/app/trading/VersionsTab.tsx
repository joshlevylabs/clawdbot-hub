"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  Award,
  GitBranch,
} from "lucide-react";

// ============ TYPES ============

interface VersionData {
  signals: string;
  cycle: string;
  pit: string;
  paper: string;
  backtest: string;
  config: string;
}

interface StrategyVersion {
  version: string;
  date: string;
  changes: string[];
  accuracy: {
    overall: number;
    byAssetClass: Record<string, number>;
  };
  winRate: number;
  sharpe: number;
  profitFactor: number;
}

interface StrategyRegression {
  version: string;
  issue: string;
  resolution: string;
}

interface Strategy {
  name: string;
  currentVersion: string;
  description: string;
  parameters: any;
  versions: StrategyVersion[];
  regressions: StrategyRegression[];
}

interface StrategyVersionData {
  lastUpdated: string;
  strategies: Record<string, Strategy>;
}

// ============ HELPERS ============

function scoreColor(val: number, thresholds: [number, number] = [0.5, 0.7]): string {
  if (val >= thresholds[1]) return "text-emerald-400";
  if (val >= thresholds[0]) return "text-amber-400";
  return "text-red-400";
}

function pctColor(val: number): string {
  return val >= 0 ? "text-emerald-400" : "text-red-400";
}

// ============ SUB COMPONENTS ============

function VersionBadges({ versions }: { versions: VersionData }) {
  const items = [
    { label: "Signals", version: versions.signals, icon: "📡" },
    { label: "Cycle", version: versions.cycle, icon: "🔄" },
    { label: "Pit", version: versions.pit, icon: "⚙️" },
    { label: "Paper", version: versions.paper, icon: "📋" },
    { label: "Backtest", version: versions.backtest, icon: "📊" },
    { label: "Config", version: versions.config, icon: "🔧" },
  ];

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
        <Award className="w-4 h-4 text-primary-400" />
        MRE Semver Versions
      </h3>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-slate-900/50 rounded-lg p-3 text-center">
            <span className="text-lg">{item.icon}</span>
            <div className="text-xs text-slate-500 mt-1">{item.label}</div>
            <div className="text-sm font-mono font-bold text-primary-400 mt-0.5">v{item.version}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategyVersionHistory({ strategies }: { strategies: StrategyVersionData }) {
  const [expandedStrategies, setExpandedStrategies] = useState<Record<string, boolean>>({});

  const toggleStrategy = (strategyKey: string) => {
    setExpandedStrategies(prev => ({
      ...prev,
      [strategyKey]: !prev[strategyKey]
    }));
  };

  const strategyEntries = Object.entries(strategies.strategies);

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-emerald-400" />
        Strategy Version History ({strategyEntries.length} strategies)
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {strategyEntries.map(([strategyKey, strategy]) => {
          const isExpanded = expandedStrategies[strategyKey];
          const currentVersionData = strategy.versions[0]; // Latest version is first
          const hasRegressions = strategy.regressions.length > 0;

          return (
            <div key={strategyKey} className="bg-slate-900/50 rounded-lg border border-slate-700/50">
              {/* Header with current metrics */}
              <div className="p-4">
                <button
                  onClick={() => toggleStrategy(strategyKey)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-slate-200">{strategy.name}</h4>
                    <span className="px-2 py-1 bg-primary-600/20 text-primary-400 text-xs rounded-full font-mono">
                      v{strategy.currentVersion}
                    </span>
                    {hasRegressions && (
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {/* Current metrics - always visible */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Accuracy</div>
                    <div className={`text-sm font-bold ${scoreColor(currentVersionData.accuracy.overall / 100, [0.5, 0.55])}`}>
                      {currentVersionData.accuracy.overall.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Win Rate</div>
                    <div className={`text-sm font-bold ${scoreColor(currentVersionData.winRate, [0.5, 0.55])}`}>
                      {(currentVersionData.winRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Sharpe</div>
                    <div className={`text-sm font-bold ${pctColor(currentVersionData.sharpe)}`}>
                      {currentVersionData.sharpe.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Profit Factor</div>
                    <div className={`text-sm font-bold ${scoreColor(currentVersionData.profitFactor, [1.5, 2.0])}`}>
                      {currentVersionData.profitFactor.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-slate-700/50 p-4 space-y-4">
                  {/* Description */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 mb-1">Description</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">{strategy.description}</p>
                  </div>

                  {/* Accuracy trend mini-chart */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 mb-2">Accuracy Trend</h5>
                    <div className="bg-slate-800/50 rounded p-2">
                      <div className="flex items-center justify-between text-xs">
                        {strategy.versions.slice().reverse().map((version) => (
                          <div key={version.version} className="text-center">
                            <div className={`w-2 h-8 bg-gradient-to-t rounded-sm ${
                              scoreColor(version.accuracy.overall / 100, [0.5, 0.55]) === 'text-emerald-400' 
                                ? 'from-emerald-600 to-emerald-400' 
                                : scoreColor(version.accuracy.overall / 100, [0.5, 0.55]) === 'text-amber-400'
                                ? 'from-amber-600 to-amber-400'
                                : 'from-red-600 to-red-400'
                            }`} style={{ height: `${Math.max(version.accuracy.overall / 2, 10)}px` }}></div>
                            <div className="text-slate-500 mt-1">{version.version.split('.')[0]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Version history */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 mb-2">Version History</h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {strategy.versions.map((version) => (
                        <div key={version.version} className="bg-slate-800/50 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-semibold text-primary-400">
                              v{version.version}
                            </span>
                            <span className="text-xs text-slate-500">{version.date}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                            <div className="text-center">
                              <div className="text-slate-500">Accuracy</div>
                              <div className={`font-bold ${scoreColor(version.accuracy.overall / 100, [0.5, 0.55])}`}>
                                {version.accuracy.overall.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-slate-500">Win Rate</div>
                              <div className={`font-bold ${scoreColor(version.winRate, [0.5, 0.55])}`}>
                                {(version.winRate * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-slate-500">Sharpe</div>
                              <div className={`font-bold ${pctColor(version.sharpe)}`}>
                                {version.sharpe.toFixed(2)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-slate-500">Profit Factor</div>
                              <div className={`font-bold ${scoreColor(version.profitFactor, [1.5, 2.0])}`}>
                                {version.profitFactor.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <ul className="text-xs text-slate-300 space-y-1">
                            {version.changes.map((change, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-primary-400 mt-0.5">•</span>
                                <span>{change}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Regressions */}
                  {hasRegressions && (
                    <div>
                      <h5 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Known Regressions
                      </h5>
                      <div className="space-y-2">
                        {strategy.regressions.map((regression, idx) => (
                          <div key={idx} className="bg-red-900/20 border border-red-500/30 rounded p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono font-semibold text-red-400">
                                v{regression.version}
                              </span>
                            </div>
                            <div className="text-xs text-red-300 mb-2">
                              <strong>Issue:</strong> {regression.issue}
                            </div>
                            <div className="text-xs text-slate-300">
                              <strong>Resolution:</strong> {regression.resolution}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-slate-500 text-center">
        Last updated: {new Date(strategies.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export default function VersionsTab() {
  const [versions, setVersions] = useState<VersionData | null>(null);
  const [strategyVersions, setStrategyVersions] = useState<StrategyVersionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const ts = Date.now();
      const [verRes, stratRes] = await Promise.all([
        fetch(`/data/trading/mre-versions.json?${ts}`),
        fetch(`/data/trading/strategy-versions.json?${ts}`),
      ]);

      if (!verRes.ok || !stratRes.ok) {
        throw new Error("Failed to load version data");
      }

      setVersions(await verRes.json());
      setStrategyVersions(await stratRes.json());
    } catch (e) {
      setError("Failed to load version data");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300">{error}</p>
          <button onClick={fetchAll} className="mt-4 px-4 py-2 bg-primary-600 rounded-lg text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-violet-900/30 rounded-xl p-4 border border-cyan-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-cyan-400" />
              MRE Version Tracking
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Semver component versions · Strategy version history · Accuracy trends · Regression tracking
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Version Badges */}
      {versions && <VersionBadges versions={versions} />}

      {/* Strategy Version History */}
      {strategyVersions && <StrategyVersionHistory strategies={strategyVersions} />}
    </div>
  );
}
