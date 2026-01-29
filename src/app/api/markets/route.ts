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
  retracements: { level: string; price: number; percent: number }[];
  extensions: { level: string; price: number; percent: number }[];
  trend: 'up' | 'down';
  swingHighDate?: string;
  swingLowDate?: string;
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
  SPY: 'S&P 500 ETF',
  QQQ: 'Nasdaq 100 ETF',
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corp.',
  GLD: 'Gold ETF',
  SLV: 'Silver ETF',
};

// Map our range/interval to Yahoo Finance parameters
function getYahooParams(range: string, interval: string): { yahooRange: string; yahooInterval: string } {
  // Interval mapping
  const intervalMap: Record<string, string> = {
    '30m': '30m',
    '1h': '1h',
    '4h': '1h', // Yahoo doesn't have 4h, we'll aggregate
    '1d': '1d',
    '1w': '1wk',
  };
  
  // Range mapping
  const rangeMap: Record<string, string> = {
    '1d': '1d',
    '5d': '5d',
    '1mo': '1mo',
    '3mo': '3mo',
    '6mo': '6mo',
    '1y': '1y',
    '3y': '3y',
    '5y': '5y',
    '10y': '10y',
  };
  
  const yahooInterval = intervalMap[interval] || '1d';
  const yahooRange = rangeMap[range] || '3mo';
  
  // For intraday intervals, limit range
  if (['30m', '1h'].includes(interval)) {
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
      extensions: calculateFibExtensions(high, low),
      trend: 'up'
    };
  }
  
  const lastSwingHigh = highs[highs.length - 1];
  const lastSwingLow = lows[lows.length - 1];
  
  let swingLowIdx: number;
  let swingHighIdx: number;
  let trend: 'up' | 'down';
  
  if (lastSwingHigh > lastSwingLow) {
    // Most recent is a high - retracement from high
    const lowsBeforeHigh = lows.filter(l => l < lastSwingHigh);
    swingLowIdx = lowsBeforeHigh.length > 0 ? lowsBeforeHigh[lowsBeforeHigh.length - 1] : 0;
    swingHighIdx = lastSwingHigh;
    trend = 'up';
  } else {
    // Most recent is a low - bounce from low
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
    retracements: calculateFibRetracements(high, low), 
    extensions: calculateFibExtensions(high, low),
    trend,
    swingHighDate: new Date(candles[swingHighIdx].time * 1000).toLocaleDateString(),
    swingLowDate: new Date(candles[swingLowIdx].time * 1000).toLocaleDateString(),
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

function calculateFibExtensions(high: number, low: number) {
  const diff = high - low;
  // Extension levels project ABOVE the high
  const extLevels = [1.272, 1.414, 1.618, 2.0, 2.618];
  
  return extLevels.map(ext => ({
    level: `${(ext * 100).toFixed(1)}%`,
    price: Math.round((low + diff * ext) * 100) / 100,
    percent: ext * 100,
  }));
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
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
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
async function fetchCandles(symbol: string, range: string, interval: string): Promise<CandleData[]> {
  try {
    const { yahooRange, yahooInterval } = getYahooParams(range, interval);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${yahooInterval}&range=${yahooRange}`;
    
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
    
    // Aggregate to 4h if needed
    if (interval === '4h' && candles.length > 0) {
      const aggregated: CandleData[] = [];
      for (let i = 0; i < candles.length; i += 4) {
        const chunk = candles.slice(i, Math.min(i + 4, candles.length));
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
