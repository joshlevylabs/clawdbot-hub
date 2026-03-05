"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  Pause,
  Filter,
  Search,
  Zap,
  Target,
  Layers,
  Clock,
} from "lucide-react";
import WorkflowNode from "@/components/WorkflowNode";
import PipelineDetailPanel from "@/components/PipelineDetailPanel";
import PersistenceFlipFlop from "@/components/PersistenceFlipFlop";
import SectorFearGreedPanel from "./SectorFearGreedPanel";
import GeopoliticalFlowTab from "./GeopoliticalFlowTab";
import PortfolioExitFlow from "@/components/trading/PortfolioExitFlow";

// Interface for MRE signal data
interface MRESignal {
  symbol: string;
  signal: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  signal_strength: number;
  signal_track: string;
  signal_source: string;
  strategies_agreeing: number;
  current_fg: number;
  fear_threshold: number;
  fear_threshold_conservative: number;
  fear_threshold_opportunistic: number;
  regime: string;
  regime_weight?: number;
  role: string;
  role_action: string;
  rotation_modifier: number;
  sideways_applied: boolean;
  kalshi_applied: boolean;
  kalshi_adjustment?: number;
  cluster_limited: boolean;
  asset_confidence: number;
  cap_applied: boolean;
  crash_action: string;
  bear_suppressed: boolean;
  sell_suppressed: boolean;
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
  // Tier 3: Signal persistence tracking
  persistence_by_strategy?: Record<string, number>;
  persistence_days?: number;
  vol_adjusted_size?: number;
  vol_scaling_factor?: number;
  rsi_percentile?: number;
  momentum_percentile?: number;
  volatility_percentile?: number;
  price?: number;
  asset_class?: string;
  sector?: string;
  rsi_14?: number;
  bb_position?: string;
  dip_5d_pct?: number;
  return_5d?: number;
  momentum_20d?: number;
  volatility_20d?: number;
  regime_details?: {
    ema_20: number;
    ema_50: number;
    ema_100?: number;
    ema_150?: number;
    ema_200: number;
    ema_slow?: number;
    above_ema_20: boolean;
    above_ema_50: boolean;
    above_ema_100?: boolean;
    above_ema_150?: boolean;
    above_ema_200: boolean;
    regime_days: number;
    regime_stage: string;
    confidence: number;
    momentum_20d: number;
    ema_spread_pct: number;
  };
  // Alpha Rank fields
  alpha_rank_score?: number;
  alpha_decile?: number;
  alpha_sector_rank_pct?: number;
  alpha_composite_raw?: number;
  alpha_factors?: Record<string, number>;
  alpha_factors_available?: number;
  alpha_regime_weights_applied?: string;
  alpha_mean_rev_dampened?: boolean;
  alpha_top_contributors?: Array<{ factor: string; contribution: number; direction: string }>;
  fibonacci?: {
    symbol: string;
    current_price: number;
    swing_high: number;
    swing_low: number;
    swing_high_date?: string;
    swing_low_date?: string;
    swing_high_idx?: number;
    swing_low_idx?: number;
    trend: string;
    swing_quality?: string;
    lookback_period?: string;
    retracements?: Record<string, number>;  // {"0.0": 288.35, "23.6": 260.06, ...}
    extensions?: Record<string, number>;     // {"100.0": 363.07, ...}
    nearest_support?: number;
    nearest_resistance?: number;
    entry_zone?: string;                     // "242.56 - 214.27" (STRING!)
    profit_targets?: number[];               // [395.67, 437.15] (number array!)
    extension_type?: string;
    pullback_low?: number;
    pullback_date?: string;
  };
  // New sector F&G fields from A-198 pipeline update
  global_fg?: number;
  sector_fg?: number;
  effective_fg?: number;
  fg_divergence?: number;
  fg_divergence_bonus?: number;
  fg_blend_weights?: {
    global_weight: number;
    sector_weight: number;
  };
  // Per-stage signal snapshots
  stage_signals?: {
    strategies: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
    signal_gating: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
    confidence_tuning: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
    final_filters: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  };
}

interface MREData {
  timestamp: string;
  fear_greed: {
    current: number;
    rating: string;
    summary?: string;
  };
  regime: {
    global: string;
  };
  // New sector F&G data from A-198 pipeline update
  sector_fear_greed?: {
    broad_market: number;
    technology: number;
    healthcare: number;
    financials: number;
    real_estate: number;
    energy: number;
    bonds: number;
    international: number;
    commodities: number;
  };
  signals: {
    summary: {
      total_buy: number;
      total_hold: number;
      total_watch: number;
      total_failed?: number;
    };
    by_asset_class: MRESignal[];
  };
  meta?: {
    version: string;
    core_pipeline?: string;
  };
  alpha_rank_meta?: {
    config_version: string;
    config_hash: string;
    config_date: string;
    regime_weights_applied: string;
    factors: string[];
    weights: Record<string, number>;
  };
}

interface TickerDetail {
  symbol: string;
  reason?: string;
  beforeValue?: number;
  afterValue?: number;
  signal?: string;
  signalStrength?: number;
  currentPrice?: number;
  adjustmentValue?: number;
  // Add full raw data
  rawData?: MRESignal;
}

interface StageDetails {
  name: string;
  description: string;
  stageType: 'input' | 'filter' | 'modifier' | 'output';
  inputCount: number;
  outputCount: number;
  filteredTickers: TickerDetail[];
  passedTickers: TickerDetail[];
  pendingTickers?: TickerDetail[];
}

// Calculate pipeline stages from MRE data
interface StrategyVoteStage {
  name: string;
  key: string;
  inputCount: number;
  outputCount: number;
  passed: MRESignal[];
  filtered: MRESignal[];
}

interface VoteConsensusPath {
  voteCount: number;
  name: string;
  tickers: MRESignal[];
  count: number;
}

function calculatePipelineStages(signals: MRESignal[], dataType: 'core' | 'universe') {
  const totalTickers = signals.length;
  
  // Step 1: Universe Input
  const inputStage = {
    inputCount: totalTickers,
    outputCount: totalTickers,
    passed: signals,
    filtered: [] as MRESignal[]
  };
  
  // Step 2: Individual Strategy Votes (8 strategies, each evaluates all tickers)
  // Shows RAW votes (including persistence-pending signals via persistence_by_strategy > 0)
  const strategyNames = [
    { key: 'fear_greed', name: 'Blended F&G' },
    { key: 'regime_confirmation', name: 'Multi-TF Trend' },
    { key: 'rsi_oversold', name: 'ConnorsRSI' },
    { key: 'mean_reversion', name: 'Dual Band MR' },
    { key: 'momentum', name: 'Dual Momentum' },
    { key: 'time_series_momentum', name: 'TS Momentum' },
    { key: 'qvm_factor', name: 'QVM Factor' },
    { key: 'vix_mean_reversion', name: 'VIX Reversion' },
  ];
  
  // Check if a strategy fired (confirmed OR pending persistence)
  const didStrategyFire = (s: MRESignal, key: string): boolean => {
    // Check confirmed votes first
    if (s.strategy_votes?.[key as keyof typeof s.strategy_votes] === true) return true;
    // Check persistence-pending votes (day 1+, not yet confirmed)
    if (s.persistence_by_strategy && (s.persistence_by_strategy[key] || 0) > 0) return true;
    // Fallback for core tickers
    if (key === 'fear_greed' && s.signal_track !== 'none' && s.signal_track !== undefined) return true;
    return false;
  };
  
  // Check if a strategy's vote is confirmed (persistence >= 2 days)
  const isStrategyConfirmed = (s: MRESignal, key: string): boolean => {
    if (s.strategy_votes?.[key as keyof typeof s.strategy_votes] === true) return true;
    if (s.persistence_by_strategy && (s.persistence_by_strategy[key] || 0) >= 2) return true;
    return false;
  };
  
  const strategyVotes: StrategyVoteStage[] = strategyNames.map(({ key, name }) => {
    const passed = signals.filter(s => didStrategyFire(s, key));
    const filtered = signals.filter(s => !didStrategyFire(s, key));
    // Count confirmed vs pending
    const confirmedCount = signals.filter(s => isStrategyConfirmed(s, key)).length;
    return { 
      name, key, inputCount: totalTickers, outputCount: passed.length, passed, filtered,
      confirmedCount, pendingCount: passed.length - confirmedCount,
    } as StrategyVoteStage & { confirmedCount: number; pendingCount: number };
  });
  
  // Tickers that got at least one RAW BUY vote from any strategy (including persistence-pending)
  const anyVotePassed = signals.filter(s => {
    return strategyNames.some(({ key }) => didStrategyFire(s, key));
  });
  const anyVoteFiltered = signals.filter(s => !anyVotePassed.includes(s));
  
  // Per-Consensus Persistence Gates: separate persistence tracking for each vote level
  const perConsensusPersistence: Record<number, {
    inputCount: number;
    outputCount: number;
    pendingCount: number;
    passed: MRESignal[];
    pending: MRESignal[];
    filtered: MRESignal[];
  }> = {};
  
  // Build persistence gates for each vote consensus level (1-8)
  for (let voteCount = 1; voteCount <= 8; voteCount++) {
    const tickersWithThisVoteCount = anyVotePassed.filter(s => {
      const actualVoteCount = strategyNames.filter(({ key }) => didStrategyFire(s, key)).length;
      return actualVoteCount === voteCount;
    });
    
    if (tickersWithThisVoteCount.length === 0) {
      // Skip creating persistence gate for empty vote levels
      continue;
    }
    
    // For persistence at this consensus level, a ticker must:
    // 1. Currently have exactly this vote count
    // 2. Have confirmed persistence (>= 2 days) for at least one strategy
    const confirmed = tickersWithThisVoteCount.filter(s => {
      return strategyNames.some(({ key }) => isStrategyConfirmed(s, key));
    });
    
    const pending = tickersWithThisVoteCount.filter(s => {
      return !strategyNames.some(({ key }) => isStrategyConfirmed(s, key));
    });
    
    perConsensusPersistence[voteCount] = {
      inputCount: tickersWithThisVoteCount.length,
      outputCount: confirmed.length,
      pendingCount: pending.length,
      passed: confirmed,
      pending: pending,
      filtered: pending, // pending = filtered for now
    };
  }
  
  // Legacy single persistence gate for backward compatibility
  const allConfirmed = Object.values(perConsensusPersistence).flatMap(p => p.passed);
  const allPending = Object.values(perConsensusPersistence).flatMap(p => p.pending);
  
  const persistenceGate = {
    inputCount: anyVotePassed.length,
    outputCount: allConfirmed.length,
    pendingCount: allPending.length,
    passed: allConfirmed,
    pending: allPending,
    filtered: allPending, // pending = filtered for now
  };
  
  // Vote Consensus Gate: Group tickers by how many strategies voted BUY (raw, including pending)
  // Only create paths for vote levels that have tickers (dynamic)
  const voteConsensusPaths: VoteConsensusPath[] = [];
  
  for (let voteCount = 1; voteCount <= 8; voteCount++) {
    const tickersWithThisVoteCount = anyVotePassed.filter(s => {
      const actualVoteCount = strategyNames.filter(({ key }) => didStrategyFire(s, key)).length;
      return actualVoteCount === voteCount;
    });
    
    // Only add this vote level if it has tickers
    if (tickersWithThisVoteCount.length > 0) {
      voteConsensusPaths.push({
        voteCount,
        name: `${voteCount}-of-8 votes`,
        tickers: tickersWithThisVoteCount,
        count: tickersWithThisVoteCount.length
      });
    }
  }
  
  const voteConsensusGate = {
    inputCount: anyVotePassed.length,
    outputCount: anyVotePassed.length,
    passed: anyVotePassed,
    filtered: anyVoteFiltered,
    paths: voteConsensusPaths
  };
  
  // Post-Persistence Consensus: Separate nodes for each consensus level after persistence
  const postPersistenceConsensusPaths: VoteConsensusPath[] = [];
  
  for (const [voteCount, persistenceData] of Object.entries(perConsensusPersistence)) {
    if (persistenceData.outputCount > 0) { // Only show consensus levels with confirmed tickers
      postPersistenceConsensusPaths.push({
        voteCount: parseInt(voteCount),
        name: `${voteCount}-of-8 confirmed`,
        tickers: persistenceData.passed,
        count: persistenceData.outputCount
      });
    }
  }
  
  // Step 3: Signal Gating (sell suppress + bear suppress) — operates on persistence-confirmed signals
  const persistenceBypass = allConfirmed.length === 0 && anyVotePassed.length > 0;
  const gatingInput = allConfirmed.length > 0 ? allConfirmed : anyVotePassed;
  
  // Use stage-specific signal for Signal Gating categorization
  const signalGatePassed = gatingInput.filter(s => {
    const stageSignal = s.stage_signals?.signal_gating || s.signal;
    return stageSignal === 'BUY' || stageSignal === 'WATCH';
  });
  const signalGateFiltered = gatingInput.filter(s => {
    const stageSignal = s.stage_signals?.signal_gating || s.signal;
    return stageSignal === 'HOLD' || s.bear_suppressed || s.sell_suppressed;
  });
  
  const signalGateStage = {
    inputCount: gatingInput.length,
    outputCount: signalGatePassed.length,
    passed: signalGatePassed,
    filtered: signalGateFiltered,
    persistenceBypass,
  };

  // Post-Gating Consensus: Group the signals that passed gating by their vote consensus tier
  const postGatingConsensusPaths: VoteConsensusPath[] = [];
  
  for (let voteCount = 1; voteCount <= 8; voteCount++) {
    const tickersWithThisVoteCount = signalGatePassed.filter(s => {
      const actualVoteCount = strategyNames.filter(({ key }) => didStrategyFire(s, key)).length;
      return actualVoteCount === voteCount;
    });
    
    // Only add this vote level if it has tickers
    if (tickersWithThisVoteCount.length > 0) {
      postGatingConsensusPaths.push({
        voteCount,
        name: `${voteCount}-of-8 signals`,
        tickers: tickersWithThisVoteCount,
        count: tickersWithThisVoteCount.length
      });
    }
  }
  
  // Step 4: Confidence Tuning (all modifiers: regime, role, rotation, sideways, kalshi)
  // Use stage-specific signal for Confidence Tuning categorization
  const confidencePassed = signalGatePassed.filter(s => {
    const stageSignal = s.stage_signals?.confidence_tuning || s.signal;
    return stageSignal !== 'HOLD';
  });
  const confidenceFiltered = signalGatePassed.filter(s => {
    const stageSignal = s.stage_signals?.confidence_tuning || s.signal;
    return stageSignal === 'HOLD';
  });
  
  // Add per-tier data for confidence tuning — use stage-specific signal
  const confidencePerTierData: Record<number, { input: number, output: number, tickers: MRESignal[] }> = {};
  for (let voteCount = 1; voteCount <= 8; voteCount++) {
    const tierInputTickers = signalGatePassed.filter(s => {
      const actualVoteCount = strategyNames.filter(({ key }) => didStrategyFire(s, key)).length;
      return actualVoteCount === voteCount;
    });
    const tierOutputTickers = tierInputTickers.filter(s => {
      const stageSignal = s.stage_signals?.confidence_tuning || s.signal;
      return stageSignal !== 'HOLD';
    });
    
    if (tierInputTickers.length > 0) {
      confidencePerTierData[voteCount] = {
        input: tierInputTickers.length,
        output: tierOutputTickers.length,
        tickers: tierOutputTickers
      };
    }
  }
  
  const confidenceStage = {
    inputCount: signalGatePassed.length,
    outputCount: confidencePassed.length,
    passed: confidencePassed,
    filtered: confidenceFiltered,
    perTierData: confidencePerTierData
  };
  
  // Step 5: Final Filters (cluster limit, asset confidence, crash mode, multiplier cap)
  // Use stage-specific signal for Final Filters categorization
  const finalPassed = confidencePassed.filter(s => {
    const stageSignal = s.stage_signals?.final_filters || s.signal;
    return stageSignal === 'BUY';
  });
  const finalFiltered = confidencePassed.filter(s => {
    const stageSignal = s.stage_signals?.final_filters || s.signal;
    return stageSignal !== 'BUY';
  });
  
  // Add per-tier data for final filters — use stage-specific signal
  const finalPerTierData: Record<number, { input: number, output: number, tickers: MRESignal[] }> = {};
  for (let voteCount = 1; voteCount <= 8; voteCount++) {
    const tierInputTickers = confidencePassed.filter(s => {
      const actualVoteCount = strategyNames.filter(({ key }) => didStrategyFire(s, key)).length;
      return actualVoteCount === voteCount;
    });
    const tierOutputTickers = tierInputTickers.filter(s => {
      const stageSignal = s.stage_signals?.final_filters || s.signal;
      return stageSignal === 'BUY';
    });
    
    if (tierInputTickers.length > 0) {
      finalPerTierData[voteCount] = {
        input: tierInputTickers.length,
        output: tierOutputTickers.length,
        tickers: tierOutputTickers
      };
    }
  }
  
  const finalStage = {
    inputCount: confidencePassed.length,
    outputCount: finalPassed.length,
    passed: finalPassed,
    filtered: finalFiltered,
    perTierData: finalPerTierData
  };
  
  // Step 6: Output (only BUY signals)
  // Add per-tier data for output
  const outputPerTierData: Record<number, { input: number, output: number, tickers: MRESignal[] }> = {};
  for (let voteCount = 1; voteCount <= 8; voteCount++) {
    const tierTickers = finalPassed.filter(s => {
      const actualVoteCount = strategyNames.filter(({ key }) => didStrategyFire(s, key)).length;
      return actualVoteCount === voteCount;
    });
    
    if (tierTickers.length > 0) {
      outputPerTierData[voteCount] = {
        input: tierTickers.length,
        output: tierTickers.length, // Pass-through
        tickers: tierTickers
      };
    }
  }
  
  const outputStage = {
    inputCount: finalPassed.length,
    outputCount: finalPassed.length,
    passed: [...finalPassed].sort((a, b) => b.signal_strength - a.signal_strength),
    filtered: [] as MRESignal[],
    perTierData: outputPerTierData
  };
  
  // Step 7: Alpha Rank Gate — independent cross-sectional ranking (all 666 ranked tickers)
  // Prime Trades = BUY signal + Top Decile Alpha Rank
  const alphaRankedSignals = signals.filter(s => s.alpha_rank_score !== undefined && s.alpha_rank_score !== null);
  const topDecileSignals = alphaRankedSignals.filter(s => (s.alpha_decile || 0) >= 10);
  const primeTradeSignals = finalPassed.filter(s => (s.alpha_decile || 0) >= 10);
  
  // Per-tier alpha rank data
  const alphaRankPerTierData: Record<number, { input: number, output: number, tickers: MRESignal[], primeCount: number }> = {};
  for (let voteCount = 1; voteCount <= 8; voteCount++) {
    const tierTickers = finalPassed.filter(s => {
      const actualVoteCount = strategyNames.filter(({ key }) => didStrategyFire(s, key)).length;
      return actualVoteCount === voteCount;
    });
    
    if (tierTickers.length > 0) {
      const primeTickers = tierTickers.filter(s => (s.alpha_decile || 0) >= 10);
      alphaRankPerTierData[voteCount] = {
        input: tierTickers.length,
        output: tierTickers.length, // Pass-through (rank is informational)
        tickers: tierTickers,
        primeCount: primeTickers.length
      };
    }
  }
  
  const alphaRankStage = {
    inputCount: finalPassed.length,
    outputCount: finalPassed.length, // Pass-through — Alpha Rank is a scoring overlay, not a filter
    passed: finalPassed,
    filtered: [] as MRESignal[],
    totalRanked: alphaRankedSignals.length,
    topDecileCount: topDecileSignals.length,
    primeTradeCount: primeTradeSignals.length,
    primeTradeSignals,
    perTierData: alphaRankPerTierData
  };

  // Step 9: Fibonacci Level Selection (post-output — determines entry, SL, TP)
  // Add per-tier data for fibonacci levels (same as alpha rank output since it's pass-through)
  const fibonacciPerTierData: Record<number, { input: number, output: number, tickers: MRESignal[] }> = {};
  for (let voteCount = 1; voteCount <= 8; voteCount++) {
    const tierTickers = finalPassed.filter(s => {
      const actualVoteCount = strategyNames.filter(({ key }) => didStrategyFire(s, key)).length;
      return actualVoteCount === voteCount;
    });
    
    if (tierTickers.length > 0) {
      fibonacciPerTierData[voteCount] = {
        input: tierTickers.length,
        output: tierTickers.length, // Pass-through
        tickers: tierTickers
      };
    }
  }
  
  const fibonacciLevels = {
    inputCount: finalPassed.length,
    outputCount: finalPassed.length, // All signals get fib levels calculated
    passed: finalPassed,
    filtered: [] as MRESignal[],
    status: finalPassed.length > 0 ? 'active' : 'waiting',
    perTierData: fibonacciPerTierData
  };

  // Step 10: Agent Analysis (final review by trading agents)
  // Each agent has style filters — a ticker passes only if ALL agents agree it's a BUY
  const AGENT_STYLE_FILTERS = [
    { id: 'chris-vermeulen', name: 'Chris Vermeulen', emoji: '📊', color: '#F59E0B', preferredSectors: ['*'], minSignalStrength: 40, minStrategiesAgreeing: 3, preferredRegimes: ['bull', 'recovery', 'sideways'] },
    { id: 'warren-buffett', name: 'Warren Buffett', emoji: '📈', color: '#10B981', preferredSectors: ['Financials', 'Consumer Staples', 'Consumer Discretionary', 'Energy', 'Industrials', 'Healthcare'], minSignalStrength: 35, minStrategiesAgreeing: 3, preferredRegimes: ['bull', 'recovery', 'sideways', 'bear'] },
    { id: 'peter-schiff', name: 'Peter Schiff', emoji: '🥇', color: '#EAB308', preferredSectors: ['Energy', 'Materials', 'Utilities', 'Real Estate'], minSignalStrength: 30, minStrategiesAgreeing: 2, preferredRegimes: ['bull', 'recovery', 'sideways', 'bear', 'crisis'] },
    { id: 'raoul-pal', name: 'Raoul Pal', emoji: '🌊', color: '#06B6D4', preferredSectors: ['Technology', 'Communication Services', 'Financials'], minSignalStrength: 35, minStrategiesAgreeing: 3, preferredRegimes: ['bull', 'recovery'] },
    { id: 'peter-lynch', name: 'Peter Lynch', emoji: '📉', color: '#8B5CF6', preferredSectors: ['*'], minSignalStrength: 30, minStrategiesAgreeing: 2, preferredRegimes: ['bull', 'recovery', 'sideways'] },
  ];

  // Use the most common regime from signals as global regime fallback
  const regimeCounts: Record<string, number> = {};
  finalPassed.forEach(s => { const r = (s.regime || '').toLowerCase(); if (r) regimeCounts[r] = (regimeCounts[r] || 0) + 1; });
  const globalRegime = Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'sideways';

  // For each signal, determine which agents would approve it
  const signalAgentApprovals = new Map<string, string[]>(); // symbol → agent ids that approve
  finalPassed.forEach(sig => {
    const approvals: string[] = [];
    AGENT_STYLE_FILTERS.forEach(agent => {
      // Signal strength check
      if (sig.signal_strength < agent.minSignalStrength) return;
      // Strategies agreeing check
      if ((sig.strategies_agreeing || 0) < agent.minStrategiesAgreeing) return;
      // Sector filter
      if (!agent.preferredSectors.includes('*')) {
        const sigSector = sig.sector || '';
        if (!agent.preferredSectors.some(ps => sigSector.includes(ps))) return;
      }
      // Regime filter
      const regime = (sig.regime || globalRegime || '').toLowerCase();
      if (!agent.preferredRegimes.some(pr => regime.includes(pr))) return;
      approvals.push(agent.id);
    });
    signalAgentApprovals.set(sig.symbol, approvals);
  });

  // Only tickers where ALL 5 agents agree pass through to output
  const agentPassed = finalPassed.filter(s => (signalAgentApprovals.get(s.symbol) || []).length === 5);
  const agentFiltered = finalPassed.filter(s => (signalAgentApprovals.get(s.symbol) || []).length < 5);

  const agentPerTierData: Record<number, { input: number, output: number, filtered: number, tickers: MRESignal[], filteredTickers: MRESignal[] }> = {};
  for (let voteCount = 1; voteCount <= 8; voteCount++) {
    const tierTickers = finalPassed.filter(s => {
      const actualVoteCount = strategyNames.filter(({ key }) => didStrategyFire(s, key)).length;
      return actualVoteCount === voteCount;
    });
    
    if (tierTickers.length > 0) {
      const tierPassed = tierTickers.filter(s => (signalAgentApprovals.get(s.symbol) || []).length === 5);
      const tierFiltered = tierTickers.filter(s => (signalAgentApprovals.get(s.symbol) || []).length < 5);
      agentPerTierData[voteCount] = {
        input: tierTickers.length,
        output: tierPassed.length,
        filtered: tierFiltered.length,
        tickers: tierPassed,
        filteredTickers: tierFiltered,
      };
    }
  }
  
  const agentAnalysis = {
    inputCount: finalPassed.length,
    outputCount: agentPassed.length,
    passed: agentPassed,
    filtered: agentFiltered,
    agentStyles: AGENT_STYLE_FILTERS,
    signalAgentApprovals, // Map<symbol, agentId[]>
    perTierData: agentPerTierData
  };

  // Build a unified tier list from postPersistenceConsensusPaths so that ALL tiers
  // that have confirmed signals render cards in every subsequent column — even if
  // gating/tuning/filters removed all signals for that tier.  This guarantees
  // connection lines can always route from Confirmed Signals → Signal Gating → … → Agent Analysis.
  const allFlowTiers: VoteConsensusPath[] = (postPersistenceConsensusPaths.length > 0
    ? postPersistenceConsensusPaths
    : postGatingConsensusPaths   // fallback when persistence has no confirmed signals
  ).map(path => {
    // Use postGating count if available (the surviving count), else 0
    const gatingPath = postGatingConsensusPaths.find(p => p.voteCount === path.voteCount);
    return { ...path, gatingCount: gatingPath?.count ?? 0 };
  });

  return {
    input: inputStage,
    strategyVotes,
    voteConsensusGate,
    perConsensusPersistence,
    postPersistenceConsensusPaths,
    persistenceGate,
    signalGating: signalGateStage,
    postGatingConsensusPaths,
    allFlowTiers,
    confidenceTuning: confidenceStage,
    finalFilters: finalStage,
    output: outputStage,
    alphaRank: alphaRankStage,
    fibonacciLevels,
    agentAnalysis,
  };
}

// ── Tier color helper (shared by dots and connections) ─────────────
function getTierColor(voteCount: number): { dot: string; text: string; label: string } {
  if (voteCount >= 3) return { dot: 'border-emerald-400 bg-emerald-400/20', text: 'text-emerald-400', label: `${voteCount}/8` };
  if (voteCount >= 2) return { dot: 'border-blue-400 bg-blue-400/20', text: 'text-blue-400', label: `${voteCount}/8` };
  return { dot: 'border-slate-500 bg-slate-500/20', text: 'text-slate-500', label: `${voteCount}/8` };
}

// ── HTML-based tier connector line (extends from card right edge into gap) ──
function TierConnectorLine({ voteCount, isLast = false }: { voteCount: number; isLast?: boolean }) {
  // Brand palette: Forge Gold, uniform brightness
  const color = '#D4A020';
  const opacity = 0.8;
  if (isLast) return null; // No connector after the last column
  return (
    <div 
      className="absolute right-0 top-1/2 pointer-events-none"
      style={{
        width: '96px', // gap-24 = 96px
        height: '3px',
        transform: 'translate(100%, -50%)',
        background: `repeating-linear-gradient(to right, ${color} 0px, ${color} 8px, transparent 8px, transparent 14px)`,
        opacity,
        zIndex: 30,
      }}
    />
  );
}

// ── Labeled multi-dot connectors (reusable for all pipeline nodes) ──
// Dots start below the icon+title area. Labels only on right (output) side.
function MultiDotConnectors({
  paths,
  side,
}: {
  paths: VoteConsensusPath[];
  side: 'left' | 'right';
}) {
  const totalDots = paths.length;
  const dotSpacing = totalDots > 1 ? 60 : 0;
  const startY = totalDots > 1 ? 30 : 50;

  return (
    <>
      {paths.map((path, index) => {
        const yPosition = startY + (index * (dotSpacing / Math.max(1, totalDots - 1)));
        const tier = getTierColor(path.voteCount);
        const isLeft = side === 'left';

        return (
          <div
            key={`${side}-${path.voteCount}`}
            className="absolute"
            style={{ top: `${yPosition}px`, [isLeft ? 'left' : 'right']: 0 }}
          >
            {/* Dot */}
            <div
              className={`w-3.5 h-3.5 rounded-full border-2 ${tier.dot} ${isLeft ? '-translate-x-1/2' : 'translate-x-1/2'}`}
            />
            {/* Label — only on output (right) side, positioned outside the node */}
            {!isLeft && (
              <span
                className={`absolute text-[9px] font-semibold ${tier.text} whitespace-nowrap select-none pointer-events-none`}
                style={{ top: '0px', left: '12px' }}
              >
                {tier.label}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

// n8n-Style Workflow Visualization Component
interface WorkflowVisualizationProps {
  pipelineData: any;
  mreVersions: any;
  strategyVersions: any;
  onStageClick: (stageKey: string) => void;
}

// Map strategy keys to strategy-versions.json keys
const STRATEGY_VERSION_KEY_MAP: Record<string, string> = {
  fear_greed: 'fear_greed',
  regime_confirmation: 'regime_confirm',
  rsi_oversold: 'rsi_oversold',
  mean_reversion: 'mean_reversion',
  momentum: 'momentum',
  time_series_momentum: 'time_series_momentum',
  qvm_factor: 'qvm_factor',
  vix_mean_reversion: 'vix_mean_reversion',
};

// Consensus confidence: compounding effect when multiple strategies agree
// Uses ensemble boosting: P(correct | N agree) = 1 - ∏(1 - p_i) for N independent signals
// Then scaled to show the additive effect clearly
const CONSENSUS_CONFIDENCE: Record<number, number> = {
  1: 35,   // Single strategy — could be noise
  2: 55,   // Two agree — meaningful signal
  3: 72,   // Three agree — strong convergence
  4: 83,   // Four agree — high confidence
  5: 90,   // Five agree — very high
  6: 94,   // Six agree — near certain
  7: 97,   // Seven agree — exceptional
  8: 99,   // Unanimous — maximum conviction
};

// Non-strategy node confidence levels (based on design maturity and validation)
const PIPELINE_NODE_CONFIDENCE: Record<string, number> = {
  input: 95,           // Data ingestion — well-tested, mature
  persistence: 70,     // New system, still accumulating data
  signalGating: 88,    // Bear/sell suppression — straightforward logic
  confidenceTuning: 75, // Multiple adjustment factors — moderate complexity
  finalFilters: 82,    // Cluster limits + crash mode — well-defined rules
  output: 95,          // Pass-through — minimal logic
  alphaRank: 72,       // New — Cross-sectional factor ranking (5 factors, sector-neutralized, regime-aware)
  fibonacciLevels: 60, // New — Fibonacci A/B/C retracement + extension system
  agentAnalysis: 65,   // 5 trading desk agents (Chris Vermeulen, Buffett, Schiff, Pal, Lynch)
};

function WorkflowVisualization({ pipelineData, mreVersions, strategyVersions, onStageClick }: WorkflowVisualizationProps) {
  const TRADING_DESK_AGENTS = [
    { emoji: '📊', name: 'Chris V.', color: '#F59E0B' },
    { emoji: '📈', name: 'Buffett', color: '#10B981' },
    { emoji: '🥇', name: 'Schiff', color: '#EAB308' },
    { emoji: '🌊', name: 'Pal', color: '#06B6D4' },
    { emoji: '📉', name: 'Lynch', color: '#8B5CF6' },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Build strategy confidence lookup from strategy-versions.json
  const getStrategyConfidence = (stratKey: string): number | undefined => {
    if (!strategyVersions?.strategies) return undefined;
    const versionKey = STRATEGY_VERSION_KEY_MAP[stratKey];
    if (!versionKey) return undefined;
    const strat = strategyVersions.strategies[versionKey];
    if (!strat?.versions?.[0]?.accuracy?.overall) return undefined;
    return Math.round(strat.versions[0].accuracy.overall);
  };
  
  // Store node positions for connection lines
  const [connections, setConnections] = useState<{ from: string; to: string; fromPos: { x: number; y: number }; toPos: { x: number; y: number } }[]>([]);
  const [scale, setScale] = useState(1);

  // Individual node connections with clean parallel routing
  // Fan-out: Input → each strategy node (8 lines from 1 point to 8 points)
  // Parallel: Each strategy node → corresponding consensus node (8 clean horizontal lines)
  // Fan-in: Consensus column → Persistence (single line from midpoint)
  // Sequential: Persistence → Gating → Tuning → Filters → Output
  const updateConnections = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    // getBoundingClientRect returns screen-space (post-transform) coords.
    // SVG lives inside the scaled container, so we must convert back to local space by dividing by scale.
    const s = scale || 1;
    const newConnections: (typeof connections[0] & { isActive?: boolean; isPending?: boolean })[] = [];
    
    const getRight = (node: HTMLDivElement) => {
      const r = node.getBoundingClientRect();
      return { x: (r.right - containerRect.left) / s, y: (r.top + r.height / 2 - containerRect.top) / s };
    };
    const getLeft = (node: HTMLDivElement) => {
      const r = node.getBoundingClientRect();
      return { x: (r.left - containerRect.left) / s, y: (r.top + r.height / 2 - containerRect.top) / s };
    };
    
    // Helper functions to get specific dot positions on multi-dot nodes
    const getLeftDot = (node: HTMLDivElement, dotIndex: number, totalDots: number) => {
      const r = node.getBoundingClientRect();
      const dotSpacing = totalDots > 1 ? 60 : 0;
      const startY = totalDots > 1 ? 30 : 50;
      const yPosition = startY + (dotIndex * (dotSpacing / Math.max(1, totalDots - 1)));
      return { 
        x: (r.left - containerRect.left) / s, 
        y: (r.top + yPosition - containerRect.top) / s 
      };
    };

    const getRightDot = (node: HTMLDivElement, dotIndex: number, totalDots: number) => {
      const r = node.getBoundingClientRect();
      const dotSpacing = totalDots > 1 ? 60 : 0;
      const startY = totalDots > 1 ? 30 : 50;
      const yPosition = startY + (dotIndex * (dotSpacing / Math.max(1, totalDots - 1)));
      return { 
        x: (r.right - containerRect.left) / s, 
        y: (r.top + yPosition - containerRect.top) / s 
      };
    };
    
    const strategyKeys = [
      'fear_greed', 'regime_confirmation', 'rsi_oversold', 'mean_reversion',
      'momentum', 'time_series_momentum', 'qvm_factor', 'vix_mean_reversion'
    ];
    const consensusKeys = ['8','7','6','5','4','3','2','1'];
    
    const inputNode = nodeRefs.current['input'];
    
    // 1. Fan-out: Input → each strategy node (8 curves from 1 point spreading to 8 points)
    if (inputNode) {
      const fromPos = getRight(inputNode);
      strategyKeys.forEach(stratKey => {
        const stratNode = nodeRefs.current[`strategy_${stratKey}`];
        if (stratNode) {
          const toPos = getLeft(stratNode);
          const sv = pipelineData.strategyVotes.find((s: any) => s.key === stratKey);
          newConnections.push({
            from: 'input', to: `strategy_${stratKey}`,
            fromPos, toPos,
            isActive: sv && sv.outputCount > 0,
            isPending: sv && (sv.pendingCount || 0) > 0
          });
        }
      });
    }
    
    // 2. Dynamic: Each strategy → consensus tiers where that strategy's tickers land
    //    Only draw lines from strategies with votes to consensus tiers with tickers
    //    A strategy connects to a tier if any ticker in that tier was voted by that strategy
    const strategyNameMap: Record<string, string> = {
      'fear_greed': 'fear_greed', 'regime_confirmation': 'regime_confirmation',
      'rsi_oversold': 'rsi_oversold', 'mean_reversion': 'mean_reversion',
      'momentum': 'momentum', 'time_series_momentum': 'time_series_momentum',
      'qvm_factor': 'qvm_factor', 'vix_mean_reversion': 'vix_mean_reversion'
    };
    
    strategyKeys.forEach(stratKey => {
      const sv = pipelineData.strategyVotes.find((s: any) => s.key === stratKey);
      if (!sv || sv.outputCount === 0) return; // Skip strategies with no votes
      
      const stratNode = nodeRefs.current[`strategy_${stratKey}`];
      if (!stratNode) return;
      
      // Find which consensus tiers contain tickers that this strategy voted for
      pipelineData.voteConsensusGate.paths.forEach((path: any) => {
        if (path.count === 0) return; // Skip empty tiers
        
        // Check if any ticker in this tier has a vote from this strategy
        const hasContribution = path.tickers.some((ticker: any) => {
          // Check confirmed votes
          if (ticker.strategy_votes?.[stratKey as keyof typeof ticker.strategy_votes] === true) return true;
          // Check persistence-pending votes
          if (ticker.persistence_by_strategy && (ticker.persistence_by_strategy[stratKey] || 0) > 0) return true;
          return false;
        });
        
        if (!hasContribution) return;
        
        const consNode = nodeRefs.current[`consensus_${path.voteCount}`];
        if (!consNode) return;
        
        newConnections.push({
          from: `strategy_${stratKey}`, to: `consensus_${path.voteCount}`,
          fromPos: getRight(stratNode), toPos: getLeft(consNode),
          isActive: sv.outputCount > 0,
          isPending: (sv.pendingCount || 0) > 0
        });
      });
    });
    
    // 3. Fan-out: Each non-empty consensus tier → corresponding per-consensus persistence gate
    pipelineData.voteConsensusGate.paths.forEach((path: any) => {
      const consNode = nodeRefs.current[`consensus_${path.voteCount}`];
      const persistNode = nodeRefs.current[`persistence_${path.voteCount}`];
      if (!consNode || !persistNode) return;
      
      const persistenceData = pipelineData.perConsensusPersistence[path.voteCount];
      if (!persistenceData) return;
      
      newConnections.push({
        from: `consensus_${path.voteCount}`, to: `persistence_${path.voteCount}`,
        fromPos: getRight(consNode), toPos: getLeft(persistNode),
        isActive: path.count > 0,
        isPending: persistenceData.pendingCount > 0,
        tierVoteCount: path.voteCount
      } as any);
    });
    
    // 4. Fan-out: Each per-consensus persistence gate → post-persistence consensus nodes
    pipelineData.postPersistenceConsensusPaths?.forEach((path: any) => {
      const persistNode = nodeRefs.current[`persistence_${path.voteCount}`];
      const postConsNode = nodeRefs.current[`post_consensus_${path.voteCount}`];
      if (!persistNode || !postConsNode) return;
      
      newConnections.push({
        from: `persistence_${path.voteCount}`, to: `post_consensus_${path.voteCount}`,
        fromPos: getRight(persistNode), toPos: getLeft(postConsNode),
        isActive: path.count > 0,
        isPending: false,
        tierVoteCount: path.voteCount
      } as any);
    });
    
    // 5. Post-persistence consensus nodes → Signal Gating tier cards (1-to-1 per tier)
    pipelineData.postPersistenceConsensusPaths?.forEach((path: any) => {
      const postConsNode = nodeRefs.current[`post_consensus_${path.voteCount}`];
      const sgTierNode = nodeRefs.current[`signalGating_tier_${path.voteCount}`];
      if (!postConsNode || !sgTierNode) return;
      
      const fromPos = getRight(postConsNode);
      const toPos = getLeft(sgTierNode);
      
      newConnections.push({
        from: `post_consensus_${path.voteCount}`, to: `signalGating_tier_${path.voteCount}`,
        fromPos, toPos,
        isActive: path.count > 0,
        isPending: false,
        tierVoteCount: path.voteCount
      } as any);
    });
    
    // 6. Sequential tier-to-tier connections: Each tier flows through all remaining nodes
    const seqKeys = ['signalGating', 'confidenceTuning', 'finalFilters', 'output', 'alphaRank', 'fibonacciLevels', 'agentAnalysis'];
    
    // Use allFlowTiers so every tier that entered the pipeline has connections across all columns
    const flowTiers = pipelineData.allFlowTiers || pipelineData.postGatingConsensusPaths || [];
    if (flowTiers.length > 0) {
      for (let i = 0; i < seqKeys.length - 1; i++) {
        const fromNodeKey = seqKeys[i];
        const toNodeKey = seqKeys[i + 1];
        
        flowTiers.forEach((path: VoteConsensusPath) => {
          
          const fromNode = nodeRefs.current[`${fromNodeKey}_tier_${path.voteCount}`];
          const toNode = nodeRefs.current[`${toNodeKey}_tier_${path.voteCount}`];
          
          if (fromNode && toNode) {
            // Use center-to-center connections like other single-dot connections
            const fromPos = getRight(fromNode);
            const toPos = getLeft(toNode);
            
            // Determine if this tier connection is active based on the tier having signals
            let isActive = path.count > 0;
            
            newConnections.push({
              from: `${fromNodeKey}_tier_${path.voteCount}`,
              to: `${toNodeKey}_tier_${path.voteCount}`,
              fromPos,
              toPos,
              isActive,
              tierVoteCount: path.voteCount, // Add tier info for styling
              isPending: false
            } as typeof newConnections[0] & { tierVoteCount?: number });
          }
        });
      }
    }
    
    // Deduplicate connections — keep the first (most specific) connection for each from→to pair
    const seen = new Set<string>();
    const dedupedConnections = newConnections.filter(c => {
      const key = `${c.from}→${c.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    setConnections(dedupedConnections);
  }, [pipelineData, scale]);

  useEffect(() => {
    // Run immediately
    updateConnections();
    
    // Re-run after successive frames to catch nodes laid out progressively.
    // Persistence Gate + Confirmed Signals columns render after vote consensus,
    // so their refs may not be in DOM on the first paint.
    const raf1 = requestAnimationFrame(() => {
      updateConnections();
      requestAnimationFrame(() => updateConnections());
    });
    const t1 = setTimeout(() => updateConnections(), 150);
    const t2 = setTimeout(() => updateConnections(), 400);
    const t3 = setTimeout(() => updateConnections(), 800);
    
    // Update connections on resize
    const resizeObserver = new ResizeObserver(updateConnections);
    // Also observe child additions (new cards appearing)
    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(() => updateConnections());
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      mutationObserver.observe(containerRef.current, { childList: true, subtree: true });
    }
    
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      cancelAnimationFrame(raf1);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [updateConnections, pipelineData]);

  // Create bezier curve path
  const createBezierPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = Math.abs(to.y - from.y);
    // Use tighter control points when nodes are at similar Y to prevent visual crossing
    const controlPointOffset = dy < 50 ? Math.min(dx * 0.3, 80) : Math.min(dx * 0.4, 150);
    
    // Add a slight arc for nearly-flat connections so they remain visible
    const arcBump = dy < 8 ? -12 : 0;
    
    return `M ${from.x} ${from.y} C ${from.x + controlPointOffset} ${from.y + arcBump} ${to.x - controlPointOffset} ${to.y + arcBump} ${to.x} ${to.y}`;
  };

  const pipelineVersion = pipelineData?.input?.passed?.[0]?.meta?.version || '3.1.0';

  return (
    <div 
      className="bg-slate-900/80 rounded-xl border border-slate-700/50 p-4 md:p-8 relative overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Desktop zoom controls — hidden on mobile (pinch-to-zoom there instead) */}
      <div className="hidden lg:flex items-center gap-1.5 absolute top-3 right-3 z-30">
        <button
          onClick={() => setScale((s) => Math.max(0.4, +(s - 0.1).toFixed(1)))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
          style={{ backgroundColor: "#1A1A24", border: "1px solid #2A2A38", color: "#8B8B80" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#D4A020"; e.currentTarget.style.color = "#D4A020"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A38"; e.currentTarget.style.color = "#8B8B80"; }}
          title="Zoom out"
        >
          −
        </button>
        <span className="text-[10px] font-mono w-10 text-center" style={{ color: "#626259" }}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(1)))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
          style={{ backgroundColor: "#1A1A24", border: "1px solid #2A2A38", color: "#8B8B80" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#D4A020"; e.currentTarget.style.color = "#D4A020"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A38"; e.currentTarget.style.color = "#8B8B80"; }}
          title="Zoom in"
        >
          +
        </button>
        {scale !== 1 && (
          <button
            onClick={() => setScale(1)}
            className="ml-1 px-2 h-8 rounded-lg flex items-center justify-center text-[10px] font-medium transition-all"
            style={{ backgroundColor: "#1A1A24", border: "1px solid #2A2A38", color: "#8B8B80" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#D4A020"; e.currentTarget.style.color = "#D4A020"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A38"; e.currentTarget.style.color = "#8B8B80"; }}
            title="Reset zoom"
          >
            Reset
          </button>
        )}
      </div>
    <div 
      className="relative"
      onTouchStart={(e) => {
        const touch = e.touches[0];
        const container = containerRef.current;
        if (!container) return;
        (container as any)._touchStartX = touch.clientX;
        (container as any)._touchStartY = touch.clientY;
        (container as any)._scrollStartX = container.parentElement?.scrollLeft || 0;
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          (container as any)._pinchStartDist = Math.sqrt(dx * dx + dy * dy);
          (container as any)._pinchStartScale = scale;
        }
      }}
      onTouchMove={(e) => {
        const container = containerRef.current;
        if (!container) return;
        if (e.touches.length === 2) {
          // Pinch to zoom
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const startDist = (container as any)._pinchStartDist || dist;
          const startScale = (container as any)._pinchStartScale || 1;
          const newScale = Math.min(2, Math.max(0.4, startScale * (dist / startDist)));
          setScale(newScale);
          e.preventDefault();
        } else if (e.touches.length === 1) {
          // Swipe to pan
          const wrapper = container.parentElement;
          if (!wrapper) return;
          const touch = e.touches[0];
          const startX = (container as any)._touchStartX || touch.clientX;
          const scrollStartX = (container as any)._scrollStartX || 0;
          wrapper.scrollLeft = scrollStartX - (touch.clientX - startX);
        }
      }}
    >
      <div 
        className="overflow-x-auto overflow-y-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
      <div 
        ref={containerRef} 
        className="relative min-h-[500px]"
        style={{ 
          background: 'radial-gradient(circle at 20% 80%, rgba(15, 118, 110, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: scale < 1 ? `${100 / scale}%` : 'max-content',
          minWidth: '2000px',
        }}
      >
        {/* Workflow Nodes */}
        <div className="relative z-[5] flex flex-row items-start gap-24 p-6">
          
          {/* Column 1: Universe Input */}
          <div className="flex flex-col items-center gap-6">
            <WorkflowNode
              ref={(el) => { nodeRefs.current['input'] = el; }}
              name="Universe Input" 
              description={`${pipelineData.input.inputCount.toLocaleString()} tickers`}
              inputCount={0}
              outputCount={pipelineData.input.outputCount}
              onClick={() => onStageClick('input')}
              nodeType="input"
              version={mreVersions?.signals || '2.0.0'}
              confidence={PIPELINE_NODE_CONFIDENCE.input}
              refreshFrequency="Daily batch"
            />
          </div>
          
          {/* Column 2: Strategy Votes (Responsive Grid) */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Strategy Votes</div>
            <div className="flex flex-col gap-3">
              {pipelineData.strategyVotes.map((sv: any, index: number) => {
                const confirmed = sv.confirmedCount || 0;
                const pending = sv.pendingCount || 0;
                const description = sv.key === 'fear_greed' ? 'Per-sector blended F&G' : 'Strategic signal detection';
                
                return (
                  <WorkflowNode
                    key={sv.key}
                    ref={(el) => { nodeRefs.current[`strategy_${sv.key}`] = el; }}
                    name={sv.name}
                    description={description}
                    inputCount={sv.inputCount}
                    outputCount={sv.outputCount}
                    confirmedCount={confirmed}
                    pendingCount={pending}
                    onClick={() => onStageClick(`strategy_${sv.key}`)}
                    nodeType="strategy"
                    isPending={pending > 0}
                    className="max-w-[160px] min-h-[80px]"
                    style={{ padding: '8px', minHeight: '80px' }}
                    confidence={getStrategyConfidence(sv.key)}
                    refreshFrequency="Daily batch"
                  />
                );
              })}
            </div>
          </div>
          
          {/* Column 3: Vote Consensus Gate (Dynamic - only show nodes with tickers) */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Vote Consensus</div>
            <div className="flex flex-col gap-2">
              {pipelineData.voteConsensusGate.paths.map((path: any) => {
                const conf = CONSENSUS_CONFIDENCE[path.voteCount] || 35;
                const prevConf = path.voteCount > 1 ? (CONSENSUS_CONFIDENCE[path.voteCount - 1] || 35) : 0;
                const boost = path.voteCount > 1 ? conf - prevConf : 0;
                return (
                  <WorkflowNode
                    key={path.voteCount}
                    ref={(el) => { nodeRefs.current[`consensus_${path.voteCount}`] = el; }}
                    name={`${path.voteCount} of 8`}
                    description={`${path.count} tickers${boost > 0 ? ` · +${boost}% boost` : ''}`}
                    inputCount={0}
                    outputCount={path.count}
                    onClick={() => onStageClick(`vote_consensus_${path.voteCount}`)}
                    nodeType="consensus"
                    className="max-w-[140px]"
                    confidence={conf}
                    refreshFrequency="Daily batch"
                  />
                );
              })}
              {pipelineData.voteConsensusGate.paths.length === 0 && (
                <div className="text-xs text-slate-500 italic p-4">No tickers with votes</div>
              )}
            </div>
          </div>
          
          {/* Column 4: Per-Consensus Persistence Gates — Separate persistence tracking for each vote level */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Persistence Gates</div>
            <div className="flex flex-col gap-2">
              {Object.entries(pipelineData.perConsensusPersistence).map(([voteCount, persistenceData]) => {
                const voteNum = parseInt(voteCount);
                const data = persistenceData as {
                  inputCount: number;
                  outputCount: number;
                  pendingCount: number;
                  passed: MRESignal[];
                  pending: MRESignal[];
                  filtered: MRESignal[];
                };
                return (
                  <div key={voteCount} ref={(el) => { nodeRefs.current[`persistence_${voteCount}`] = el; }}>
                    <PersistenceFlipFlop
                      inputCount={data.inputCount}
                      confirmedCount={data.outputCount}
                      pendingCount={data.pendingCount}
                      filteredCount={Math.max(0, data.inputCount - data.outputCount - data.pendingCount)}
                      onClick={() => onStageClick(`persistenceGate_${voteCount}`)}
                      version="4.0.0"
                      confidence={PIPELINE_NODE_CONFIDENCE.persistence}
                      refreshFrequency="Daily batch"
                    />
                  </div>
                );
              })}
              {Object.keys(pipelineData.perConsensusPersistence).length === 0 && (
                <div className="text-xs text-slate-500 italic p-4">No signals to persist</div>
              )}
            </div>
          </div>
          
          {/* Column 5: Post-Persistence Consensus — Confirmed signals by vote level */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Confirmed Signals</div>
            <div className="flex flex-col gap-2">
              {pipelineData.postPersistenceConsensusPaths?.map((path: any) => {
                const conf = CONSENSUS_CONFIDENCE[path.voteCount] || 35;
                const persistenceData = pipelineData.perConsensusPersistence?.[path.voteCount];
                const persistenceInput = persistenceData?.inputCount ?? path.count;
                return (
                  <WorkflowNode
                    key={path.voteCount}
                    ref={(el) => { nodeRefs.current[`post_consensus_${path.voteCount}`] = el; }}
                    name={`${path.voteCount} of 8`}
                    description={`${path.count} confirmed`}
                    inputCount={persistenceInput}
                    outputCount={path.count}
                    onClick={() => onStageClick(`post_consensus_${path.voteCount}`)}
                    nodeType="consensus"
                    className="max-w-[140px] border-emerald-500/40"
                    confidence={conf}
                    refreshFrequency="Daily batch"
                  />
                );
              })}
              {!pipelineData.postPersistenceConsensusPaths || pipelineData.postPersistenceConsensusPaths.length === 0 && (
                <div className="text-xs text-slate-500 italic p-4">No confirmed signals yet</div>
              )}
            </div>
          </div>

          {/* Column 6: Signal Gating - Per-Tier Cards (uses allFlowTiers for full connectivity) */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Signal Gating</div>
            <div className="flex flex-col gap-2">
              {pipelineData.allFlowTiers?.map((path: any) => {
                const inputPath = pipelineData.postPersistenceConsensusPaths?.find((p: VoteConsensusPath) => p.voteCount === path.voteCount);
                const inputCount = inputPath?.count || 0;
                const gatingPath = pipelineData.postGatingConsensusPaths?.find((p: VoteConsensusPath) => p.voteCount === path.voteCount);
                const outputCount = gatingPath?.count || 0;
                
                return (
                  <div key={`sg-wrap-${path.voteCount}`} className="relative">
                    <WorkflowNode
                      ref={(el) => { nodeRefs.current[`signalGating_tier_${path.voteCount}`] = el; }}
                      name={`${path.voteCount}/8`}
                      description={`${inputCount} → ${outputCount}`}
                      inputCount={inputCount}
                      outputCount={outputCount}
                      onClick={() => onStageClick('signalGating_tier_' + path.voteCount)}
                      nodeType="filter"
                      className={`max-w-[140px] border-2 ${path.voteCount >= 3 ? 'border-emerald-500/40' : path.voteCount >= 2 ? 'border-blue-400/40' : 'border-slate-500/40'}`}
                      style={{ padding: '8px', minHeight: '80px' }}
                      confidence={PIPELINE_NODE_CONFIDENCE.signalGating}
                      refreshFrequency="Daily batch"
                    />
                    
                  </div>
                );
              })}
              {(!pipelineData.allFlowTiers || pipelineData.allFlowTiers.length === 0) && (
                <div className="text-xs text-slate-500 italic p-4">No gated signals</div>
              )}
            </div>
          </div>
          
          {/* Column 7: Confidence Tuning - Per-Tier Cards */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Confidence Tuning</div>
            <div className="flex flex-col gap-2">
              {pipelineData.allFlowTiers?.map((path: any) => {
                const tierData = pipelineData.confidenceTuning.perTierData?.[path.voteCount];
                const gatingPath = pipelineData.postGatingConsensusPaths?.find((p: VoteConsensusPath) => p.voteCount === path.voteCount);
                const inputCount = gatingPath?.count || 0;
                const outputCount = tierData?.output || 0;
                
                return (
                  <div key={`confidenceTuning-wrap-${path.voteCount}`} className="relative">
                      <WorkflowNode
                    key={path.voteCount}
                    ref={(el) => { nodeRefs.current[`confidenceTuning_tier_${path.voteCount}`] = el; }}
                    name={`${path.voteCount}/8`}
                    description={`${inputCount} → ${outputCount}`}
                    inputCount={inputCount}
                    outputCount={outputCount}
                    onClick={() => onStageClick('confidenceTuning_tier_' + path.voteCount)}
                    nodeType="modifier"
                    className={`max-w-[140px] border-2 ${path.voteCount >= 3 ? 'border-emerald-500/40' : path.voteCount >= 2 ? 'border-blue-400/40' : 'border-slate-500/40'}`}
                    style={{ padding: '8px', minHeight: '80px' }}
                    confidence={PIPELINE_NODE_CONFIDENCE.confidenceTuning}
                    refreshFrequency="Daily batch"
                  />
                      
                    </div>
                );
              })}
              {(!pipelineData.allFlowTiers || pipelineData.allFlowTiers.length === 0) && (
                <div className="text-xs text-slate-500 italic p-4">No signals to tune</div>
              )}
            </div>
          </div>
          
          {/* Column 8: Final Filters - Per-Tier Cards */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Final Filters</div>
            <div className="flex flex-col gap-2">
              {pipelineData.allFlowTiers?.map((path: any) => {
                const tierData = pipelineData.finalFilters.perTierData?.[path.voteCount];
                const confidenceTierData = pipelineData.confidenceTuning.perTierData?.[path.voteCount];
                const inputCount = confidenceTierData?.output || 0;
                const outputCount = tierData?.output || 0;
                
                return (
                  <div key={`finalFilters-wrap-${path.voteCount}`} className="relative">
                      <WorkflowNode
                    key={path.voteCount}
                    ref={(el) => { nodeRefs.current[`finalFilters_tier_${path.voteCount}`] = el; }}
                    name={`${path.voteCount}/8`}
                    description={`${inputCount} → ${outputCount}`}
                    inputCount={inputCount}
                    outputCount={outputCount}
                    onClick={() => onStageClick('finalFilters_tier_' + path.voteCount)}
                    nodeType="filter"
                    className={`max-w-[140px] border-2 ${path.voteCount >= 3 ? 'border-emerald-500/40' : path.voteCount >= 2 ? 'border-blue-400/40' : 'border-slate-500/40'}`}
                    style={{ padding: '8px', minHeight: '80px' }}
                    confidence={PIPELINE_NODE_CONFIDENCE.finalFilters}
                    refreshFrequency="Daily batch"
                  />
                      
                    </div>
                );
              })}
              {(!pipelineData.allFlowTiers || pipelineData.allFlowTiers.length === 0) && (
                <div className="text-xs text-slate-500 italic p-4">No signals to filter</div>
              )}
            </div>
          </div>
          
          {/* Column 9: BUY Signals - Per-Tier Cards */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">BUY Signals</div>
            <div className="flex flex-col gap-2">
              {pipelineData.allFlowTiers?.map((path: any) => {
                const tierData = pipelineData.output.perTierData?.[path.voteCount];
                const finalFiltersTierData = pipelineData.finalFilters.perTierData?.[path.voteCount];
                const inputCount = finalFiltersTierData?.output || 0;
                const outputCount = tierData?.output || 0;
                
                return (
                  <div key={`output-wrap-${path.voteCount}`} className="relative">
                      <WorkflowNode
                    key={path.voteCount}
                    ref={(el) => { nodeRefs.current[`output_tier_${path.voteCount}`] = el; }}
                    name={`${path.voteCount}/8`}
                    description={`${inputCount} → ${outputCount}`}
                    inputCount={inputCount}
                    outputCount={outputCount}
                    onClick={() => onStageClick('output_tier_' + path.voteCount)}
                    nodeType="output"
                    className={`max-w-[140px] border-2 ${path.voteCount >= 3 ? 'border-emerald-500/40' : path.voteCount >= 2 ? 'border-blue-400/40' : 'border-slate-500/40'}`}
                    style={{ padding: '8px', minHeight: '80px' }}
                    confidence={PIPELINE_NODE_CONFIDENCE.output}
                    refreshFrequency="Daily batch"
                  />
                      
                    </div>
                );
              })}
              {(!pipelineData.allFlowTiers || pipelineData.allFlowTiers.length === 0) && (
                <div className="text-xs text-slate-500 italic p-4">No BUY signals</div>
              )}
            </div>
          </div>
          
          {/* Column 10: Alpha Rank - Per-Tier Cards */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Alpha Rank</div>
            <div className="flex flex-col gap-2">
              {pipelineData.allFlowTiers?.map((path: any) => {
                const tierData = pipelineData.alphaRank.perTierData?.[path.voteCount];
                const outputTierData = pipelineData.output.perTierData?.[path.voteCount];
                const inputCount = outputTierData?.output || 0;
                const outputCount = tierData?.output || 0;
                const primeCount = tierData?.primeCount || 0;
                
                return (
                  <div key={`alphaRank-wrap-${path.voteCount}`} className="relative">
                      <WorkflowNode
                    key={path.voteCount}
                    ref={(el) => { nodeRefs.current[`alphaRank_tier_${path.voteCount}`] = el; }}
                    name={`${path.voteCount}/8`}
                    description={primeCount > 0 ? `${inputCount} ranked · ${primeCount} ⭐` : `${inputCount} ranked`}
                    inputCount={inputCount}
                    outputCount={outputCount}
                    onClick={() => onStageClick('alphaRank_tier_' + path.voteCount)}
                    nodeType="modifier"
                    className={`max-w-[140px] border-2 ${primeCount > 0 ? 'border-yellow-500/60' : path.voteCount >= 3 ? 'border-emerald-500/40' : path.voteCount >= 2 ? 'border-blue-400/40' : 'border-slate-500/40'}`}
                    style={{ padding: '8px', minHeight: '80px' }}
                    confidence={PIPELINE_NODE_CONFIDENCE.alphaRank}
                    refreshFrequency="Daily batch"
                  />
                      
                    </div>
                );
              })}
              {(!pipelineData.allFlowTiers || pipelineData.allFlowTiers.length === 0) && (
                <div className="text-xs text-slate-500 italic p-4">No ranked signals</div>
              )}
            </div>
          </div>

          {/* Column 11: Fibonacci Levels - Per-Tier Cards */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Fib Levels</div>
            <div className="flex flex-col gap-2">
              {pipelineData.allFlowTiers?.map((path: any) => {
                const tierData = pipelineData.fibonacciLevels.perTierData?.[path.voteCount];
                const outputTierData = pipelineData.output.perTierData?.[path.voteCount];
                const inputCount = outputTierData?.output || 0;
                const outputCount = tierData?.output || 0;
                
                return (
                  <div key={`fibonacciLevels-wrap-${path.voteCount}`} className="relative">
                      <WorkflowNode
                    key={path.voteCount}
                    ref={(el) => { nodeRefs.current[`fibonacciLevels_tier_${path.voteCount}`] = el; }}
                    name={`${path.voteCount}/8`}
                    description={`${inputCount} signals`}
                    inputCount={inputCount}
                    outputCount={outputCount}
                    onClick={() => onStageClick('fibonacciLevels_tier_' + path.voteCount)}
                    nodeType="modifier"
                    className={`max-w-[120px] border-2 ${path.voteCount >= 3 ? 'border-emerald-500/40' : path.voteCount >= 2 ? 'border-blue-400/40' : 'border-slate-500/40'}`}
                    style={{ padding: '6px', minHeight: '70px' }}
                    confidence={PIPELINE_NODE_CONFIDENCE.fibonacciLevels}
                    refreshFrequency="Daily batch"
                  />
                      
                    </div>
                );
              })}
              {(!pipelineData.allFlowTiers || pipelineData.allFlowTiers.length === 0) && (
                <div className="text-xs text-slate-500 italic p-4">No fib levels</div>
              )}
            </div>
          </div>

          {/* Column 11: Agent Analysis - Per-Tier Cards */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Agent Analysis</div>
            <div className="flex flex-col gap-2">
              {pipelineData.allFlowTiers?.map((path: any) => {
                const tierData = pipelineData.agentAnalysis.perTierData?.[path.voteCount];
                const fibTierData = pipelineData.fibonacciLevels.perTierData?.[path.voteCount];
                const inputCount = fibTierData?.output || 0;
                const outputCount = tierData?.output || 0;
                
                return (
                  <div key={`agentAnalysis-wrap-${path.voteCount}`} className="relative">
                      <WorkflowNode
                    key={path.voteCount}
                    ref={(el) => { nodeRefs.current[`agentAnalysis_tier_${path.voteCount}`] = el; }}
                    name={`${path.voteCount}/8`}
                    description={`${inputCount} signals`}
                    inputCount={inputCount}
                    outputCount={outputCount}
                    onClick={() => onStageClick('agentAnalysis_tier_' + path.voteCount)}
                    nodeType="output"
                    className={`max-w-[140px] border-2 ${path.voteCount >= 3 ? 'border-emerald-500/40' : path.voteCount >= 2 ? 'border-blue-400/40' : 'border-slate-500/40'}`}
                    style={{ padding: '6px', minHeight: '70px' }}
                    confidence={PIPELINE_NODE_CONFIDENCE.agentAnalysis}
                    refreshFrequency="On demand"
                    badges={TRADING_DESK_AGENTS.map(a => ({ emoji: a.emoji, label: a.name, color: a.color }))}
                  />
                    </div>
                );
              })}
              {(!pipelineData.allFlowTiers || pipelineData.allFlowTiers.length === 0) && (
                <div className="text-xs text-slate-500 italic p-4">No agent analysis</div>
              )}
            </div>
          </div>
        </div>

        {/* SVG Layer for Connections — rendered AFTER cards in DOM order to paint on top */}
        <svg 
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 20, overflow: 'visible' }}
        >
          <defs>
            {/* Brand: Forge Gold data flow — default connection */}
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D4A020" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#B8860B" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#D4A020" stopOpacity="0.3" />
            </linearGradient>
            {/* Brand: Active flow — Forge Gold full intensity */}
            <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D4A020" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#F4D03F" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#D4A020" stopOpacity="0.9" />
            </linearGradient>
            {/* Brand: Pending flow — Forge Gold muted */}
            <linearGradient id="pendingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D4A020" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#B8860B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#D4A020" stopOpacity="0.5" />
            </linearGradient>
            {/* Tier 3+: Emerald for high-confidence tiers */}
            <linearGradient id="tier3PlusGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="rgb(34, 197, 94)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="rgb(52, 211, 153)" stopOpacity="0.8" />
            </linearGradient>
            {/* Tier 2: Deep Indigo for mid tiers */}
            <linearGradient id="tier2Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#6366F1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.8" />
            </linearGradient>
            {/* Tier 1: Smoke for low tiers */}
            <linearGradient id="tier1Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B8B80" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#626259" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8B8B80" stopOpacity="0.5" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
          </defs>
          
          <style>{`
            @keyframes flowAnimation {
              0% { stroke-dashoffset: 24; }
              100% { stroke-dashoffset: 0; }
            }
            .flow-active {
              animation: flowAnimation 1s linear infinite;
            }
            .flow-pending {
              animation: flowAnimation 1.5s linear infinite;
            }
          `}</style>
          
          {connections.map((connection, index) => {
            const isActive = (connection as any).isActive;
            const isPending = (connection as any).isPending;
            const tierVoteCount = (connection as any).tierVoteCount;
            
            // Brand: ALL connections use Forge Gold palette — uniform appearance
            let strokeColor = "url(#connectionGradient)";
            let className = "";
            let opacity = "0.5";
            let strokeWidth = "2";
            
            // ALL connections: same Forge Gold color, same brightness
            if (isActive || isPending || tierVoteCount !== undefined) {
              strokeColor = "url(#activeGradient)";
              className = "flow-active";
              opacity = "1";
              strokeWidth = "2.5";
            }
            
            return (
              <path
                key={`${connection.from}-${connection.to}-${index}`}
                d={createBezierPath(connection.fromPos, connection.toPos)}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                filter={(isActive || isPending || tierVoteCount !== undefined) ? "url(#glow)" : undefined}
                opacity={opacity}
                strokeDasharray="8 6"
                className={className || "flow-active"}
              />
            );
          })}
        </svg>
      </div>
      </div>
      
      {/* Current State Summary */}
      <div className="mt-8 p-6 bg-slate-900/50 rounded-lg border border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">Current Pipeline State</h3>
        <div className="text-sm text-slate-400 space-y-2">
          <p>
            <strong>{pipelineData.input.inputCount.toLocaleString()}</strong> tickers entered → 
            <strong className="text-emerald-400 ml-1">{pipelineData.output.outputCount}</strong> BUY signals generated
          </p>
          {pipelineData.persistenceGate.pendingCount > 0 && (
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>
                <strong className="text-amber-400">{pipelineData.persistenceGate.pendingCount}</strong> signals pending day-2 confirmation
                {pipelineData.persistenceGate.outputCount === 0 && (
                  <span className="text-amber-300"> — first run of persistence system, signals will confirm tomorrow</span>
                )}
              </span>
            </p>
          )}
          <p>
            Fear & Greed at <strong>{pipelineData.input.passed?.[0]?.current_fg || 'N/A'}</strong> means strategic opportunities across sectors
          </p>
          {/* Strategy vote summary */}
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 mb-2">Strategy performance (raw votes before persistence):</p>
            <div className="flex flex-wrap gap-2">
              {pipelineData.strategyVotes.map((sv: any) => (
                <span key={sv.key} className={`px-2 py-1 rounded text-xs ${
                  sv.outputCount > 0 
                    ? 'bg-slate-800 text-slate-300' 
                    : 'bg-slate-900/50 text-slate-600'
                }`}>
                  {sv.name}: <strong className={sv.outputCount > 0 ? 'text-amber-400' : 'text-slate-500'}>{sv.outputCount}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default function SignalFlowTab() {
  const [coreData, setCoreData] = useState<MREData | null>(null);
  const [universeData, setUniverseData] = useState<MREData | null>(null);
  const [mreVersions, setMreVersions] = useState<any>(null);
  const [strategyVersions, setStrategyVersions] = useState<any>(null);
  const [selectedStage, setSelectedStage] = useState<StageDetails | null>(null);
  const [dataMode, setDataMode] = useState<'pipeline' | 'geopolitical' | 'portfolio'>('pipeline');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    searchQuery: '',
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch directly from public JSON files (the raw MRE signal data + versions)
        const [coreResponse, universeResponse, versionsResponse, stratVersionsResponse] = await Promise.allSettled([
          fetch('/data/trading/mre-signals.json'),
          fetch('/data/trading/mre-signals-universe.json'),
          fetch('/data/trading/mre-versions.json'),
          fetch('/data/trading/strategy-versions.json'),
        ]);
        
        if (coreResponse.status === 'fulfilled' && coreResponse.value.ok) {
          const coreJson = await coreResponse.value.json();
          setCoreData(coreJson);
        } else {
          console.log('Could not load core signals data');
        }
        
        if (universeResponse.status === 'fulfilled' && universeResponse.value.ok) {
          const universeJson = await universeResponse.value.json();
          setUniverseData(universeJson);
        } else {
          console.log('Could not load universe signals data');
        }
        
        if (versionsResponse.status === 'fulfilled' && versionsResponse.value.ok) {
          const versionsJson = await versionsResponse.value.json();
          setMreVersions(versionsJson);
        } else {
          console.log('Could not load MRE versions data');
        }
        
        if (stratVersionsResponse.status === 'fulfilled' && stratVersionsResponse.value.ok) {
          const stratJson = await stratVersionsResponse.value.json();
          setStrategyVersions(stratJson);
        }
      } catch (error) {
        console.error('Error loading signal data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Memoized pipeline data — always uses universe (merged with core)
  const pipelineData = useMemo(() => {
    if (dataMode === 'geopolitical') return null;
    const baseData = universeData || coreData;
    if (!baseData?.signals?.by_asset_class) return null;
    
    let signals = baseData.signals.by_asset_class;
    
    // Merge core 24 tickers if missing from universe file
    if (universeData && coreData?.signals?.by_asset_class) {
      const uniSymbols = new Set(signals.map((s: MRESignal) => s.symbol));
      const missingCore = coreData.signals.by_asset_class.filter(
        (s: MRESignal) => !uniSymbols.has(s.symbol)
      );
      if (missingCore.length > 0) {
        signals = [...signals, ...missingCore];
      }
    }
    
    return calculatePipelineStages(signals, 'universe');
  }, [coreData, universeData, dataMode]);

  const currentData = universeData || coreData;

  // Handler for stage clicks
  const handleStageClick = (stageKey: string) => {
    if (!pipelineData) return;
    
    // Handle individual strategy vote clicks
    if (stageKey.startsWith('strategy_')) {
      const stratKey = stageKey.replace('strategy_', '');
      const sv = pipelineData.strategyVotes.find(s => s.key === stratKey);
      if (!sv) return;
      
      setSelectedStage({
        name: `${sv.name} Strategy`,
        description: `Tickers where ${sv.name} voted BUY`,
        stageType: 'filter',
        inputCount: sv.inputCount,
        outputCount: sv.outputCount,
        filteredTickers: sv.filtered.map(t => ({
          symbol: t.symbol,
          reason: `${sv.name} did not vote BUY`,
          signal: t.signal,
          currentPrice: t.price,
          rawData: t
        })),
        passedTickers: sv.passed.map(t => ({
          symbol: t.symbol,
          signal: 'BUY' as const,
          currentPrice: t.price,
          rawData: t
        }))
      });
      return;
    }
    
    // Handle vote consensus path clicks
    if (stageKey.startsWith('vote_consensus_')) {
      const voteCount = parseInt(stageKey.replace('vote_consensus_', ''));
      const path = pipelineData.voteConsensusGate.paths.find(p => p.voteCount === voteCount);
      if (!path) return;
      
      // Filtered = all tickers from the gate that DON'T have this vote count
      const filteredFromThisLevel = pipelineData.voteConsensusGate.passed.filter(
        t => !path.tickers.includes(t)
      );
      
      setSelectedStage({
        name: `${path.name.replace('votes', 'Vote Consensus')}`,
        description: path.count > 0 
          ? `Tickers where exactly ${voteCount} of 8 strategies voted BUY`
          : `No tickers currently have exactly ${voteCount} of 8 strategies voting BUY`,
        stageType: 'filter',
        inputCount: pipelineData.voteConsensusGate.inputCount,
        outputCount: path.count,
        filteredTickers: filteredFromThisLevel.map(t => ({
          symbol: t.symbol,
          signal: t.signal,
          currentPrice: t.price,
          rawData: t
        })),
        passedTickers: path.tickers.map(t => ({
          symbol: t.symbol,
          signal: t.signal,
          currentPrice: t.price,
          rawData: t
        }))
      });
      return;
    }
    
    // Handle per-consensus persistence gate clicks
    if (stageKey.startsWith('persistenceGate_')) {
      const voteCount = stageKey.replace('persistenceGate_', '');
      const persistenceData = pipelineData.perConsensusPersistence[parseInt(voteCount)];
      if (!persistenceData) return;
      
      setSelectedStage({
        name: `${voteCount}-of-8 Persistence Gate`,
        description: `Multi-day confirmation for tickers with exactly ${voteCount} of 8 strategy votes. Signals must fire 2+ consecutive days before confirmation.`,
        stageType: 'filter',
        inputCount: persistenceData.inputCount,
        outputCount: persistenceData.outputCount,
        // Confirmed tickers (passed 2-day check)
        passedTickers: persistenceData.passed.map((t: any) => ({
          symbol: t.symbol,
          signal: t.signal,
          currentPrice: t.price,
          rawData: t
        })),
        // Pending tickers (day 1, waiting for day 2 confirmation)
        pendingTickers: persistenceData.pending.map((t: any) => {
          const pendingStrats = Object.entries(t.persistence_by_strategy || {})
            .filter(([, days]) => (days as number) > 0 && (days as number) < 2)
            .map(([strat, days]) => `${strat} (day ${days})`);
          return {
            symbol: t.symbol,
            reason: `Pending: ${pendingStrats.join(', ') || 'awaiting confirmation'}`,
            signal: t.signal,
            currentPrice: t.price,
            rawData: t
          };
        }),
        // Filtered tickers (had a signal but didn't confirm — currently empty on first run)
        filteredTickers: [],
      });
      return;
    }
    
    // Handle post-persistence consensus clicks
    if (stageKey.startsWith('post_consensus_')) {
      const voteCount = parseInt(stageKey.replace('post_consensus_', ''));
      const path = pipelineData.postPersistenceConsensusPaths?.find(p => p.voteCount === voteCount);
      if (!path) return;
      
      setSelectedStage({
        name: `${path.name} (Confirmed)`,
        description: `Tickers with exactly ${voteCount} of 8 strategy votes that have passed persistence confirmation`,
        stageType: 'output',
        inputCount: 0,
        outputCount: path.count,
        filteredTickers: [],
        passedTickers: path.tickers.map(t => ({
          symbol: t.symbol,
          signal: t.signal,
          currentPrice: t.price,
          rawData: t
        }))
      });
      return;
    }
    
    // Handle legacy persistence gate click (for backward compatibility)
    if (stageKey === 'persistenceGate') {
      const pg = pipelineData.persistenceGate;
      setSelectedStage({
        name: 'Signal Persistence Gate (Legacy)',
        description: `Combined view of all persistence gates. Total: ${pg.pendingCount} signals pending (day 1), ${pg.outputCount} confirmed.`,
        stageType: 'filter',
        inputCount: pg.inputCount,
        outputCount: pg.outputCount,
        passedTickers: pg.passed.map((t: any) => ({
          symbol: t.symbol,
          signal: t.signal,
          currentPrice: t.price,
          rawData: t
        })),
        pendingTickers: pg.pending.map((t: any) => {
          const pendingStrats = Object.entries(t.persistence_by_strategy || {})
            .filter(([, days]) => (days as number) > 0 && (days as number) < 2)
            .map(([strat, days]) => `${strat} (day ${days})`);
          return {
            symbol: t.symbol,
            reason: `Pending: ${pendingStrats.join(', ') || 'awaiting confirmation'}`,
            signal: t.signal,
            currentPrice: t.price,
            rawData: t
          };
        }),
        filteredTickers: [],
      });
      return;
    }

    // Handle per-tier clicks for sequential stages (signalGating, confidenceTuning, finalFilters, output, fibonacciLevels, agentAnalysis)
    // Handle Alpha Rank tier clicks with enriched data
    const alphaRankTierMatch = stageKey.match(/^alphaRank_tier_(\d+)$/);
    if (alphaRankTierMatch) {
      const voteCount = parseInt(alphaRankTierMatch[1]);
      const tierData = pipelineData.alphaRank.perTierData?.[voteCount];
      if (!tierData) return;
      
      const primeCount = tierData.primeCount || 0;
      const sortedTickers = [...tierData.tickers].sort((a: MRESignal, b: MRESignal) => 
        (b.alpha_rank_score || 0) - (a.alpha_rank_score || 0)
      );
      
      setSelectedStage({
        name: `Alpha Rank (${voteCount}/8)`,
        description: `Cross-sectional factor ranking for BUY signals with ${voteCount}/8 consensus. 5 factors: trend, momentum, mean reversion, vol compression, F&G divergence. Sector-neutralized, regime-aware.${primeCount > 0 ? ` ⭐ ${primeCount} Prime Trade${primeCount > 1 ? 's' : ''} (BUY + Top Decile)` : ''}`,
        stageType: 'modifier',
        inputCount: tierData.input,
        outputCount: tierData.output,
        filteredTickers: [],
        passedTickers: sortedTickers.map((t: MRESignal) => ({
          symbol: t.symbol,
          signal: t.signal,
          signalStrength: t.signal_strength,
          currentPrice: t.price,
          rawData: t
        }))
      });
      return;
    }

    // Special handling for Agent Analysis tier clicks — uses pre-computed agent approval data
    const agentTierMatch = stageKey.match(/^agentAnalysis_tier_(\d+)$/);
    if (agentTierMatch) {
      const voteCount = parseInt(agentTierMatch[1]);
      const stage = pipelineData!.agentAnalysis as any;
      const tierData = stage.perTierData?.[voteCount];
      if (!tierData) return;

      const agentApprovals = stage.signalAgentApprovals as Map<string, string[]>;
      const agentStyles = stage.agentStyles || [];

      setSelectedStage({
        name: `Agent Analysis (${voteCount}/8)`,
        description: 'Agent opinions on signals from this tier',
        stageType: 'output',
        inputCount: tierData.input,
        outputCount: tierData.output,
        filteredTickers: (tierData.filteredTickers || []).map((t: any) => {
          const approvals = agentApprovals?.get(t.symbol) || [];
          const missingAgents = agentStyles.filter((a: any) => !approvals.includes(a.id)).map((a: any) => a.name);
          return {
            symbol: t.symbol,
            reason: `Rejected by: ${missingAgents.join(', ')}`,
            signal: t.signal,
            currentPrice: t.price,
            rawData: { ...t, _agentApprovals: approvals, _agentStyles: agentStyles }
          };
        }),
        passedTickers: (tierData.tickers || []).map((t: any) => {
          const approvals = agentApprovals?.get(t.symbol) || [];
          return {
            symbol: t.symbol,
            signal: t.signal,
            signalStrength: t.signal_strength,
            currentPrice: t.price,
            rawData: { ...t, _agentApprovals: approvals, _agentStyles: agentStyles }
          };
        })
      });
      return;
    }

    const tierStageMatch = stageKey.match(/^(signalGating|confidenceTuning|finalFilters|output|alphaRank|fibonacciLevels)_tier_(\d+)$/);
    if (tierStageMatch) {
      const [, stageName, voteCountStr] = tierStageMatch;
      const voteCount = parseInt(voteCountStr);
      const stage = pipelineData![stageName as keyof typeof pipelineData] as any;
      if (!stage) return;
      
      // Get tier-specific data
      const tierData = stage.perTierData?.[voteCount];
      const tierLabel = `${voteCount}/8`;
      
      // Filter passed/filtered tickers to only this tier
      const tierFilter = (t: any) => {
        const tVotes = pipelineData.strategyVotes.filter((sv: any) => {
          if (t.strategy_votes?.[sv.key as keyof typeof t.strategy_votes] === true) return true;
          if (t.persistence_by_strategy && (t.persistence_by_strategy[sv.key] || 0) > 0) return true;
          return false;
        }).length;
        return tVotes === voteCount;
      };
      
      const tierPassed = (stage.passed || []).filter(tierFilter);
      const tierFiltered = (stage.filtered || []).filter(tierFilter);
      
      const stageNames: Record<string, string> = {
        signalGating: 'Signal Gating',
        confidenceTuning: 'Confidence Tuning',
        finalFilters: 'Final Filters',
        output: 'BUY Signals',
        alphaRank: 'Alpha Rank',
        fibonacciLevels: 'Fibonacci Levels',
      };
      const stageDescriptions: Record<string, string> = {
        signalGating: 'Bear & sell suppression for this consensus tier',
        confidenceTuning: 'Regime weight, role evaluation, rotation penalty for this tier',
        finalFilters: 'Cluster limit, asset confidence, crash mode for this tier',
        output: 'Final BUY signals from this consensus tier',
        alphaRank: 'Cross-sectional factor ranking — 5 factors (trend, momentum, mean reversion, vol compression, F&G divergence), sector-neutralized, regime-aware. ⭐ = Prime Trade (BUY + Top Decile)',
        fibonacciLevels: 'Fibonacci entry, stop loss, and profit target levels for this tier',
      };

      setSelectedStage({
        name: `${stageNames[stageName]} (${tierLabel})`,
        description: stageDescriptions[stageName],
        stageType: stageName === 'output' ? 'output' : stageName === 'confidenceTuning' ? 'modifier' : 'filter',
        inputCount: tierData?.input ?? tierPassed.length + tierFiltered.length,
        outputCount: tierData?.output ?? tierPassed.length,
        filteredTickers: tierFiltered.map((t: any) => ({
          symbol: t.symbol,
          reason: t.bear_suppressed ? `BUY suppressed (${t.regime} regime)` : t.cluster_limited ? 'Cluster limit' : 'Filtered',
          signal: t.signal,
          currentPrice: t.price,
          rawData: t
        })),
        passedTickers: tierPassed.map((t: any) => ({
          symbol: t.symbol,
          signal: t.signal,
          signalStrength: t.signal_strength,
          currentPrice: t.price,
          rawData: t
        }))
      });
      return;
    }
    
    const stageData = pipelineData![stageKey as keyof typeof pipelineData];
    if (!stageData || Array.isArray(stageData) || typeof stageData === 'object' && !('inputCount' in stageData)) return;
    
    // Create stage details for the panel
    let stageDetails: StageDetails;
    
    switch (stageKey) {
      case 'input':
        stageDetails = {
          name: 'Universe Input',
          description: `${pipelineData.input.inputCount.toLocaleString()} tickers entering the MRE pipeline`,
          stageType: 'input',
          inputCount: stageData.inputCount,
          outputCount: stageData.outputCount,
          filteredTickers: [],
          passedTickers: stageData.passed.slice(0, 50).map(t => ({
            symbol: t.symbol,
            signal: t.signal,
            currentPrice: t.price,
            rawData: t
          }))
        };
        break;
        
      case 'voteConsensusGate':
        stageDetails = {
          name: 'Vote Consensus Gate',
          description: 'Tickers classified by how many strategies voted BUY',
          stageType: 'filter',
          inputCount: stageData.inputCount,
          outputCount: stageData.outputCount,
          filteredTickers: stageData.filtered.slice(0, 50).map(t => ({
            symbol: t.symbol,
            reason: `No BUY votes from any strategy (F&G: ${Math.round(t.current_fg)})`,
            signal: t.signal,
            currentPrice: t.price,
            rawData: t
          })),
          passedTickers: stageData.passed.map(t => ({
            symbol: t.symbol,
            signal: t.signal,
            currentPrice: t.price,
            rawData: t
          }))
        };
        break;
        
      case 'signalGating':
        stageDetails = {
          name: 'Signal Gating (Combined)',
          description: 'Bear & sell suppression with per-tier breakdown. Shows how many signals from each consensus tier survived gating.',
          stageType: 'filter',
          inputCount: stageData.inputCount,
          outputCount: stageData.outputCount,
          filteredTickers: stageData.filtered.map(t => {
            const voteCount = pipelineData.strategyVotes.filter((sv: any) => {
              if (t.strategy_votes?.[sv.key as keyof typeof t.strategy_votes] === true) return true;
              if (t.persistence_by_strategy && (t.persistence_by_strategy[sv.key] || 0) > 0) return true;
              return false;
            }).length;
            
            return {
              symbol: t.symbol,
              reason: t.bear_suppressed 
                ? `BUY suppressed (${t.regime} regime, ${voteCount}/8 consensus)` 
                : `Sell signal suppressed to HOLD (${voteCount}/8 consensus)`,
              signal: t.signal,
              currentPrice: t.price,
              rawData: t
            };
          }),
          passedTickers: stageData.passed.map(t => {
            const voteCount = pipelineData.strategyVotes.filter((sv: any) => {
              if (t.strategy_votes?.[sv.key as keyof typeof t.strategy_votes] === true) return true;
              if (t.persistence_by_strategy && (t.persistence_by_strategy[sv.key] || 0) > 0) return true;
              return false;
            }).length;
            
            return {
              symbol: t.symbol,
              reason: `${voteCount}/8 consensus - passed gating`,
              signal: t.signal,
              currentPrice: t.price,
              rawData: t
            };
          })
        };
        break;
        
      case 'confidenceTuning':
        stageDetails = {
          name: 'Confidence Tuning',
          description: 'Regime weight, role evaluation, rotation, sideways penalty, Kalshi',
          stageType: 'modifier',
          inputCount: stageData.inputCount,
          outputCount: stageData.outputCount,
          filteredTickers: stageData.filtered.map(t => ({
            symbol: t.symbol,
            reason: 'Confidence adjusted to HOLD',
            signal: t.signal,
            currentPrice: t.price,
            rawData: t
          })),
          passedTickers: stageData.passed.map(t => ({
            symbol: t.symbol,
            signal: t.signal,
            signalStrength: t.signal_strength,
            currentPrice: t.price,
            adjustmentValue: ((t.regime_weight || 1) * t.rotation_modifier * t.asset_confidence) - 1,
            rawData: t
          }))
        };
        break;
        
      case 'finalFilters':
        stageDetails = {
          name: 'Final Filters',
          description: 'Cluster limit, asset confidence, crash mode, multiplier cap',
          stageType: 'filter',
          inputCount: stageData.inputCount,
          outputCount: stageData.outputCount,
          filteredTickers: stageData.filtered.map(t => ({
            symbol: t.symbol,
            reason: t.cluster_limited 
              ? 'Cluster limit (max 2 per sector/day)' 
              : t.cap_applied 
                ? 'Multiplier capped' 
                : 'Asset confidence or crash mode filter',
            signal: t.signal,
            currentPrice: t.price,
            rawData: t
          })),
          passedTickers: stageData.passed.map(t => ({
            symbol: t.symbol,
            signal: t.signal,
            signalStrength: t.signal_strength,
            currentPrice: t.price,
            rawData: t
          }))
        };
        break;
        
      case 'output':
        stageDetails = {
          name: 'Final BUY Signals',
          description: 'BUY signals with confidence scores, sorted by strength',
          stageType: 'output',
          inputCount: stageData.inputCount,
          outputCount: stageData.outputCount,
          filteredTickers: [],
          passedTickers: stageData.passed.map(t => ({
            symbol: t.symbol,
            signal: t.signal,
            signalStrength: t.signal_strength,
            currentPrice: t.price,
            rawData: t
          }))
        };
        break;

      case 'alphaRank':
        stageDetails = {
          name: 'Alpha Rank (All Tiers)',
          description: `Cross-sectional factor ranking — ${pipelineData.alphaRank.totalRanked} tickers ranked, ${pipelineData.alphaRank.topDecileCount} in top decile, ${pipelineData.alphaRank.primeTradeCount} Prime Trades (BUY + Top Decile). Factors: trend, momentum, mean reversion, vol compression, F&G divergence. Sector-neutralized, regime-aware.`,
          stageType: 'modifier',
          inputCount: pipelineData.alphaRank.inputCount,
          outputCount: pipelineData.alphaRank.outputCount,
          filteredTickers: [],
          passedTickers: [...pipelineData.alphaRank.passed].sort((a: any, b: any) => (b.alpha_rank_score || 0) - (a.alpha_rank_score || 0)).map((t: any) => ({
            symbol: t.symbol,
            signal: t.signal,
            signalStrength: t.signal_strength,
            currentPrice: t.price,
            rawData: t
          }))
        };
        break;

      case 'fibonacciLevels':
        stageDetails = {
          name: 'Fibonacci Level Selection',
          description: 'Determines optimal entry, stop loss, and profit target levels using A/B/C point Fibonacci retracement and extension. Point A = swing low, Point B = swing high, Point C = retracement. Entry at 0.618 retracement, stop loss at 0.786 retracement, profit target at 1.618 extension.',
          stageType: 'modifier',
          inputCount: pipelineData.fibonacciLevels.inputCount,
          outputCount: pipelineData.fibonacciLevels.outputCount,
          filteredTickers: [],
          passedTickers: pipelineData.fibonacciLevels.passed.map((t: any) => ({
            symbol: t.symbol,
            signal: t.signal,
            currentPrice: t.price,
            rawData: t
          }))
        };
        break;

      case 'agentAnalysis':
        stageDetails = {
          name: 'Agent Analysis',
          description: 'Five AI trading agents review final BUY signals from independent perspectives: Chris Vermeulen (Technical Analysis — chart patterns, cycles, momentum), Warren Buffett (Fundamental Analysis — value, moats, margin of safety), Peter Schiff (Macro/Austrian Economics — monetary policy, gold, inflation), Raoul Pal (Global Macro — liquidity cycles, crypto, exponential age), Peter Lynch (GARP — PEG ratios, stock categorization, two-minute drill).',
          stageType: 'output',
          inputCount: pipelineData.agentAnalysis.inputCount,
          outputCount: pipelineData.agentAnalysis.outputCount,
          filteredTickers: [],
          passedTickers: pipelineData.agentAnalysis.passed.map((t: any) => ({
            symbol: t.symbol,
            signal: t.signal,
            currentPrice: t.price,
            rawData: t
          }))
        };
        break;
        
      default:
        return;
    }
    
    setSelectedStage(stageDetails);
  };

  const handleModalClose = () => {
    setSelectedStage(null);
  };

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading signal pipeline...</p>
        </div>
      </div>
    );
  }

  if (dataMode === 'pipeline' && (!currentData || !pipelineData)) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center text-slate-400">
          <Activity className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p>No pipeline data available</p>
        </div>
      </div>
    );
  }

  const fgValue = Math.round(currentData?.fear_greed?.current || 0);
  const fgRating = currentData?.fear_greed?.rating || 'Unknown';
  const regimeValue = currentData?.regime?.global || 'Unknown';
  const summary = currentData?.signals?.summary;
  
  // Get pipeline version from signal data meta
  const pipelineVersion = currentData?.meta?.version || '3.1.0';

  return (
    <>
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary-400" />
            MRE Signal Pipeline
          </h2>
          
          {/* Data Mode Toggle */}
          <div className="bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
            <button
              onClick={() => setDataMode('pipeline')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                dataMode === 'pipeline'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Pipeline (690)
            </button>
            <button
              onClick={() => setDataMode('geopolitical')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                dataMode === 'geopolitical'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              ⚔️ Geopolitical
            </button>
            <button
              onClick={() => setDataMode('portfolio')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                dataMode === 'portfolio'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              📊 Portfolio
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search symbols..."
            value={filters.searchQuery}
            onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
            className="w-64 bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Geopolitical Mode — render dedicated tab */}
      {dataMode === 'geopolitical' && <GeopoliticalFlowTab />}

      {/* Portfolio Mode — workflow diagram filtered to portfolio tickers + position cards */}
      {dataMode === 'portfolio' && (
        <PortfolioExitFlow
          universeData={universeData}
          coreData={coreData}
        />
      )}

      {/* MRE Pipeline Mode (Core/Universe) */}
      {dataMode === 'pipeline' && <>
      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">BUY</span>
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {summary?.total_buy || 0}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Pause className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">HOLD</span>
          </div>
          <div className="text-xl font-bold text-amber-400">
            {summary?.total_hold || 0}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">SELL</span>
          </div>
          <div className="text-xl font-bold text-red-400">
            0
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">WATCH</span>
          </div>
          <div className="text-xl font-bold text-slate-400">
            {summary?.total_watch || 0}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-slate-400">Fear & Greed</span>
          </div>
          <div className="text-xl font-bold text-primary-400">
            {fgValue}
          </div>
          <div className="text-xs text-slate-500 capitalize">{fgRating}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-accent-400" />
            <span className="text-xs text-slate-400">Regime</span>
          </div>
          <div className="text-sm font-bold text-accent-400 capitalize">
            {regimeValue}
          </div>
        </div>
      </div>

      {/* Sector Fear & Greed Panel */}
      <SectorFearGreedPanel 
        sectorFearGreed={currentData?.sector_fear_greed}
        globalFearGreed={fgValue}
      />

      {/* Pipeline Visualization - n8n Style Workflow */}
      <WorkflowVisualization 
        pipelineData={pipelineData}
        mreVersions={mreVersions}
        strategyVersions={strategyVersions}
        onStageClick={handleStageClick}
      />

      {/* Detail Panel */}
      <PipelineDetailPanel
        stageDetails={selectedStage}
        onClose={handleModalClose}
      />
      </>}
    </>
  );
}