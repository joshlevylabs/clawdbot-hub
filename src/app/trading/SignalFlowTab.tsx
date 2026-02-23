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
  current_fg: number;
  fear_threshold_conservative: number;
  fear_threshold_opportunistic: number;
  regime: string;
  regime_weight: number;
  role: string;
  role_action: string;
  rotation_modifier: number;
  sideways_applied: boolean;
  kalshi_applied: boolean;
  kalshi_adjustment: number;
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
}

interface StageDetails {
  name: string;
  description: string;
  stageType: 'input' | 'filter' | 'modifier' | 'output';
  inputCount: number;
  outputCount: number;
  filteredTickers: Array<{
    symbol: string;
    reason?: string;
    beforeValue?: number;
    afterValue?: number;
    signal?: string;
    signalStrength?: number;
    currentPrice?: number;
  }>;
  passedTickers: Array<{
    symbol: string;
    signal?: string;
    signalStrength?: number;
    currentPrice?: number;
    adjustmentValue?: number;
  }>;
}

// Calculate pipeline stages from MRE data
function calculatePipelineStages(signals: MRESignal[], dataType: 'core' | 'universe') {
  const totalTickers = signals.length;
  
  // Step 1: Universe Input
  const inputStage = {
    inputCount: totalTickers,
    outputCount: totalTickers,
    passed: signals,
    filtered: []
  };
  
  // Step 2: Strategy Screening (only meaningful for universe data with strategy_votes)
  let strategyScreenPassed = signals;
  let strategyScreenFiltered: MRESignal[] = [];
  
  if (dataType === 'universe') {
    // Tickers with at least one BUY vote from the 5 strategies
    strategyScreenPassed = signals.filter(s => {
      if (!s.strategy_votes) return false;
      return Object.values(s.strategy_votes).some(vote => vote === true);
    });
    strategyScreenFiltered = signals.filter(s => {
      if (!s.strategy_votes) return true; // No strategy votes = filtered
      return !Object.values(s.strategy_votes).some(vote => vote === true);
    });
  } else {
    // For core data, use signal_strength > 0 as proxy for strategy screening
    strategyScreenPassed = signals.filter(s => s.signal_strength > 0 || s.signal_track !== 'none');
    strategyScreenFiltered = signals.filter(s => s.signal_strength === 0 && s.signal_track === 'none');
  }
  
  const strategyStage = {
    inputCount: totalTickers,
    outputCount: strategyScreenPassed.length,
    passed: strategyScreenPassed,
    filtered: strategyScreenFiltered
  };
  
  // Step 3: Signal Gating (sell suppress + bear suppress)
  const signalGatePassed = strategyScreenPassed.filter(s => 
    !s.bear_suppressed && !s.sell_suppressed
  );
  const signalGateFiltered = strategyScreenPassed.filter(s => 
    s.bear_suppressed || s.sell_suppressed
  );
  
  const signalGateStage = {
    inputCount: strategyScreenPassed.length,
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
    passed: finalPassed.sort((a, b) => b.signal_strength - a.signal_strength), // Sort by confidence desc
    filtered: []
  };
  
  return {
    input: inputStage,
    strategyScreen: strategyStage,
    signalGating: signalGateStage,
    confidenceTuning: confidenceStage,
    finalFilters: finalStage,
    output: outputStage
  };
}

export default function SignalFlowTab() {
  const [coreData, setCoreData] = useState<MREData | null>(null);
  const [universeData, setUniverseData] = useState<MREData | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageDetails | null>(null);
  const [dataMode, setDataMode] = useState<'core' | 'universe'>('core');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    searchQuery: '',
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch from API first, fall back to direct file import
        const [coreResponse, universeResponse] = await Promise.allSettled([
          fetch('/api/signal-flow'),
          fetch('/api/signal-flow?type=universe')
        ]);
        
        // Core data
        if (coreResponse.status === 'fulfilled' && coreResponse.value.ok) {
          const coreJson = await coreResponse.value.json();
          setCoreData(coreJson);
        } else {
          // Fallback to direct fetch from public folder
          try {
            const coreFileResponse = await fetch('/data/trading/mre-signals.json');
            if (coreFileResponse.ok) {
              const coreJson = await coreFileResponse.json();
              setCoreData(coreJson);
            }
          } catch (err) {
            console.log('Could not load core signals data');
          }
        }
        
        // Universe data
        if (universeResponse.status === 'fulfilled' && universeResponse.value.ok) {
          const universeJson = await universeResponse.value.json();
          setUniverseData(universeJson);
        } else {
          // Fallback to direct fetch from public folder
          try {
            const universeFileResponse = await fetch('/data/trading/mre-signals-universe.json');
            if (universeFileResponse.ok) {
              const universeJson = await universeFileResponse.json();
              setUniverseData(universeJson);
            }
          } catch (err) {
            console.log('Could not load universe signals data');
          }
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
    
    return calculatePipelineStages(currentData.signals.by_asset_class, dataMode);
  }, [coreData, universeData, dataMode]);
  
  const currentData = dataMode === 'core' ? coreData : universeData;
  
  // Handler for stage clicks
  const handleStageClick = (stageKey: string) => {
    if (!pipelineData) return;
    
    const stageData = pipelineData[stageKey as keyof typeof pipelineData];
    if (!stageData) return;
    
    // Create stage details for the panel
    let stageDetails: StageDetails;
    
    switch (stageKey) {
      case 'input':
        stageDetails = {
          name: 'Universe Input',
          description: `${dataMode === 'core' ? '24 core' : '676'} tickers entering the MRE pipeline`,
          stageType: 'input',
          inputCount: stageData.inputCount,
          outputCount: stageData.outputCount,
          filteredTickers: [],
          passedTickers: stageData.passed.map(t => ({
            symbol: t.symbol,
            signal: t.signal,
            currentPrice: t.price
          }))
        };
        break;
        
      case 'strategyScreen':
        stageDetails = {
          name: 'Strategy Screening',
          description: '5 strategies vote BUY/no-buy per ticker',
          stageType: 'filter',
          inputCount: stageData.inputCount,
          outputCount: stageData.outputCount,
          filteredTickers: stageData.filtered.map(t => ({
            symbol: t.symbol,
            reason: dataMode === 'universe' 
              ? `No BUY votes from 5 strategies (F&G: ${Math.round(t.current_fg)})` 
              : `Signal strength 0, F&G ${Math.round(t.current_fg)} above thresholds`,
            signal: t.signal,
            currentPrice: t.price
          })),
          passedTickers: stageData.passed.map(t => ({
            symbol: t.symbol,
            signal: t.signal,
            currentPrice: t.price
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
            currentPrice: t.price
          })),
          passedTickers: stageData.passed.map(t => ({
            symbol: t.symbol,
            signal: t.signal,
            currentPrice: t.price
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
            currentPrice: t.price
          })),
          passedTickers: stageData.passed.map(t => ({
            symbol: t.symbol,
            signal: t.signal,
            signalStrength: t.signal_strength,
            currentPrice: t.price,
            adjustmentValue: (t.regime_weight * t.rotation_modifier * t.asset_confidence) - 1
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
            currentPrice: t.price
          })),
          passedTickers: stageData.passed.map(t => ({
            symbol: t.symbol,
            signal: t.signal,
            signalStrength: t.signal_strength,
            currentPrice: t.price
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
            currentPrice: t.price
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
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-8">
        <div className="flex items-center overflow-x-auto pb-4 space-x-0">
          <PipelineStage
            name="Universe Input"
            description={`${dataMode === 'core' ? '24 core' : '676'} tickers entering pipeline`}
            inputCount={pipelineData.input.inputCount}
            outputCount={pipelineData.input.outputCount}
            onClick={() => handleStageClick('input')}
            stageType="input"
          />
          
          <PipelineStage
            name="Strategy Screen"
            description="5 strategies vote BUY/no-buy"
            inputCount={pipelineData.strategyScreen.inputCount}
            outputCount={pipelineData.strategyScreen.outputCount}
            onClick={() => handleStageClick('strategyScreen')}
            stageType="filter"
          />
          
          <PipelineStage
            name="Signal Gating"
            description="Sell suppress + bear suppress"
            inputCount={pipelineData.signalGating.inputCount}
            outputCount={pipelineData.signalGating.outputCount}
            onClick={() => handleStageClick('signalGating')}
            stageType="filter"
          />
          
          <PipelineStage
            name="Confidence Tuning"
            description="Regime, role, rotation, sideways, Kalshi"
            inputCount={pipelineData.confidenceTuning.inputCount}
            outputCount={pipelineData.confidenceTuning.outputCount}
            onClick={() => handleStageClick('confidenceTuning')}
            stageType="modifier"
          />
          
          <PipelineStage
            name="Final Filters"
            description="Cluster limit, asset confidence, crash mode"
            inputCount={pipelineData.finalFilters.inputCount}
            outputCount={pipelineData.finalFilters.outputCount}
            onClick={() => handleStageClick('finalFilters')}
            stageType="filter"
          />
          
          <PipelineStage
            name="BUY Signals"
            description="Final output with confidence scores"
            inputCount={pipelineData.output.inputCount}
            outputCount={pipelineData.output.outputCount}
            onClick={() => handleStageClick('output')}
            stageType="output"
            isLast={true}
          />
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