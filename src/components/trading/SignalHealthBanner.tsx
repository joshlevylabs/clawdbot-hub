'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Activity, Shield } from 'lucide-react';
import { computeFreshness, detectRegimeChange, type FreshnessInfo, type RegimeChangeInfo } from '@/lib/trading/signal-freshness';

interface SignalHealthBannerProps {
  signalTimestamp: string;
  signalVix: number | null;
  signalFearGreed: number;
  /** Total signals in universe */
  totalSignals: number;
  /** Buy signals count */
  buySignals: number;
  /** Number of invalidated signals (if any) */
  invalidatedCount?: number;
  /** Called when user clicks refresh */
  onRefresh?: () => void;
}

export default function SignalHealthBanner({
  signalTimestamp,
  signalVix,
  signalFearGreed,
  totalSignals,
  buySignals,
  invalidatedCount = 0,
  onRefresh,
}: SignalHealthBannerProps) {
  const [freshness, setFreshness] = useState<FreshnessInfo>(() => computeFreshness(signalTimestamp));
  const [regimeChange] = useState<RegimeChangeInfo>(() =>
    // For now, regime change detection uses signal-time values only
    // TODO: Fetch live VIX/F&G for real-time comparison
    detectRegimeChange(signalVix, null, signalFearGreed, null)
  );

  // Refresh freshness every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFreshness(computeFreshness(signalTimestamp));
    }, 60_000);
    return () => clearInterval(interval);
  }, [signalTimestamp]);

  // Don't show banner if everything is fresh and normal
  if (freshness.tier === 'fresh' && !regimeChange.changed && invalidatedCount === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/30 text-xs">
        <Activity className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-slate-400">
          {freshness.emoji} Signals fresh ({freshness.ageLabel}) • {totalSignals} assets • {buySignals} BUY signals
        </span>
      </div>
    );
  }

  // Show warning banner
  const isUrgent = freshness.tier === 'stale' || !freshness.isActionable;
  const borderClass = isUrgent ? 'border-red-700/50' : freshness.tier === 'old' ? 'border-orange-700/50' : 'border-yellow-700/50';
  const bgClass = isUrgent ? 'bg-red-900/20' : freshness.tier === 'old' ? 'bg-orange-900/20' : 'bg-yellow-900/20';

  return (
    <div className={`rounded-lg ${bgClass} border ${borderClass} p-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          {isUrgent ? (
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          ) : (
            <Shield className={`h-4 w-4 ${freshness.color} mt-0.5 flex-shrink-0`} />
          )}
          <div className="space-y-1">
            {/* Freshness warning */}
            {freshness.warningMessage && (
              <p className={`text-xs ${freshness.color}`}>
                {freshness.emoji} {freshness.warningMessage}
              </p>
            )}
            {/* Invalidation notice */}
            {invalidatedCount > 0 && (
              <p className="text-xs text-red-300">
                ⛔ {invalidatedCount} BUY signal{invalidatedCount > 1 ? 's' : ''} auto-downgraded to WATCH due to staleness.
              </p>
            )}
            {/* Regime change warning */}
            {regimeChange.changed && regimeChange.message && (
              <p className="text-xs text-amber-300">
                {regimeChange.message}
              </p>
            )}
            {/* Stats line */}
            <p className="text-xs text-slate-500">
              {totalSignals} assets scanned • {buySignals} actionable BUY signals • Generated {new Date(signalTimestamp).toLocaleString()}
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 rounded-md transition-colors"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}
