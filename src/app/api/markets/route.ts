import { NextResponse } from 'next/server';

// Symbols to track
const SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GLD', 'SLV'];

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
  levels: { level: string; price: number; percent: number }[];
  trend: 'up' | 'down';
  swingHighIdx?: number;
  swingLowIdx?: number;
}

const SYMBOL_NAMES: Record<string, string> = {
  SPY: 'S&P 500 ETF',
  QQQ: 'Nasdaq 100 ETF',
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corp.',
  GLD: 'Gold ETF',
  SLV: 'Silver ETF',
};

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

// Calculate Fibonacci retracement levels using proper swing points
function calculateFibonacci(candles: CandleData[]): FibonacciLevels {
  if (candles.length < 30) {
    return { high: 0, low: 0, levels: [], trend: 'up', swingHighIdx: 0, swingLowIdx: 0 };
  }
  
  const { highs, lows } = findSwingPoints(candles, 5);
  
  if (highs.length === 0 || lows.length === 0) {
    // Fallback to simple high/low
    const recentCandles = candles.slice(-50);
    const high = Math.max(...recentCandles.map(c => c.high));
    const low = Math.min(...recentCandles.map(c => c.low));
    return { 
      high, low, 
      levels: calculateFibLevels(high, low, 'up'), 
      trend: 'up',
      swingHighIdx: candles.length - 1,
      swingLowIdx: 0
    };
  }
  
  // Find the most recent significant swing pattern:
  // For uptrend: swing low → swing high → current retracement
  // For downtrend: swing high → swing low → current retracement
  
  const lastSwingHigh = highs[highs.length - 1];
  const lastSwingLow = lows[lows.length - 1];
  
  let swingLowIdx: number;
  let swingHighIdx: number;
  let trend: 'up' | 'down';
  
  if (lastSwingHigh > lastSwingLow) {
    // Most recent is a high - we're in a potential retracement from high
    // Find the swing low before this high
    const lowsBeforeHigh = lows.filter(l => l < lastSwingHigh);
    swingLowIdx = lowsBeforeHigh.length > 0 ? lowsBeforeHigh[lowsBeforeHigh.length - 1] : 0;
    swingHighIdx = lastSwingHigh;
    trend = 'up';
  } else {
    // Most recent is a low - we're in a potential bounce from low
    // Find the swing high before this low
    const highsBeforeLow = highs.filter(h => h < lastSwingLow);
    swingHighIdx = highsBeforeLow.length > 0 ? highsBeforeLow[highsBeforeLow.length - 1] : 0;
    swingLowIdx = lastSwingLow;
    trend = 'down';
  }
  
  const high = candles[swingHighIdx].high;
  const low = candles[swingLowIdx].low;
  
  return { 
    high, 
    low, 
    levels: calculateFibLevels(high, low, trend), 
    trend,
    swingHighIdx,
    swingLowIdx
  };
}

function calculateFibLevels(high: number, low: number, trend: 'up' | 'down') {
  const diff = high - low;
  const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  
  return fibLevels.map(fib => {
    // Fibonacci retracements measure from the high down
    const price = high - (diff * fib);
    return {
      level: `${(fib * 100).toFixed(1)}%`,
      price: Math.round(price * 100) / 100,
      percent: fib * 100,
    };
  });
}

// Fetch quote data from Yahoo Finance
async function fetchQuote(symbol: string): Promise<QuoteData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 }, // Cache for 1 minute
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    
    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.previousClose ?? price;
    
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

// Fetch historical candle data
async function fetchCandles(symbol: string, range = '3mo', interval = '1d'): Promise<CandleData[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return [];
    
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    
    const candles: CandleData[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open?.[i] && quote.high?.[i] && quote.low?.[i] && quote.close?.[i]) {
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
      
      return NextResponse.json({
        quote,
        candles,
        fibonacci,
        updatedAt: new Date().toISOString(),
      });
    }
    
    // Return overview of all symbols
    const quotes = await Promise.all(SYMBOLS.map(fetchQuote));
    const validQuotes = quotes.filter((q): q is QuoteData => q !== null);
    
    // Also fetch candles for Fibonacci calculations
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
