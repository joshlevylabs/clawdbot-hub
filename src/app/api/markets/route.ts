import { NextResponse } from 'next/server';

// MRE V10 - All 25 tracked assets
const SYMBOLS = [
  // Broad Market
  'SPY', 'QQQ', 'IWM',
  // Sectors
  'XLK', 'XLC', 'XLF', 'XLV', 'XLP', 'XLE', 'XLB', 'XLU',
  // International
  'EFA', 'EEM', 'INDA', 'FXI', 'EWJ',
  // Fixed Income
  'TLT', 'IEF', 'HYG',
  // Commodities & Crypto
  'GLD', 'SLV', 'GDX', 'DBA', 'BITO'
];

interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
  marketCap?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FibonacciLevels {
  high: number;
  low: number;
  pullback?: number | null;
  retracements: { level: string; price: number; percent: number }[];
  extensions: { level: string; price: number; percent: number }[];
  trend: 'up' | 'down';
  swingHighDate?: string;
  swingLowDate?: string;
  pullbackDate?: string;
}

interface MovingAverages {
  ma5: number | null;
  ma20: number | null;
  ma50: number | null;
  ma100: number | null;
  ma5Data: (number | null)[];
  ma20Data: (number | null)[];
  ma50Data: (number | null)[];
  ma100Data: (number | null)[];
}

const SYMBOL_NAMES: Record<string, string> = {
  // Broad Market
  SPY: 'S&P 500 ETF',
  QQQ: 'Nasdaq 100 ETF',
  IWM: 'Russell 2000 ETF',
  // Sectors
  XLK: 'Technology Select Sector',
  XLC: 'Communication Services Select Sector',
  XLF: 'Financial Select Sector',
  XLV: 'Health Care Select Sector',
  XLP: 'Consumer Staples Select Sector',
  XLE: 'Energy Select Sector',
  XLB: 'Materials Select Sector',
  XLU: 'Utilities Select Sector',
  // International
  EFA: 'iShares MSCI EAFE ETF',
  EEM: 'iShares MSCI Emerging Markets ETF',
  INDA: 'iShares MSCI India ETF',
  FXI: 'iShares China Large-Cap ETF',
  EWJ: 'iShares MSCI Japan ETF',
  // Fixed Income
  TLT: 'iShares 20+ Year Treasury Bond ETF',
  IEF: 'iShares 7-10 Year Treasury Bond ETF',
  HYG: 'iShares iBoxx High Yield Corporate Bond ETF',
  // Commodities & Crypto
  GLD: 'SPDR Gold Shares',
  SLV: 'iShares Silver Trust',
  GDX: 'VanEck Gold Miners ETF',
  DBA: 'Invesco DB Agriculture Fund',
  BITO: 'ProShares Bitcoin Strategy ETF'
};

// Map our range/interval to Yahoo Finance parameters
function getYahooParams(range: string, interval: string): { yahooRange: string; yahooInterval: string; aggregate?: number } {
  // Interval mapping - Yahoo doesn't support all intervals, we aggregate some
  const intervalMap: Record<string, { yahoo: string; aggregate?: number }> = {
    '5m': { yahoo: '5m' },
    '15m': { yahoo: '15m' },
    '30m': { yahoo: '30m' },
    '1h': { yahoo: '1h' },
    '4h': { yahoo: '1h', aggregate: 4 }, // Aggregate 4 hourly candles
    '1d': { yahoo: '1d' },
    '1wk': { yahoo: '1wk' },
    '1mo': { yahoo: '1mo' },
    '6mo': { yahoo: '1mo', aggregate: 6 }, // Aggregate 6 monthly candles
    '12mo': { yahoo: '1mo', aggregate: 12 }, // Aggregate 12 monthly candles
  };
  
  // Range mapping
  const rangeMap: Record<string, string> = {
    '1d': '1d',
    '5d': '5d',
    '1mo': '1mo',
    '2y': '2y',
    '3mo': '3mo',
    '6mo': '6mo',
    '1y': '1y',
    '3y': '3y',
    '5y': '5y',
    '10y': '10y',
  };
  
  const intervalConfig = intervalMap[interval] || { yahoo: '1d' };
  const yahooInterval = intervalConfig.yahoo;
  const yahooRange = rangeMap[range] || '3mo';
  
  // For intraday intervals, limit range
  if (['5m', '15m', '30m', '1h'].includes(interval)) {
    if (['3y', '5y', '10y', '1y', '6mo'].includes(range)) {
      return { yahooRange: '60d', yahooInterval };
    }
  }
  
  return { yahooRange, yahooInterval };
}

// Find swing points (local highs and lows)
function findSwingPoints(candles: CandleData[], lookback: number = 5): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;
    
    for (let j = 1; j <= lookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isSwingHigh = false;
      }
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isSwingLow = false;
      }
    }
    
    if (isSwingHigh) highs.push(i);
    if (isSwingLow) lows.push(i);
  }
  
  return { highs, lows };
}

// Calculate Fibonacci retracement AND extension levels
// For uptrend: A=swing low, B=swing high (after A), C=pullback low (after B)
// Constraints: A < B < C (chronologically) and A.price < C.price < B.price
function calculateFibonacci(candles: CandleData[]): FibonacciLevels {
  if (candles.length < 20) {
    return { high: 0, low: 0, retracements: [], extensions: [], trend: 'up' };
  }
  
  // Adjust lookback based on candle count
  const lookback = Math.min(5, Math.floor(candles.length / 10));
  const { highs, lows } = findSwingPoints(candles, Math.max(2, lookback));
  
  if (highs.length === 0 || lows.length === 0) {
    // Fallback to simple high/low
    const high = Math.max(...candles.map(c => c.high));
    const low = Math.min(...candles.map(c => c.low));
    return { 
      high, low, 
      retracements: calculateFibRetracements(high, low), 
      extensions: [],
      trend: 'up'
    };
  }
  
  // Find the best A-B-C pattern working backwards from recent data
  // We want: A (swing low) → B (swing high after A) → C (pullback low after B, optional)
  
  let pointA: number = 0;
  let pointB: number = 0;
  let pointC: number | null = null;
  let trend: 'up' | 'down' = 'up';
  
  // Strategy: Find the most recent significant swing high, then find the swing low before it
  // Then check if there's a valid pullback after the high
  
  // Start from most recent swing high
  for (let i = highs.length - 1; i >= 0; i--) {
    const candidateB = highs[i];
    
    // Find swing lows BEFORE this high
    const lowsBeforeB = lows.filter(l => l < candidateB);
    if (lowsBeforeB.length === 0) continue;
    
    // Take the most recent low before B as candidate A
    const candidateA = lowsBeforeB[lowsBeforeB.length - 1];
    
    // Validate: A must be lower price than B
    if (candles[candidateA].low >= candles[candidateB].high) continue;
    
    // We have a valid A-B pair
    pointA = candidateA;
    pointB = candidateB;
    
    // Now look for C: a swing low AFTER B
    const lowsAfterB = lows.filter(l => l > candidateB);
    
    for (const candidateC of lowsAfterB) {
      const aPrice = candles[pointA].low;
      const bPrice = candles[pointB].high;
      const cPrice = candles[candidateC].low;
      
      // C must be: after B (already filtered), price between A and B
      if (cPrice > aPrice && cPrice < bPrice) {
        pointC = candidateC;
        break; // Take the first valid C after B
      }
    }
    
    // If we found a valid A-B (with or without C), we're done
    break;
  }
  
  // Fallback if no valid pattern found
  if (pointA === 0 && pointB === 0) {
    // Just use overall high/low
    let maxIdx = 0, minIdx = 0;
    for (let i = 1; i < candles.length; i++) {
      if (candles[i].high > candles[maxIdx].high) maxIdx = i;
      if (candles[i].low < candles[minIdx].low) minIdx = i;
    }
    
    // Ensure A before B chronologically
    if (minIdx < maxIdx) {
      pointA = minIdx;
      pointB = maxIdx;
    } else {
      pointA = maxIdx; // Use high as A in downtrend
      pointB = minIdx;
      trend = 'down';
    }
  }
  
  // For uptrend: A is low, B is high (A < B chronologically and A.price < B.price)
  // Verify we have proper chronological order and price relationship
  const aCandle = candles[pointA];
  const bCandle = candles[pointB];
  
  // Determine actual high and low values
  let swingLow: number;
  let swingHigh: number;
  let swingLowIdx: number;
  let swingHighIdx: number;
  
  if (pointA < pointB && aCandle.low < bCandle.high) {
    // Standard uptrend: A (low) → B (high)
    swingLow = aCandle.low;
    swingHigh = bCandle.high;
    swingLowIdx = pointA;
    swingHighIdx = pointB;
    trend = 'up';
  } else if (pointA < pointB && aCandle.high > bCandle.low) {
    // Downtrend: A (high) → B (low) - but we still want to show as uptrend from the low
    swingHigh = aCandle.high;
    swingLow = bCandle.low;
    swingHighIdx = pointA;
    swingLowIdx = pointB;
    trend = 'down';
    // Clear C since it's a downtrend pattern
    pointC = null;
  } else {
    // Fallback: use the values as-is
    swingLow = Math.min(aCandle.low, bCandle.low);
    swingHigh = Math.max(aCandle.high, bCandle.high);
    swingLowIdx = aCandle.low < bCandle.low ? pointA : pointB;
    swingHighIdx = aCandle.high > bCandle.high ? pointA : pointB;
    trend = swingLowIdx < swingHighIdx ? 'up' : 'down';
  }
  
  // Validate C is after B and between A and B price-wise
  let pullbackPrice: number | null = null;
  if (pointC !== null && trend === 'up') {
    const cCandle = candles[pointC];
    // C must be after the swing high
    if (pointC > swingHighIdx && cCandle.low > swingLow && cCandle.low < swingHigh) {
      pullbackPrice = cCandle.low;
    } else {
      pointC = null; // Invalid C, clear it
    }
  }
  
  // Calculate extensions only if we have valid C
  const extensions = (pointC !== null && pullbackPrice !== null) 
    ? calculateFibExtensions(swingLow, swingHigh, pullbackPrice, trend)
    : [];
  
  return { 
    high: swingHigh, 
    low: swingLow, 
    pullback: pullbackPrice,
    retracements: calculateFibRetracements(swingHigh, swingLow), 
    extensions,
    trend,
    swingHighDate: new Date(candles[swingHighIdx].time * 1000).toLocaleDateString(),
    swingLowDate: new Date(candles[swingLowIdx].time * 1000).toLocaleDateString(),
    pullbackDate: pointC !== null ? new Date(candles[pointC].time * 1000).toLocaleDateString() : undefined,
  };
}

function calculateFibRetracements(high: number, low: number) {
  const diff = high - low;
  const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  
  return fibLevels.map(fib => ({
    level: `${(fib * 100).toFixed(1)}%`,
    price: Math.round((high - diff * fib) * 100) / 100,
    percent: fib * 100,
  }));
}

// Fibonacci Extensions (Projections) using 3 points:
// A = swing low, B = swing high, C = pullback low
// Extension = C + (B - A) * ratio
function calculateFibExtensions(swingLow: number, swingHigh: number, pullback: number, trend: 'up' | 'down') {
  const range = swingHigh - swingLow;
  const extLevels = [1.0, 1.272, 1.414, 1.618, 2.0, 2.618];
  
  if (trend === 'up') {
    // Uptrend: project UP from pullback low
    return extLevels.map(ext => ({
      level: `${(ext * 100).toFixed(1)}%`,
      price: Math.round((pullback + range * ext) * 100) / 100,
      percent: ext * 100,
    }));
  } else {
    // Downtrend: project DOWN from pullback high
    return extLevels.map(ext => ({
      level: `${(ext * 100).toFixed(1)}%`,
      price: Math.round((pullback - range * ext) * 100) / 100,
      percent: ext * 100,
    }));
  }
}

// Calculate moving averages
function calculateMovingAverages(candles: CandleData[]): MovingAverages {
  const closes = candles.map(c => c.close);
  
  const calcMA = (period: number): (number | null)[] => {
    return closes.map((_, i) => {
      if (i < period - 1) return null;
      const slice = closes.slice(i - period + 1, i + 1);
      return slice.reduce((a, b) => a + b, 0) / period;
    });
  };
  
  const ma5Data = calcMA(5);
  const ma20Data = calcMA(20);
  const ma50Data = calcMA(50);
  const ma100Data = calcMA(100);
  
  return {
    ma5: ma5Data[ma5Data.length - 1],
    ma20: ma20Data[ma20Data.length - 1],
    ma50: ma50Data[ma50Data.length - 1],
    ma100: ma100Data[ma100Data.length - 1],
    ma5Data,
    ma20Data,
    ma50Data,
    ma100Data,
  };
}

// Fetch quote data from Yahoo Finance
async function fetchQuote(symbol: string): Promise<QuoteData | null> {
  try {
    // Use range=5d to ensure we get chartPreviousClose data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    
    const meta = result.meta;
    const price = meta.regularMarketPrice ?? 0;
    // Use chartPreviousClose (more reliable) or fallback to previousClose
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    
    return {
      symbol,
      name: SYMBOL_NAMES[symbol] || symbol,
      price,
      change: price - prevClose,
      changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
      high: meta.regularMarketDayHigh ?? price,
      low: meta.regularMarketDayLow ?? price,
      open: meta.regularMarketOpen ?? prevClose,
      prevClose,
      volume: meta.regularMarketVolume ?? 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? price,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? price,
    };
  } catch (error) {
    console.error(`Failed to fetch quote for ${symbol}:`, error);
    return null;
  }
}

// Aggregate candles by a factor
function aggregateCandles(candles: CandleData[], factor: number): CandleData[] {
  const aggregated: CandleData[] = [];
  for (let i = 0; i < candles.length; i += factor) {
    const chunk = candles.slice(i, Math.min(i + factor, candles.length));
    if (chunk.length > 0) {
      aggregated.push({
        time: chunk[0].time,
        open: chunk[0].open,
        high: Math.max(...chunk.map(c => c.high)),
        low: Math.min(...chunk.map(c => c.low)),
        close: chunk[chunk.length - 1].close,
        volume: chunk.reduce((sum, c) => sum + c.volume, 0),
      });
    }
  }
  return aggregated;
}

// Fetch historical candle data
async function fetchCandles(symbol: string, range: string, interval: string): Promise<CandleData[]> {
  try {
    const params = getYahooParams(range, interval);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${params.yahooInterval}&range=${params.yahooRange}`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return [];
    
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    
    const candles: CandleData[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open?.[i] != null && quote.high?.[i] != null && quote.low?.[i] != null && quote.close?.[i] != null) {
        candles.push({
          time: timestamps[i],
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume?.[i] || 0,
        });
      }
    }
    
    // Aggregate if needed (4h from 1h, 6mo/12mo from monthly)
    if (interval === '4h') return aggregateCandles(candles, 4);
    if (interval === '6mo') return aggregateCandles(candles, 6);
    if (interval === '12mo') return aggregateCandles(candles, 12);
    
    return candles;
  } catch (error) {
    console.error(`Failed to fetch candles for ${symbol}:`, error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '3mo';
  const interval = searchParams.get('interval') || '1d';
  
  try {
    // If specific symbol requested, return detailed data
    if (symbol) {
      const [quote, candles] = await Promise.all([
        fetchQuote(symbol),
        fetchCandles(symbol, range, interval),
      ]);
      
      if (!quote) {
        return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
      }
      
      const fibonacci = calculateFibonacci(candles);
      const movingAverages = calculateMovingAverages(candles);
      
      return NextResponse.json({
        quote,
        candles,
        fibonacci,
        movingAverages,
        range,
        interval,
        updatedAt: new Date().toISOString(),
      });
    }
    
    // Return overview of all symbols
    const quotes = await Promise.all(SYMBOLS.map(fetchQuote));
    const validQuotes = quotes.filter((q): q is QuoteData => q !== null);
    
    // Also fetch candles for Fibonacci calculations (use 3mo daily for overview)
    const candlePromises = SYMBOLS.map(s => fetchCandles(s, '3mo', '1d'));
    const allCandles = await Promise.all(candlePromises);
    
    const symbolData = validQuotes.map((quote, i) => ({
      ...quote,
      fibonacci: calculateFibonacci(allCandles[i]),
    }));
    
    return NextResponse.json({
      symbols: symbolData,
      updatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Markets API error:', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
