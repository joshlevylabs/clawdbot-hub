'use client';

import { useState, useEffect } from 'react';
import { 
  RefreshCcw, 
  Clock, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  Target,
  Eye,
  Activity
} from 'lucide-react';

interface ChrisAction {
  priority: "high" | "medium" | "low";
  action: string;
  ticker?: string;
  price_level?: string;
  rationale: string;
}

interface PositionReview {
  ticker: string;
  current_assessment: "hold" | "watch" | "trim" | "exit";
  note: string;
}

interface ChrisActionsData {
  date: string;
  market_assessment: string;
  pre_market_actions: ChrisAction[];
  market_hours_actions: ChrisAction[];
  positions_review: PositionReview[];
  watchlist: string[];
  risk_warnings: string[];
  generated_at?: string;
}

const getPriorityBadge = (priority: string) => {
  const getBadgeClasses = (priority: string) => {
    switch (priority) {
      case 'high':
        return "bg-red-600/20 text-red-300 border border-red-500/30";
      case 'medium':
        return "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
      case 'low':
        return "bg-green-600/20 text-green-300 border border-green-500/30";
      default:
        return "bg-slate-600/20 text-slate-300 border border-slate-500/30";
    }
  };

  const getEmoji = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-md font-medium ${getBadgeClasses(priority)}`}>
      {getEmoji(priority)} {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

const getAssessmentIcon = (assessment: string) => {
  switch (assessment) {
    case 'hold':
      return <Shield className="h-4 w-4 text-blue-400" />;
    case 'watch':
      return <Eye className="h-4 w-4 text-yellow-400" />;
    case 'trim':
      return <TrendingUp className="h-4 w-4 text-orange-400" />;
    case 'exit':
      return <AlertTriangle className="h-4 w-4 text-red-400" />;
    default:
      return <Activity className="h-4 w-4 text-gray-400" />;
  }
};

const getAssessmentColor = (assessment: string) => {
  switch (assessment) {
    case 'hold':
      return 'text-blue-400';
    case 'watch':
      return 'text-yellow-400';
    case 'trim':
      return 'text-orange-400';
    case 'exit':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
};

export default function ChrisDailyActions() {
  const [data, setData] = useState<ChrisActionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CACHE_KEY = 'chris-daily-actions';

  const fetchAnalysis = async (refresh: boolean = false) => {
    // Check localStorage cache first (unless explicit refresh)
    if (!refresh) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const cachedData = JSON.parse(cached);
          const today = new Date().toISOString().split('T')[0];
          if (cachedData.date === today && cachedData.market_assessment) {
            setData(cachedData);
            return; // Use cached, no loading spinner
          }
        }
      } catch { /* cache miss */ }
    }

    setLoading(true);
    setError(null);
    
    try {
      const url = `/api/trading/chris-actions${refresh ? '?refresh=true' : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.fallback) {
          setData(errorData.fallback);
          setError(errorData.detail || 'Analysis temporarily unavailable');
        } else {
          throw new Error(errorData.detail || errorData.error || 'Failed to fetch analysis');
        }
      } else {
        const result = await response.json();
        setData(result);
        setError(null);
        // Cache in localStorage
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch { /* quota */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch Chris actions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return '';
    }
  };

  if (!data && loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <span className="ml-3 text-slate-400">Loading Chris's analysis...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg">
        <div className="p-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-slate-300">Chris's analysis is unavailable</p>
            <p className="text-slate-500 text-sm">{error}</p>
            <button 
              onClick={() => fetchAnalysis()}
              className="mt-4 px-3 py-1.5 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 rounded-md transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border-2 border-amber-500/20 rounded-lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">🎯 Chris's Actions For Today</h3>
              <p className="text-sm text-slate-400">
                {data?.generated_at ? `Generated at ${formatTimestamp(data.generated_at)}` : 'Ready to analyze'}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-slate-600 rounded-md transition-colors duration-200"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Market Assessment */}
          {data?.market_assessment && (
            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <p className="text-slate-200 text-sm leading-relaxed">"{data.market_assessment}"</p>
            </div>
          )}

          {/* Actions Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pre-Market Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-400" />
                Pre-Market Actions
              </h4>
              {data?.pre_market_actions?.length ? (
                <div className="space-y-2">
                  {data.pre_market_actions.map((action, idx) => (
                    <div key={idx} className="p-3 bg-slate-700/20 rounded border border-slate-600/20">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {action.ticker && <span className="text-blue-400">{action.ticker}: </span>}
                          {action.action}
                        </span>
                        {getPriorityBadge(action.priority)}
                      </div>
                      <p className="text-xs text-slate-400">{action.rationale}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm italic">No pre-market actions</p>
              )}
            </div>

            {/* Market Hours Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-green-400" />
                Market Hours Actions
              </h4>
              {data?.market_hours_actions?.length ? (
                <div className="space-y-2">
                  {data.market_hours_actions.map((action, idx) => (
                    <div key={idx} className="p-3 bg-slate-700/20 rounded border border-slate-600/20">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {action.ticker && <span className="text-blue-400">{action.ticker}: </span>}
                          {action.action}
                          {action.price_level && <span className="text-green-400"> @ {action.price_level}</span>}
                        </span>
                        {getPriorityBadge(action.priority)}
                      </div>
                      <p className="text-xs text-slate-400">{action.rationale}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm italic">No market hours actions</p>
              )}
            </div>
          </div>

          {/* Positions Review */}
          {data?.positions_review?.length ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300 flex items-center">
                <Shield className="h-4 w-4 mr-2 text-purple-400" />
                Positions Review
              </h4>
              <div className="grid gap-2">
                {data.positions_review.map((position, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/20 rounded border border-slate-600/20">
                    <div className="flex items-center space-x-3">
                      {getAssessmentIcon(position.current_assessment)}
                      <span className="text-sm font-medium text-blue-400">{position.ticker}</span>
                      <span className={`text-sm font-medium capitalize ${getAssessmentColor(position.current_assessment)}`}>
                        {position.current_assessment}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-md text-right">{position.note}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Watchlist & Risk Warnings */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Watchlist */}
            {data?.watchlist?.length ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-300 flex items-center">
                  <Eye className="h-4 w-4 mr-2 text-cyan-400" />
                  Watchlist
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.watchlist.map((ticker, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-1 text-xs rounded-md font-medium bg-cyan-600/20 text-cyan-300 border border-cyan-500/30"
                    >
                      {ticker}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Risk Warnings */}
            {data?.risk_warnings?.length ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-300 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-400" />
                  Risk Warnings
                </h4>
                <div className="space-y-2">
                  {data.risk_warnings.map((warning, idx) => (
                    <div key={idx} className="p-2 bg-red-900/20 border border-red-700/30 rounded text-xs text-red-200">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}