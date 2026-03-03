"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  Activity,
  DollarSign,
  Percent,
  BarChart3,
  Zap,
  Shield,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Portfolio position type from page.tsx
interface PaperPosition {
  id: string;
  user_id: string | null;
  symbol: string;
  side: string;
  qty: number;
  entry_price: number;
  current_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  signal_confidence: number | null;
  signal_regime: string | null;
  opened_at: string;
  hold_days: number | null;
  notes: string | null;
  auto_tracked: boolean | null;
}

// MRE Signal interface from SignalFlowTab.tsx
interface MRESignal {
  symbol: string;
  signal: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  signal_strength: number;
  strategy_votes?: {
    fear_greed: boolean;
    regime_confirmation: boolean;
    rsi_oversold: boolean;
    mean_reversion: boolean;
    momentum: boolean;
    time_series_momentum?: boolean;
    qvm_factor?: boolean;
    vix_mean_reversion?: boolean;
  };
  regime: string;
  current_fg: number;
  rsi_14?: number;
  momentum_20d?: number;
  bb_position?: string;
  persistence_by_strategy?: Record<string, number>;
  sector?: string;
  dip_5d_pct?: number;
  return_5d?: number;
  volatility_20d?: number;
  global_fg?: number;
  sector_fg?: number;
  effective_fg?: number;
  fibonacci?: {
    current_price: number;
    swing_high: number;
    swing_low: number;
    trend: string;
    retracements?: Record<string, number>;
    extensions?: Record<string, number>;
    nearest_support?: number;
    nearest_resistance?: number;
    entry_zone?: string;
    profit_targets?: number[];
  };
  price?: number;
}

interface MREData {
  signals: {
    by_asset_class: MRESignal[];
  };
  fear_greed: {
    current: number;
    rating: string;
  };
  regime: {
    global: string;
  };
  sector_fear_greed?: {
    [key: string]: number;
  };
}

interface PositionWithSignal extends PaperPosition {
  signalData?: MRESignal;
  exitUrgency: number;
  exitAlerts: string[];
}

interface PortfolioSignalFlowProps {
  universeData: MREData | null;
  coreData: MREData | null;
}

// Calculate exit urgency score (0-100)
function calculateExitUrgency(position: PaperPosition, signalData?: MRESignal): { score: number; alerts: string[] } {
  let score = 0;
  const alerts: string[] = [];
  
  if (!signalData) {
    return { score: 0, alerts: ["No signal data available"] };
  }

  const currentPrice = position.current_price || position.entry_price;
  const pnlPct = ((currentPrice - position.entry_price) / position.entry_price) * 100;
  const holdDays = Math.floor((Date.now() - new Date(position.opened_at).getTime()) / (1000 * 60 * 60 * 24));
  const holdTarget = position.hold_days || 10;

  // Signal degradation
  if (signalData.signal === 'HOLD') {
    score += 30;
    alerts.push("🟡 Signal downgraded to HOLD");
  }
  if (signalData.signal === 'SELL') {
    score += 50;
    alerts.push("🔴 Signal downgraded to SELL");
  }

  // Regime change from entry
  if (position.signal_regime && signalData.regime !== position.signal_regime) {
    score += 15;
    alerts.push(`📊 Regime changed: ${position.signal_regime} → ${signalData.regime}`);
  }

  // RSI overbought
  if (signalData.rsi_14 && signalData.rsi_14 > 70) {
    score += 10;
    alerts.push(`📈 RSI overbought: ${signalData.rsi_14.toFixed(1)}`);
  }

  // Sector Fear & Greed extreme
  const sectorFg = signalData.sector_fg || signalData.effective_fg || signalData.current_fg;
  if (sectorFg > 70) {
    score += 10;
    alerts.push(`😨 Sector F&G extreme greed: ${sectorFg.toFixed(0)}`);
  }

  // Strategy consensus degradation
  if (position.signal_confidence && signalData.strategy_votes) {
    const currentVotes = Object.values(signalData.strategy_votes).filter(v => v === true).length;
    const entryVotes = Math.round((position.signal_confidence / 100) * 8); // Estimate original votes
    const voteDrop = entryVotes - currentVotes;
    if (voteDrop > 0) {
      score += voteDrop * 5;
      alerts.push(`📉 Strategy consensus dropped: ${entryVotes}/8 → ${currentVotes}/8`);
    }
  }

  // Time-based alerts
  if (holdDays >= holdTarget) {
    score += 10;
    alerts.push(`⏰ Past hold target: ${holdDays}d vs ${holdTarget}d target`);
  }

  // P&L deterioration
  if (pnlPct < -5 && currentPrice < position.entry_price) {
    score += 20;
    alerts.push(`📉 Negative P&L worsening: ${pnlPct.toFixed(1)}%`);
  }

  return { score: Math.min(100, score), alerts };
}

// Count active strategy votes
function countActiveVotes(signalData?: MRESignal): number {
  if (!signalData?.strategy_votes) return 0;
  return Object.values(signalData.strategy_votes).filter(v => v === true).length;
}

export default function PortfolioSignalFlow({ universeData, coreData }: PortfolioSignalFlowProps) {
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  // Fetch positions from the API
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/paper-trading');
        if (!response.ok) {
          throw new Error(`Failed to fetch positions: ${response.status}`);
        }
        const data = await response.json();
        setPositions(data.positions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load positions');
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, []);

  // Merge positions with signal data and calculate exit urgency
  const positionsWithSignals = useMemo((): PositionWithSignal[] => {
    if (!positions.length) return [];

    const signalsData = universeData || coreData;
    if (!signalsData?.signals?.by_asset_class) return positions.map(p => ({ ...p, exitUrgency: 0, exitAlerts: [] }));

    const signalMap = new Map<string, MRESignal>();
    signalsData.signals.by_asset_class.forEach(signal => {
      signalMap.set(signal.symbol, signal);
    });

    return positions.map(position => {
      const signalData = signalMap.get(position.symbol);
      const { score, alerts } = calculateExitUrgency(position, signalData);
      
      return {
        ...position,
        signalData,
        exitUrgency: score,
        exitAlerts: alerts
      };
    }).sort((a, b) => b.exitUrgency - a.exitUrgency); // Sort by urgency (highest first)
  }, [positions, universeData, coreData]);

  // Portfolio health summary
  const portfolioHealth = useMemo(() => {
    if (!positionsWithSignals.length) {
      return {
        totalPositions: 0,
        buySignals: 0,
        holdSignals: 0,
        degradedSignals: 0,
        averageConsensus: 0,
        regimeDistribution: {},
        highUrgencyCount: 0,
        mediumUrgencyCount: 0,
        lowUrgencyCount: 0
      };
    }

    const buySignals = positionsWithSignals.filter(p => p.signalData?.signal === 'BUY').length;
    const holdSignals = positionsWithSignals.filter(p => p.signalData?.signal === 'HOLD').length;
    const degradedSignals = positionsWithSignals.filter(p => !p.signalData || ['SELL', 'WATCH'].includes(p.signalData.signal)).length;
    
    const totalVotes = positionsWithSignals.reduce((sum, p) => sum + countActiveVotes(p.signalData), 0);
    const averageConsensus = positionsWithSignals.length > 0 ? totalVotes / positionsWithSignals.length : 0;
    
    const regimeDistribution = positionsWithSignals.reduce((acc, p) => {
      const regime = p.signalData?.regime || 'unknown';
      acc[regime] = (acc[regime] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const highUrgencyCount = positionsWithSignals.filter(p => p.exitUrgency >= 50).length;
    const mediumUrgencyCount = positionsWithSignals.filter(p => p.exitUrgency >= 25 && p.exitUrgency < 50).length;
    const lowUrgencyCount = positionsWithSignals.filter(p => p.exitUrgency < 25).length;

    return {
      totalPositions: positionsWithSignals.length,
      buySignals,
      holdSignals,
      degradedSignals,
      averageConsensus,
      regimeDistribution,
      highUrgencyCount,
      mediumUrgencyCount,
      lowUrgencyCount
    };
  }, [positionsWithSignals]);

  const togglePositionExpanded = (positionId: string) => {
    setExpandedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(positionId)) {
        newSet.delete(positionId);
      } else {
        newSet.add(positionId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-400 mx-auto mb-3" />
          <p className="text-slate-400">Loading portfolio positions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 mb-2">{error}</p>
          <p className="text-slate-500 text-sm">Check that the /api/paper-trading endpoint is accessible</p>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Open Positions</h3>
          <p className="text-slate-500">Open some positions to see portfolio signal flow analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Health Score */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-400" />
          Portfolio Health Overview
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Signal Distribution */}
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{portfolioHealth.buySignals}</div>
            <div className="text-xs text-slate-500 uppercase">BUY Signals</div>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{portfolioHealth.holdSignals}</div>
            <div className="text-xs text-slate-500 uppercase">HOLD Signals</div>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{portfolioHealth.degradedSignals}</div>
            <div className="text-xs text-slate-500 uppercase">Degraded</div>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary-400">{portfolioHealth.averageConsensus.toFixed(1)}/8</div>
            <div className="text-xs text-slate-500 uppercase">Avg Consensus</div>
          </div>
        </div>

        {/* Exit Urgency Distribution */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-400">{portfolioHealth.highUrgencyCount}</div>
            <div className="text-xs text-slate-500">High Urgency (50+)</div>
          </div>
          
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-amber-400">{portfolioHealth.mediumUrgencyCount}</div>
            <div className="text-xs text-slate-500">Medium Urgency</div>
          </div>
          
          <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{portfolioHealth.lowUrgencyCount}</div>
            <div className="text-xs text-slate-500">Low Urgency</div>
          </div>
        </div>

        {/* Regime Distribution */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Regime Distribution</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(portfolioHealth.regimeDistribution).map(([regime, count]) => (
              <span
                key={regime}
                className={`px-3 py-1 rounded-lg text-xs font-medium border capitalize ${
                  regime === 'bull' ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400' :
                  regime === 'bear' ? 'bg-red-900/30 border-red-700/50 text-red-400' :
                  'bg-amber-900/30 border-amber-700/50 text-amber-400'
                }`}
              >
                {regime === 'bull' ? '🟢' : regime === 'bear' ? '🔴' : '🟡'} {regime}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Position Analysis */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-400" />
          Position Signal Analysis ({positionsWithSignals.length})
          <span className="text-sm text-slate-500 font-normal">— sorted by exit urgency</span>
        </h3>

        {positionsWithSignals.map((position) => {
          const currentPrice = position.current_price || position.entry_price;
          const pnl = (currentPrice - position.entry_price) * position.qty;
          const pnlPct = ((currentPrice - position.entry_price) / position.entry_price) * 100;
          const holdDays = Math.floor((Date.now() - new Date(position.opened_at).getTime()) / (1000 * 60 * 60 * 24));
          const isExpanded = expandedPositions.has(position.id);
          
          const urgencyColor = position.exitUrgency >= 50 ? 'border-red-500/50 bg-red-900/20' :
                              position.exitUrgency >= 25 ? 'border-amber-500/50 bg-amber-900/20' :
                              'border-emerald-500/50 bg-emerald-900/20';

          return (
            <div key={position.id} className={`rounded-xl border p-4 ${urgencyColor}`}>
              {/* Position Header Row */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => togglePositionExpanded(position.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Symbol & Basic Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-slate-100">{position.symbol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        position.exitUrgency >= 50 ? 'bg-red-600 text-white' :
                        position.exitUrgency >= 25 ? 'bg-amber-600 text-white' :
                        'bg-emerald-600 text-white'
                      }`}>
                        {position.exitUrgency} urgency
                      </span>
                    </div>
                    <div className="text-sm text-slate-400">
                      {position.qty} shares • Entry: ${position.entry_price.toFixed(2)} • 
                      Current: ${currentPrice.toFixed(2)} • {holdDays}d held
                    </div>
                  </div>

                  {/* P&L */}
                  <div className="text-right">
                    <div className={`text-lg font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </div>
                    <div className={`text-sm ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </div>
                  </div>

                  {/* Current Signal */}
                  <div className="text-center">
                    <div className={`text-sm font-bold ${
                      position.signalData?.signal === 'BUY' ? 'text-emerald-400' :
                      position.signalData?.signal === 'HOLD' ? 'text-amber-400' :
                      position.signalData?.signal === 'SELL' ? 'text-red-400' :
                      'text-slate-500'
                    }`}>
                      {position.signalData?.signal || 'NO DATA'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {position.signalData ? `${countActiveVotes(position.signalData)}/8 votes` : 'No signal data'}
                    </div>
                  </div>
                </div>

                {/* Expand/Collapse Icon */}
                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Exit Alerts - Always Visible */}
              {position.exitAlerts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="flex flex-wrap gap-2">
                    {position.exitAlerts.slice(0, 3).map((alert, index) => (
                      <span key={index} className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300">
                        {alert}
                      </span>
                    ))}
                    {position.exitAlerts.length > 3 && (
                      <span className="text-xs text-slate-500">
                        +{position.exitAlerts.length - 3} more alerts
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Expanded Detail */}
              {isExpanded && position.signalData && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                  {/* Signal Health Dashboard */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Strategy Votes Breakdown */}
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-slate-300 mb-2">Strategy Votes</h5>
                      <div className="space-y-1 text-xs">
                        {position.signalData.strategy_votes && Object.entries(position.signalData.strategy_votes).map(([strategy, voted]) => (
                          <div key={strategy} className="flex justify-between">
                            <span className="text-slate-400 capitalize">{strategy.replace(/_/g, ' ')}</span>
                            <span className={voted ? 'text-emerald-400' : 'text-slate-600'}>
                              {voted ? '✓' : '✗'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Technical Indicators */}
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-slate-300 mb-2">Technical Indicators</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">RSI (14)</span>
                          <span className={
                            position.signalData.rsi_14 && position.signalData.rsi_14 > 70 ? 'text-red-400' :
                            position.signalData.rsi_14 && position.signalData.rsi_14 < 30 ? 'text-emerald-400' :
                            'text-slate-300'
                          }>
                            {position.signalData.rsi_14?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">20d Momentum</span>
                          <span className={
                            position.signalData.momentum_20d && position.signalData.momentum_20d > 0 ? 'text-emerald-400' : 'text-red-400'
                          }>
                            {position.signalData.momentum_20d ? `${(position.signalData.momentum_20d * 100).toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">BB Position</span>
                          <span className="text-slate-300">{position.signalData.bb_position || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Fear & Greed Analysis */}
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-slate-300 mb-2">Fear & Greed</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Global F&G</span>
                          <span className={
                            position.signalData.global_fg && position.signalData.global_fg > 70 ? 'text-red-400' :
                            position.signalData.global_fg && position.signalData.global_fg < 30 ? 'text-emerald-400' :
                            'text-slate-300'
                          }>
                            {position.signalData.global_fg?.toFixed(0) || position.signalData.current_fg?.toFixed(0) || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Sector F&G</span>
                          <span className={
                            position.signalData.sector_fg && position.signalData.sector_fg > 70 ? 'text-red-400' :
                            position.signalData.sector_fg && position.signalData.sector_fg < 30 ? 'text-emerald-400' :
                            'text-slate-300'
                          }>
                            {position.signalData.sector_fg?.toFixed(0) || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Sector</span>
                          <span className="text-slate-300 capitalize">{position.signalData.sector || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Position Targets & Fibonacci */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Position Levels */}
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-slate-300 mb-2">Position Levels</h5>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Stop Loss</span>
                          <span className="text-red-400">{position.stop_loss ? `$${position.stop_loss.toFixed(2)}` : 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Take Profit</span>
                          <span className="text-emerald-400">{position.take_profit ? `$${position.take_profit.toFixed(2)}` : 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hold Target</span>
                          <span className="text-slate-300">{position.hold_days || 'Not set'} days</span>
                        </div>
                      </div>
                    </div>

                    {/* Fibonacci Analysis */}
                    {position.signalData.fibonacci && (
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <h5 className="text-sm font-medium text-slate-300 mb-2">Fibonacci Analysis</h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Trend</span>
                            <span className="text-slate-300 capitalize">{position.signalData.fibonacci.trend}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Support</span>
                            <span className="text-emerald-400">
                              ${position.signalData.fibonacci.nearest_support?.toFixed(2) || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Resistance</span>
                            <span className="text-red-400">
                              ${position.signalData.fibonacci.nearest_resistance?.toFixed(2) || 'N/A'}
                            </span>
                          </div>
                          {position.signalData.fibonacci.profit_targets && position.signalData.fibonacci.profit_targets.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Target 1</span>
                              <span className="text-primary-400">
                                ${position.signalData.fibonacci.profit_targets[0].toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Full Exit Alerts List */}
                  {position.exitAlerts.length > 3 && (
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-slate-300 mb-2">All Exit Alerts</h5>
                      <div className="space-y-1">
                        {position.exitAlerts.map((alert, index) => (
                          <div key={index} className="text-xs text-slate-400">• {alert}</div>
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
    </div>
  );
}