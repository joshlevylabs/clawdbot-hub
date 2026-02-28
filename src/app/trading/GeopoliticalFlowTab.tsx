"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  AlertTriangle,
  Target,
  Layers,
  Shield,
  Flame,
  Globe,
  DollarSign,
} from "lucide-react";
import WorkflowNode from "@/components/WorkflowNode";
import PipelineDetailPanel from "@/components/PipelineDetailPanel";

// Interface for geopolitical signal data
interface GeopoliticalSignal {
  name: string;
  status: 'ESCALATION' | 'DE-ESCALATION' | 'MIXED' | 'ELEVATED' | 'CONTAINED';
  score: number;
  data: any;
  detail: string;
}

interface SectorRecommendation {
  sector: string;
  tickers: string[];
  rationale: string;
  conviction: number;
}

interface Scenario {
  name: string;
  probability: number;
  description: string;
  oil_target: string;
  market_impact: string;
  positioning: string;
}

interface Watchpoint {
  indicator: string;
  current: string;
  escalation_trigger: string;
  deescalation_trigger: string;
}

interface BlocExposure {
  us_israel: {
    companies: Array<{
      ticker: string;
      name: string;
      exposure: string;
      risk: 'HIGH' | 'CRITICAL' | 'BENEFICIARY';
    }>;
  };
  china_russia_iran: {
    companies: Array<{
      ticker: string;
      name: string;
      exposure: string;
      risk: 'HIGH' | 'CRITICAL';
    }>;
    dependency: string;
  };
}

interface GeopoliticalData {
  timestamp: string;
  conflict: string;
  overall_regime: 'ESCALATION' | 'DE-ESCALATION' | 'MIXED' | 'CONTAINED';
  escalation_score: number;
  signals: Record<string, GeopoliticalSignal>;
  sector_recommendations: {
    OVERWEIGHT: SectorRecommendation[];
    UNDERWEIGHT: SectorRecommendation[];
    MONITOR: SectorRecommendation[];
  };
  scenarios: Scenario[];
  key_watchpoints: Watchpoint[];
  bloc_exposure: BlocExposure;
}

interface StageDetails {
  name: string;
  description: string;
  stageType: 'input' | 'filter' | 'modifier' | 'output';
  inputCount: number;
  outputCount: number;
  filteredTickers: any[];
  passedTickers: any[];
  rawData?: any;
}

export default function GeopoliticalFlowTab() {
  const [data, setData] = useState<GeopoliticalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<StageDetails | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/geopolitical-signals.json');
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error('Failed to load geopolitical data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStageClick = (stageKey: string) => {
    if (!data) return;

    let stageDetails: StageDetails;
    
    switch (stageKey) {
      case 'input':
        stageDetails = {
          name: '7 Geopolitical Signals',
          description: 'Raw signal inputs from oil markets, defense spending, diplomatic channels, military posture, safe haven flows, VIX fear, and Strait of Hormuz status',
          stageType: 'input',
          inputCount: 7,
          outputCount: 7,
          filteredTickers: [],
          passedTickers: Object.entries(data.signals).map(([key, signal]) => ({
            symbol: key.toUpperCase(),
            signal: signal.status,
            signalStrength: signal.score,
            reason: signal.detail,
            rawData: signal
          }))
        };
        break;

      case 'consensus':
        stageDetails = {
          name: 'Consensus Gate',
          description: `Aggregates all 7 signals into unified escalation score: ${data.escalation_score}/100`,
          stageType: 'filter',
          inputCount: 7,
          outputCount: 1,
          filteredTickers: [],
          passedTickers: [{
            symbol: 'CONSENSUS',
            signal: data.overall_regime,
            signalStrength: data.escalation_score,
            reason: `${data.escalation_score}/100 escalation score indicates ${data.overall_regime} regime`,
            rawData: data
          }]
        };
        break;

      case 'regime':
        stageDetails = {
          name: 'Regime Classification',
          description: `Current regime: ${data.overall_regime} based on ${data.escalation_score}/100 escalation score`,
          stageType: 'filter',
          inputCount: 1,
          outputCount: 1,
          filteredTickers: [],
          passedTickers: [{
            symbol: 'REGIME',
            signal: data.overall_regime,
            signalStrength: data.escalation_score,
            reason: `Classified as ${data.overall_regime} regime`,
            rawData: data
          }]
        };
        break;

      case 'rotation':
        const totalRecs = data.sector_recommendations.OVERWEIGHT.length + 
                         data.sector_recommendations.UNDERWEIGHT.length + 
                         data.sector_recommendations.MONITOR.length;
        stageDetails = {
          name: 'Sector Rotation Engine',
          description: `Maps ${data.overall_regime} regime to sector positioning: ${data.sector_recommendations.OVERWEIGHT.length} overweight, ${data.sector_recommendations.UNDERWEIGHT.length} underweight, ${data.sector_recommendations.MONITOR.length} monitor`,
          stageType: 'modifier',
          inputCount: 1,
          outputCount: totalRecs,
          filteredTickers: [],
          passedTickers: [
            ...data.sector_recommendations.OVERWEIGHT.map(rec => ({
              symbol: rec.sector,
              signal: 'OVERWEIGHT',
              signalStrength: rec.conviction,
              reason: rec.rationale,
              rawData: rec
            })),
            ...data.sector_recommendations.UNDERWEIGHT.map(rec => ({
              symbol: rec.sector,
              signal: 'UNDERWEIGHT',
              signalStrength: rec.conviction,
              reason: rec.rationale,
              rawData: rec
            })),
            ...data.sector_recommendations.MONITOR.map(rec => ({
              symbol: rec.sector,
              signal: 'MONITOR',
              signalStrength: rec.conviction,
              reason: rec.rationale,
              rawData: rec
            }))
          ]
        };
        break;

      case 'output':
        stageDetails = {
          name: 'Portfolio Actions',
          description: 'Final BUY/SELL/ROTATE recommendations based on geopolitical regime',
          stageType: 'output',
          inputCount: data.sector_recommendations.OVERWEIGHT.length + data.sector_recommendations.UNDERWEIGHT.length,
          outputCount: data.sector_recommendations.OVERWEIGHT.length + data.sector_recommendations.UNDERWEIGHT.length,
          filteredTickers: [],
          passedTickers: [
            ...data.sector_recommendations.OVERWEIGHT.flatMap(rec => 
              rec.tickers.map(ticker => ({
                symbol: ticker,
                signal: 'BUY',
                signalStrength: rec.conviction,
                reason: `OVERWEIGHT ${rec.sector}: ${rec.rationale}`,
                rawData: rec
              }))
            ),
            ...data.sector_recommendations.UNDERWEIGHT.flatMap(rec => 
              rec.tickers.map(ticker => ({
                symbol: ticker,
                signal: 'SELL',
                signalStrength: rec.conviction,
                reason: `UNDERWEIGHT ${rec.sector}: ${rec.rationale}`,
                rawData: rec
              }))
            )
          ]
        };
        break;

      default:
        // Individual signal nodes
        const signal = data.signals[stageKey];
        if (signal) {
          stageDetails = {
            name: signal.name,
            description: signal.detail,
            stageType: 'filter',
            inputCount: 1,
            outputCount: 1,
            filteredTickers: [],
            passedTickers: [{
              symbol: stageKey.toUpperCase(),
              signal: signal.status,
              signalStrength: signal.score,
              reason: signal.detail,
              rawData: signal
            }]
          };
        } else {
          return;
        }
        break;
    }
    
    setSelectedStage(stageDetails);
  };

  const handleModalClose = () => {
    setSelectedStage(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ESCALATION':
        return 'text-red-400 bg-red-500/20 border-red-500/40';
      case 'DE-ESCALATION':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
      case 'MIXED':
      case 'ELEVATED':
        return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
      case 'CONTAINED':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/40';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500/40';
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'OVERWEIGHT':
        return 'border-emerald-500/40 bg-emerald-500/10';
      case 'UNDERWEIGHT':
        return 'border-red-500/40 bg-red-500/10';
      case 'MONITOR':
        return 'border-amber-500/40 bg-amber-500/10';
      default:
        return 'border-slate-500/40 bg-slate-500/10';
    }
  };

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading geopolitical signals...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center text-slate-400">
          <Globe className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p>No geopolitical data available</p>
        </div>
      </div>
    );
  }

  const signals = Object.entries(data.signals);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Globe className="w-6 h-6 text-red-400" />
            Geopolitical Signal Pipeline
          </h2>
          <div className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(data.overall_regime)}`}>
            {data.overall_regime} ({data.escalation_score}/100)
          </div>
        </div>
        
        <div className="text-sm text-slate-400">
          {data.conflict} • {new Date(data.timestamp).toLocaleDateString()}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">OVERWEIGHT</span>
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {data.sector_recommendations.OVERWEIGHT.length}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">UNDERWEIGHT</span>
          </div>
          <div className="text-xl font-bold text-red-400">
            {data.sector_recommendations.UNDERWEIGHT.length}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">MONITOR</span>
          </div>
          <div className="text-xl font-bold text-amber-400">
            {data.sector_recommendations.MONITOR.length}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">Escalation Score</span>
          </div>
          <div className="text-xl font-bold text-red-400">
            {data.escalation_score}/100
          </div>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6 mb-8">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary-400" />
          Signal Pipeline Flow
        </h3>
        
        <div className="relative overflow-x-auto">
          <div className="flex items-center gap-6 min-w-max pb-4">
            {/* Input Node */}
            <WorkflowNode
              name="7 Geopolitical Signals"
              description="Raw signal inputs"
              inputCount={0}
              outputCount={7}
              nodeType="input"
              onClick={() => handleStageClick('input')}
              refreshFrequency="Manual"
            />

            {/* Signal Strategy Nodes */}
            {signals.map(([key, signal]) => (
              <WorkflowNode
                key={key}
                name={signal.name}
                description={`Score: ${signal.score}`}
                inputCount={1}
                outputCount={1}
                nodeType="strategy"
                confidence={signal.score}
                onClick={() => handleStageClick(key)}
                className={`${getStatusColor(signal.status)} border-2`}
                refreshFrequency={key === 'vix_fear' || key === 'defense_momentum' || key === 'gold_safe_haven' ? 'Intraday' : key === 'oil_price_shock' || key === 'hormuz_flow' ? 'Hourly' : 'Event-driven'}
              />
            ))}

            {/* Consensus Gate */}
            <WorkflowNode
              name="Consensus Gate"
              description={`Escalation: ${data.escalation_score}/100`}
              inputCount={7}
              outputCount={1}
              nodeType="consensus"
              confidence={data.escalation_score}
              onClick={() => handleStageClick('consensus')}
              refreshFrequency="On signal update"
            />

            {/* Regime Classification */}
            <WorkflowNode
              name="Regime Classification"
              description={data.overall_regime}
              inputCount={1}
              outputCount={1}
              nodeType="filter"
              onClick={() => handleStageClick('regime')}
              className={`${getStatusColor(data.overall_regime)} border-2`}
              refreshFrequency="On signal update"
            />

            {/* Sector Rotation Engine */}
            <WorkflowNode
              name="Sector Rotation Engine"
              description="Maps to sectors"
              inputCount={1}
              outputCount={data.sector_recommendations.OVERWEIGHT.length + data.sector_recommendations.UNDERWEIGHT.length + data.sector_recommendations.MONITOR.length}
              nodeType="modifier"
              onClick={() => handleStageClick('rotation')}
              refreshFrequency="On regime change"
            />

            {/* Portfolio Actions */}
            <WorkflowNode
              name="Portfolio Actions"
              description="BUY/SELL/ROTATE"
              inputCount={data.sector_recommendations.OVERWEIGHT.length + data.sector_recommendations.UNDERWEIGHT.length}
              outputCount={data.sector_recommendations.OVERWEIGHT.length + data.sector_recommendations.UNDERWEIGHT.length}
              nodeType="output"
              onClick={() => handleStageClick('output')}
              refreshFrequency="On regime change"
            />
          </div>
        </div>
      </div>

      {/* Scenarios Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <h3 className="col-span-full text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
          <Target className="w-5 h-5 text-accent-400" />
          Scenario Probabilities
        </h3>
        {data.scenarios.map((scenario) => (
          <div key={scenario.name} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-slate-100">{scenario.name}</h4>
              <span className="text-lg font-bold text-primary-400">{scenario.probability}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
              <div 
                className="bg-primary-500 h-2 rounded-full" 
                style={{ width: `${scenario.probability}%` }}
              />
            </div>
            <p className="text-sm text-slate-400 mb-2">{scenario.description}</p>
            <div className="space-y-1">
              <div className="text-xs text-amber-400">Oil: {scenario.oil_target}</div>
              <div className="text-xs text-slate-400">{scenario.market_impact}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Key Watchpoints */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 mb-8">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            Key Watchpoints
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left p-4 text-slate-300">Indicator</th>
                <th className="text-left p-4 text-slate-300">Current</th>
                <th className="text-left p-4 text-slate-300">Escalation Trigger</th>
                <th className="text-left p-4 text-slate-300">De-escalation Trigger</th>
              </tr>
            </thead>
            <tbody>
              {data.key_watchpoints.map((watchpoint, idx) => (
                <tr key={idx} className="border-b border-slate-700/30">
                  <td className="p-4 text-slate-100">{watchpoint.indicator}</td>
                  <td className="p-4 text-slate-300">{watchpoint.current}</td>
                  <td className="p-4 text-red-400">{watchpoint.escalation_trigger}</td>
                  <td className="p-4 text-emerald-400">{watchpoint.deescalation_trigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector Recommendations */}
      <div className="space-y-6 mb-8">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          Sector Recommendations
        </h3>
        
        {(['OVERWEIGHT', 'UNDERWEIGHT', 'MONITOR'] as const).map((type) => (
          <div key={type}>
            <h4 className="text-md font-medium text-slate-200 mb-3">{type}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.sector_recommendations[type].map((rec) => (
                <div key={rec.sector} className={`p-4 rounded-lg border ${getRecommendationColor(type)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-slate-100">{rec.sector}</h5>
                    <span className="text-sm font-bold text-primary-400">{rec.conviction}%</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{rec.rationale}</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.tickers.map((ticker) => (
                      <span key={ticker} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">
                        {ticker}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bloc Exposure Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              US/Israel Bloc Exposure
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {data.bloc_exposure.us_israel.companies.map((company) => (
              <div key={company.ticker} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div>
                  <div className="font-medium text-slate-100">{company.ticker}</div>
                  <div className="text-sm text-slate-400">{company.name}</div>
                  <div className="text-xs text-slate-500">{company.exposure}</div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  company.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                  company.risk === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {company.risk}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-400" />
              China/Russia/Iran Bloc Exposure
            </h3>
          </div>
          <div className="p-4">
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{data.bloc_exposure.china_russia_iran.dependency}</p>
            </div>
            <div className="space-y-3">
              {data.bloc_exposure.china_russia_iran.companies.map((company) => (
                <div key={company.ticker} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-100">{company.ticker}</div>
                    <div className="text-sm text-slate-400">{company.name}</div>
                    <div className="text-xs text-slate-500">{company.exposure}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    company.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {company.risk}
                  </div>
                </div>
              ))}
            </div>
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