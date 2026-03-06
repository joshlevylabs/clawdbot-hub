'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCcw,
  Clock,
  TrendingUp,
  Shield,
  AlertTriangle,
  Target,
  Eye,
  Activity,
  Landmark,
  X,
  ChevronRight,
} from 'lucide-react';
import SignalFreshnessBadge from './SignalFreshnessBadge';

// ── Types ──

interface AdvisorAction {
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

interface AdvisorData {
  date: string;
  market_assessment: string;
  pre_market_actions: AdvisorAction[];
  market_hours_actions: AdvisorAction[];
  positions_review: PositionReview[];
  watchlist: string[];
  risk_warnings: string[];
  generated_at?: string;
  signal_timestamp?: string;
  signal_freshness?: { tier: string; ageLabel: string; isActionable: boolean };
  knowledge_version?: string;
  disclaimer?: string;
  validation?: { warnings: string[]; errors: string[] };
  _stale_guard?: boolean;
}

// ── Advisor Config ──

interface AdvisorConfig {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  borderColor: string;
  hoverBorder: string;
  accentText: string;
  accentBg: string;
  spinnerBorder: string;
  gradient: [string, string];
  avatarColors: {
    suit: string;
    accent: string;
    hair: string;
    extra?: string;
  };
  apiRoute: string;
  cacheKey: string;
  knowledgeVersion: string;
}

interface AgentPortfolio {
  id: string;
  name: string;
  emoji: string;
  theme: string;
  cashBalance: number;
  positionsValue: number;
  totalEquity: number;
  positionCount: number;
  dailyPnl: number;
  totalPnl: number;
  dailyPnlPct: number;
  totalPnlPct: number;
}

const ADVISORS: AdvisorConfig[] = [
  {
    id: 'chris',
    name: 'Chris Vermeulen',
    subtitle: 'Technical Strategist',
    emoji: '🎯',
    borderColor: 'border-amber-500/30',
    hoverBorder: 'hover:border-amber-400/50',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-600/20',
    spinnerBorder: 'border-amber-400',
    gradient: ['#f59e0b', '#d97706'],
    avatarColors: { suit: '#d97706', accent: '#fbbf24', hair: '#92400e' },
    apiRoute: '/api/trading/chris-actions',
    cacheKey: 'chris-daily-actions-v2',
    knowledgeVersion: 'chris-vermeulen-v2-10videos',
  },
  {
    id: 'buffett',
    name: 'Warren Buffett',
    subtitle: 'Value Investor',
    emoji: '🦉',
    borderColor: 'border-emerald-500/30',
    hoverBorder: 'hover:border-emerald-400/50',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-600/20',
    spinnerBorder: 'border-emerald-400',
    gradient: ['#10b981', '#065f46'],
    avatarColors: { suit: '#065f46', accent: '#10b981', hair: '#e2e8f0' },
    apiRoute: '/api/trading/buffett-actions',
    cacheKey: 'buffett-daily-actions-v1',
    knowledgeVersion: 'warren-buffett-v1-portfolio-letters',
  },
  {
    id: 'schiff',
    name: 'Peter Schiff',
    subtitle: 'Austrian Economist',
    emoji: '🥇',
    borderColor: 'border-yellow-500/30',
    hoverBorder: 'hover:border-yellow-400/50',
    accentText: 'text-yellow-400',
    accentBg: 'bg-yellow-600/20',
    spinnerBorder: 'border-yellow-400',
    gradient: ['#eab308', '#a16207'],
    avatarColors: { suit: '#854d0e', accent: '#facc15', hair: '#44403c', extra: 'gold' },
    apiRoute: '/api/trading/schiff-actions',
    cacheKey: 'schiff-daily-actions-v1',
    knowledgeVersion: 'peter-schiff-v1',
  },
  {
    id: 'pal',
    name: 'Raoul Pal',
    subtitle: 'Global Macro',
    emoji: '🌊',
    borderColor: 'border-cyan-500/30',
    hoverBorder: 'hover:border-cyan-400/50',
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-600/20',
    spinnerBorder: 'border-cyan-400',
    gradient: ['#06b6d4', '#0e7490'],
    avatarColors: { suit: '#0e7490', accent: '#22d3ee', hair: '#334155' },
    apiRoute: '/api/trading/pal-actions',
    cacheKey: 'pal-daily-actions-v1',
    knowledgeVersion: 'raoul-pal-v1',
  },
  {
    id: 'lynch',
    name: 'Peter Lynch',
    subtitle: 'GARP Investor',
    emoji: '📈',
    borderColor: 'border-violet-500/30',
    hoverBorder: 'hover:border-violet-400/50',
    accentText: 'text-violet-400',
    accentBg: 'bg-violet-600/20',
    spinnerBorder: 'border-violet-400',
    gradient: ['#8b5cf6', '#6d28d9'],
    avatarColors: { suit: '#5b21b6', accent: '#a78bfa', hair: '#78716c' },
    apiRoute: '/api/trading/lynch-actions',
    cacheKey: 'lynch-daily-actions-v1',
    knowledgeVersion: 'peter-lynch-v1',
  },
  {
    id: 'dalio',
    name: 'Ray Dalio',
    subtitle: 'All Weather Strategist',
    emoji: '⚖️',
    borderColor: 'border-orange-500/30',
    hoverBorder: 'hover:border-orange-400/50',
    accentText: 'text-orange-400',
    accentBg: 'bg-orange-600/20',
    spinnerBorder: 'border-orange-400',
    gradient: ['#f97316', '#ea580c'],
    avatarColors: { suit: '#c2410c', accent: '#fb923c', hair: '#9ca3af' },
    apiRoute: '/api/trading/dalio-actions',
    cacheKey: 'dalio-daily-actions-v1',
    knowledgeVersion: 'ray-dalio-v1',
  },
];

// ── Helpers ──

const getPriorityBadge = (priority: string) => {
  const cls = priority === 'high'
    ? "bg-red-600/20 text-red-300 border border-red-500/30"
    : priority === 'medium'
      ? "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30"
      : "bg-green-600/20 text-green-300 border border-green-500/30";
  const emoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
  return (
    <span className={`px-2 py-1 text-xs rounded-md font-medium ${cls}`}>
      {emoji} {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

const getAssessmentIcon = (a: string) => {
  switch (a) {
    case 'hold': return <Shield className="h-4 w-4 text-blue-400" />;
    case 'watch': return <Eye className="h-4 w-4 text-yellow-400" />;
    case 'trim': return <TrendingUp className="h-4 w-4 text-orange-400" />;
    case 'exit': return <AlertTriangle className="h-4 w-4 text-red-400" />;
    default: return <Activity className="h-4 w-4 text-gray-400" />;
  }
};

const getAssessmentColor = (a: string) => {
  switch (a) {
    case 'hold': return 'text-blue-400';
    case 'watch': return 'text-yellow-400';
    case 'trim': return 'text-orange-400';
    case 'exit': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

function formatTimestamp(ts?: string) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  } catch { return ''; }
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

// ── Generic Advisor Avatar ──

function AdvisorAvatar({ config, size = 48 }: { config: AdvisorConfig; size?: number }) {
  const id = config.id;
  const { suit, accent, hair } = config.avatarColors;
  const [g1, g2] = config.gradient;

  // Unique avatar detail per advisor
  const detail = () => {
    switch (id) {
      case 'chris': // Chart icon
        return <polyline points="18,36 21,34 24,37 27,33 30,35" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
      case 'buffett': // Dollar sign
        return <text x="24" y="39" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">$</text>;
      case 'schiff': // Gold bar
        return (<>
          <rect x="19" y="33" width="10" height="6" rx="1" fill="#fbbf24" stroke="#a16207" strokeWidth="0.5" />
          <text x="24" y="38" textAnchor="middle" fill="#854d0e" fontSize="5" fontWeight="bold">Au</text>
        </>);
      case 'pal': // Wave
        return <path d="M16,36 C19,33 21,39 24,36 C27,33 29,39 32,36" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />;
      case 'lynch': // Bar chart
        return (<>
          <rect x="19" y="36" width="3" height="4" fill="#fff" rx="0.5" />
          <rect x="23" y="33" width="3" height="7" fill="#fff" rx="0.5" />
          <rect x="27" y="35" width="3" height="5" fill="#fff" rx="0.5" />
        </>);
      default:
        return null;
    }
  };

  // Hair style varies
  const hairPath = id === 'buffett'
    ? <path d="M14 16c1-4 4-8 10-8s9 4 10 8c0 0-2-4-10-3s-10 3-10 3z" fill={hair} /> // sparse
    : id === 'schiff'
    ? <path d="M14 18c0-6 4-11 10-11s10 5 10 11c0 0-3-7-10-7s-10 7-10 7z" fill={hair} /> // full
    : id === 'pal'
    ? <path d="M15 17c0-5 4-9 9-9s9 4 9 9c0 0-3-5-9-5s-9 5-9 5z" fill={hair} /> // slick
    : id === 'lynch'
    ? <path d="M14 18c0-5 3-10 10-10s10 5 10 10c-1-3-4-6-10-6s-9 3-10 6z" fill={hair} /> // classic
    : <path d="M14 18c0-6 4-12 10-12s10 6 10 12c0 0-3-6-10-6s-10 6-10 6z" fill={hair} />; // chris

  const hasGlasses = ['chris', 'buffett', 'schiff', 'lynch'].includes(id);

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill={`url(#${id}-bg)`} />
      <circle cx="24" cy="20" r="10" fill="#fde68a" opacity="0.9" />
      {hairPath}
      {hasGlasses && <>
        <circle cx="20" cy="19" r="3" stroke="#334155" strokeWidth="1.2" fill="none" />
        <circle cx="28" cy="19" r="3" stroke="#334155" strokeWidth="1.2" fill="none" />
        <line x1="23" y1="19" x2="25" y2="19" stroke="#334155" strokeWidth="1" />
      </>}
      {!hasGlasses && <>
        <circle cx="21" cy="18.5" r="1.2" fill="#334155" />
        <circle cx="27" cy="18.5" r="1.2" fill="#334155" />
      </>}
      <path d="M21 23q3 2 6 0" stroke="#451a03" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d={`M10 42c0-8 6-14 14-14s14 6 14 14`} fill={suit} />
      <path d="M20 28l4 6 4-6" fill={accent} />
      {detail()}
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor={g1} />
          <stop offset="100%" stopColor={g2} />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Compact Card ──

function AdvisorCard({
  config,
  data,
  loading,
  error,
  portfolio,
  onOpen,
  onAgentClick,
}: {
  config: AdvisorConfig;
  data: AdvisorData | null;
  loading: boolean;
  error: string | null;
  portfolio?: AgentPortfolio;
  onOpen: () => void;
  onAgentClick?: (agentId: string) => void;
}) {
  const totalActions = (data?.pre_market_actions?.length || 0) + (data?.market_hours_actions?.length || 0);
  const highPriority = [
    ...(data?.pre_market_actions || []),
    ...(data?.market_hours_actions || []),
  ].filter(a => a.priority === 'high').length;
  const exitPositions = (data?.positions_review || []).filter(p => p.current_assessment === 'exit' || p.current_assessment === 'trim').length;

  const statusLine = data?._stale_guard
    ? 'Signal data expired'
    : data
      ? `${totalActions} action${totalActions !== 1 ? 's' : ''}${highPriority > 0 ? ` · ${highPriority} 🔴` : ''}${exitPositions > 0 ? ` · ${exitPositions} exit` : ''}`
      : error
        ? 'Unavailable'
        : 'Loading...';

  return (
    <div
      className={`w-full bg-slate-800/50 border ${config.borderColor} ${config.hoverBorder} rounded-xl p-4 transition-all duration-200 hover:bg-slate-800/80 group`}
    >
      {/* Top row: avatar + name + chevron */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-shrink-0">
          <AdvisorAvatar config={config} size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white leading-tight">{config.name}</h3>
          <p className="text-[11px] text-slate-500">{config.subtitle}</p>
        </div>
        <button
          onClick={onOpen}
          className="p-1 hover:bg-slate-700/50 rounded-md transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
        </button>
      </div>

      {/* Analysis status row */}
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs ${data?._stale_guard ? 'text-red-400' : config.accentText}`}>
          {loading ? (
            <span className="flex items-center gap-1">
              <RefreshCcw className="h-3 w-3 animate-spin" /> Analyzing…
            </span>
          ) : statusLine}
        </p>
        {data?.signal_timestamp && !data._stale_guard && !loading && (
          <SignalFreshnessBadge signalTimestamp={data.signal_timestamp} compact />
        )}
        {data?._stale_guard && (
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-900/30 text-red-400 border border-red-700/30">
            Expired
          </span>
        )}
      </div>

      {/* Portfolio data */}
      {portfolio && (
        <div className="space-y-2">
          {/* Portfolio equity */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Portfolio</span>
            <div className="text-right">
              <div className={`text-sm font-semibold ${config.accentText}`}>
                {formatCurrency(portfolio.totalEquity)}
              </div>
              <div className="text-xs text-slate-500">
                {portfolio.positionCount} positions
              </div>
            </div>
          </div>

          {/* P&L Performance */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="text-slate-500">Today</div>
              <div className={`font-semibold ${portfolio.dailyPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPercentage(portfolio.dailyPnlPct)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-500">Total</div>
              <div className={`font-semibold ${portfolio.totalPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPercentage(portfolio.totalPnlPct)}
              </div>
            </div>
          </div>

          {/* Action button */}
          {onAgentClick && (
            <button
              onClick={() => onAgentClick(portfolio.id)}
              className={`w-full mt-2 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${config.accentBg} ${config.accentText} hover:bg-opacity-80`}
            >
              View Positions
            </button>
          )}
        </div>
      )}

      {/* Loading portfolio */}
      {!portfolio && (
        <div className="animate-pulse">
          <div className="h-3 bg-slate-700/30 rounded mb-2"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-slate-700/30 rounded flex-1"></div>
            <div className="h-8 bg-slate-700/30 rounded flex-1"></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Full Modal Content ──

function AdvisorModalContent({
  config,
  data,
  loading,
  error,
  onRefresh,
}: {
  config: AdvisorConfig;
  data: AdvisorData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  if (!data && loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${config.spinnerBorder}`} />
        <span className="ml-3 text-slate-400">Loading analysis...</span>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
        <p className="text-slate-300">Analysis unavailable</p>
        <p className="text-slate-500 text-sm">{error}</p>
        <button onClick={onRefresh}
          className="mt-4 px-3 py-1.5 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 rounded-md">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stale guard */}
      {data?._stale_guard && (
        <div className="p-4 bg-red-900/20 rounded-lg border border-red-700/40 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-300">Signal Data Expired</p>
            <p className="text-xs text-red-400/80 mt-1">
              Analysis was not generated because signal data is too old. Refresh signals first.
            </p>
          </div>
        </div>
      )}

      {/* Market Assessment */}
      {data?.market_assessment && !data?._stale_guard && (
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <p className="text-slate-200 text-sm leading-relaxed">
            &ldquo;{data.market_assessment}&rdquo;
          </p>
        </div>
      )}

      {/* Actions Grid */}
      {!data?._stale_guard && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Pre-Market */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300 flex items-center">
              <Clock className={`h-4 w-4 mr-2 ${config.accentText}`} />
              Pre-Market Actions
            </h4>
            {data?.pre_market_actions?.length ? (
              <div className="space-y-2">
                {data.pre_market_actions.map((action, idx) => (
                  <div key={idx} className="p-3 bg-slate-700/20 rounded border border-slate-600/20">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-white">
                        {action.ticker && <span className={config.accentText}>{action.ticker}: </span>}
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

          {/* Market Hours */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300 flex items-center">
              <TrendingUp className={`h-4 w-4 mr-2 ${config.accentText}`} />
              Market Hours Actions
            </h4>
            {data?.market_hours_actions?.length ? (
              <div className="space-y-2">
                {data.market_hours_actions.map((action, idx) => (
                  <div key={idx} className="p-3 bg-slate-700/20 rounded border border-slate-600/20">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-white">
                        {action.ticker && <span className={config.accentText}>{action.ticker}: </span>}
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
      )}

      {/* Positions Review */}
      {!data?._stale_guard && data?.positions_review?.length ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-300 flex items-center">
            <Shield className={`h-4 w-4 mr-2 ${config.accentText}`} />
            Positions Review
          </h4>
          <div className="grid gap-2">
            {data.positions_review.map((pos, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/20 rounded border border-slate-600/20">
                <div className="flex items-center space-x-3">
                  {getAssessmentIcon(pos.current_assessment)}
                  <span className={`text-sm font-medium ${config.accentText}`}>{pos.ticker}</span>
                  <span className={`text-sm font-medium capitalize ${getAssessmentColor(pos.current_assessment)}`}>
                    {pos.current_assessment}
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-md text-right">{pos.note}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Watchlist & Warnings */}
      {!data?._stale_guard && (
        <div className="grid md:grid-cols-2 gap-5">
          {data?.watchlist?.length ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300 flex items-center">
                <Eye className={`h-4 w-4 mr-2 ${config.accentText}`} />
                Watchlist
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.watchlist.map((ticker, idx) => (
                  <span key={idx}
                    className={`px-2 py-1 text-xs rounded-md font-medium ${config.accentBg} ${config.accentText} border ${config.borderColor}`}>
                    {ticker}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

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
      )}

      {/* Validation warnings */}
      {data?.validation?.warnings && data.validation.warnings.length > 0 && (
        <div className="p-2 bg-yellow-900/10 border border-yellow-800/20 rounded text-xs text-yellow-500">
          ⚠️ {data.validation.warnings.length} validation note{data.validation.warnings.length > 1 ? 's' : ''}: {data.validation.warnings[0]}
          {data.validation.warnings.length > 1 && ` (+${data.validation.warnings.length - 1} more)`}
        </div>
      )}

      {/* Disclaimer */}
      {data?.disclaimer && (
        <p className="pt-3 border-t border-slate-700/30 text-[10px] text-slate-600 leading-relaxed">
          {data.disclaimer}
        </p>
      )}
    </div>
  );
}

// ── Modal Shell ──

function AdvisorModal({
  config,
  data,
  loading,
  error,
  open,
  onClose,
  onRefresh,
}: {
  config: AdvisorConfig;
  data: AdvisorData | null;
  loading: boolean;
  error: string | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-3xl max-h-[calc(100vh-4rem)] bg-slate-900 border-2 ${config.borderColor} rounded-xl shadow-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${config.borderColor} bg-slate-900`}>
          <div className="flex items-center gap-3">
            <AdvisorAvatar config={config} size={40} />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {config.emoji} {config.name}&apos;s Analysis
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{config.subtitle}</span>
                {data?.generated_at && <span>· {formatTimestamp(data.generated_at)}</span>}
                {data?.signal_timestamp && <SignalFreshnessBadge signalTimestamp={data.signal_timestamp} compact />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white border border-slate-600 rounded-md transition-colors">
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <AdvisorModalContent config={config} data={data} loading={loading} error={error} onRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
}

// ── Main Export ──

interface AdvisorCardsProps {
  onAgentClick?: (agentId: string) => void;
}

export default function AdvisorCards({ onAgentClick }: AdvisorCardsProps = {}) {
  // State for all advisors
  const [advisorState, setAdvisorState] = useState<Record<string, {
    data: AdvisorData | null;
    loading: boolean;
    error: string | null;
  }>>(
    Object.fromEntries(ADVISORS.map(a => [a.id, { data: null, loading: false, error: null }]))
  );

  // State for portfolio data
  const [portfolios, setPortfolios] = useState<AgentPortfolio[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [portfoliosError, setPortfoliosError] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState<string | null>(null);

  const fetchPortfolios = useCallback(async () => {
    try {
      setPortfoliosLoading(true);
      const response = await fetch('/api/trading/agent-portfolios');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch portfolios');
      }
      
      setPortfolios(data.portfolios || []);
      setPortfoliosError(null);
    } catch (err) {
      console.error('Error fetching agent portfolios:', err);
      setPortfoliosError(err instanceof Error ? err.message : 'Failed to load portfolios');
    } finally {
      setPortfoliosLoading(false);
    }
  }, []);

  const fetchAdvisor = useCallback(async (config: AdvisorConfig, refresh = false) => {
    const { id, apiRoute, cacheKey, knowledgeVersion } = config;

    // Check cache first
    if (!refresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const c = JSON.parse(cached);
          const today = new Date().toISOString().split('T')[0];
          if (c.date === today && c.knowledge_version === knowledgeVersion && c.market_assessment && (c.pre_market_actions?.length > 0 || c._stale_guard)) {
            setAdvisorState(prev => ({ ...prev, [id]: { data: c, loading: false, error: null } }));
            return;
          }
        }
      } catch { /* cache miss */ }
    }

    setAdvisorState(prev => ({ ...prev, [id]: { ...prev[id], loading: true, error: null } }));

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s client timeout
      const r = await fetch(`${apiRoute}${refresh ? '?refresh=true' : ''}`, { signal: controller.signal });
      clearTimeout(timeout);
      const text = await r.text();
      let json: Record<string, unknown>;
      try { json = JSON.parse(text); } catch { throw new Error(`API returned ${r.status} (non-JSON)`); }

      if (!r.ok) {
        if (json.fallback) {
          setAdvisorState(prev => ({
            ...prev,
            [id]: { data: json.fallback as AdvisorData, loading: false, error: json.detail as string }
          }));
        } else {
          throw new Error((json.detail || json.error || 'Failed') as string);
        }
      } else {
        setAdvisorState(prev => ({
          ...prev,
          [id]: { data: json as unknown as AdvisorData, loading: false, error: null }
        }));
        try { localStorage.setItem(cacheKey, JSON.stringify(json)); } catch { /* quota */ }
      }
    } catch (e) {
      setAdvisorState(prev => ({
        ...prev,
        [id]: { ...prev[id], loading: false, error: e instanceof Error ? e.message : 'Unknown error' }
      }));
    }
  }, []);

  // Staggered fetch: load advisors 1s apart to avoid hammering Anthropic API
  useEffect(() => {
    fetchPortfolios(); // Fetch portfolios immediately
    ADVISORS.forEach((advisor, idx) => {
      setTimeout(() => fetchAdvisor(advisor), idx * 2000); // 2s stagger
    });
  }, [fetchAdvisor, fetchPortfolios]);

  const openConfig = openModal ? ADVISORS.find(a => a.id === openModal) : null;

  // Map portfolio data to advisor IDs
  const getPortfolioForAdvisor = useCallback((advisorId: string) => {
    const portfolioId = advisorId === 'chris' ? 'chris-vermeulen' :
                      advisorId === 'buffett' ? 'warren-buffett' :
                      advisorId === 'schiff' ? 'peter-schiff' :
                      advisorId === 'pal' ? 'raoul-pal' :
                      advisorId === 'lynch' ? 'peter-lynch' :
                      advisorId === 'dalio' ? 'ray-dalio' : null;
    
    return portfolioId ? portfolios.find(p => p.id === portfolioId) : undefined;
  }, [portfolios]);

  return (
    <>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-slate-400">AI Trading Desk</span>
        <span className="text-xs text-slate-600">— {ADVISORS.length} advisors with live portfolios</span>
      </div>

      {/* Advisor cards: row of 3 + row of 2 centered on desktop; 2-col on mobile */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ADVISORS.slice(0, 3).map((advisor) => {
            const state = advisorState[advisor.id];
            const portfolio = getPortfolioForAdvisor(advisor.id);
            return (
              <AdvisorCard
                key={advisor.id}
                config={advisor}
                data={state.data}
                loading={state.loading}
                error={state.error}
                portfolio={portfolio}
                onOpen={() => setOpenModal(advisor.id)}
                onAgentClick={onAgentClick}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:max-w-[66.666%] md:mx-auto">
          {ADVISORS.slice(3).map((advisor) => {
            const state = advisorState[advisor.id];
            const portfolio = getPortfolioForAdvisor(advisor.id);
            return (
              <AdvisorCard
                key={advisor.id}
                config={advisor}
                data={state.data}
                loading={state.loading}
                error={state.error}
                portfolio={portfolio}
                onOpen={() => setOpenModal(advisor.id)}
                onAgentClick={onAgentClick}
              />
            );
          })}
        </div>
      </div>

      {/* Summary Stats - taken from AgentPortfolios */}
      {portfolios.length > 0 && !portfoliosLoading && (
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-400 mb-1">Total AUM</div>
              <div className="text-sm font-semibold text-primary-400">
                {formatCurrency(portfolios.reduce((sum, p) => sum + p.totalEquity, 0))}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Avg Return</div>
              <div className="text-sm font-semibold text-slate-100">
                {formatPercentage(portfolios.reduce((sum, p) => sum + p.totalPnlPct, 0) / portfolios.length)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Best Performer</div>
              <div className="text-sm font-semibold text-emerald-400">
                {portfolios.reduce((best, p) => p.totalPnlPct > best.totalPnlPct ? p : best).name.split(' ')[0]}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Total Positions</div>
              <div className="text-sm font-semibold text-slate-100">
                {portfolios.reduce((sum, p) => sum + p.positionCount, 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {openConfig && (
        <AdvisorModal
          config={openConfig}
          data={advisorState[openConfig.id].data}
          loading={advisorState[openConfig.id].loading}
          error={advisorState[openConfig.id].error}
          open={!!openModal}
          onClose={() => setOpenModal(null)}
          onRefresh={() => fetchAdvisor(openConfig, true)}
        />
      )}
    </>
  );
}
