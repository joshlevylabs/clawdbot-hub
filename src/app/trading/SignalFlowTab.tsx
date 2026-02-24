"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import PipelineStage from "@/components/PipelineStage";
import PipelineDetailPanel from "@/components/PipelineDetailPanel";

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
  };
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
    ema_200: number;
    above_ema_20: boolean;
    above_ema_50: boolean;
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
  
  // Step 2: Individual Strategy Votes (5 strategies, each evaluates all tickers)
  const strategyNames = [
    { key: 'fear_greed', name: 'Fear & Greed' },
    { key: 'regime_confirmation', name: 'Regime Confirm' },
    { key: 'rsi_oversold', name: 'RSI Oversold' },
    { key: 'mean_reversion', name: 'Mean Reversion' },
    { key: 'momentum', name: 'Momentum' },
  ];
  
  const strategyVotes: StrategyVoteStage[] = strategyNames.map(({ key, name }) => {
    const passed = signals.filter(s => {
      if (s.strategy_votes) return s.strategy_votes[key as keyof typeof s.strategy_votes] === true;
      // Core tickers don't have strategy_votes — use signal_track as proxy for fear_greed
      if (key === 'fear_greed') return s.signal_track !== 'none' && s.signal_track !== undefined;
      return false;
    });
    const filtered = signals.filter(s => !passed.includes(s));
    return { name, key, inputCount: totalTickers, outputCount: passed.length, passed, filtered };
  });
  
  // Tickers that got at least one BUY vote from any strategy
  const anyVotePassed = signals.filter(s => {
    if (s.strategy_votes) return Object.values(s.strategy_votes).some(v => v === true);
    return s.signal_strength > 0 || (s.signal_track !== 'none' && s.signal_track !== undefined);
  });
  const anyVoteFiltered = signals.filter(s => !anyVotePassed.includes(s));
  
  // Vote Consensus Gate: Group tickers by how many strategies voted BUY
  const voteConsensusPaths: VoteConsensusPath[] = [];
  
  for (let voteCount = 1; voteCount <= 5; voteCount++) {
    const tickersWithThisVoteCount = anyVotePassed.filter(s => {
      const actualVoteCount = s.strategy_votes 
        ? Object.values(s.strategy_votes).filter(v => v === true).length 
        : s.strategies_agreeing || 0;
      return actualVoteCount === voteCount;
    });
    
    voteConsensusPaths.push({
      voteCount,
      name: `${voteCount}-of-5 votes`,
      tickers: tickersWithThisVoteCount,
      count: tickersWithThisVoteCount.length
    });
  }
  
  const voteConsensusGate = {
    inputCount: anyVotePassed.length,
    outputCount: anyVotePassed.length,
    passed: anyVotePassed,
    filtered: anyVoteFiltered,
    paths: voteConsensusPaths
  };
  
  // Step 3: Signal Gating (sell suppress + bear suppress)
  const signalGatePassed = anyVotePassed.filter(s => 
    !s.bear_suppressed && !s.sell_suppressed
  );
  const signalGateFiltered = anyVotePassed.filter(s => 
    s.bear_suppressed || s.sell_suppressed
  );
  
  const signalGateStage = {
    inputCount: anyVotePassed.length,
    outputCount: signalGatePassed.length,
    passed: signalGatePassed,
    filtered: signalGateFiltered
  };
  
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
  
  return {
    input: inputStage,
    strategyVotes,
    voteConsensusGate,
    signalGating: signalGateStage,
    confidenceTuning: confidenceStage,
    finalFilters: finalStage,
    output: outputStage
  };
}

export default function SignalFlowTab() {
  const [coreData, setCoreData] = useState<MREData | null>(null);
  const [universeData, setUniverseData] = useState<MREData | null>(null);
  const [mreVersions, setMreVersions] = useState<any>(null);
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
        const [coreResponse, universeResponse, versionsResponse] = await Promise.allSettled([
          fetch('/data/trading/mre-signals.json'),
          fetch('/data/trading/mre-signals-universe.json'),
          fetch('/data/trading/mre-versions.json')
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
      
      setSelectedStage({
        name: `${path.name.replace('votes', 'Vote Consensus')}`,
        description: `Tickers where exactly ${voteCount} of 5 strategies voted BUY`,
        stageType: 'filter',
        inputCount: pipelineData.voteConsensusGate.inputCount,
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
    
    const stageData = pipelineData[stageKey as keyof typeof pipelineData];
    if (!stageData || Array.isArray(stageData)) return;
    
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

      {/* Pipeline Visualization */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6 overflow-x-auto">
        <div className="flex items-stretch min-w-[1200px]">
          
          {/* Stage 1: Universe Input */}
          <div className="flex items-center">
            <PipelineStage
              name="Universe Input"
              description={`${pipelineData.input.inputCount.toLocaleString()} tickers`}
              inputCount={pipelineData.input.inputCount}
              outputCount={pipelineData.input.outputCount}
              onClick={() => handleStageClick('input')}
              stageType="input"
              version={mreVersions?.signals || '2.0.0'}
            />
          </div>
          
          {/* Arrow → */}
          <div className="flex items-center px-2">
            <div className="text-slate-600 text-xl">→</div>
          </div>
          
          {/* Stage 2: 5 Strategy Votes (fanned out vertically) */}
          <div className="flex flex-col gap-1.5 justify-center">
            <div className="text-xs font-semibold text-slate-400 text-center mb-1">Strategy Votes</div>
            {pipelineData.strategyVotes.map((sv) => (
              <div
                key={sv.key}
                onClick={() => handleStageClick(`strategy_${sv.key}`)}
                className="flex items-center justify-between gap-3 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/50 hover:border-primary-500/50 cursor-pointer transition-all min-w-[200px]"
              >
                <span className="text-xs font-medium text-slate-300 truncate">{sv.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${sv.outputCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {sv.outputCount}
                  </span>
                  <span className="text-[10px] text-slate-600">BUY</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Arrow → */}
          <div className="flex items-center px-2">
            <div className="text-slate-600 text-xl">→</div>
          </div>
          
          {/* Stage 3: Vote Consensus Gate */}
          <div className="flex flex-col gap-1.5 justify-center">
            <div className="text-xs font-semibold text-slate-400 text-center mb-1">Vote Consensus Gate</div>
            {pipelineData.voteConsensusGate.paths.slice().reverse().map((path) => (
              <div
                key={path.voteCount}
                onClick={() => handleStageClick(`vote_consensus_${path.voteCount}`)}
                className="flex items-center justify-between gap-3 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/50 hover:border-primary-500/50 cursor-pointer transition-all min-w-[200px]"
              >
                <span className="text-xs font-medium text-slate-300 truncate">{path.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${path.count > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {path.count}
                  </span>
                </div>
              </div>
            ))}
            {/* Total summary */}
            <div className="mt-1 pt-1.5 border-t border-slate-700/50 flex items-center justify-between px-3">
              <span className="text-[10px] text-slate-500">Total →</span>
              <span className="text-xs font-bold text-emerald-400">{pipelineData.voteConsensusGate.outputCount}</span>
            </div>
          </div>
          
          {/* Arrow → */}
          <div className="flex items-center px-2">
            <div className="text-slate-600 text-xl">→</div>
          </div>
          
          {/* Stage 4: Signal Gating */}
          <div className="flex items-center">
            <PipelineStage
              name="Signal Gating"
              description="Bear suppress + sell suppress"
              inputCount={pipelineData.signalGating.inputCount}
              outputCount={pipelineData.signalGating.outputCount}
              onClick={() => handleStageClick('signalGating')}
              stageType="filter"
              version={mreVersions?.signals || '2.0.0'}
            />
          </div>
          
          {/* Arrow → */}
          <div className="flex items-center px-2">
            <div className="text-slate-600 text-xl">→</div>
          </div>
          
          {/* Stage 5: Confidence Tuning */}
          <div className="flex items-center">
            <PipelineStage
              name="Confidence Tuning"
              description="Regime, role, rotation, sideways, Kalshi"
              inputCount={pipelineData.confidenceTuning.inputCount}
              outputCount={pipelineData.confidenceTuning.outputCount}
              onClick={() => handleStageClick('confidenceTuning')}
              stageType="modifier"
              version={mreVersions?.pit || '1.1.0'}
            />
          </div>
          
          {/* Arrow → */}
          <div className="flex items-center px-2">
            <div className="text-slate-600 text-xl">→</div>
          </div>
          
          {/* Stage 6: Final Filters */}
          <div className="flex items-center">
            <PipelineStage
              name="Final Filters"
              description="Cluster, confidence, crash, cap"
              inputCount={pipelineData.finalFilters.inputCount}
              outputCount={pipelineData.finalFilters.outputCount}
              onClick={() => handleStageClick('finalFilters')}
              stageType="filter"
              version={mreVersions?.config || '2.0.0'}
            />
          </div>
          
          {/* Arrow → */}
          <div className="flex items-center px-2">
            <div className="text-slate-600 text-xl">→</div>
          </div>
          
          {/* Stage 7: Output */}
          <div className="flex items-center">
            <PipelineStage
              name="BUY Signals"
              description="Final output"
              inputCount={pipelineData.output.inputCount}
              outputCount={pipelineData.output.outputCount}
              onClick={() => handleStageClick('output')}
              stageType="output"
              isLast={true}
              version={pipelineVersion}
            />
          </div>
        </div>
        
        {/* Current State Summary */}
        <div className="mt-8 p-6 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-200 mb-3">Current Pipeline State</h3>
          <div className="text-sm text-slate-400">
            <p className="mb-2">
              <strong>{pipelineData.input.inputCount.toLocaleString()}</strong> tickers entered → 
              <strong className="text-emerald-400 ml-1">{pipelineData.output.outputCount}</strong> BUY signals generated
            </p>
            <p>
              Fear & Greed at <strong>{fgValue}</strong> ({fgRating}) means {
                fgValue <= 25 ? "extreme fear - prime buying opportunity" :
                fgValue <= 45 ? "fear levels - watch for oversold bounces" :
                fgValue <= 55 ? "neutral market - selective opportunities" :
                fgValue <= 75 ? "greed levels - be cautious" :
                "extreme greed - avoid buying"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <PipelineDetailPanel
        stageDetails={selectedStage}
        onClose={handleModalClose}
      />
    </>
  );
}