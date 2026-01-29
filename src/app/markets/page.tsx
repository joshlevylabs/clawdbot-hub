"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  Target,
  Clock,
  BarChart3,
} from "lucide-react";

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
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fibonacci: {
    high: number;
    low: number;
    trend: 'up' | 'down';
    levels: { level: string; price: number; percent: number }[];
  };
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SymbolDetail {
  quote: QuoteData;
  candles: CandleData[];
  fibonacci: QuoteData['fibonacci'];
}

const SYMBOL_COLORS: Record<string, string> = {
  SPY: 'emerald',
  QQQ: 'purple',
  AAPL: 'slate',
  MSFT: 'blue',
  GLD: 'amber',
  SLV: 'slate',
};

const SYMBOL_CATEGORIES = {
  indices: ['SPY', 'QQQ'],
  tech: ['AAPL', 'MSFT'],
  metals: ['GLD', 'SLV'],
};

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toString();
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Simple price chart using canvas (no external dependencies)
function CandlestickChart({ 
  candles, 
  fibonacci,
  symbol 
}: { 
  candles: CandleData[]; 
  fibonacci: QuoteData['fibonacci'];
  symbol: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || candles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Find price range
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.05;

    const scaleY = (price: number) => {
      return padding.top + chartHeight - ((price - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;
    };

    const candleWidth = Math.max(2, (chartWidth / candles.length) - 1);

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Price labels
      const price = maxPrice - (priceRange / 4) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`$${price.toFixed(2)}`, width - padding.right + 5, y + 3);
    }

    // Draw Fibonacci levels
    fibonacci.levels.forEach(fib => {
      const y = scaleY(fib.price);
      if (y > padding.top && y < height - padding.bottom) {
        ctx.strokeStyle = fib.percent === 50 ? '#8b5cf6' : '#3b82f6';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = fib.percent === 50 ? '#8b5cf6' : '#3b82f6';
        ctx.font = '9px sans-serif';
        ctx.fillText(fib.level, padding.left + 2, y - 2);
      }
    });

    // Draw candles
    candles.forEach((candle, i) => {
      const x = padding.left + (i / candles.length) * chartWidth + candleWidth / 2;
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#10b981' : '#ef4444';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, scaleY(candle.high));
      ctx.lineTo(x, scaleY(candle.low));
      ctx.stroke();

      // Body
      const bodyTop = scaleY(Math.max(candle.open, candle.close));
      const bodyBottom = scaleY(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);
      
      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // Current price line
    const lastCandle = candles[candles.length - 1];
    const currentY = scaleY(lastCandle.close);
    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentY);
    ctx.lineTo(width - padding.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [candles, fibonacci, symbol]);

  if (candles.length === 0) {
    return (
      <div className="w-full h-[300px] bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-500">
        Loading chart data...
      </div>
    );
  }

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-[300px] rounded-lg"
      style={{ background: '#0f172a' }}
    />
  );
}

// Quote Card Component
function QuoteCard({ 
  quote, 
  onClick,
  selected 
}: { 
  quote: QuoteData; 
  onClick: () => void;
  selected: boolean;
}) {
  const isPositive = quote.change >= 0;
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-slate-850 rounded-xl border p-4 transition-all hover:border-slate-600 ${
        selected ? 'border-primary-500 ring-1 ring-primary-500/30' : 'border-slate-800'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-slate-200">{quote.symbol}</h3>
          <p className="text-xs text-slate-500">{quote.name}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
          isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
        </div>
      </div>
      
      <p className="text-2xl font-bold text-slate-100">${formatPrice(quote.price)}</p>
      
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>H: ${formatPrice(quote.high)}</span>
        <span>L: ${formatPrice(quote.low)}</span>
      </div>
      
      {/* Fibonacci preview */}
      {quote.fibonacci.levels.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
            <Target className="w-3 h-3" />
            <span>Fib Targets ({quote.fibonacci.trend === 'up' ? '↑' : '↓'})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {quote.fibonacci.levels.filter(l => l.percent === 38.2 || l.percent === 50 || l.percent === 61.8).map(fib => (
              <span key={fib.level} className="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                {fib.level}: ${formatPrice(fib.price)}
              </span>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}

// Fibonacci Detail Panel
function FibonacciPanel({ fibonacci, currentPrice }: { fibonacci: QuoteData['fibonacci']; currentPrice: number }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-amber-400" />
        <h3 className="font-medium text-slate-200">Fibonacci Levels</h3>
        <span className={`px-2 py-0.5 rounded text-xs ${
          fibonacci.trend === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {fibonacci.trend === 'up' ? 'Uptrend' : 'Downtrend'}
        </span>
      </div>
      
      <div className="space-y-1">
        {fibonacci.levels.map(fib => {
          const isNearPrice = Math.abs(fib.price - currentPrice) / currentPrice < 0.02;
          return (
            <div 
              key={fib.level} 
              className={`flex items-center justify-between p-2 rounded ${
                isNearPrice ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-800/30'
              }`}
            >
              <span className={`text-sm ${
                fib.percent === 0 || fib.percent === 100 
                  ? 'text-amber-400 font-medium' 
                  : fib.percent === 50 
                    ? 'text-purple-400 font-medium' 
                    : 'text-slate-400'
              }`}>
                {fib.level}
              </span>
              <span className={`text-sm font-mono ${isNearPrice ? 'text-amber-300' : 'text-slate-300'}`}>
                ${formatPrice(fib.price)}
              </span>
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-slate-600 mt-3">
        Range: ${formatPrice(fibonacci.low)} — ${formatPrice(fibonacci.high)}
      </p>
    </div>
  );
}

export default function MarketsPage() {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [symbolDetail, setSymbolDetail] = useState<SymbolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [range, setRange] = useState('3mo');

  const fetchQuotes = useCallback(async () => {
    try {
      const response = await fetch('/api/markets');
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.symbols || []);
        setLastUpdate(new Date(data.updatedAt));
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSymbolDetail = useCallback(async (symbol: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/markets?symbol=${symbol}&range=${range}`);
      if (response.ok) {
        const data = await response.json();
        setSymbolDetail(data);
      }
    } catch (error) {
      console.error('Failed to fetch symbol detail:', error);
    } finally {
      setDetailLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchQuotes();
    // Refresh every minute
    const interval = setInterval(fetchQuotes, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  useEffect(() => {
    if (selectedSymbol) {
      fetchSymbolDetail(selectedSymbol);
    }
  }, [selectedSymbol, fetchSymbolDetail]);

  // Auto-select first symbol
  useEffect(() => {
    if (quotes.length > 0 && !selectedSymbol) {
      setSelectedSymbol(quotes[0].symbol);
    }
  }, [quotes, selectedSymbol]);

  const handleRefresh = () => {
    setLoading(true);
    fetchQuotes();
    if (selectedSymbol) {
      fetchSymbolDetail(selectedSymbol);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
            Markets
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Real-time quotes with technical analysis</p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastUpdate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && quotes.length === 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-slate-850 rounded-xl border border-slate-800 p-4 animate-pulse">
              <div className="h-5 bg-slate-800 rounded w-1/3 mb-3" />
              <div className="h-8 bg-slate-800 rounded w-1/2 mb-2" />
              <div className="h-4 bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      {!loading || quotes.length > 0 ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quote Cards - Left Column */}
          <div className="space-y-4">
            {/* Indices */}
            <div>
              <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Indices
              </h2>
              <div className="space-y-2">
                {quotes.filter(q => SYMBOL_CATEGORIES.indices.includes(q.symbol)).map(quote => (
                  <QuoteCard
                    key={quote.symbol}
                    quote={quote}
                    onClick={() => setSelectedSymbol(quote.symbol)}
                    selected={selectedSymbol === quote.symbol}
                  />
                ))}
              </div>
            </div>

            {/* Tech */}
            <div>
              <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Tech
              </h2>
              <div className="space-y-2">
                {quotes.filter(q => SYMBOL_CATEGORIES.tech.includes(q.symbol)).map(quote => (
                  <QuoteCard
                    key={quote.symbol}
                    quote={quote}
                    onClick={() => setSelectedSymbol(quote.symbol)}
                    selected={selectedSymbol === quote.symbol}
                  />
                ))}
              </div>
            </div>

            {/* Precious Metals */}
            <div>
              <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="text-amber-400">◆</span> Precious Metals
              </h2>
              <div className="space-y-2">
                {quotes.filter(q => SYMBOL_CATEGORIES.metals.includes(q.symbol)).map(quote => (
                  <QuoteCard
                    key={quote.symbol}
                    quote={quote}
                    onClick={() => setSelectedSymbol(quote.symbol)}
                    selected={selectedSymbol === quote.symbol}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Chart & Details - Right Column */}
          <div className="lg:col-span-2 space-y-4">
            {selectedSymbol && symbolDetail && (
              <>
                {/* Chart Header */}
                <div className="bg-slate-850 rounded-xl border border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">
                        {symbolDetail.quote.symbol} — {symbolDetail.quote.name}
                      </h2>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-2xl font-bold text-slate-100">
                          ${formatPrice(symbolDetail.quote.price)}
                        </span>
                        <span className={`flex items-center gap-1 text-sm font-medium ${
                          symbolDetail.quote.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {symbolDetail.quote.change >= 0 ? '+' : ''}
                          {formatPrice(symbolDetail.quote.change)} ({symbolDetail.quote.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                    
                    {/* Range Selector */}
                    <div className="flex gap-1">
                      {['1mo', '3mo', '6mo', '1y'].map(r => (
                        <button
                          key={r}
                          onClick={() => setRange(r)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            range === r
                              ? 'bg-primary-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {r.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chart */}
                  {detailLoading ? (
                    <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />
                  ) : (
                    <CandlestickChart
                      candles={symbolDetail.candles}
                      fibonacci={symbolDetail.fibonacci}
                      symbol={selectedSymbol}
                    />
                  )}
                </div>

                {/* Stats & Fibonacci */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Key Stats */}
                  <div className="bg-slate-850 rounded-xl border border-slate-800 p-4">
                    <h3 className="font-medium text-slate-200 mb-3">Key Statistics</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500">Open</p>
                        <p className="text-slate-200 font-mono">${formatPrice(symbolDetail.quote.open)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Prev Close</p>
                        <p className="text-slate-200 font-mono">${formatPrice(symbolDetail.quote.prevClose)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Day High</p>
                        <p className="text-emerald-400 font-mono">${formatPrice(symbolDetail.quote.high)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Day Low</p>
                        <p className="text-red-400 font-mono">${formatPrice(symbolDetail.quote.low)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">52W High</p>
                        <p className="text-slate-200 font-mono">${formatPrice(symbolDetail.quote.fiftyTwoWeekHigh)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">52W Low</p>
                        <p className="text-slate-200 font-mono">${formatPrice(symbolDetail.quote.fiftyTwoWeekLow)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-500">Volume</p>
                        <p className="text-slate-200 font-mono">{formatVolume(symbolDetail.quote.volume)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Fibonacci */}
                  <FibonacciPanel 
                    fibonacci={symbolDetail.fibonacci} 
                    currentPrice={symbolDetail.quote.price}
                  />
                </div>
              </>
            )}

            {!selectedSymbol && (
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-12 text-center">
                <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">Select a symbol to view chart and analysis</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
