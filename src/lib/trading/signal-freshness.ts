/**
 * Signal Freshness & Reliability Layer (P0-1)
 * 
 * Provides freshness computation, auto-invalidation, and regime change detection
 * for MRE signal data.
 * 
 * Freshness Tiers:
 *   🟢 FRESH:  <= 30 minutes
 *   🟡 AGING:  30 min – 3 hours
 *   🟠 OLD:    3 – 6 hours
 *   🔴 STALE:  > 6 hours (display warning, consider non-actionable)
 * 
 * Auto-invalidation: Signals > 8 hours old are downgraded to WATCH.
 * 
 * Regime Change Detection:
 *   - VIX moves > 15% from signal-time value → flag
 *   - Fear & Greed shifts > 10 points from signal-time value → flag
 */

export type FreshnessTier = 'fresh' | 'aging' | 'old' | 'stale';

export interface FreshnessInfo {
  tier: FreshnessTier;
  ageMinutes: number;
  ageLabel: string; // e.g. "12 min ago", "3.2 hours ago"
  emoji: string;
  color: string; // tailwind color class
  bgColor: string; // tailwind bg color class
  borderColor: string;
  isActionable: boolean; // false if stale (> 8h)
  warningMessage: string | null;
}

export interface RegimeChangeInfo {
  changed: boolean;
  triggers: string[];
  vixDelta: number | null;
  fgDelta: number | null;
  message: string | null;
}

export interface SignalHealthStatus {
  freshness: FreshnessInfo;
  regimeChange: RegimeChangeInfo;
  signalTimestamp: string;
  generatedAt: string;
  totalSignals: number;
  buySignals: number;
  invalidatedCount: number;
}

// ── Freshness Thresholds (in minutes) ──
const FRESH_MAX_MIN = 30;
const AGING_MAX_MIN = 180; // 3 hours
const OLD_MAX_MIN = 360; // 6 hours
const STALE_INVALIDATION_MIN = 480; // 8 hours → auto-downgrade

// ── Regime Change Thresholds ──
const VIX_CHANGE_THRESHOLD_PCT = 15; // 15% relative change
const FG_CHANGE_THRESHOLD_PTS = 10; // 10 absolute points

/**
 * Compute freshness tier from signal timestamp.
 * 
 * Handles timezone-naive timestamps by checking if the parsed time
 * is unreasonably far in the future (which indicates local-time-as-UTC mismatch).
 * Signal generator outputs UTC timestamps with '+00:00' suffix (fixed March 2026).
 * Legacy timestamps without timezone info are handled gracefully.
 */
export function computeFreshness(signalTimestamp: string): FreshnessInfo {
  let signalTime = new Date(signalTimestamp);
  const now = new Date();
  
  // Handle timezone-naive timestamps (legacy: generated in PST without tz suffix).
  // On Vercel serverless (UTC env), `new Date('2026-03-04T09:06:37')` is parsed as
  // UTC 09:06, but the signal was actually generated at PST 09:06 = UTC 17:06.
  // This makes signals appear ~8h older than reality on the server.
  // 
  // Detection: if typeof window === 'undefined' (server-side) AND no tz info in
  // timestamp AND TZ env is UTC (Vercel), apply Pacific offset correction.
  // On the browser (local TZ = Pacific), parsing is already correct.
  if (!signalTimestamp.includes('Z') && !signalTimestamp.includes('+') && !signalTimestamp.match(/-\d{2}:\d{2}$/)) {
    const isServer = typeof window === 'undefined';
    if (isServer) {
      // Server (Vercel = UTC): add Pacific offset to correct naive timestamp.
      // PDT (Mar-Nov) = UTC-7, PST (Nov-Mar) = UTC-8
      const month = signalTime.getUTCMonth(); // 0-indexed
      const isPDT = month >= 2 && month <= 10; // Rough heuristic
      const offsetHours = isPDT ? 7 : 8;
      signalTime = new Date(signalTime.getTime() + offsetHours * 60 * 60 * 1000);
    }
    // Browser: V8 parses timezone-naive as local time, which is already correct.
  }
  
  const ageMs = now.getTime() - signalTime.getTime();
  const ageMinutes = Math.max(0, ageMs / (1000 * 60));

  const ageLabel = ageMinutes < 1
    ? 'just now'
    : ageMinutes < 60
      ? `${Math.round(ageMinutes)} min ago`
      : ageMinutes < 1440
        ? `${(ageMinutes / 60).toFixed(1)}h ago`
        : `${Math.round(ageMinutes / 1440)}d ago`;

  if (ageMinutes <= FRESH_MAX_MIN) {
    return {
      tier: 'fresh',
      ageMinutes,
      ageLabel,
      emoji: '🟢',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/20',
      borderColor: 'border-emerald-700/30',
      isActionable: true,
      warningMessage: null,
    };
  }

  if (ageMinutes <= AGING_MAX_MIN) {
    return {
      tier: 'aging',
      ageMinutes,
      ageLabel,
      emoji: '🟡',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-700/30',
      isActionable: true,
      warningMessage: `Signals are ${ageLabel}. Consider refreshing before trading.`,
    };
  }

  if (ageMinutes <= OLD_MAX_MIN) {
    return {
      tier: 'old',
      ageMinutes,
      ageLabel,
      emoji: '🟠',
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
      borderColor: 'border-orange-700/30',
      isActionable: true,
      warningMessage: `Signals are ${ageLabel}. Market conditions may have changed. Refresh recommended.`,
    };
  }

  // Stale
  return {
    tier: 'stale',
    ageMinutes,
    ageLabel,
    emoji: '🔴',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-700/30',
    isActionable: ageMinutes < STALE_INVALIDATION_MIN,
    warningMessage: ageMinutes >= STALE_INVALIDATION_MIN
      ? `Signals are ${ageLabel} and have been auto-invalidated. All BUY signals downgraded to WATCH. Do not trade on stale data.`
      : `Signals are ${ageLabel}. Data may be unreliable. Refresh before making any decisions.`,
  };
}

/**
 * Check for regime change between signal-time values and current/latest known values.
 * 
 * @param signalVix - VIX at signal generation time
 * @param currentVix - Current/latest VIX (null if unavailable)
 * @param signalFg - Fear & Greed at signal generation time
 * @param currentFg - Current/latest Fear & Greed (null if unavailable)
 */
export function detectRegimeChange(
  signalVix: number | null,
  currentVix: number | null,
  signalFg: number,
  currentFg: number | null,
): RegimeChangeInfo {
  const triggers: string[] = [];
  let vixDelta: number | null = null;
  let fgDelta: number | null = null;

  if (signalVix != null && currentVix != null && signalVix > 0) {
    vixDelta = ((currentVix - signalVix) / signalVix) * 100;
    if (Math.abs(vixDelta) > VIX_CHANGE_THRESHOLD_PCT) {
      triggers.push(
        `VIX moved ${vixDelta > 0 ? '+' : ''}${vixDelta.toFixed(1)}% since signal generation (${signalVix.toFixed(1)} → ${currentVix.toFixed(1)})`
      );
    }
  }

  if (currentFg != null) {
    fgDelta = currentFg - signalFg;
    if (Math.abs(fgDelta) > FG_CHANGE_THRESHOLD_PTS) {
      triggers.push(
        `Fear & Greed shifted ${fgDelta > 0 ? '+' : ''}${fgDelta.toFixed(1)} points since signal generation (${signalFg.toFixed(0)} → ${currentFg.toFixed(0)})`
      );
    }
  }

  const changed = triggers.length > 0;

  return {
    changed,
    triggers,
    vixDelta,
    fgDelta,
    message: changed
      ? `⚠️ Regime may have changed — re-validate all signals. ${triggers.join('. ')}`
      : null,
  };
}

/**
 * Apply auto-invalidation to signals array.
 * Signals older than STALE_INVALIDATION_MIN (8h) have BUY downgraded to WATCH.
 * Returns the modified array and count of invalidated signals.
 */
export function applyAutoInvalidation<T extends { signal: string }>(
  signals: T[],
  signalTimestamp: string,
): { signals: T[]; invalidatedCount: number } {
  const freshness = computeFreshness(signalTimestamp);
  
  if (freshness.isActionable) {
    return { signals, invalidatedCount: 0 };
  }

  let invalidatedCount = 0;
  const invalidated = signals.map(sig => {
    if (sig.signal === 'BUY') {
      invalidatedCount++;
      return { ...sig, signal: 'WATCH', _invalidated: true, _originalSignal: 'BUY' };
    }
    return sig;
  });

  return { signals: invalidated as T[], invalidatedCount };
}

/**
 * Check if we're in market hours (US Eastern, M-F, 9:30 AM - 4:00 PM).
 * Used by refresh cron to determine if signals should be refreshed.
 */
export function isMarketHours(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeMinutes = hours * 60 + minutes;

  if (day === 0 || day === 6) return false; // Weekend
  if (timeMinutes < 9 * 60 + 30) return false; // Before 9:30 AM
  if (timeMinutes > 16 * 60) return false; // After 4:00 PM
  return true;
}

/**
 * Check if we're in extended hours (pre-market 6AM or after-hours until 8PM ET).
 */
export function isExtendedHours(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const hours = et.getHours();

  if (day === 0 || day === 6) return false;
  return hours >= 6 && hours <= 20;
}
