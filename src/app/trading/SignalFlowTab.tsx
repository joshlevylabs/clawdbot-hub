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
  const signalGatePassed = gatingInput.filter(s => 
    !s.bear_suppressed && !s.sell_suppressed
  );
  const signalGateFiltered = gatingInput.filter(s => 
    s.bear_suppressed || s.sell_suppressed
  );
  
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
  const confidencePassed = signalGatePassed.filter(s => s.signal !== 'HOLD');
  const confidenceFiltered = signalGatePassed.filter(s => s.signal === 'HOLD');
  
  const confidenceStage = {
    inputCount: signalGatePassed.length,
    outputCount: confidencePassed.length,
    passed: confidencePassed,
    filtered: confidenceFiltered
  };
  
  // Step 5: Final Filters (cluster limit, asset confidence, crash mode, multiplier cap)
  const finalPassed = confidencePassed.filter(s => s.signal === 'BUY');
  const finalFiltered = confidencePassed.filter(s => s.signal !== 'BUY');
  
  const finalStage = {
    inputCount: confidencePassed.length,
    outputCount: finalPassed.length,
    passed: finalPassed,
    filtered: finalFiltered
  };
  
  // Step 6: Output (only BUY signals)
  const outputStage = {
    inputCount: finalPassed.length,
    outputCount: finalPassed.length,
    passed: [...finalPassed].sort((a, b) => b.signal_strength - a.signal_strength),
    filtered: [] as MRESignal[]
  };
  
  // Step 7: Fibonacci Level Selection (post-output — determines entry, SL, TP)
  const fibonacciLevels = {
    inputCount: finalPassed.length,
    outputCount: finalPassed.length, // All signals get fib levels calculated
    passed: finalPassed,
    filtered: [] as MRESignal[],
    status: finalPassed.length > 0 ? 'active' : 'waiting',
  };

  // Step 8: Agent Analysis (final review by trading agents)
  const agentAnalysis = {
    inputCount: finalPassed.length,
    outputCount: finalPassed.length,
    passed: finalPassed,
    filtered: [] as MRESignal[],
    agents: [
      { name: 'Chris Vermeullen', role: 'Technical Analysis', status: finalPassed.length > 0 ? 'reviewing' : 'idle' },
      { name: 'Warren Buffett', role: 'Fundamental Analysis', status: 'pending' }, // Not yet active
    ],
  };

  return {
    input: inputStage,
    strategyVotes,
    voteConsensusGate,
    perConsensusPersistence,
    postPersistenceConsensusPaths,
    persistenceGate,
    signalGating: signalGateStage,
    postGatingConsensusPaths,
    confidenceTuning: confidenceStage,
    finalFilters: finalStage,
    output: outputStage,
    fibonacciLevels,
    agentAnalysis,
  };
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
  fibonacciLevels: 60, // New — Fibonacci A/B/C retracement + extension system
  agentAnalysis: 45,   // New — Agent opinions (Chris Vermeullen + Warren Buffett)
};

function WorkflowVisualization({ pipelineData, mreVersions, strategyVersions, onStageClick }: WorkflowVisualizationProps) {
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
    const newConnections: (typeof connections[0] & { isActive?: boolean; isPending?: boolean })[] = [];
    
    const getRight = (node: HTMLDivElement) => {
      const r = node.getBoundingClientRect();
      return { x: r.right - containerRect.left, y: r.top + r.height / 2 - containerRect.top };
    };
    const getLeft = (node: HTMLDivElement) => {
      const r = node.getBoundingClientRect();
      return { x: r.left - containerRect.left, y: r.top + r.height / 2 - containerRect.top };
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
        isPending: persistenceData.pendingCount > 0
      });
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
        isPending: false
      });
    });
    
    // 5. Fan-in: Post-persistence consensus nodes → Signal Gating
    const signalGatingNode = nodeRefs.current['signalGating'];
    if (signalGatingNode) {
      const toPos = getLeft(signalGatingNode);
      pipelineData.postPersistenceConsensusPaths?.forEach((path: any) => {
        const postConsNode = nodeRefs.current[`post_consensus_${path.voteCount}`];
        if (!postConsNode) return;
        
        newConnections.push({
          from: `post_consensus_${path.voteCount}`, to: 'signalGating',
          fromPos: getRight(postConsNode), toPos,
          isActive: path.count > 0,
          isPending: false
        });
      });
    }
    
    // 6. Sequential: Gating → Actionable Signals → Tuning → Filters → Output → Fibonacci → Agents
    const seqKeys = ['signalGating', 'actionableSignals', 'confidenceTuning', 'finalFilters', 'output', 'fibonacciLevels', 'agentAnalysis'];
    for (let i = 0; i < seqKeys.length - 1; i++) {
      const fromNode = nodeRefs.current[seqKeys[i]];
      const toNode = nodeRefs.current[seqKeys[i + 1]];
      if (fromNode && toNode) {
        let isActive = false;
        if (seqKeys[i] === 'signalGating') isActive = pipelineData.signalGating.outputCount > 0;
        else if (seqKeys[i] === 'actionableSignals') isActive = pipelineData.signalGating.outputCount > 0;
        else if (seqKeys[i] === 'confidenceTuning') isActive = pipelineData.confidenceTuning.outputCount > 0;
        else if (seqKeys[i] === 'finalFilters') isActive = pipelineData.finalFilters.outputCount > 0;
        else if (seqKeys[i] === 'output') isActive = pipelineData.output.outputCount > 0;
        else if (seqKeys[i] === 'fibonacciLevels') isActive = pipelineData.fibonacciLevels.outputCount > 0;
        
        newConnections.push({
          from: seqKeys[i], to: seqKeys[i + 1],
          fromPos: getRight(fromNode), toPos: getLeft(toNode),
          isActive
        });
      }
    }
    
    setConnections(newConnections);
  }, [pipelineData]);

  useEffect(() => {
    updateConnections();
    
    // Update connections on resize
    const resizeObserver = new ResizeObserver(updateConnections);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, [updateConnections, pipelineData]);

  // Create bezier curve path
  const createBezierPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const controlPointOffset = Math.min(dx * 0.4, 150);
    
    return `M ${from.x} ${from.y} C ${from.x + controlPointOffset} ${from.y} ${to.x - controlPointOffset} ${to.y} ${to.x} ${to.y}`;
  };

  const pipelineVersion = pipelineData?.input?.passed?.[0]?.meta?.version || '3.1.0';

  return (
    <div 
      className="bg-slate-900/80 rounded-xl border border-slate-700/50 p-4 md:p-8 relative overflow-hidden"
      style={{ touchAction: 'none' }}
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
        className="relative min-w-[2000px] min-h-[500px]"
        style={{ 
          background: 'radial-gradient(circle at 20% 80%, rgba(15, 118, 110, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: scale < 1 ? `${100 / scale}%` : undefined,
        }}
      >
        {/* SVG Layer for Connections */}
        <svg 
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <defs>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(148, 163, 184)" stopOpacity="0.6" />
              <stop offset="50%" stopColor="rgb(59, 130, 246)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="rgb(148, 163, 184)" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="rgb(34, 197, 94)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="pendingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(251, 191, 36)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="rgb(245, 158, 11)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="rgb(251, 191, 36)" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
          </defs>
          
          <style>{`
            @keyframes flowAnimation {
              0% { stroke-dashoffset: 20; }
              100% { stroke-dashoffset: 0; }
            }
            .flow-active {
              animation: flowAnimation 1.5s linear infinite;
            }
            .flow-pending {
              animation: flowAnimation 2s linear infinite;
            }
          `}</style>
          
          {connections.map((connection, index) => {
            const isActive = (connection as any).isActive;
            const isPending = (connection as any).isPending;
            
            let strokeColor = "url(#connectionGradient)";
            let className = "";
            let opacity = "0.4";
            
            if (isActive) {
              strokeColor = "url(#activeGradient)";
              className = "flow-active";
              opacity = "0.8";
            } else if (isPending) {
              strokeColor = "url(#pendingGradient)";
              className = "flow-pending";
              opacity = "0.7";
            }
            
            return (
              <path
                key={`${connection.from}-${connection.to}-${index}`}
                d={createBezierPath(connection.fromPos, connection.toPos)}
                stroke={strokeColor}
                strokeWidth={isActive || isPending ? "2.5" : "1.5"}
                fill="none"
                filter={isActive || isPending ? "url(#glow)" : undefined}
                opacity={opacity}
                strokeDasharray={isActive || isPending ? "8 6" : "4 4"}
                className={className}
              />
            );
          })}
        </svg>
        
        {/* Workflow Nodes */}
        <div className="relative z-10 flex flex-row items-start gap-24 p-6">
          
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
                  />
                );
              })}
            </div>
          </div>
          
          {/* Column 3: Vote Consensus Gate (Dynamic - only show nodes with tickers) */}
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-semibold text-slate-400 text-center mb-2">Vote Consensus</div>
            <div className="flex flex-col gap-2">
              {pipelineData.voteConsensusGate.paths.slice().reverse().map((path: any) => {
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
              {Object.entries(pipelineData.perConsensusPersistence).slice().reverse().map(([voteCount, persistenceData]) => {
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
              {pipelineData.postPersistenceConsensusPaths?.slice().reverse().map((path: any) => {
                const conf = CONSENSUS_CONFIDENCE[path.voteCount] || 35;
                return (
                  <WorkflowNode
                    key={path.voteCount}
                    ref={(el) => { nodeRefs.current[`post_consensus_${path.voteCount}`] = el; }}
                    name={`${path.voteCount} of 8`}
                    description={`${path.count} confirmed`}
                    inputCount={0}
                    outputCount={path.count}
                    onClick={() => onStageClick(`post_consensus_${path.voteCount}`)}
                    nodeType="consensus"
                    className="max-w-[140px] border-emerald-500/40"
                    confidence={conf}
                  />
                );
              })}
              {!pipelineData.postPersistenceConsensusPaths || pipelineData.postPersistenceConsensusPaths.length === 0 && (
                <div className="text-xs text-slate-500 italic p-4">No confirmed signals yet</div>
              )}
            </div>
          </div>

          {/* Column 6: Signal Gating */}
          <div className="flex flex-col items-center gap-6">
            <WorkflowNode
              ref={(el) => { nodeRefs.current['signalGating'] = el; }}
              name="Signal Gating"
              description={pipelineData.signalGating.persistenceBypass 
                ? "Persistence bypass — all raw votes" 
                : "Bear & sell suppression"}
              inputCount={pipelineData.signalGating.inputCount}
              outputCount={pipelineData.signalGating.outputCount}
              onClick={() => onStageClick('signalGating')}
              nodeType="filter"
              version={mreVersions?.signals || '2.0.0'}
              bypassLabel={pipelineData.signalGating.persistenceBypass 
                ? "No confirmed signals — using raw votes" 
                : undefined}
              confidence={PIPELINE_NODE_CONFIDENCE.signalGating}
            />
          </div>

          {/* Column 6.5: Actionable Signals */}
          <div className="flex flex-col items-center gap-6">
            <div
              ref={(el) => { nodeRefs.current['actionableSignals'] = el; }}
              className={`
                relative bg-slate-800/90 rounded-xl border-2 p-4 cursor-pointer
                transition-all duration-200 hover:shadow-lg hover:shadow-black/20
                min-w-[140px] md:min-w-[160px] max-w-[180px] md:max-w-[200px]
                ${pipelineData.signalGating.outputCount > 0 
                  ? 'border-emerald-500/40 hover:border-emerald-400/60' 
                  : 'border-slate-600/40 hover:border-slate-500/60'}
              `}
              onClick={() => onStageClick('actionableSignals')}
              style={{ minHeight: `${Math.max(120, 60 + (pipelineData.postGatingConsensusPaths?.length || 0) * 32)}px` }}
            >
              {/* Input connector dot */}
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-600 border-2 border-slate-700 rounded-full" />
              {/* Output connector dot */}
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-600 border-2 border-slate-700 rounded-full" />
              
              {/* Icon */}
              <div className="bg-emerald-500/20 rounded-lg p-2 w-fit mb-3">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              
              <h3 className="text-sm font-bold text-slate-200 mb-1 leading-tight">📊 Actionable Signals</h3>
              <p className="text-xs text-slate-400 mb-3 leading-tight">Breakdown by consensus tier</p>
              
              {/* Dynamic consensus tier rows */}
              <div className="space-y-1 mb-3">
                {pipelineData.postGatingConsensusPaths?.length > 0 ? (
                  pipelineData.postGatingConsensusPaths
                    .slice()
                    .sort((a: VoteConsensusPath, b: VoteConsensusPath) => b.voteCount - a.voteCount)
                    .map((path: VoteConsensusPath) => {
                      const getIconAndStyle = (voteCount: number) => {
                        if (voteCount >= 4) return { icon: '🔥', color: 'text-emerald-400', weight: 'font-bold' };
                        if (voteCount >= 3) return { icon: '🔥', color: 'text-emerald-400', weight: 'font-bold' };
                        if (voteCount >= 2) return { icon: '⚡', color: 'text-blue-400', weight: 'font-medium' };
                        return { icon: '', color: 'text-slate-400', weight: 'font-normal' };
                      };
                      
                      const { icon, color, weight } = getIconAndStyle(path.voteCount);
                      
                      return (
                        <div key={path.voteCount} className="flex justify-between text-xs">
                          <span className={`${color} ${weight}`}>
                            {path.voteCount}/8 → {path.count} signals {icon}
                          </span>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-xs text-slate-500 italic">No signals passed gating</div>
                )}
              </div>

              {/* Total at bottom */}
              <div className="border-t border-slate-700/50 pt-2 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total:</span>
                  <span className={`font-bold ${pipelineData.signalGating.outputCount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {pipelineData.signalGating.outputCount} passed
                  </span>
                </div>
              </div>

              {/* Confidence badge using highest tier's consensus confidence */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-block bg-slate-700/50 text-slate-500 px-2 py-0.5 rounded text-[9px] font-medium">v3.1.0</span>
                <span className="inline-block bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-medium">
                  {pipelineData.postGatingConsensusPaths?.length > 0 
                    ? `${CONSENSUS_CONFIDENCE[Math.max(...pipelineData.postGatingConsensusPaths.map((p: VoteConsensusPath) => p.voteCount))] || 35}% conf`
                    : '35% conf'
                  }
                </span>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>
          
          {/* Column 7: Confidence Tuning */}
          <div className="flex flex-col items-center gap-6">
            <WorkflowNode
              ref={(el) => { nodeRefs.current['confidenceTuning'] = el; }}
              name="Confidence Tuning"
              description="Regime, role, rotation adjustments"
              inputCount={pipelineData.confidenceTuning.inputCount}
              outputCount={pipelineData.confidenceTuning.outputCount}
              onClick={() => onStageClick('confidenceTuning')}
              nodeType="modifier"
              version={mreVersions?.pit || '1.1.0'}
              confidence={PIPELINE_NODE_CONFIDENCE.confidenceTuning}
            />
          </div>
          
          {/* Column 8: Final Filters */}
          <div className="flex flex-col items-center gap-6">
            <WorkflowNode
              ref={(el) => { nodeRefs.current['finalFilters'] = el; }}
              name="Final Filters"
              description="Cluster, confidence, caps"
              inputCount={pipelineData.finalFilters.inputCount}
              outputCount={pipelineData.finalFilters.outputCount}
              onClick={() => onStageClick('finalFilters')}
              nodeType="filter"
              version={mreVersions?.config || '2.0.0'}
              confidence={PIPELINE_NODE_CONFIDENCE.finalFilters}
            />
          </div>
          
          {/* Column 9: BUY Signals Output */}
          <div className="flex flex-col items-center gap-6">
            <WorkflowNode
              ref={(el) => { nodeRefs.current['output'] = el; }}
              name="BUY Signals"
              description="Final confirmed signals"
              inputCount={pipelineData.output.inputCount}
              outputCount={pipelineData.output.outputCount}
              onClick={() => onStageClick('output')}
              nodeType="filter"
              version={pipelineVersion}
              confidence={PIPELINE_NODE_CONFIDENCE.output}
            />
          </div>
          
          {/* Column 10: Fibonacci Level Selection */}
          <div className="flex flex-col items-center gap-6">
            <div
              ref={(el) => { nodeRefs.current['fibonacciLevels'] = el; }}
              className={`
                relative bg-slate-800/90 rounded-xl border-2 p-4 cursor-pointer
                transition-all duration-200 hover:shadow-lg hover:shadow-black/20
                min-w-[140px] md:min-w-[160px] max-w-[180px] md:max-w-[200px]
                ${pipelineData.fibonacciLevels.inputCount > 0 
                  ? 'border-violet-500/40 hover:border-violet-400/60' 
                  : 'border-slate-600/40 hover:border-slate-500/60'}
              `}
              onClick={() => onStageClick('fibonacciLevels')}
            >
              {/* Input connector dot */}
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-600 border-2 border-slate-700 rounded-full" />
              {/* Output connector dot */}
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-600 border-2 border-slate-700 rounded-full" />
              
              {/* Icon */}
              <div className="bg-violet-500/20 rounded-lg p-2 w-fit mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
              </div>
              
              <h3 className="text-sm font-bold text-slate-200 mb-1 leading-tight">Fib Levels</h3>
              <p className="text-xs text-slate-400 mb-3 leading-tight">A/B/C retracement & extension</p>
              
              {/* Fib level indicators */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Entry:</span>
                  <span className={`font-medium ${pipelineData.fibonacciLevels.inputCount > 0 ? 'text-violet-400' : 'text-slate-600'}`}>
                    {pipelineData.fibonacciLevels.inputCount > 0 ? '0.618 ret' : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Stop Loss:</span>
                  <span className={`font-medium ${pipelineData.fibonacciLevels.inputCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                    {pipelineData.fibonacciLevels.inputCount > 0 ? '0.786 ret' : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Target:</span>
                  <span className={`font-medium ${pipelineData.fibonacciLevels.inputCount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {pipelineData.fibonacciLevels.inputCount > 0 ? '1.618 ext' : '—'}
                  </span>
                </div>
              </div>

              {/* A/B/C points visual */}
              <div className="bg-slate-900/60 rounded-md p-2 mb-3">
                <svg viewBox="0 0 120 40" className="w-full h-auto">
                  {/* A-B-C Fibonacci pattern */}
                  <polyline
                    points="5,35 40,5 75,25 110,5"
                    fill="none"
                    stroke={pipelineData.fibonacciLevels.inputCount > 0 ? 'rgba(167,139,250,0.6)' : 'rgba(148,163,184,0.2)'}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  {/* Point labels */}
                  <circle cx="5" cy="35" r="2" fill={pipelineData.fibonacciLevels.inputCount > 0 ? 'rgba(167,139,250,0.8)' : 'rgba(148,163,184,0.3)'} />
                  <text x="5" y="32" fontSize="6" fill="rgba(167,139,250,0.6)" textAnchor="middle" fontFamily="monospace">A</text>
                  <circle cx="40" cy="5" r="2" fill={pipelineData.fibonacciLevels.inputCount > 0 ? 'rgba(167,139,250,0.8)' : 'rgba(148,163,184,0.3)'} />
                  <text x="40" y="14" fontSize="6" fill="rgba(167,139,250,0.6)" textAnchor="middle" fontFamily="monospace">B</text>
                  <circle cx="75" cy="25" r="2" fill={pipelineData.fibonacciLevels.inputCount > 0 ? 'rgba(167,139,250,0.8)' : 'rgba(148,163,184,0.3)'} />
                  <text x="75" y="22" fontSize="6" fill="rgba(167,139,250,0.6)" textAnchor="middle" fontFamily="monospace">C</text>
                  {/* Extension target */}
                  <circle cx="110" cy="5" r="2" fill={pipelineData.fibonacciLevels.inputCount > 0 ? 'rgba(52,211,153,0.8)' : 'rgba(148,163,184,0.2)'} />
                  <text x="110" y="14" fontSize="5" fill="rgba(52,211,153,0.5)" textAnchor="middle" fontFamily="monospace">1.618</text>
                  {/* Retracement levels (dashed) */}
                  <line x1="40" y1="17" x2="75" y2="17" stroke="rgba(167,139,250,0.2)" strokeWidth="0.5" strokeDasharray="2 2" />
                  <text x="77" y="18" fontSize="4" fill="rgba(167,139,250,0.3)" fontFamily="monospace">.618</text>
                  <line x1="40" y1="21" x2="75" y2="21" stroke="rgba(248,113,113,0.2)" strokeWidth="0.5" strokeDasharray="2 2" />
                  <text x="77" y="22" fontSize="4" fill="rgba(248,113,113,0.3)" fontFamily="monospace">.786</text>
                </svg>
              </div>

              {/* Metrics */}
              <div className="flex justify-between text-xs mb-3">
                <span className="text-slate-500">Tickers:</span>
                <span className={`font-bold ${pipelineData.fibonacciLevels.inputCount > 0 ? 'text-violet-400' : 'text-slate-600'}`}>
                  {pipelineData.fibonacciLevels.inputCount}
                </span>
              </div>

              {/* Version + Confidence */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-block bg-slate-700/50 text-slate-500 px-2 py-0.5 rounded text-[9px] font-medium">v1.0.0</span>
                <span className="inline-block bg-orange-900/40 text-orange-400 px-2 py-0.5 rounded text-[9px] font-medium">
                  {PIPELINE_NODE_CONFIDENCE.fibonacciLevels}% conf
                </span>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>

          {/* Column 11: Agent Analysis */}
          <div className="flex flex-col items-center gap-6">
            <div
              ref={(el) => { nodeRefs.current['agentAnalysis'] = el; }}
              className={`
                relative bg-slate-800/90 rounded-xl border-2 p-4 cursor-pointer
                transition-all duration-200 hover:shadow-lg hover:shadow-black/20
                min-w-[140px] md:min-w-[160px] max-w-[180px] md:max-w-[200px]
                ${pipelineData.agentAnalysis.inputCount > 0 
                  ? 'border-cyan-500/40 hover:border-cyan-400/60' 
                  : 'border-slate-600/40 hover:border-slate-500/60'}
              `}
              onClick={() => onStageClick('agentAnalysis')}
            >
              {/* Input connector dot */}
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-600 border-2 border-slate-700 rounded-full" />
              
              {/* Icon */}
              <div className="bg-cyan-500/20 rounded-lg p-2 w-fit mb-3">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              
              <h3 className="text-sm font-bold text-slate-200 mb-1 leading-tight">Agent Analysis</h3>
              <p className="text-xs text-slate-400 mb-3 leading-tight">Expert opinions on final picks</p>
              
              {/* Agent roster */}
              <div className="space-y-2 mb-3">
                {/* Chris Vermeullen */}
                <div className={`
                  flex items-center gap-2 rounded-md px-2 py-1.5
                  ${pipelineData.agentAnalysis.inputCount > 0 
                    ? 'bg-emerald-900/20 border border-emerald-700/20' 
                    : 'bg-slate-800/40 border border-slate-700/20'}
                `}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    pipelineData.agentAnalysis.inputCount > 0 
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' 
                      : 'bg-slate-700'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-medium block truncate ${
                      pipelineData.agentAnalysis.inputCount > 0 ? 'text-slate-200' : 'text-slate-500'
                    }`}>Chris Vermeullen</span>
                    <span className="text-[8px] text-slate-500">Technical Analysis</span>
                  </div>
                </div>
                
                {/* Warren Buffett */}
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-slate-800/40 border border-amber-700/20">
                  <div className="w-2 h-2 rounded-full shrink-0 bg-amber-500/50" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-medium block truncate text-slate-400">Warren Buffett</span>
                    <span className="text-[8px] text-amber-500/60">Fundamental • pending setup</span>
                  </div>
                </div>
              </div>
              
              {/* Metrics */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Tickers:</span>
                  <span className={`font-bold ${pipelineData.agentAnalysis.inputCount > 0 ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {pipelineData.agentAnalysis.inputCount}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Agents:</span>
                  <span className="text-slate-400 font-medium">1/2 active</span>
                </div>
              </div>

              {/* Version + Confidence */}
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <span className="inline-block bg-slate-700/50 text-slate-500 px-2 py-0.5 rounded text-[9px] font-medium">v0.1.0</span>
                <span className="inline-block bg-red-900/40 text-red-400 px-2 py-0.5 rounded text-[9px] font-medium">
                  {PIPELINE_NODE_CONFIDENCE.agentAnalysis}% conf
                </span>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>
        </div>
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
  );
}

export default function SignalFlowTab() {
  const [coreData, setCoreData] = useState<MREData | null>(null);
  const [universeData, setUniverseData] = useState<MREData | null>(null);
  const [mreVersions, setMreVersions] = useState<any>(null);
  const [strategyVersions, setStrategyVersions] = useState<any>(null);
  const [selectedStage, setSelectedStage] = useState<StageDetails | null>(null);
  const [dataMode, setDataMode] = useState<'core' | 'universe'>('universe');
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

  // Memoized pipeline data
  const pipelineData = useMemo(() => {
    const currentData = dataMode === 'core' ? coreData : universeData;
    if (!currentData?.signals?.by_asset_class) return null;
    
    let signals = currentData.signals.by_asset_class;
    
    // For universe mode: merge core 24 tickers (they're missing from universe file)
    if (dataMode === 'universe' && coreData?.signals?.by_asset_class) {
      const uniSymbols = new Set(signals.map((s: MRESignal) => s.symbol));
      const missingCore = coreData.signals.by_asset_class.filter(
        (s: MRESignal) => !uniSymbols.has(s.symbol)
      );
      if (missingCore.length > 0) {
        signals = [...signals, ...missingCore];
      }
    }
    
    return calculatePipelineStages(signals, dataMode);
  }, [coreData, universeData, dataMode]);
  
  const currentData = dataMode === 'core' ? coreData : universeData;
  
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

    // Handle actionable signals click
    if (stageKey === 'actionableSignals') {
      setSelectedStage({
        name: 'Actionable Signals by Consensus Tier',
        description: 'Signals that passed gating, broken down by how many of 8 strategies agreed. Higher consensus = higher conviction.',
        stageType: 'filter',
        inputCount: pipelineData.signalGating.outputCount,
        outputCount: pipelineData.signalGating.outputCount,
        filteredTickers: [],
        passedTickers: pipelineData.signalGating.passed.map(t => ({
          symbol: t.symbol,
          signal: t.signal,
          currentPrice: t.price,
          rawData: t
        }))
      });
      return;
    }
    
    const stageData = pipelineData[stageKey as keyof typeof pipelineData];
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
          name: 'Signal Gating',
          description: 'Sell signal suppression + bear regime buy suppress',
          stageType: 'filter',
          inputCount: stageData.inputCount,
          outputCount: stageData.outputCount,
          filteredTickers: stageData.filtered.map(t => ({
            symbol: t.symbol,
            reason: t.bear_suppressed 
              ? `BUY suppressed (${t.regime} regime)` 
              : 'Sell signal suppressed to HOLD',
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
          description: 'Trading agents review final BUY signals and provide expert opinions. Chris Vermeullen (Technical Analysis) evaluates chart patterns, momentum, and technical setups. Warren Buffett (Fundamental Analysis — pending setup) will evaluate value metrics, moats, and long-term quality.',
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

  if (!currentData || !pipelineData) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center text-slate-400">
          <Activity className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p>No pipeline data available</p>
        </div>
      </div>
    );
  }

  const fgValue = Math.round(currentData.fear_greed?.current || 0);
  const fgRating = currentData.fear_greed?.rating || 'Unknown';
  const regimeValue = currentData.regime?.global || 'Unknown';
  const summary = currentData.signals?.summary;
  
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
              onClick={() => setDataMode('core')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                dataMode === 'core'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Core (24)
            </button>
            <button
              onClick={() => setDataMode('universe')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                dataMode === 'universe'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Universe (676)
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
        sectorFearGreed={currentData.sector_fear_greed}
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
    </>
  );
}