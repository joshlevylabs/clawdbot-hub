'use client';

import { computeFreshness, type FreshnessInfo } from '@/lib/trading/signal-freshness';
import { Clock } from 'lucide-react';

interface SignalFreshnessBadgeProps {
  signalTimestamp: string;
  compact?: boolean;
}

export default function SignalFreshnessBadge({ signalTimestamp, compact = false }: SignalFreshnessBadgeProps) {
  const freshness: FreshnessInfo = computeFreshness(signalTimestamp);

  if (compact) {
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${freshness.bgColor} ${freshness.color} border ${freshness.borderColor}`}
        title={freshness.warningMessage || `Signals generated ${freshness.ageLabel}`}
      >
        {freshness.emoji} {freshness.ageLabel}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${freshness.bgColor} border ${freshness.borderColor}`}>
      <Clock className={`h-3.5 w-3.5 ${freshness.color}`} />
      <span className={freshness.color}>
        {freshness.emoji} Signal data: {freshness.ageLabel}
      </span>
      {!freshness.isActionable && (
        <span className="text-red-300 font-medium ml-1">• AUTO-INVALIDATED</span>
      )}
    </div>
  );
}
