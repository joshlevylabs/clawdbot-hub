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

type AdvisorType = 'chris' | 'buffett';

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

// ── Advisor Avatar SVG ──

function ChrisAvatar({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="url(#chris-bg)" />
      {/* Stylized face */}
      <circle cx="24" cy="20" r="10" fill="#fde68a" opacity="0.9" />
      {/* Hair */}
      <path d="M14 18c0-6 4-12 10-12s10 6 10 12c0 0-3-6-10-6s-10 6-10 6z" fill="#92400e" />
      {/* Glasses */}
      <circle cx="20" cy="19" r="3" stroke="#451a03" strokeWidth="1.2" fill="none" />
      <circle cx="28" cy="19" r="3" stroke="#451a03" strokeWidth="1.2" fill="none" />
      <line x1="23" y1="19" x2="25" y2="19" stroke="#451a03" strokeWidth="1" />
      {/* Smile */}
      <path d="M21 23q3 2 6 0" stroke="#451a03" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* Suit */}
      <path d="M10 42c0-8 6-14 14-14s14 6 14 14" fill="#d97706" />
      <path d="M20 28l4 6 4-6" fill="#fbbf24" />
      {/* Chart icon on chest */}
      <polyline points="18,36 21,34 24,37 27,33 30,35" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="chris-bg" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function BuffettAvatar({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="url(#buffett-bg)" />
      {/* Face */}
      <circle cx="24" cy="20" r="10" fill="#fde68a" opacity="0.9" />
      {/* Sparse white hair */}
      <path d="M14 16c1-4 4-8 10-8s9 4 10 8c0 0-2-4-10-3s-10 3-10 3z" fill="#e2e8f0" />
      {/* Glasses */}
      <circle cx="20" cy="19" r="3.5" stroke="#334155" strokeWidth="1.5" fill="none" />
      <circle cx="28" cy="19" r="3.5" stroke="#334155" strokeWidth="1.5" fill="none" />
      <line x1="23.5" y1="19" x2="24.5" y2="19" stroke="#334155" strokeWidth="1.2" />
      {/* Warm smile */}
      <path d="M20 23q4 3 8 0" stroke="#451a03" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* Suit */}
      <path d="M10 42c0-8 6-14 14-14s14 6 14 14" fill="#065f46" />
      <path d="M20 28l4 6 4-6" fill="#10b981" />
      {/* Dollar sign on chest */}
      <text x="24" y="39" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">$</text>
      <defs>
        <linearGradient id="buffett-bg" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Compact Card ──

function AdvisorCard({
  type,
  data,
  loading,
  error,
  onOpen,
  onRefresh,
}: {
  type: AdvisorType;
  data: AdvisorData | null;
  loading: boolean;
  error: string | null;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const isChris = type === 'chris';
  const borderColor = isChris ? 'border-amber-500/30' : 'border-emerald-500/30';
  const hoverBorder = isChris ? 'hover:border-amber-400/50' : 'hover:border-emerald-400/50';
  const accentText = isChris ? 'text-amber-400' : 'text-emerald-400';

  const totalActions = (data?.pre_market_actions?.length || 0) + (data?.market_hours_actions?.length || 0);
  const highPriority = [
    ...(data?.pre_market_actions || []),
    ...(data?.market_hours_actions || []),
  ].filter(a => a.priority === 'high').length;
  const exitPositions = (data?.positions_review || []).filter(p => p.current_assessment === 'exit' || p.current_assessment === 'trim').length;

  const statusLine = data?._stale_guard
    ? 'Signal data expired — refresh needed'
    : data
      ? `${totalActions} action${totalActions !== 1 ? 's' : ''}${highPriority > 0 ? ` · ${highPriority} high priority` : ''}${exitPositions > 0 ? ` · ${exitPositions} exit/trim` : ''}`
      : error
        ? 'Analysis unavailable'
        : 'Loading...';

  return (
    <button
      onClick={onOpen}
      className={`w-full bg-slate-800/50 border ${borderColor} ${hoverBorder} rounded-lg p-4 transition-all duration-200 hover:bg-slate-800/80 group text-left`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isChris ? <ChrisAvatar size={48} /> : <BuffettAvatar size={48} />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              {isChris ? 'Chris Vermeulen' : 'Warren Buffett'}
            </h3>
            {data?.signal_timestamp && !data._stale_guard && (
              <SignalFreshnessBadge signalTimestamp={data.signal_timestamp} compact />
            )}
            {data?._stale_guard && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-900/30 text-red-400 border border-red-700/30">
                Expired
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isChris ? 'Technical Strategist' : 'Value Investor'}
          </p>
          <p className={`text-xs mt-1 ${data?._stale_guard ? 'text-red-400' : accentText}`}>
            {loading ? (
              <span className="flex items-center gap-1">
                <RefreshCcw className="h-3 w-3 animate-spin" /> Analyzing...
              </span>
            ) : statusLine}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
      </div>
    </button>
  );
}

// ── Full Modal Content ──

function AdvisorModalContent({
  type,
  data,
  loading,
  error,
  onRefresh,
}: {
  type: AdvisorType;
  data: AdvisorData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const isChris = type === 'chris';
  const accentColor = isChris ? 'text-amber-400' : 'text-emerald-400';

  if (!data && loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isChris ? 'border-amber-400' : 'border-emerald-400'}`} />
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
            {isChris ? `"${data.market_assessment}"` : `\u201c${data.market_assessment}\u201d`}
          </p>
        </div>
      )}

      {/* Actions Grid */}
      {!data?._stale_guard && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Pre-Market */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300 flex items-center">
              <Clock className={`h-4 w-4 mr-2 ${accentColor}`} />
              {isChris ? 'Pre-Market Actions' : 'Pre-Market Considerations'}
            </h4>
            {data?.pre_market_actions?.length ? (
              <div className="space-y-2">
                {data.pre_market_actions.map((action, idx) => (
                  <div key={idx} className="p-3 bg-slate-700/20 rounded border border-slate-600/20">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-white">
                        {action.ticker && <span className={accentColor}>{action.ticker}: </span>}
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
              <TrendingUp className={`h-4 w-4 mr-2 ${isChris ? 'text-green-400' : accentColor}`} />
              Market Hours Actions
            </h4>
            {data?.market_hours_actions?.length ? (
              <div className="space-y-2">
                {data.market_hours_actions.map((action, idx) => (
                  <div key={idx} className="p-3 bg-slate-700/20 rounded border border-slate-600/20">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-white">
                        {action.ticker && <span className={accentColor}>{action.ticker}: </span>}
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
            <Shield className={`h-4 w-4 mr-2 ${accentColor}`} />
            {isChris ? 'Positions Review' : "Positions Review \u2014 Business Owner\u2019s Perspective"}
          </h4>
          <div className="grid gap-2">
            {data.positions_review.map((pos, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/20 rounded border border-slate-600/20">
                <div className="flex items-center space-x-3">
                  {getAssessmentIcon(pos.current_assessment)}
                  <span className={`text-sm font-medium ${accentColor}`}>{pos.ticker}</span>
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
                <Eye className={`h-4 w-4 mr-2 ${isChris ? 'text-cyan-400' : accentColor}`} />
                Watchlist
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.watchlist.map((ticker, idx) => (
                  <span key={idx}
                    className={`px-2 py-1 text-xs rounded-md font-medium ${isChris
                      ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
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
  type,
  data,
  loading,
  error,
  open,
  onClose,
  onRefresh,
}: {
  type: AdvisorType;
  data: AdvisorData | null;
  loading: boolean;
  error: string | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const isChris = type === 'chris';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className={`relative w-full max-w-3xl max-h-[calc(100vh-4rem)] bg-slate-900 border-2 ${isChris ? 'border-amber-500/30' : 'border-emerald-500/30'} rounded-xl shadow-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isChris ? 'border-amber-500/20' : 'border-emerald-500/20'} bg-slate-900`}>
          <div className="flex items-center gap-3">
            {isChris ? <ChrisAvatar size={40} /> : <BuffettAvatar size={40} />}
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isChris ? '🎯 Chris\u2019s Actions For Today' : '🦉 Buffett\u2019s Value Assessment'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {data?.generated_at && <span>Generated at {formatTimestamp(data.generated_at)}</span>}
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AdvisorModalContent
            type={type}
            data={data}
            loading={loading}
            error={error}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Export ──

export default function AdvisorCards() {
  const [chrisData, setChrisData] = useState<AdvisorData | null>(null);
  const [chrisLoading, setChrisLoading] = useState(false);
  const [chrisError, setChrisError] = useState<string | null>(null);

  const [buffettData, setBuffettData] = useState<AdvisorData | null>(null);
  const [buffettLoading, setBuffettLoading] = useState(false);
  const [buffettError, setBuffettError] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState<AdvisorType | null>(null);

  const CHRIS_CACHE = 'chris-daily-actions-v2';
  const BUFFETT_CACHE = 'buffett-daily-actions-v1';
  const CHRIS_KNOWLEDGE = 'chris-vermeulen-v2-10videos';
  const BUFFETT_KNOWLEDGE = 'warren-buffett-v1-portfolio-letters';

  const fetchChris = async (refresh = false) => {
    if (!refresh) {
      try {
        const cached = localStorage.getItem(CHRIS_CACHE);
        if (cached) {
          const c = JSON.parse(cached);
          const today = new Date().toISOString().split('T')[0];
          if (c.date === today && c.knowledge_version === CHRIS_KNOWLEDGE && c.market_assessment && (c.pre_market_actions?.length > 0 || c._stale_guard)) {
            setChrisData(c);
            return;
          }
        }
      } catch { /* miss */ }
    }
    setChrisLoading(true);
    setChrisError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s client timeout
      const r = await fetch(`/api/trading/chris-actions${refresh ? '?refresh=true' : ''}`, { signal: controller.signal });
      clearTimeout(timeout);
      const text = await r.text();
      let json: Record<string, unknown>;
      try { json = JSON.parse(text); } catch { throw new Error(`API returned ${r.status} (non-JSON — possible timeout)`); }
      if (!r.ok) {
        if (json.fallback) {
          setChrisData(json.fallback as AdvisorData);
          setChrisError(json.detail as string);
        } else {
          throw new Error((json.detail || json.error || 'Failed') as string);
        }
      } else {
        setChrisData(json as unknown as AdvisorData);
        setChrisError(null);
        try { localStorage.setItem(CHRIS_CACHE, JSON.stringify(json)); } catch { /* quota */ }
      }
    } catch (e) {
      setChrisError(e instanceof Error ? e.message : 'Unknown error');
    } finally { setChrisLoading(false); }
  };

  const fetchBuffett = async (refresh = false) => {
    if (!refresh) {
      try {
        const cached = localStorage.getItem(BUFFETT_CACHE);
        if (cached) {
          const c = JSON.parse(cached);
          const today = new Date().toISOString().split('T')[0];
          if (c.date === today && c.knowledge_version === BUFFETT_KNOWLEDGE && c.market_assessment && (c.pre_market_actions?.length > 0 || c._stale_guard)) {
            setBuffettData(c);
            return;
          }
        }
      } catch { /* miss */ }
    }
    setBuffettLoading(true);
    setBuffettError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const r = await fetch(`/api/trading/buffett-actions${refresh ? '?refresh=true' : ''}`, { signal: controller.signal });
      clearTimeout(timeout);
      const text = await r.text();
      let json: Record<string, unknown>;
      try { json = JSON.parse(text); } catch { throw new Error(`API returned ${r.status} (non-JSON — possible timeout)`); }
      if (!r.ok) {
        if (json.fallback) {
          setBuffettData(json.fallback as AdvisorData);
          setBuffettError(json.detail as string);
        } else {
          throw new Error((json.detail || json.error || 'Failed') as string);
        }
      } else {
        setBuffettData(json as unknown as AdvisorData);
        setBuffettError(null);
        try { localStorage.setItem(BUFFETT_CACHE, JSON.stringify(json)); } catch { /* quota */ }
      }
    } catch (e) {
      setBuffettError(e instanceof Error ? e.message : 'Unknown error');
    } finally { setBuffettLoading(false); }
  };

  useEffect(() => {
    fetchChris();
    fetchBuffett();
  }, []);

  return (
    <>
      {/* Compact cards side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AdvisorCard
          type="chris"
          data={chrisData}
          loading={chrisLoading}
          error={chrisError}
          onOpen={() => setOpenModal('chris')}
          onRefresh={() => fetchChris(true)}
        />
        <AdvisorCard
          type="buffett"
          data={buffettData}
          loading={buffettLoading}
          error={buffettError}
          onOpen={() => setOpenModal('buffett')}
          onRefresh={() => fetchBuffett(true)}
        />
      </div>

      {/* Modals */}
      <AdvisorModal
        type="chris"
        data={chrisData}
        loading={chrisLoading}
        error={chrisError}
        open={openModal === 'chris'}
        onClose={() => setOpenModal(null)}
        onRefresh={() => fetchChris(true)}
      />
      <AdvisorModal
        type="buffett"
        data={buffettData}
        loading={buffettLoading}
        error={buffettError}
        open={openModal === 'buffett'}
        onClose={() => setOpenModal(null)}
        onRefresh={() => fetchBuffett(true)}
      />
    </>
  );
}
