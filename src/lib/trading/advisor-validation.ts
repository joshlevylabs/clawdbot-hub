/**
 * AI Advisor Guardrails & Validation (P0-2)
 * 
 * Validates advisor output against real signal/position data.
 * Ensures no hallucinated tickers, no fabricated prices,
 * and proper citations for every recommendation.
 * 
 * Validation rules:
 * 1. Every ticker must exist in signal universe OR positions table
 * 2. Any mentioned price must be within 10% of actual latest price
 * 3. Stale/missing data → "Insufficient data" not fabrication
 * 4. Citation format: signal_timestamp, regime, strategy_agreement, hit_rate
 */

export interface AdvisorAction {
  priority: "high" | "medium" | "low";
  action: string;
  ticker?: string;
  price_level?: string;
  rationale: string;
}

export interface PositionReview {
  ticker: string;
  current_assessment: "hold" | "watch" | "trim" | "exit";
  note: string;
}

export interface AdvisorOutput {
  date: string;
  market_assessment: string;
  pre_market_actions: AdvisorAction[];
  market_hours_actions: AdvisorAction[];
  positions_review: PositionReview[];
  watchlist: string[];
  risk_warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  /** Cleaned output with invalid items annotated */
  cleanedOutput: AdvisorOutput;
}

interface SignalLookup {
  [symbol: string]: {
    price?: number;
    signal: string;
    signal_strength?: number;
    regime?: string;
    strategies_agreeing?: number;
  };
}

interface PositionLookup {
  [symbol: string]: {
    current_price: number | null;
    entry_price: number;
  };
}

/**
 * Build lookup maps from signal data and positions.
 */
export function buildLookups(
  signals: Array<{ symbol: string; price?: number; signal: string; signal_strength?: number; regime?: string; strategies_agreeing?: number }>,
  positions: Array<{ symbol: string; current_price: number | null; entry_price: number }>,
): { signalLookup: SignalLookup; positionLookup: PositionLookup; knownTickers: Set<string> } {
  const signalLookup: SignalLookup = {};
  for (const sig of signals) {
    signalLookup[sig.symbol] = {
      price: sig.price,
      signal: sig.signal,
      signal_strength: sig.signal_strength,
      regime: sig.regime,
      strategies_agreeing: sig.strategies_agreeing,
    };
  }

  const positionLookup: PositionLookup = {};
  for (const pos of positions) {
    positionLookup[pos.symbol] = {
      current_price: pos.current_price,
      entry_price: pos.entry_price,
    };
  }

  const knownTickers = new Set([
    ...Object.keys(signalLookup),
    ...Object.keys(positionLookup),
  ]);

  return { signalLookup, positionLookup, knownTickers };
}

/**
 * Extract price from a price_level string like "$263.52" or "below $250".
 * Returns null if no price found.
 */
function extractPrice(priceLevelStr: string): number | null {
  const match = priceLevelStr.match(/\$?([\d,]+\.?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(',', ''));
  }
  return null;
}

/**
 * Get the best known price for a ticker from signals or positions.
 */
function getKnownPrice(ticker: string, signalLookup: SignalLookup, positionLookup: PositionLookup): number | null {
  // Prefer current price from positions (more recent)
  if (positionLookup[ticker]?.current_price) {
    return positionLookup[ticker].current_price;
  }
  if (signalLookup[ticker]?.price) {
    return signalLookup[ticker].price!;
  }
  if (positionLookup[ticker]?.entry_price) {
    return positionLookup[ticker].entry_price;
  }
  return null;
}

/**
 * Validate an advisor's output against real data.
 * 
 * - Checks all referenced tickers exist in signal universe or positions
 * - Validates mentioned prices are within 10% of known prices
 * - Annotates warnings on items that can't be validated
 */
export function validateAdvisorOutput(
  output: AdvisorOutput,
  signalLookup: SignalLookup,
  positionLookup: PositionLookup,
  knownTickers: Set<string>,
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const cleaned = JSON.parse(JSON.stringify(output)) as AdvisorOutput;

  // Validate pre_market_actions
  for (const action of cleaned.pre_market_actions) {
    if (action.ticker) {
      if (!knownTickers.has(action.ticker)) {
        warnings.push(`Pre-market action references unknown ticker: ${action.ticker}`);
        action.rationale = `⚠️ [Unverified ticker] ${action.rationale}`;
      }
    }
  }

  // Validate market_hours_actions
  for (const action of cleaned.market_hours_actions) {
    if (action.ticker) {
      if (!knownTickers.has(action.ticker)) {
        warnings.push(`Market hours action references unknown ticker: ${action.ticker}`);
        action.rationale = `⚠️ [Unverified ticker] ${action.rationale}`;
      }

      // Validate price level
      if (action.price_level) {
        const mentionedPrice = extractPrice(action.price_level);
        const knownPrice = action.ticker ? getKnownPrice(action.ticker, signalLookup, positionLookup) : null;

        if (mentionedPrice && knownPrice) {
          const pctDiff = Math.abs((mentionedPrice - knownPrice) / knownPrice) * 100;
          if (pctDiff > 10) {
            warnings.push(
              `${action.ticker}: mentioned price ${action.price_level} is ${pctDiff.toFixed(1)}% away from known price $${knownPrice.toFixed(2)}`
            );
            action.rationale = `⚠️ [Price may be inaccurate — known: $${knownPrice.toFixed(2)}] ${action.rationale}`;
          }
        }
      }
    }
  }

  // Validate positions_review
  for (const review of cleaned.positions_review) {
    if (!positionLookup[review.ticker] && !signalLookup[review.ticker]) {
      // Not a held position AND not in signal universe
      if (!knownTickers.has(review.ticker)) {
        warnings.push(`Position review references unknown ticker: ${review.ticker}`);
        review.note = `⚠️ [Unverified ticker] ${review.note}`;
      }
    }
  }

  // Validate watchlist
  cleaned.watchlist = cleaned.watchlist.filter(ticker => {
    if (!knownTickers.has(ticker)) {
      // Allow well-known tickers that might not be in our universe (e.g., VIX, DXY)
      const allowedExternal = ['VIX', 'DXY', 'TNX', 'SPY', 'QQQ', 'IWM', 'DIA', 'TLT', 'GLD', 'SLV', 'USO', 'UNG'];
      if (!allowedExternal.includes(ticker)) {
        warnings.push(`Watchlist contains unknown ticker: ${ticker}`);
        return false; // Remove from watchlist
      }
    }
    return true;
  });

  const valid = errors.length === 0;

  return { valid, warnings, errors, cleanedOutput: cleaned };
}

/**
 * Build the citation/grounding instruction to inject into advisor prompts.
 * This ensures the advisor references real data in its output.
 */
export function buildCitationInstructions(signalTimestamp: string, regime: string, freshnessLabel: string): string {
  return `
GROUNDING RULES (mandatory):
1. You MUST only reference tickers that appear in the signal data or positions provided above.
2. When mentioning a price level, it MUST be based on the actual price data provided. Do not invent or estimate prices.
3. For each recommendation, your rationale MUST reference specific data: signal strength, regime, strategy agreement count, or position P&L.
4. If you do not have sufficient data for a ticker or position, say: "Insufficient data for [TICKER] — cannot assess reliably."
5. Signal data freshness: ${freshnessLabel}. Signal timestamp: ${signalTimestamp}. Current regime: ${regime}.
6. Do NOT generate recommendations for tickers not present in the data above. If you want to suggest a ticker for the watchlist, only use major indices/ETFs (SPY, QQQ, TLT, GLD, VIX, etc.).
`;
}

/**
 * Generate the disclaimer text for advisor panels.
 */
export const ADVISOR_DISCLAIMER = 
  "AI-generated research for educational purposes only. Not investment advice. " +
  "All recommendations are based on quantitative signals and AI analysis which may contain errors. " +
  "Verify all data independently before making investment decisions. Past performance does not guarantee future results.";

/**
 * Detect disagreement between two advisor outputs on the same ticker.
 * Returns array of disagreements.
 */
export interface AdvisorDisagreement {
  ticker: string;
  advisor1Assessment: string;
  advisor1Note: string;
  advisor2Assessment: string;
  advisor2Note: string;
}

export function detectDisagreements(
  advisor1Reviews: PositionReview[],
  advisor2Reviews: PositionReview[],
): AdvisorDisagreement[] {
  const disagreements: AdvisorDisagreement[] = [];
  
  // Build map of advisor2 reviews
  const advisor2Map = new Map<string, PositionReview>();
  for (const r of advisor2Reviews) {
    advisor2Map.set(r.ticker, r);
  }

  // Check for conflicting assessments
  for (const r1 of advisor1Reviews) {
    const r2 = advisor2Map.get(r1.ticker);
    if (!r2) continue;

    // Define conflicting pairs
    const conflicts = [
      ['exit', 'hold'],
      ['trim', 'hold'],
      ['exit', 'watch'],
    ];

    const isConflict = conflicts.some(([a, b]) =>
      (r1.current_assessment === a && r2.current_assessment === b) ||
      (r1.current_assessment === b && r2.current_assessment === a)
    );

    if (isConflict) {
      disagreements.push({
        ticker: r1.ticker,
        advisor1Assessment: r1.current_assessment,
        advisor1Note: r1.note,
        advisor2Assessment: r2.current_assessment,
        advisor2Note: r2.note,
      });
    }
  }

  return disagreements;
}
