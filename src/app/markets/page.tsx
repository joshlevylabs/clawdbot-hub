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
  ChevronDown,
  ChevronUp,
  X,
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

const SYMBOL_CATEGORIES = {
  indices: ['SPY', 'QQQ'],
  tech: ['AAPL', 'MSFT'],
  metals: ['GLD', 'SLV'],
};

function formatVolume(vol: number | null | undefined): string {
  if (vol == null) return '—';
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toString();
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safePercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toFixed(2);
}

// Simple canvas chart
function MiniChart({ 
  candles, 
  fibonacci,
  height = 200
}: { 
  candles: CandleData[]; 
  fibonacci: QuoteData['fibonacci'];
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || candles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const width = rect.width;
    const chartHeight = rect.height;
    const padding = { top: 10, right: 50, bottom: 20, left: 5 };
    const chartWidth = width - padding.left - padding.right;
    const drawHeight = chartHeight - padding.top - padding.bottom;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, chartHeight);

    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.05;

    const scaleY = (price: number) => {
      return padding.top + drawHeight - ((price - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * drawHeight;
    };

    const candleWidth = Math.max(1, (chartWidth / candles.length) - 0.5);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (drawHeight / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      const price = maxPrice - (priceRange / 3) * i;
      ctx.fillStyle = '#475569';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${price.toFixed(0)}`, width - padding.right + 3, y + 3);
    }

    // Fibonacci levels
    if (fibonacci?.levels) {
      fibonacci.levels.forEach(fib => {
        const y = scaleY(fib.price);
        if (y > padding.top && y < chartHeight - padding.bottom) {
          ctx.strokeStyle = fib.percent === 50 ? '#8b5cf680' : '#3b82f650';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(width - padding.right, y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // Candles
    candles.forEach((candle, i) => {
      const x = padding.left + (i / candles.length) * chartWidth + candleWidth / 2;
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#10b981' : '#ef4444';

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, scaleY(candle.high));
      ctx.lineTo(x, scaleY(candle.low));
      ctx.stroke();

      const bodyTop = scaleY(Math.max(candle.open, candle.close));
      const bodyBottom = scaleY(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);
      
      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

  }, [candles, fibonacci]);

  if (candles.length === 0) {
    return (
      <div className={`w-full bg-slate-800/30 rounded-lg flex items-center justify-center text-slate-600 text-sm`} style={{ height }}>
        Loading...
      </div>
    );
  }

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full rounded-lg"
      style={{ height, background: '#0f172a' }}
    />
  );
}

// Compact Quote Row for mobile
function QuoteRow({ 
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
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
        selected 
          ? 'bg-primary-600/20 border border-primary-500/50' 
          : 'bg-slate-800/50 border border-transparent hover:bg-slate-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="text-left">
          <p className="font-semibold text-slate-100">{quote.symbol}</p>
          <p className="text-xs text-slate-500">{quote.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-slate-100">${formatPrice(quote.price)}</p>
        <p className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{safePercent(quote.changePercent)}%
        </p>
      </div>
    </button>
  );
}

// Fibonacci Panel with explanation
function FibonacciPanel({ fibonacci, currentPrice }: { fibonacci: QuoteData['fibonacci']; currentPrice: number }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <span className="font-medium text-slate-200">Fibonacci Levels</span>
          <span className={`px-2 py-0.5 rounded text-xs ${
            fibonacci.trend === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {fibonacci.trend === 'up' ? '↑ Uptrend' : '↓ Downtrend'}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      
      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Explanation */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-400">
            <p className="mb-2">
              <strong className="text-slate-300">Based on:</strong> Swing Low at <span className="text-emerald-400">${formatPrice(fibonacci.low)}</span> → 
              Swing High at <span className="text-red-400">${formatPrice(fibonacci.high)}</span>
            </p>
            <p>Retracement levels show potential support/resistance during pullbacks.</p>
          </div>
          
          {/* Levels */}
          <div className="space-y-1">
            {fibonacci.levels.map(fib => {
              const isNearPrice = Math.abs(fib.price - currentPrice) / currentPrice < 0.015;
              const isKeyLevel = fib.percent === 38.2 || fib.percent === 50 || fib.percent === 61.8;
              return (
                <div 
                  key={fib.level} 
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    isNearPrice ? 'bg-amber-500/20 border border-amber-500/30' : 
                    isKeyLevel ? 'bg-slate-700/50' : 'bg-slate-800/30'
                  }`}
                >
                  <span className={`text-sm ${
                    fib.percent === 0 ? 'text-emerald-400 font-medium' : 
                    fib.percent === 100 ? 'text-red-400 font-medium' :
                    fib.percent === 50 ? 'text-purple-400 font-medium' : 
                    isKeyLevel ? 'text-blue-400' : 'text-slate-500'
                  }`}>
                    {fib.level}
                    {fib.percent === 0 && ' (High)'}
                    {fib.percent === 100 && ' (Low)'}
                  </span>
                  <span className={`text-sm font-mono ${isNearPrice ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    ${formatPrice(fib.price)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Collapsed preview */}
      {!expanded && fibonacci.levels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {fibonacci.levels
            .filter(l => l.percent === 38.2 || l.percent === 50 || l.percent === 61.8)
            .map(fib => (
              <span key={fib.level} className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400">
                {fib.level}: ${formatPrice(fib.price)}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

// Mobile Detail Modal
function DetailModal({ 
  detail, 
  onClose,
  range,
  setRange 
}: { 
  detail: SymbolDetail; 
  onClose: () => void;
  range: string;
  setRange: (r: string) => void;
}) {
  const isPositive = detail.quote.change >= 0;
  
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{detail.quote.symbol}</h2>
            <p className="text-sm text-slate-500">{detail.quote.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="flex items-baseline gap-3 mt-2">
          <span className="text-3xl font-bold text-slate-100">${formatPrice(detail.quote.price)}</span>
          <span className={`text-lg font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{formatPrice(detail.quote.change)} ({safePercent(detail.quote.changePercent)}%)
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Range Selector */}
        <div className="flex gap-2">
          {['1mo', '3mo', '6mo', '1y'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                range === r
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
        
        {/* Chart */}
        <MiniChart candles={detail.candles} fibonacci={detail.fibonacci} height={250} />
        
        {/* Fibonacci */}
        <FibonacciPanel fibonacci={detail.fibonacci} currentPrice={detail.quote.price} />
        
        {/* Key Stats */}
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-medium text-slate-200 mb-3">Key Statistics</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Open</span>
              <span className="text-slate-200 font-mono">${formatPrice(detail.quote.open)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Close</span>
              <span className="text-slate-200 font-mono">${formatPrice(detail.quote.prevClose)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">High</span>
              <span className="text-emerald-400 font-mono">${formatPrice(detail.quote.high)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Low</span>
              <span className="text-red-400 font-mono">${formatPrice(detail.quote.low)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">52W High</span>
              <span className="text-slate-200 font-mono">${formatPrice(detail.quote.fiftyTwoWeekHigh)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">52W Low</span>
              <span className="text-slate-200 font-mono">${formatPrice(detail.quote.fiftyTwoWeekLow)}</span>
            </div>
            <div className="col-span-2 flex justify-between">
              <span className="text-slate-500">Volume</span>
              <span className="text-slate-200 font-mono">{formatVolume(detail.quote.volume)}</span>
            </div>
          </div>
        </div>
      </div>
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
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    const interval = setInterval(fetchQuotes, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  useEffect(() => {
    if (selectedSymbol) {
      fetchSymbolDetail(selectedSymbol);
    }
  }, [selectedSymbol, fetchSymbolDetail]);

  useEffect(() => {
    if (quotes.length > 0 && !selectedSymbol) {
      setSelectedSymbol(quotes[0].symbol);
    }
  }, [quotes, selectedSymbol]);

  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    if (isMobile) {
      setShowModal(true);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchQuotes();
    if (selectedSymbol) {
      fetchSymbolDetail(selectedSymbol);
    }
  };

  // Mobile Detail Modal
  if (isMobile && showModal && symbolDetail) {
    return (
      <DetailModal 
        detail={symbolDetail} 
        onClose={() => setShowModal(false)}
        range={range}
        setRange={(r) => {
          setRange(r);
          if (selectedSymbol) fetchSymbolDetail(selectedSymbol);
        }}
      />
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" strokeWidth={1.5} />
            Markets
          </h1>
          {lastUpdate && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {lastUpdate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 lg:px-4 lg:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          <span className="hidden lg:inline text-sm">Refresh</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && quotes.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-slate-700 rounded w-1/3 mb-2" />
              <div className="h-4 bg-slate-700 rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      {!loading || quotes.length > 0 ? (
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Quote List */}
          <div className="space-y-4 lg:space-y-6">
            {/* Indices */}
            <div>
              <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2 px-1">
                <Activity className="w-3 h-3" /> Indices
              </h2>
              <div className="space-y-2">
                {quotes.filter(q => SYMBOL_CATEGORIES.indices.includes(q.symbol)).map(quote => (
                  <QuoteRow
                    key={quote.symbol}
                    quote={quote}
                    onClick={() => handleSelectSymbol(quote.symbol)}
                    selected={selectedSymbol === quote.symbol}
                  />
                ))}
              </div>
            </div>

            {/* Tech */}
            <div>
              <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2 px-1">
                <TrendingUp className="w-3 h-3" /> Tech
              </h2>
              <div className="space-y-2">
                {quotes.filter(q => SYMBOL_CATEGORIES.tech.includes(q.symbol)).map(quote => (
                  <QuoteRow
                    key={quote.symbol}
                    quote={quote}
                    onClick={() => handleSelectSymbol(quote.symbol)}
                    selected={selectedSymbol === quote.symbol}
                  />
                ))}
              </div>
            </div>

            {/* Metals */}
            <div>
              <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2 px-1">
                <span className="text-amber-400">◆</span> Precious Metals
              </h2>
              <div className="space-y-2">
                {quotes.filter(q => SYMBOL_CATEGORIES.metals.includes(q.symbol)).map(quote => (
                  <QuoteRow
                    key={quote.symbol}
                    quote={quote}
                    onClick={() => handleSelectSymbol(quote.symbol)}
                    selected={selectedSymbol === quote.symbol}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Detail Panel */}
          <div className="hidden lg:block lg:col-span-2 space-y-4">
            {selectedSymbol && symbolDetail && (
              <>
                {/* Chart Header */}
                <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">
                        {symbolDetail.quote.symbol} — {symbolDetail.quote.name}
                      </h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-2xl font-bold text-slate-100">
                          ${formatPrice(symbolDetail.quote.price)}
                        </span>
                        <span className={`text-sm font-medium ${
                          symbolDetail.quote.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {symbolDetail.quote.change >= 0 ? '+' : ''}
                          {formatPrice(symbolDetail.quote.change)} ({safePercent(symbolDetail.quote.changePercent)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {['1mo', '3mo', '6mo', '1y'].map(r => (
                        <button
                          key={r}
                          onClick={() => setRange(r)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
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

                  {detailLoading ? (
                    <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />
                  ) : (
                    <MiniChart candles={symbolDetail.candles} fibonacci={symbolDetail.fibonacci} height={300} />
                  )}
                </div>

                {/* Stats & Fib */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
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

                  <FibonacciPanel fibonacci={symbolDetail.fibonacci} currentPrice={symbolDetail.quote.price} />
                </div>
              </>
            )}

            {!selectedSymbol && (
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-12 text-center">
                <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">Select a symbol to view details</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
