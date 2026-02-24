"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  TestTube,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Clock,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Activity,
  Settings,
} from "lucide-react";

// ============ TYPES ============

interface BacktestStrategy {
  tested: boolean;
  name: string;
  version: string;
  lastAccuracy: number;
  lastSharpe: number;
  lastWinRate: number;
  profitFactor: number;
  paramsTested: string[];
  optimalParams: Record<string, any>;
  improvements?: string;
  sectorBreakdown?: Record<string, any>;
  topPairs?: Array<{ pair: string; reverter: string; probability: number }>;
  crossAssetPredictions?: Array<{ predictor: string; target: string; correlation: number }>;
}

interface TopConfiguration {
  rank: number;
  name: string;
  accuracy: number;
  buySignals: number;
  score: number;
  params: string;
  improvement?: string;
}

interface SectorAnalysis {
  assets: number;
  buySignals: number;
  buyRate: number;
  bullPercent: number;
  bearPercent: number;
  issue: string;
  solution: string;
}

interface TopAsset {
  symbol: string;
  score: number;
  winRate: number;
  strategy: string;
}

interface BacktestSummaryData {
  lastRun: string;
  backtesterVersion: string;
  universeSize: number;
  coreAssets: number;
  lookbackYears: number;
  runtime_seconds: number;
  tickers_calibrated: number;
  strategies: Record<string, BacktestStrategy>;
  topConfigurations: TopConfiguration[];
  sectorAnalysis: Record<string, SectorAnalysis>;
  validationStatus: Record<string, string>;
  summary: {
    avgConfidenceMultiplier: number;
    medianConfidenceMultiplier: number;
    avgCompositeScore: number;
    tickersTested: number;
    strategiesTested: number;
    validationMethods: string[];
  };
  topAssets: TopAsset[];
  keyInsights: string[];
  nextSteps: string[];
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

function formatPct(val: number): string {
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

// ============ COMPONENT ============

export default function BacktestOverview() {
  const [data, setData] = useState<BacktestSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    system: true,
    strategies: false,
    results: false,
    timeline: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const fetchBacktestData = async () => {
    try {
      setLoading(true);
      setError(null);
      const ts = Date.now();
      const response = await fetch(`/data/trading/backtest-summary.json?${ts}`);
      
      if (!response.ok) {
        throw new Error("Failed to load backtest summary data");
      }

      const summaryData = await response.json();
      setData(summaryData);
    } catch (e) {
      setError("Failed to load backtest results");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBacktestData();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-center">
          <TestTube className="w-6 h-6 text-blue-400 animate-pulse mr-3" />
          <span className="text-slate-300">Loading backtest overview...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400 mr-3" />
          <span className="text-red-300">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Backtester System Card */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-700/30">
        <button
          onClick={() => toggleSection('system')}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <TestTube className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-bold text-slate-100">
              MRE Backtester v{data.backtesterVersion} — Historical Validation Engine
            </h3>
          </div>
          {expandedSections.system ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.system && (
          <div className="mt-6 space-y-6">
            {/* System Overview */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                System Architecture
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Historical validation engine testing <strong>{Object.keys(data.strategies).length} strategies</strong> across{" "}
                <strong>{data.universeSize} assets</strong> using <strong>{data.lookbackYears}+ years</strong> of data.
                Two-tier system: Universe Backtester ({data.universeSize} assets, batch processing) + Core MRE Backtester ({data.coreAssets} primary assets, deep analysis).
              </p>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{data.universeSize}</div>
                  <div className="text-xs text-slate-500">Universe Assets</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">{data.coreAssets}</div>
                  <div className="text-xs text-slate-500">Core Assets</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{data.lookbackYears}+</div>
                  <div className="text-xs text-slate-500">Years Data</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{Object.keys(data.strategies).length}</div>
                  <div className="text-xs text-slate-500">Strategies</div>
                </div>
              </div>
            </div>

            {/* Validation Methods */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Validation Methods
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.summary.validationMethods.map((method, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>{method}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How It's Used */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Usage & Integration
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Overnight Pit runs it nightly (Phases 4-6), results feed into strategy version bumps. 
                Current run: <strong>{data.tickers_calibrated} tickers calibrated</strong> in{" "}
                <strong>{data.runtime_seconds.toFixed(1)}s</strong>, achieving{" "}
                <span className={`font-bold ${scoreColor(data.summary.avgCompositeScore, [0.5, 0.7])}`}>
                  {(data.summary.avgCompositeScore * 100).toFixed(1)}% avg composite score
                </span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Strategy Coverage Matrix */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <button
          onClick={() => toggleSection('strategies')}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" />
            Strategy Coverage Matrix ({Object.keys(data.strategies).length} strategies)
          </h3>
          {expandedSections.strategies ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {expandedSections.strategies && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                  <th className="text-left py-3 px-2">Strategy</th>
                  <th className="text-left py-3 px-2">Version</th>
                  <th className="text-center py-3 px-2">Testing</th>
                  <th className="text-right py-3 px-2">Accuracy</th>
                  <th className="text-right py-3 px-2">Win Rate</th>
                  <th className="text-right py-3 px-2">Sharpe</th>
                  <th className="text-right py-3 px-2">Profit Factor</th>
                  <th className="text-left py-3 px-2">Key Parameters</th>
                  <th className="text-left py-3 px-2">Recent Improvements</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.strategies).map(([key, strategy]) => (
                  <tr key={key} className="border-b border-slate-800/50 hover:bg-slate-700/20">
                    <td className="py-3 px-2">
                      <div className="font-semibold text-slate-200">{strategy.name}</div>
                      <div className="text-xs text-slate-500 capitalize">{key.replace(/_/g, " ")}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 bg-primary-600/20 text-primary-400 text-xs rounded-full font-mono">
                        v{strategy.version}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {strategy.tested ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className={`py-3 px-2 text-right font-mono font-bold ${scoreColor(strategy.lastAccuracy / 100, [0.5, 0.65])}`}>
                      {strategy.lastAccuracy.toFixed(1)}%
                    </td>
                    <td className={`py-3 px-2 text-right font-mono ${scoreColor(strategy.lastWinRate, [0.5, 0.65])}`}>
                      {(strategy.lastWinRate * 100).toFixed(1)}%
                    </td>
                    <td className={`py-3 px-2 text-right font-mono ${pctColor(strategy.lastSharpe)}`}>
                      {strategy.lastSharpe.toFixed(3)}
                    </td>
                    <td className={`py-3 px-2 text-right font-mono ${scoreColor(strategy.profitFactor, [1.5, 2.0])}`}>
                      {strategy.profitFactor.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-400">
                      {strategy.paramsTested.slice(0, 3).join(", ")}
                      {strategy.paramsTested.length > 3 && ` +${strategy.paramsTested.length - 3} more`}
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-300 max-w-xs">
                      {strategy.improvements && (
                        <div className="truncate" title={strategy.improvements}>
                          {strategy.improvements}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Latest Backtest Results */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <button
          onClick={() => toggleSection('results')}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Latest Backtest Results ({new Date(data.lastRun).toLocaleDateString()})
          </h3>
          {expandedSections.results ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {expandedSections.results && (
          <div className="mt-4 space-y-4">
            {/* Top Configurations */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-3">Top Parameter Configurations</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {data.topConfigurations.slice(0, 4).map((config) => (
                  <div key={config.rank} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          config.rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
                          config.rank === 2 ? "bg-gray-500/20 text-gray-400" :
                          config.rank === 3 ? "bg-amber-600/20 text-amber-500" :
                          "bg-slate-600/20 text-slate-400"
                        }`}>
                          #{config.rank}
                        </span>
                        <span className="text-sm font-semibold text-slate-200">{config.name}</span>
                      </div>
                      <div className={`text-sm font-bold ${scoreColor(config.accuracy / 100, [0.6, 0.8])}`}>
                        {config.accuracy}%
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div className="text-center">
                        <div className="text-slate-500">Signals</div>
                        <div className="text-slate-200 font-mono">{config.buySignals}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-500">Score</div>
                        <div className="text-emerald-400 font-mono">{config.score.toFixed(3)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-500">Rank</div>
                        <div className="text-slate-200 font-mono">#{config.rank}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mb-1">
                      <strong>Params:</strong> {config.params}
                    </div>
                    {config.improvement && (
                      <div className="text-xs text-emerald-300">
                        {config.improvement}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Assets */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-3">Top Performing Assets</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                      <th className="text-left py-2 px-2">Symbol</th>
                      <th className="text-right py-2 px-2">Composite Score</th>
                      <th className="text-right py-2 px-2">Win Rate</th>
                      <th className="text-left py-2 px-2">Best Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topAssets.slice(0, 10).map((asset) => (
                      <tr key={asset.symbol} className="border-b border-slate-800/50 hover:bg-slate-700/20">
                        <td className="py-2 px-2 font-mono font-semibold text-slate-200">{asset.symbol}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-emerald-400">
                          {asset.score.toFixed(3)}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${scoreColor(asset.winRate / 100, [0.5, 0.65])}`}>
                          {asset.winRate.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-slate-300 text-xs capitalize">
                          {asset.strategy.replace(/_/g, " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Insights */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-3">Key Insights</h4>
              <div className="space-y-2">
                {data.keyInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <Zap className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sector Analysis */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-3">Sector Analysis</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {Object.entries(data.sectorAnalysis).map(([sector, analysis]) => (
                  <div key={sector} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-200 capitalize">
                        {sector.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-slate-500">{analysis.assets} assets</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div className="text-center">
                        <div className="text-slate-500">Buy Rate</div>
                        <div className="text-slate-200 font-mono">{analysis.buyRate.toFixed(1)}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-500">Bull</div>
                        <div className="text-emerald-400 font-mono">{analysis.bullPercent.toFixed(1)}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-500">Bear</div>
                        <div className="text-red-400 font-mono">{analysis.bearPercent.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mb-1">
                      <strong>Issue:</strong> {analysis.issue}
                    </div>
                    <div className="text-xs text-emerald-300">
                      <strong>Solution:</strong> {analysis.solution}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Next Steps */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <button
          onClick={() => toggleSection('timeline')}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Implementation Roadmap
          </h3>
          {expandedSections.timeline ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {expandedSections.timeline && (
          <div className="mt-4">
            <div className="space-y-3">
              {data.nextSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="text-sm text-slate-300">{step}</div>
                </div>
              ))}
            </div>
            
            {/* Validation Status */}
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <h4 className="text-xs font-semibold text-slate-400 mb-3">Validation Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(data.validationStatus).map(([method, status]) => (
                  <div key={method} className="flex items-center gap-2 p-2 bg-slate-900/30 rounded">
                    {status === "passed" ? (
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-red-400" />
                    )}
                    <span className="text-xs text-slate-300 capitalize">{method.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}