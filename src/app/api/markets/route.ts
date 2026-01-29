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
}

const SYMBOL_NAMES: Record<string, string> = {
  SPY: 'S&P 500 ETF',
  QQQ: 'Nasdaq 100 ETF',
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corp.',
  GLD: 'Gold ETF',
  SLV: 'Silver ETF',
};

// Calculate Fibonacci retracement levels
function calculateFibonacci(candles: CandleData[]): FibonacciLevels {
  if (candles.length < 20) {
    return { high: 0, low: 0, levels: [], trend: 'up' };
  }
  
  // Find swing high and low from recent data (last 50 candles)
  const recentCandles = candles.slice(-50);
  const high = Math.max(...recentCandles.map(c => c.high));
  const low = Math.min(...recentCandles.map(c => c.low));
  
  // Determine trend by comparing first and last thirds
  const firstThird = recentCandles.slice(0, 17);
  const lastThird = recentCandles.slice(-17);
  const firstAvg = firstThird.reduce((sum, c) => sum + c.close, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((sum, c) => sum + c.close, 0) / lastThird.length;
  const trend = lastAvg > firstAvg ? 'up' : 'down';
  
  const diff = high - low;
  const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  
  const levels = fibLevels.map(fib => {
    const price = trend === 'up' 
      ? high - (diff * fib)  // Retracement from high
      : low + (diff * fib);  // Extension from low
    return {
      level: `${(fib * 100).toFixed(1)}%`,
      price: Math.round(price * 100) / 100,
      percent: fib * 100,
    };
  });
  
  return { high, low, levels, trend };
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
    
    return {
      symbol,
      name: SYMBOL_NAMES[symbol] || symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      open: meta.regularMarketOpen || meta.previousClose,
      prevClose: meta.previousClose,
      volume: meta.regularMarketVolume,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
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
