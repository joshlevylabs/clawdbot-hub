"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  AlertTriangle,
  Target,
  Zap,
  Clock,
  DollarSign,
  Shield,
  BarChart3,
} from "lucide-react";
import WorkflowNode from "@/components/WorkflowNode";
import PipelineDetailPanel from "@/components/PipelineDetailPanel";

// Portfolio position type from PortfolioSignalFlow.tsx
interface PaperPosition {
  id: string;
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
  account_id: string | null;
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
  exitSignals: string[];
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

interface PortfolioExitFlowProps {
  universeData: MREData | null;
  coreData: MREData | null;
}

// Exit evaluation strategies
const EXIT_STRATEGIES = [
  { key: 'regime_check', name: 'Regime Check', description: 'Regime changed from entry' },
  { key: 'strategy_consensus', name: 'Strategy Consensus', description: 'Strategy vote decay from entry' },
  { key: 'rsi_overbought', name: 'RSI Overbought', description: 'RSI > 70, potential reversal' },
  { key: 'momentum_reversal', name: 'Momentum Reversal', description: '20d momentum turning negative' },
  { key: 'fibonacci_target', name: 'Fibonacci Target', description: 'Price near extension targets' },
  { key: 'stop_loss_proximity', name: 'Stop Loss Proximity', description: 'Price near stop loss level' },
  { key: 'hold_time_analysis', name: 'Hold Time Analysis', description: 'Days held vs target hold period' },
  { key: 'sector_sentiment', name: 'Sector Sentiment', description: 'Sector F&G extreme greed' },
] as const;

type ExitStrategyKey = typeof EXIT_STRATEGIES[number]['key'];

// Calculate exit signals for each position
function calculateExitSignals(position: PaperPosition, signalData?: MRESignal): string[] {
  const exitSignals: string[] = [];
  
  if (!signalData) {
    return ['No signal data available'];
  }

  const currentPrice = position.current_price || position.entry_price;
  const pnlPct = ((currentPrice - position.entry_price) / position.entry_price) * 100;
  const holdDays = Math.floor((Date.now() - new Date(position.opened_at).getTime()) / (1000 * 60 * 60 * 24));
  const holdTarget = position.hold_days || 10;

  // 1. Regime Check
  if (position.signal_regime && signalData.regime !== position.signal_regime) {
    exitSignals.push('regime_check');
  }

  // 2. Strategy Consensus
  if (position.signal_confidence && signalData.strategy_votes) {
    const currentVotes = Object.values(signalData.strategy_votes).filter(v => v === true).length;
    const entryVotes = Math.round((position.signal_confidence / 100) * 8);
    if (currentVotes < entryVotes) {
      exitSignals.push('strategy_consensus');
    }
  }

  // 3. RSI Overbought
  if (signalData.rsi_14 && signalData.rsi_14 > 70) {
    exitSignals.push('rsi_overbought');
  }

  // 4. Momentum Reversal
  if (signalData.momentum_20d && signalData.momentum_20d < 0) {
    exitSignals.push('momentum_reversal');
  }

  // 5. Fibonacci Target
  if (signalData.fibonacci?.profit_targets && signalData.fibonacci.profit_targets.length > 0) {
    const nearestTarget = signalData.fibonacci.profit_targets[0];
    const priceDistanceToTarget = Math.abs((currentPrice - nearestTarget) / nearestTarget);
    if (priceDistanceToTarget < 0.05) { // Within 5% of target
      exitSignals.push('fibonacci_target');
    }
  }

  // 6. Stop Loss Proximity
  if (position.stop_loss) {
    const distanceToSL = Math.abs((currentPrice - position.stop_loss) / currentPrice);
    if (distanceToSL < 0.1) { // Within 10% of stop loss
      exitSignals.push('stop_loss_proximity');
    }
  }

  // 7. Hold Time Analysis
  if (holdDays >= holdTarget) {
    exitSignals.push('hold_time_analysis');
  }

  // 8. Sector Sentiment
  const sectorFg = signalData.sector_fg || signalData.effective_fg || signalData.current_fg;
  if (sectorFg > 70) {
    exitSignals.push('sector_sentiment');
  }

  return exitSignals;
}

// Count active strategy votes
function countActiveVotes(signalData?: MRESignal): number {
  if (!signalData?.strategy_votes) return 0;
  return Object.values(signalData.strategy_votes).filter(v => v === true).length;
}

// Calculate exit pipeline stages from positions with signals
function calculateExitPipelineStages(positionsWithSignals: PositionWithSignal[]) {
  const totalPositions = positionsWithSignals.length;
  
  // Stage 1: Portfolio Input
  const portfolioInput = {
    inputCount: totalPositions,
    outputCount: totalPositions,
    passed: positionsWithSignals,
    filtered: [] as PositionWithSignal[]
  };

  // Stage 2: Exit Strategy Evaluations (8 parallel checks)
  const exitStrategyEvaluations = EXIT_STRATEGIES.map(strategy => {
    const positionsWithThisSignal = positionsWithSignals.filter(pos => 
      pos.exitSignals.includes(strategy.key)
    );
    return {
      name: strategy.name,
      key: strategy.key,
      description: strategy.description,
      inputCount: totalPositions,
      outputCount: positionsWithThisSignal.length,
      passed: positionsWithThisSignal,
      filtered: positionsWithSignals.filter(pos => !pos.exitSignals.includes(strategy.key)),
    };
  });

  // Stage 3: Exit Signal Aggregation (by exit count)
  const exitSignalCounts: Record<number, PositionWithSignal[]> = {};
  for (let i = 0; i <= 8; i++) {
    exitSignalCounts[i] = positionsWithSignals.filter(pos => pos.exitSignals.length === i);
  }

  // Stage 4: Exit Gating (apply risk management rules)
  const exitGating = positionsWithSignals.map(pos => {
    const currentPrice = pos.current_price || pos.entry_price;
    const pnlPct = ((currentPrice - pos.entry_price) / pos.entry_price) * 100;
    const exitSignalCount = pos.exitSignals.length;
    
    let urgencyMultiplier = 1;
    
    // Negative P&L + multiple exit signals = higher urgency
    if (pnlPct < 0 && exitSignalCount >= 2) {
      urgencyMultiplier = 1.5;
    }
    
    // Positive P&L near Fibonacci targets = profit-taking opportunity
    if (pnlPct > 5 && pos.exitSignals.includes('fibonacci_target')) {
      urgencyMultiplier = 1.2;
    }
    
    return {
      ...pos,
      urgencyMultiplier
    };
  });

  // Stage 5: Exit Recommendations
  const exitRecommendations = {
    HOLD: positionsWithSignals.filter(pos => pos.exitSignals.length <= 2),
    WATCH: positionsWithSignals.filter(pos => pos.exitSignals.length >= 3 && pos.exitSignals.length <= 4),
    TRIM: positionsWithSignals.filter(pos => pos.exitSignals.length >= 5 && pos.exitSignals.length <= 6),
    EXIT: positionsWithSignals.filter(pos => pos.exitSignals.length >= 7)
  };

  return {
    portfolioInput,
    exitStrategyEvaluations,
    exitSignalCounts,
    exitGating,
    exitRecommendations
  };
}

// Create bezier curve path for SVG connections
function createBezierPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = Math.abs(to.y - from.y);
  const controlPointOffset = dy < 50 ? Math.min(dx * 0.3, 80) : Math.min(dx * 0.4, 150);
  const arcBump = dy < 8 ? -12 : 0;
  
  return `M ${from.x} ${from.y} C ${from.x + controlPointOffset} ${from.y + arcBump} ${to.x - controlPointOffset} ${to.y + arcBump} ${to.x} ${to.y}`;
}

export default function PortfolioExitFlow({ universeData, coreData }: PortfolioExitFlowProps) {
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageDetails | null>(null);
  const [scale, setScale] = useState(1);
  const [viewMode, setViewMode] = useState<'user' | 'all'>('user');
  const [connections, setConnections] = useState<{ from: string; to: string; fromPos: { x: number; y: number }; toPos: { x: number; y: number } }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // Filter positions by view mode
  const filteredPositions = useMemo(() => {
    if (viewMode === 'user') return positions.filter(p => !p.account_id);
    return positions;
  }, [positions, viewMode]);

  const agentCount = useMemo(() => positions.filter(p => p.account_id).length, [positions]);
  const userCount = useMemo(() => positions.filter(p => !p.account_id).length, [positions]);

  // Merge positions with signal data and calculate exit signals
  const positionsWithSignals = useMemo((): PositionWithSignal[] => {
    if (!filteredPositions.length) return [];

    const signalsData = universeData || coreData;
    if (!signalsData?.signals?.by_asset_class) return filteredPositions.map(p => ({ ...p, exitSignals: [] }));

    const signalMap = new Map<string, MRESignal>();
    signalsData.signals.by_asset_class.forEach(signal => {
      signalMap.set(signal.symbol, signal);
    });

    return filteredPositions.map(position => {
      const signalData = signalMap.get(position.symbol);
      const exitSignals = calculateExitSignals(position, signalData);
      
      return {
        ...position,
        signalData,
        exitSignals
      };
    });
  }, [filteredPositions, universeData, coreData]);

  // Pipeline data calculation
  const pipelineData = useMemo(() => {
    if (!positionsWithSignals.length) return null;
    return calculateExitPipelineStages(positionsWithSignals);
  }, [positionsWithSignals]);

  // Update SVG connections
  const updateConnections = useCallback(() => {
    if (!containerRef.current || !pipelineData) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const s = scale || 1;
    const newConnections: typeof connections = [];
    
    const getRight = (node: HTMLDivElement) => {
      const r = node.getBoundingClientRect();
      return { x: (r.right - containerRect.left) / s, y: (r.top + r.height / 2 - containerRect.top) / s };
    };
    const getLeft = (node: HTMLDivElement) => {
      const r = node.getBoundingClientRect();
      return { x: (r.left - containerRect.left) / s, y: (r.top + r.height / 2 - containerRect.top) / s };
    };

    // Connect portfolio input to exit strategies
    const inputNode = nodeRefs.current['portfolio-input'];
    if (inputNode) {
      const fromPos = getRight(inputNode);
      EXIT_STRATEGIES.forEach(strategy => {
        const stratNode = nodeRefs.current[`exit-strategy-${strategy.key}`];
        if (stratNode) {
          const toPos = getLeft(stratNode);
          newConnections.push({
            from: 'portfolio-input',
            to: `exit-strategy-${strategy.key}`,
            fromPos,
            toPos
          });
        }
      });
    }

    // Connect each exit strategy to the center of the exit-count column
    // Find all rendered exit-count nodes to compute the vertical midpoint
    const exitCountNodes: { key: string; node: HTMLDivElement }[] = [];
    for (let i = 0; i <= 8; i++) {
      const countNode = nodeRefs.current[`exit-count-${i}`];
      if (countNode) exitCountNodes.push({ key: `exit-count-${i}`, node: countNode });
    }

    if (exitCountNodes.length > 0) {
      // Each strategy connects to the nearest exit-count node by vertical distance
      EXIT_STRATEGIES.forEach(strategy => {
        const stratNode = nodeRefs.current[`exit-strategy-${strategy.key}`];
        if (!stratNode) return;
        const fromPos = getRight(stratNode);
        // Find the closest exit-count node
        let bestDist = Infinity;
        let bestTo = exitCountNodes[0];
        for (const ec of exitCountNodes) {
          const ecPos = getLeft(ec.node);
          const dist = Math.abs(ecPos.y - fromPos.y);
          if (dist < bestDist) { bestDist = dist; bestTo = ec; }
        }
        const toPos = getLeft(bestTo.node);
        newConnections.push({ from: `exit-strategy-${strategy.key}`, to: bestTo.key, fromPos, toPos });
      });
    }

    // Connect exit signal count nodes to exit gating
    const gatingNode = nodeRefs.current['exit-gating'];
    for (const ec of exitCountNodes) {
      if (gatingNode) {
        const fromPos = getRight(ec.node);
        const toPos = getLeft(gatingNode);
        newConnections.push({ from: ec.key, to: 'exit-gating', fromPos, toPos });
      }
    }

    // Connect exit gating to recommendations
    if (gatingNode) {
      const fromPos = getRight(gatingNode);
      ['HOLD', 'WATCH', 'TRIM', 'EXIT'].forEach(rec => {
        const recNode = nodeRefs.current[`recommendation-${rec}`];
        if (recNode) {
          const toPos = getLeft(recNode);
          newConnections.push({
            from: 'exit-gating',
            to: `recommendation-${rec}`,
            fromPos,
            toPos
          });
        }
      });
    }
    
    setConnections(newConnections);
  }, [pipelineData, scale]);

  useEffect(() => {
    updateConnections();
    const timer = setTimeout(updateConnections, 100);
    
    const resizeObserver = new ResizeObserver(updateConnections);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [updateConnections]);

  // Handle stage clicks
  const handleStageClick = (stageKey: string) => {
    if (!pipelineData) return;
    
    if (stageKey === 'portfolio-input') {
      setSelectedStage({
        name: 'Portfolio Input',
        description: `All open positions evaluated for exit signals`,
        stageType: 'input',
        inputCount: pipelineData.portfolioInput.inputCount,
        outputCount: pipelineData.portfolioInput.outputCount,
        filteredTickers: [],
        passedTickers: pipelineData.portfolioInput.passed.map(pos => ({
          symbol: pos.symbol,
          signal: pos.signalData?.signal || 'N/A',
          currentPrice: pos.current_price || pos.entry_price,
          rawData: pos.signalData
        }))
      });
      return;
    }

    if (stageKey.startsWith('exit-strategy-')) {
      const strategyKey = stageKey.replace('exit-strategy-', '') as ExitStrategyKey;
      const strategy = EXIT_STRATEGIES.find(s => s.key === strategyKey);
      const evaluation = pipelineData.exitStrategyEvaluations.find(e => e.key === strategyKey);
      
      if (strategy && evaluation) {
        setSelectedStage({
          name: strategy.name,
          description: strategy.description,
          stageType: 'filter',
          inputCount: evaluation.inputCount,
          outputCount: evaluation.outputCount,
          filteredTickers: evaluation.filtered.map(pos => ({
            symbol: pos.symbol,
            reason: `No ${strategy.name.toLowerCase()} signal`,
            signal: pos.signalData?.signal || 'N/A',
            currentPrice: pos.current_price || pos.entry_price,
            rawData: pos.signalData
          })),
          passedTickers: evaluation.passed.map(pos => ({
            symbol: pos.symbol,
            signal: pos.signalData?.signal || 'N/A',
            currentPrice: pos.current_price || pos.entry_price,
            rawData: pos.signalData
          }))
        });
      }
      return;
    }

    if (stageKey === 'exit-gating') {
      setSelectedStage({
        name: 'Exit Gating',
        description: 'Risk management layer that applies urgency multipliers based on combined P&L and exit signal analysis.\n\n**Urgency rules:**\n• Base urgency: 1.0× for all positions\n• Negative P&L + ≥2 exit signals → 1.5× urgency (losing positions need faster attention)\n• Positive P&L + Fibonacci target hit → 1.2× urgency (profit-taking opportunity)\n\nAll positions pass through — gating modifies priority, not signal direction.',
        stageType: 'modifier',
        inputCount: positionsWithSignals.length,
        outputCount: positionsWithSignals.length,
        filteredTickers: [],
        passedTickers: positionsWithSignals.map(pos => ({
          symbol: pos.symbol,
          signal: pos.signalData?.signal || 'N/A',
          currentPrice: pos.current_price || pos.entry_price,
          reason: `${pos.exitSignals.length} exit signals`,
          rawData: pos.signalData
        }))
      });
      return;
    }

    if (stageKey.startsWith('exit-count-')) {
      const count = parseInt(stageKey.replace('exit-count-', ''));
      const positions = pipelineData.exitSignalCounts[count] || [];
      
      setSelectedStage({
        name: `${count} Exit Signals`,
        description: `Positions where exactly ${count} of the 8 exit strategies flagged a concern.\n\n${count <= 2 ? '**Low risk** — these positions have strong thesis support and minimal exit pressure.' : count <= 4 ? '**Moderate risk** — multiple strategies are flagging concerns. Monitor closely for further deterioration.' : count <= 6 ? '**High risk** — more than half of exit strategies triggered. Consider trimming position size.' : '**Critical risk** — nearly all exit strategies agree this position should be closed.'}`,
        stageType: 'filter',
        inputCount: positionsWithSignals.length,
        outputCount: positions.length,
        filteredTickers: [],
        passedTickers: positions.map(pos => ({
          symbol: pos.symbol,
          signal: pos.signalData?.signal || 'N/A',
          currentPrice: pos.current_price || pos.entry_price,
          reason: pos.exitSignals.join(', '),
          rawData: pos.signalData
        }))
      });
      return;
    }

    if (stageKey.startsWith('recommendation-')) {
      const recType = stageKey.replace('recommendation-', '') as keyof typeof pipelineData.exitRecommendations;
      const positions = pipelineData.exitRecommendations[recType];
      
      setSelectedStage({
        name: `${recType} Recommendation`,
        description: `Positions recommended for ${recType} action based on exit signal analysis`,
        stageType: 'output',
        inputCount: positionsWithSignals.length,
        outputCount: positions.length,
        filteredTickers: [],
        passedTickers: positions.map(pos => ({
          symbol: pos.symbol,
          signal: pos.signalData?.signal || 'N/A',
          currentPrice: pos.current_price || pos.entry_price,
          rawData: pos.signalData
        }))
      });
      return;
    }
  };

  const handleModalClose = () => {
    setSelectedStage(null);
  };

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading portfolio positions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-300 mb-2">{error}</p>
          <p className="text-slate-500 text-sm">Check that the /api/paper-trading endpoint is accessible</p>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Open Positions</h3>
          <p className="text-slate-500">Open some positions to see portfolio exit signal flow analysis</p>
        </div>
      </div>
    );
  }

  if (!pipelineData) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No signal data available for pipeline calculation</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-slate-900/80 rounded-xl border border-slate-700/50 p-4 md:p-8 relative overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* View mode toggle */}
      <div className="flex items-center gap-2 absolute top-3 left-3 z-30">
        <button
          onClick={() => setViewMode('user')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
            viewMode === 'user'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-300 border border-slate-700'
          }`}
        >
          My Positions ({userCount})
        </button>
        <button
          onClick={() => setViewMode('all')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
            viewMode === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-300 border border-slate-700'
          }`}
        >
          All ({positions.length})
        </button>
        {viewMode === 'all' && agentCount > 0 && (
          <span className="text-[10px] text-slate-500">incl. {agentCount} agent positions</span>
        )}
      </div>

      {/* Desktop zoom controls */}
      <div className="hidden lg:flex items-center gap-1.5 absolute top-3 right-3 z-30">
        <button
          onClick={() => setScale((s) => Math.max(0.4, +(s - 0.1).toFixed(1)))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
          style={{ backgroundColor: "#1A1A24", border: "1px solid #2A2A38", color: "#8B8B80" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#DC2626"; e.currentTarget.style.color = "#DC2626"; }}
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
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#DC2626"; e.currentTarget.style.color = "#DC2626"; }}
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
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#DC2626"; e.currentTarget.style.color = "#DC2626"; }}
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
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const startDist = (container as any)._pinchStartDist || dist;
            const startScale = (container as any)._pinchStartScale || 1;
            const newScale = Math.min(2, Math.max(0.4, startScale * (dist / startDist)));
            setScale(newScale);
            e.preventDefault();
          } else if (e.touches.length === 1) {
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
              background: 'radial-gradient(circle at 20% 80%, rgba(220, 38, 38, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.05) 0%, transparent 50%)',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: scale < 1 ? `${100 / scale}%` : 'max-content',
              minWidth: '2000px',
            }}
          >
            {/* Workflow Nodes */}
            <div className="relative z-[5] flex flex-row items-start gap-24 p-6">
              
              {/* Column 1: Portfolio Input */}
              <div className="flex flex-col items-center gap-6">
                <WorkflowNode
                  ref={(el) => { nodeRefs.current['portfolio-input'] = el; }}
                  name="Portfolio Input" 
                  description={`${pipelineData.portfolioInput.inputCount} open positions`}
                  inputCount={0}
                  outputCount={pipelineData.portfolioInput.outputCount}
                  onClick={() => handleStageClick('portfolio-input')}
                  nodeType="input"
                  confidence={95}
                  refreshFrequency="Real-time"
                />
              </div>
              
              {/* Column 2: Exit Strategy Evaluations (8 strategies, vertical stack) */}
              <div className="flex flex-col items-center gap-6">
                <div className="text-xs font-semibold text-slate-400 text-center mb-2">Exit Strategy Evaluations</div>
                <div className="flex flex-col gap-3">
                  {pipelineData.exitStrategyEvaluations.map((evaluation) => (
                    <WorkflowNode
                      key={evaluation.key}
                      ref={(el) => { nodeRefs.current[`exit-strategy-${evaluation.key}`] = el; }}
                      name={evaluation.name}
                      description={evaluation.description}
                      inputCount={evaluation.inputCount}
                      outputCount={evaluation.outputCount}
                      onClick={() => handleStageClick(`exit-strategy-${evaluation.key}`)}
                      nodeType="strategy"
                      className="max-w-[160px] min-h-[80px] border-red-500/40"
                      style={{ padding: '8px', minHeight: '80px' }}
                      confidence={75}
                      refreshFrequency="Real-time"
                    />
                  ))}
                </div>
              </div>

              {/* Column 3: Exit Signal Count nodes */}
              <div className="flex flex-col items-center gap-6">
                <div className="text-xs font-semibold text-slate-400 text-center mb-2">Exit Signal Count</div>
                <div className="flex flex-col gap-2">
                  {Object.entries(pipelineData.exitSignalCounts).map(([count, positions]) => {
                    if (positions.length === 0) return null;
                    const exitCount = parseInt(count);
                    const urgencyColor = exitCount >= 7 ? 'border-red-500/60' :
                                       exitCount >= 5 ? 'border-orange-500/60' :
                                       exitCount >= 3 ? 'border-amber-500/60' :
                                       'border-emerald-500/60';
                    return (
                      <WorkflowNode
                        key={count}
                        ref={(el) => { nodeRefs.current[`exit-count-${count}`] = el; }}
                        name={`${count} Exit Signals`}
                        description={`${positions.length} positions`}
                        inputCount={positionsWithSignals.length}
                        outputCount={positions.length}
                        onClick={() => handleStageClick(`exit-count-${count}`)}
                        nodeType="consensus"
                        className={`max-w-[140px] border-2 ${urgencyColor}`}
                        confidence={85}
                        refreshFrequency="Real-time"
                      />
                    );
                  })}
                </div>
              </div>

              {/* Column 4: Exit Gating */}
              <div className="flex flex-col items-center gap-6">
                <WorkflowNode
                  ref={(el) => { nodeRefs.current['exit-gating'] = el; }}
                  name="Exit Gating"
                  description="Risk management rules"
                  inputCount={positionsWithSignals.length}
                  outputCount={positionsWithSignals.length}
                  onClick={() => handleStageClick('exit-gating')}
                  nodeType="filter"
                  className="border-red-500/40"
                  confidence={80}
                  refreshFrequency="Real-time"
                />
              </div>

              {/* Column 5: Exit Recommendations */}
              <div className="flex flex-col items-center gap-6">
                <div className="text-xs font-semibold text-slate-400 text-center mb-2">Exit Recommendations</div>
                <div className="flex flex-col gap-2">
                  {Object.entries(pipelineData.exitRecommendations).map(([recType, positions]) => {
                    const colors = {
                      HOLD: 'border-emerald-500/60 text-emerald-400',
                      WATCH: 'border-amber-500/60 text-amber-400',
                      TRIM: 'border-orange-500/60 text-orange-400',
                      EXIT: 'border-red-500/60 text-red-400'
                    };
                    return (
                      <WorkflowNode
                        key={recType}
                        ref={(el) => { nodeRefs.current[`recommendation-${recType}`] = el; }}
                        name={recType}
                        description={`${positions.length} positions`}
                        inputCount={positionsWithSignals.length}
                        outputCount={positions.length}
                        onClick={() => handleStageClick(`recommendation-${recType}`)}
                        nodeType="output"
                        className={`max-w-[120px] border-2 ${colors[recType as keyof typeof colors]}`}
                        confidence={90}
                        refreshFrequency="Real-time"
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SVG Layer for Connections */}
            <svg 
              ref={svgRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 20, overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="exitConnectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#EF4444" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity="0.6" />
                </linearGradient>
                <filter id="exitGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/> 
                  </feMerge>
                </filter>
              </defs>
              
              <style>{`
                @keyframes exitFlowAnimation {
                  0% { stroke-dashoffset: 24; }
                  100% { stroke-dashoffset: 0; }
                }
                .exit-flow-active {
                  animation: exitFlowAnimation 1.5s linear infinite;
                }
              `}</style>
              
              {connections.map((connection, index) => (
                <path
                  key={`${connection.from}-${connection.to}-${index}`}
                  d={createBezierPath(connection.fromPos, connection.toPos)}
                  stroke="url(#exitConnectionGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#exitGlow)"
                  opacity="0.8"
                  strokeDasharray="8 6"
                  className="exit-flow-active"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Current State Summary */}
        <div className="mt-8 p-6 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-200 mb-3">Portfolio Exit Analysis</h3>
          <div className="text-sm text-slate-400 space-y-2">
            <p>
              <strong>{pipelineData.portfolioInput.inputCount}</strong> open positions analyzed → 
              <strong className="text-red-400 ml-1">{pipelineData.exitRecommendations.EXIT.length}</strong> EXIT recommendations,
              <strong className="text-orange-400 ml-1">{pipelineData.exitRecommendations.TRIM.length}</strong> TRIM,
              <strong className="text-amber-400 ml-1">{pipelineData.exitRecommendations.WATCH.length}</strong> WATCH,
              <strong className="text-emerald-400 ml-1">{pipelineData.exitRecommendations.HOLD.length}</strong> HOLD
            </p>
            <p>
              Most common exit signals: 
              {pipelineData.exitStrategyEvaluations
                .sort((a, b) => b.outputCount - a.outputCount)
                .slice(0, 3)
                .map(e => ` ${e.name} (${e.outputCount})`)
                .join(', ')
              }
            </p>
          </div>
        </div>
      </div>

      {/* Detail panel for clicked stages */}
      <PipelineDetailPanel
        stageDetails={selectedStage as any}
        onClose={handleModalClose}
      />
    </div>
  );
}