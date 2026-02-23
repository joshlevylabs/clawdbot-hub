/**
 * MRE Signal Flow Attribution Metrics Engine
 * Calculates performance metrics for trading strategies and tickers
 */

export interface TickerData {
  symbol: string;
  asset_class: string;
  signal: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  signal_strength: number;
  fear_threshold_conservative: number;
  fear_threshold_opportunistic: number;
  current_fg: number;
  regime: 'bull' | 'bear' | 'sideways';
  hold_days: number;
  expected_sharpe: number;
  expected_accuracy: number;
  volatility_data: {
    volatility_20d_pct: number;
    normalization_enabled: boolean;
  };
  price: number;
  role: string;
  regime_weight: number;
  asset_confidence: number;
}

export interface StrategyMetrics {
  name: string;
  tickerCount: number;
  avgSignalStrength: number;
  winRate: number;
  expectedSharpe: number;
  avgVolatility: number;
  regimeAlignment: number;
  overallSignal: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  tickers: TickerData[];
}

export interface RiskMetrics {
  sharpe: number;
  volatility: number;
  maxDrawdown: number;
  correlation: number;
}

export interface SignalAttribution {
  primaryStrategy: string;
  contributingStrategies: Array<{
    strategy: string;
    weight: number;
    signal: string;
  }>;
  confidenceScore: number;
}

/**
 * Calculate win rate from historical signal accuracy
 */
export function calculateWinRate(tickers: TickerData[]): number {
  if (!tickers.length) return 0;
  
  const totalAccuracy = tickers.reduce((sum, ticker) => sum + ticker.expected_accuracy, 0);
  return totalAccuracy / tickers.length / 100; // Convert to 0-1 scale
}

/**
 * Calculate aggregate performance metrics per strategy (asset class)
 */
export function calculateStrategyPerformance(strategy: string, tickers: TickerData[]): StrategyMetrics {
  const strategyTickers = tickers.filter(t => t.asset_class === strategy);
  
  if (!strategyTickers.length) {
    return {
      name: strategy,
      tickerCount: 0,
      avgSignalStrength: 0,
      winRate: 0,
      expectedSharpe: 0,
      avgVolatility: 0,
      regimeAlignment: 0,
      overallSignal: 'HOLD',
      tickers: []
    };
  }

  // Calculate averages
  const avgSignalStrength = strategyTickers.reduce((sum, t) => sum + Math.abs(t.signal_strength), 0) / strategyTickers.length;
  const winRate = calculateWinRate(strategyTickers);
  const expectedSharpe = strategyTickers.reduce((sum, t) => sum + t.expected_sharpe, 0) / strategyTickers.length;
  const avgVolatility = strategyTickers.reduce((sum, t) => sum + t.volatility_data.volatility_20d_pct, 0) / strategyTickers.length;

  // Calculate regime alignment (how many tickers are in bull regime)
  const bullTickers = strategyTickers.filter(t => t.regime === 'bull').length;
  const regimeAlignment = bullTickers / strategyTickers.length;

  // Determine overall signal based on majority
  const signalCounts = strategyTickers.reduce((acc, ticker) => {
    acc[ticker.signal] = (acc[ticker.signal] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const overallSignal = Object.entries(signalCounts)
    .sort(([,a], [,b]) => b - a)[0][0] as 'BUY' | 'HOLD' | 'SELL' | 'WATCH';

  return {
    name: strategy,
    tickerCount: strategyTickers.length,
    avgSignalStrength,
    winRate,
    expectedSharpe,
    avgVolatility,
    regimeAlignment,
    overallSignal,
    tickers: strategyTickers
  };
}

/**
 * Calculate signal attribution - which strategies contribute to a ticker's signal
 */
export function calculateSignalAttribution(ticker: TickerData): SignalAttribution {
  // For this implementation, each ticker belongs to one primary strategy (asset_class)
  // but we can extend this to show cross-correlations with other strategies
  
  return {
    primaryStrategy: ticker.asset_class,
    contributingStrategies: [
      {
        strategy: ticker.asset_class,
        weight: 1.0,
        signal: ticker.signal
      }
    ],
    confidenceScore: ticker.asset_confidence
  };
}

/**
 * Calculate risk metrics for a group of tickers
 */
export function calculateRiskMetrics(tickers: TickerData[]): RiskMetrics {
  if (!tickers.length) {
    return {
      sharpe: 0,
      volatility: 0,
      maxDrawdown: 0,
      correlation: 0
    };
  }

  const avgSharpe = tickers.reduce((sum, t) => sum + t.expected_sharpe, 0) / tickers.length;
  const avgVolatility = tickers.reduce((sum, t) => sum + t.volatility_data.volatility_20d_pct, 0) / tickers.length;
  
  // Estimate max drawdown based on volatility and signal strength
  const avgSignalStrength = tickers.reduce((sum, t) => sum + Math.abs(t.signal_strength), 0) / tickers.length;
  const maxDrawdown = Math.min(avgVolatility * 0.8, 25); // Cap at 25%
  
  // Calculate average correlation (simplified - in reality would need price correlation data)
  const correlation = tickers.length > 1 ? 0.7 : 0; // Assume 70% correlation within strategies

  return {
    sharpe: avgSharpe,
    volatility: avgVolatility,
    maxDrawdown,
    correlation
  };
}

/**
 * Rank strategies by multiple metrics
 */
export function rankStrategies(strategies: StrategyMetrics[]): StrategyMetrics[] {
  return strategies.sort((a, b) => {
    // Composite score: combine sharpe, win rate, and signal strength
    const scoreA = (a.expectedSharpe * 0.4) + (a.winRate * 100 * 0.3) + (a.avgSignalStrength * 0.3);
    const scoreB = (b.expectedSharpe * 0.4) + (b.winRate * 100 * 0.3) + (b.avgSignalStrength * 0.3);
    
    return scoreB - scoreA; // Descending order
  });
}

/**
 * Get all unique asset classes (strategies) from ticker data
 */
export function getStrategies(tickers: TickerData[]): string[] {
  const strategies = new Set(tickers.map(t => t.asset_class));
  return Array.from(strategies);
}

/**
 * Calculate Fear & Greed signal context for a ticker
 */
export function calculateFearGreedContext(ticker: TickerData): {
  status: 'conservative_zone' | 'opportunistic_zone' | 'neutral_zone';
  recommendation: string;
  thresholdDistance: number;
} {
  const fg = ticker.current_fg;
  const conservative = ticker.fear_threshold_conservative;
  const opportunistic = ticker.fear_threshold_opportunistic;

  if (fg <= conservative) {
    return {
      status: 'conservative_zone',
      recommendation: 'Strong buy signal - market is in extreme fear',
      thresholdDistance: conservative - fg
    };
  } else if (fg <= opportunistic) {
    return {
      status: 'opportunistic_zone', 
      recommendation: 'Potential buy signal - market showing fear',
      thresholdDistance: opportunistic - fg
    };
  } else {
    return {
      status: 'neutral_zone',
      recommendation: 'No fear-based signal - market neutral to greedy',
      thresholdDistance: fg - opportunistic
    };
  }
}

/**
 * Generate plain-English explanation of what a signal means
 */
export function explainSignal(ticker: TickerData): string {
  const fgContext = calculateFearGreedContext(ticker);
  const regime = ticker.regime;
  const role = ticker.role;

  let explanation = `${ticker.symbol} is currently showing a ${ticker.signal} signal. `;

  switch (ticker.signal) {
    case 'BUY':
      explanation += `This suggests the stock is attractive for purchase. `;
      break;
    case 'HOLD':
      explanation += `This suggests maintaining current positions without adding or reducing. `;
      break;
    case 'SELL':
      explanation += `This suggests reducing or closing positions. `;
      break;
    case 'WATCH':
      explanation += `This suggests monitoring for potential opportunities. `;
      break;
  }

  explanation += `The market is in a ${regime} regime, and this asset plays a ${role} role in the portfolio. `;
  explanation += `${fgContext.recommendation}. `;
  explanation += `Expected accuracy for signals like this is ${ticker.expected_accuracy}% with a ${ticker.hold_days}-day average hold period.`;

  return explanation;
}