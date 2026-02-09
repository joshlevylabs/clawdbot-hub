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
  Settings2,
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
  fibonacci: FibonacciData;
}

interface FibonacciData {
  high: number;
  low: number;
  pullback?: number | null;
  trend: 'up' | 'down';
  retracements: { level: string; price: number; percent: number }[];
  extensions: { level: string; price: number; percent: number }[];
  swingHighDate?: string;
  swingLowDate?: string;
  pullbackDate?: string;
}

interface MovingAveragesData {
  ma5: number | null;
  ma20: number | null;
  ma50: number | null;
  ma100: number | null;
  ma5Data: (number | null)[];
  ma20Data: (number | null)[];
  ma50Data: (number | null)[];
  ma100Data: (number | null)[];
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
  fibonacci: FibonacciData;
  movingAverages: MovingAveragesData;
}

interface ChartSettings {
  showMA5: boolean;
  showMA20: boolean;
  showMA50: boolean;
  showMA100: boolean;
  showFibRetracements: boolean;
  showFibExtensions: boolean;
}

const DEFAULT_SETTINGS: ChartSettings = {
  showMA5: false,
  showMA20: false,
  showMA50: false,
  showMA100: false,
  showFibRetracements: true,
  showFibExtensions: true,
};

// Note: label is the unique key used for selection matching
// Timeframes: label = candle size, range = default data to fetch, interval = Yahoo interval
const TIMEFRAMES = [
  // Intraday candles
  { label: '5m', range: '1d', interval: '5m' },
  { label: '15m', range: '5d', interval: '15m' },
  { label: '30m', range: '5d', interval: '30m' },
  { label: '1H', range: '1mo', interval: '1h' },
  { label: '4H', range: '3mo', interval: '4h' },
  // Daily candles
  { label: '1D', range: '6mo', interval: '1d' },
  // Weekly candles
  { label: '1W', range: '2y', interval: '1wk' },
  // Monthly candles
  { label: '1M', range: '5y', interval: '1mo' },
  // 6-month candles (custom aggregation from monthly)
  { label: '6M', range: '10y', interval: '6mo' },
  // Yearly candles (custom aggregation from monthly)
  { label: '1Y', range: '10y', interval: '12mo' },
];

const SYMBOL_CATEGORIES = {
  broad_market: ['SPY', 'QQQ', 'IWM'],
  sectors: ['XLK', 'XLC', 'XLF', 'XLV', 'XLP', 'XLE', 'XLB', 'XLU'],
  international: ['EFA', 'EEM', 'INDA', 'FXI', 'EWJ'],
  bonds: ['TLT', 'IEF', 'HYG'],
  commodities: ['GLD', 'SLV', 'GDX', 'DBA', 'BITO'],
};

// Persistence helpers
function getStoredSettings(symbol: string): ChartSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(`markets_settings_${symbol}`);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function storeSettings(symbol: string, settings: ChartSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`markets_settings_${symbol}`, JSON.stringify(settings));
  } catch {}
}

function getStoredTimeframe(symbol: string): string {
  if (typeof window === 'undefined') return '3M';
  try {
    const stored = localStorage.getItem(`markets_timeframe_${symbol}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle old format { range, interval } by finding matching label
      if (typeof parsed === 'object' && parsed.range) {
        const match = TIMEFRAMES.find(tf => tf.range === parsed.range && tf.interval === parsed.interval);
        return match?.label ?? '3M';
      }
      return parsed;
    }
    return '3M';
  } catch {
    return '3M';
  }
}

function storeTimeframe(symbol: string, label: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`markets_timeframe_${symbol}`, JSON.stringify(label));
  } catch {}
}

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

// Custom Fibonacci points
interface CustomFibPoints {
  a: number | null; // swing low index
  b: number | null; // swing high index
  c: number | null; // pullback index
}

// View range for pan/zoom
interface ViewRange {
  start: number; // start index (0 = oldest, can be negative for "past" buffer)
  end: number;   // end index (candles.length = newest, can exceed for "future" buffer)
}

// Allow scrolling beyond data boundaries (as ratio of visible candles)
const SCROLL_BUFFER_RATIO = 0.3; // Can scroll 30% beyond data in either direction

// Helper to find candle index by date string
function findCandleIndexByDate(candles: CandleData[], dateStr: string | undefined): number | null {
  if (!dateStr || candles.length === 0) return null;
  
  // Parse the date string (format like "Jan 15, 2025" or "1/15/25")
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return null;
  
  const targetTime = targetDate.getTime();
  
  // Find the candle with the closest date
  let closestIndex = -1;
  let closestDiff = Infinity;
  
  for (let i = 0; i < candles.length; i++) {
    const candleTime = candles[i].time * 1000; // Convert to ms
    const diff = Math.abs(candleTime - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }
  
  // Only return if within reasonable range (1 day for daily candles, etc)
  if (closestIndex >= 0 && closestDiff < 7 * 24 * 60 * 60 * 1000) { // 7 days tolerance
    return closestIndex;
  }
  
  return null;
}

// Helper to find candle index by price (swing high/low)
function findCandleIndexByPrice(candles: CandleData[], price: number, type: 'high' | 'low'): number | null {
  if (!price || candles.length === 0) return null;
  
  for (let i = 0; i < candles.length; i++) {
    const candlePrice = type === 'high' ? candles[i].high : candles[i].low;
    if (Math.abs(candlePrice - price) < 0.01) {
      return i;
    }
  }
  return null;
}

// Chart with MAs and Fibonacci
function ChartCanvas({ 
  candles, 
  fibonacci,
  movingAverages,
  settings,
  height = 250,
  onCustomFib,
  customFibPoints,
  onRequestMoreData,
  isLoadingMore,
}: { 
  candles: CandleData[]; 
  fibonacci: FibonacciData;
  movingAverages?: MovingAveragesData;
  settings: ChartSettings;
  height?: number;
  onCustomFib?: (points: CustomFibPoints) => void;
  customFibPoints?: CustomFibPoints;
  onRequestMoreData?: () => void; // Called when user scrolls near the start
  isLoadingMore?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; candle: CandleData; index: number; date: string } | null>(null);
  const [selectMode, setSelectMode] = useState<'none' | 'a' | 'b' | 'c'>('none');
  const [localFibPoints, setLocalFibPoints] = useState<CustomFibPoints>({ a: null, b: null, c: null });
  const [dragPreview, setDragPreview] = useState<{ globalIndex: number; x: number; isValid: boolean } | null>(null);
  const isDraggingFib = useRef(false);
  const dragPreviewRef = useRef<{ globalIndex: number; x: number; isValid: boolean } | null>(null);
  
  // Pan & Zoom state
  const [viewRange, setViewRange] = useState<ViewRange>({ start: 0, end: candles.length });
  const [yScale, setYScale] = useState(1); // 1 = auto-fit, <1 = zoom in (less range), >1 = zoom out (more range)
  const [isPanning, setIsPanning] = useState(false);
  const [isOverYAxis, setIsOverYAxis] = useState(false);
  const panStartRef = useRef<{ x: number; viewStart: number; viewEnd: number } | null>(null);
  const touchStartRef = useRef<{ touches: { x: number; y: number }[]; viewStart: number; viewEnd: number; yScale: number } | null>(null);
  
  const fibPoints = customFibPoints || localFibPoints;
  const setFibPoints = onCustomFib || setLocalFibPoints;
  
  // Reset view when candles change
  useEffect(() => {
    setViewRange({ start: 0, end: candles.length });
    setYScale(1);
  }, [candles.length]);
  
  // Get visible candles based on view range
  const visibleStart = Math.max(0, Math.floor(viewRange.start));
  const visibleEnd = Math.min(candles.length, Math.ceil(viewRange.end));
  const visibleCandles = candles.slice(visibleStart, visibleEnd);
  const isXZoomed = viewRange.start !== 0 || viewRange.end !== candles.length;
  const isYZoomed = yScale !== 1;
  const isZoomed = isXZoomed || isYZoomed;
  
  // Request more historical data when scrolling near the start
  const lastCandleCount = useRef(candles.length);
  const hasUserScrolled = useRef(false);
  
  useEffect(() => {
    // Reset when candle count changes (new data loaded or new symbol/timeframe)
    if (candles.length !== lastCandleCount.current) {
      lastCandleCount.current = candles.length;
      hasUserScrolled.current = false; // Reset scroll tracking
    }
  }, [candles.length]);
  
  // Track when user has scrolled away from initial position
  useEffect(() => {
    // User has scrolled if view is not at the default end position
    if (viewRange.end < candles.length - 1) {
      hasUserScrolled.current = true;
    }
  }, [viewRange.end, candles.length]);
  
  useEffect(() => {
    // Only trigger when:
    // 1. User has actually scrolled (not initial load)
    // 2. Visible start is within 15% of beginning
    // 3. Not already loading
    // 4. Haven't just loaded new data
    const threshold = Math.max(10, candles.length * 0.15);
    const shouldLoad = hasUserScrolled.current &&
                       visibleStart < threshold && 
                       !isLoadingMore && 
                       onRequestMoreData &&
                       candles.length === lastCandleCount.current;
    
    if (shouldLoad) {
      console.log(`Requesting more data: visibleStart=${visibleStart}, threshold=${threshold}, candles=${candles.length}`);
      onRequestMoreData();
    }
  }, [visibleStart, candles.length, isLoadingMore, onRequestMoreData]);

  // Chart dimensions and scaling (memoized for click handling)
  const chartDims = useRef<{
    padding: { top: number; right: number; bottom: number; left: number };
    width: number;
    chartHeight: number;
    chartWidth: number;
    drawHeight: number;
    minPrice: number;
    maxPrice: number;
    priceRange: number;
    pricePadding: number;
    candleWidth: number;
  } | null>(null);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Simplified chart drawing for the overview
  useEffect(() => {
    if (!canvasRef.current || visibleCandles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const width = rect.width;
    const canvasHeight = rect.height;
    const padding = { top: 10, right: 55, bottom: 35, left: 5 };
    const chartWidth = width - padding.left - padding.right;
    const drawHeight = canvasHeight - padding.top - padding.bottom;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, canvasHeight);

    // Calculate price range from visible candles
    let prices = visibleCandles.flatMap(c => [c.high, c.low]);
    if (settings.showFibExtensions && fibonacci?.extensions) {
      prices = prices.concat(fibonacci.extensions.map(e => e.price));
    }
    
    const rawMinPrice = Math.min(...prices);
    const rawMaxPrice = Math.max(...prices);
    const rawPriceRange = rawMaxPrice - rawMinPrice;
    const priceCenter = (rawMaxPrice + rawMinPrice) / 2;
    
    // Apply Y scale factor (1 = auto-fit, <1 = zoom in, >1 = zoom out)
    const scaledPriceRange = rawPriceRange * yScale;
    const minPrice = priceCenter - scaledPriceRange / 2;
    const maxPrice = priceCenter + scaledPriceRange / 2;
    const priceRange = scaledPriceRange;
    const pricePadding = priceRange * 0.03;

    // Calculate candle width based on the full view range (including empty space)
    const viewRangeSize = viewRange.end - viewRange.start;
    const candleWidth = Math.max(1, (chartWidth / viewRangeSize) - 0.5);
    
    // Offset for when we've scrolled into empty space (viewRange.start < visibleStart)
    const startOffset = visibleStart - viewRange.start;

    // Store dims for click handling
    chartDims.current = { padding, width, chartHeight: canvasHeight, chartWidth, drawHeight, minPrice, maxPrice, priceRange, pricePadding, candleWidth };

    const scaleY = (price: number) => {
      return padding.top + drawHeight - ((price - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * drawHeight;
    };
    // scaleX maps visible candle index (0-based within visibleCandles) to X position
    // Account for offset when scrolled into empty past space
    const scaleX = (i: number) => padding.left + ((i + startOffset) / viewRangeSize) * chartWidth;

    // Y-axis highlight when hovered (interactive zoom area)
    if (isOverYAxis) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Subtle blue highlight
      ctx.fillRect(width - padding.right, padding.top, padding.right, drawHeight);
    }
    
    // Y-axis grid and labels
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (drawHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      const price = maxPrice + pricePadding - ((priceRange + pricePadding * 2) / 4) * i;
      ctx.fillStyle = isOverYAxis ? '#60a5fa' : '#94a3b8'; // Brighter labels
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${price.toFixed(price > 100 ? 0 : 2)}`, width - padding.right + 3, y + 3);
    }

    // X-axis date labels - adaptive count based on chart width
    ctx.fillStyle = '#94a3b8'; // Brighter labels
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    
    // Calculate how many labels can fit (estimate ~50px per label on mobile, ~60px on desktop)
    const labelWidth = width < 500 ? 45 : 55;
    const maxLabels = Math.floor(chartWidth / labelWidth);
    const labelCount = Math.min(maxLabels, Math.min(6, visibleCandles.length));
    const labelStep = Math.max(1, Math.floor(visibleCandles.length / labelCount));
    
    // Shorter format for mobile
    const formatLabel = (timestamp: number) => {
      const d = new Date(timestamp * 1000);
      if (width < 500) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    };
    
    let lastLabelX = -100; // Track last label position to avoid overlap
    for (let i = 0; i < visibleCandles.length; i += labelStep) {
      const x = scaleX(i) + candleWidth / 2;
      // Skip if too close to last label
      if (x - lastLabelX < labelWidth) continue;
      const date = formatLabel(visibleCandles[i].time);
      ctx.fillText(date, x, canvasHeight - padding.bottom + 15);
      lastLabelX = x;
    }
    // Last date (only if not overlapping)
    if (visibleCandles.length > 0) {
      const lastX = scaleX(visibleCandles.length - 1) + candleWidth / 2;
      if (lastX - lastLabelX >= labelWidth) {
        ctx.fillText(formatLabel(visibleCandles[visibleCandles.length - 1].time), lastX, canvasHeight - padding.bottom + 15);
      }
    }

    // Get current price for % calculations
    const currentPrice = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].close : 0;
    
    // Fibonacci Retracements - brighter, larger text with price and %
    if (settings.showFibRetracements && fibonacci?.retracements) {
      fibonacci.retracements.forEach(fib => {
        const y = scaleY(fib.price);
        if (y > padding.top - 5 && y < canvasHeight - padding.bottom + 5) {
          // Brighter, thicker lines
          ctx.strokeStyle = fib.percent === 50 ? '#a78bfacc' : '#60a5facc';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(width - padding.right, y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Calculate % from current price
          const pctFromCurrent = currentPrice > 0 ? ((fib.price - currentPrice) / currentPrice * 100) : 0;
          const pctSign = pctFromCurrent >= 0 ? '+' : '';
          
          // Left side: level label
          ctx.fillStyle = fib.percent === 50 ? '#a78bfa' : '#60a5fa';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(fib.level, padding.left + 4, y - 4);
          
          // Right side: price and % from current
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'right';
          const priceText = `$${fib.price.toFixed(2)} (${pctSign}${pctFromCurrent.toFixed(1)}%)`;
          ctx.fillText(priceText, width - padding.right - 4, y - 4);
        }
      });
    }
    
    // Fibonacci Extensions - brighter, larger text with price and %
    if (settings.showFibExtensions && fibonacci?.extensions) {
      fibonacci.extensions.forEach(ext => {
        const y = scaleY(ext.price);
        if (y > padding.top - 5 && y < canvasHeight - padding.bottom + 5) {
          // Brighter, thicker lines
          ctx.strokeStyle = '#34d399cc';
          ctx.setLineDash([6, 4]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(width - padding.right, y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Calculate % from current price
          const pctFromCurrent = currentPrice > 0 ? ((ext.price - currentPrice) / currentPrice * 100) : 0;
          const pctSign = pctFromCurrent >= 0 ? '+' : '';
          
          // Left side: level label
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`↑${ext.level}`, padding.left + 4, y - 4);
          
          // Right side: price and % from current
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'right';
          const priceText = `$${ext.price.toFixed(2)} (${pctSign}${pctFromCurrent.toFixed(1)}%)`;
          ctx.fillText(priceText, width - padding.right - 4, y - 4);
        }
      });
    }

    // Moving Averages (slice to visible range)
    const maConfigs = [
      { show: settings.showMA5, data: movingAverages?.ma5Data, color: '#f59e0b' },
      { show: settings.showMA20, data: movingAverages?.ma20Data, color: '#ec4899' },
      { show: settings.showMA50, data: movingAverages?.ma50Data, color: '#06b6d4' },
      { show: settings.showMA100, data: movingAverages?.ma100Data, color: '#8b5cf6' },
    ];
    
    maConfigs.forEach(({ show, data, color }) => {
      if (!show || !data) return;
      const visibleData = data.slice(visibleStart, visibleEnd);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      visibleData.forEach((val, i) => {
        if (val === null) return;
        const x = scaleX(i) + candleWidth / 2;
        const y = scaleY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });

    // Candles
    visibleCandles.forEach((candle, i) => {
      const x = scaleX(i) + candleWidth / 2;
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

  }, [candles, visibleCandles, visibleStart, visibleEnd, viewRange, yScale, isOverYAxis, fibonacci, movingAverages, settings, fibPoints, dragPreview, selectMode]);

  const handleMouseLeave = () => {
    setTooltip(null);
    setIsPanning(false);
    setIsOverYAxis(false);
    panStartRef.current = null;
  };
  
  if (candles.length === 0) {
    return (
      <div className="w-full bg-slate-800/30 rounded-lg flex items-center justify-center text-slate-600 text-sm" style={{ height }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Chart canvas */}
      <div className="relative">
        {isLoadingMore && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <RefreshCw className="w-3 h-3 text-primary-400 animate-spin" />
            <span className="text-xs text-slate-300">Loading more data...</span>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className="w-full rounded-lg"
          style={{ 
            height, 
            background: '#0f172a', 
            touchAction: 'none',
            cursor: isOverYAxis ? 'ns-resize' : 'crosshair'
          }}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Tooltip */}
        {tooltip && (
          <div 
            className="absolute bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-sm pointer-events-none z-10 min-w-[150px]"
            style={{ left: Math.min(tooltip.x + 10, 200), top: tooltip.y - 80 }}
          >
            <p className="text-slate-400 text-xs mb-1">{tooltip.date}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <span className="text-slate-500">Open</span>
              <span className="text-slate-200 font-mono">${tooltip.candle.open.toFixed(2)}</span>
              <span className="text-slate-500">High</span>
              <span className="text-emerald-400 font-mono">${tooltip.candle.high.toFixed(2)}</span>
              <span className="text-slate-500">Low</span>
              <span className="text-red-400 font-mono">${tooltip.candle.low.toFixed(2)}</span>
              <span className="text-slate-500">Close</span>
              <span className="text-slate-200 font-mono">${tooltip.candle.close.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Settings Panel
function SettingsPanel({ 
  settings, 
  onChange,
  movingAverages 
}: { 
  settings: ChartSettings; 
  onChange: (s: ChartSettings) => void;
  movingAverages?: MovingAveragesData;
}) {
  const [open, setOpen] = useState(false);
  
  const toggle = (key: keyof ChartSettings) => {
    onChange({ ...settings, [key]: !settings[key] });
  };
  
  return (
    <div className="relative" style={{ zIndex: open ? 200 : 'auto' }}>
      <button 
        onClick={() => setOpen(!open)}
        className={`p-2 rounded-lg transition-colors ${open ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
      >
        <Settings2 className="w-4 h-4" />
      </button>
      
      {open && (
        <div className="absolute right-0 top-10 z-[200] bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl min-w-[200px]">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Indicators</p>
          
          <div className="space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-300">MA 5</span>
              <div className="flex items-center gap-2">
                {movingAverages?.ma5 && <span className="text-xs text-amber-400">${movingAverages.ma5.toFixed(2)}</span>}
                <input 
                  type="checkbox" 
                  checked={settings.showMA5} 
                  onChange={() => toggle('showMA5')}
                  className="w-4 h-4 rounded accent-amber-500"
                />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-300">MA 20</span>
              <div className="flex items-center gap-2">
                {movingAverages?.ma20 && <span className="text-xs text-pink-400">${movingAverages.ma20.toFixed(2)}</span>}
                <input 
                  type="checkbox" 
                  checked={settings.showMA20} 
                  onChange={() => toggle('showMA20')}
                  className="w-4 h-4 rounded accent-pink-500"
                />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-300">MA 50</span>
              <div className="flex items-center gap-2">
                {movingAverages?.ma50 && <span className="text-xs text-cyan-400">${movingAverages.ma50.toFixed(2)}</span>}
                <input 
                  type="checkbox" 
                  checked={settings.showMA50} 
                  onChange={() => toggle('showMA50')}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-300">MA 100</span>
              <div className="flex items-center gap-2">
                {movingAverages?.ma100 && <span className="text-xs text-purple-400">${movingAverages.ma100.toFixed(2)}</span>}
                <input 
                  type="checkbox" 
                  checked={settings.showMA100} 
                  onChange={() => toggle('showMA100')}
                  className="w-4 h-4 rounded accent-purple-500"
                />
              </div>
            </label>
          </div>
          
          <div className="border-t border-slate-700 mt-3 pt-3 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-300">Fib Retracements</span>
              <input 
                type="checkbox" 
                checked={settings.showFibRetracements} 
                onChange={() => toggle('showFibRetracements')}
                className="w-4 h-4 rounded accent-blue-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-300">Fib Extensions</span>
              <input 
                type="checkbox" 
                checked={settings.showFibExtensions} 
                onChange={() => toggle('showFibExtensions')}
                className="w-4 h-4 rounded accent-emerald-500"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// Quote Row
function QuoteRow({ quote, onClick, selected }: { quote: QuoteData; onClick: () => void; selected: boolean }) {
  const isPositive = quote.change >= 0;
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
        selected ? 'bg-primary-600/20 border border-primary-500/50' : 'bg-slate-800/50 border border-transparent hover:bg-slate-800'
      }`}
    >
      <div className="text-left">
        <p className="font-semibold text-slate-100">{quote.symbol}</p>
        <p className="text-xs text-slate-500">{quote.name}</p>
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

// Fibonacci Panel
function FibonacciPanel({ fibonacci, currentPrice }: { fibonacci: FibonacciData; currentPrice: number }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!fibonacci) return null;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <span className="font-medium text-slate-200">Fibonacci Levels</span>
          <span className={`px-2 py-0.5 rounded text-xs ${fibonacci.trend === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {fibonacci.trend === 'up' ? '↑' : '↓'}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      
      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-400 space-y-1">
            <p><strong className="text-emerald-400">A) Swing Low:</strong> ${formatPrice(fibonacci.low)} {fibonacci.swingLowDate && `(${fibonacci.swingLowDate})`}</p>
            <p><strong className="text-red-400">B) Swing High:</strong> ${formatPrice(fibonacci.high)} {fibonacci.swingHighDate && `(${fibonacci.swingHighDate})`}</p>
            {fibonacci.pullback && (
              <p><strong className="text-amber-400">C) Pullback:</strong> ${formatPrice(fibonacci.pullback)} {fibonacci.pullbackDate && `(${fibonacci.pullbackDate})`}</p>
            )}
            <p className="text-slate-500 mt-2 pt-2 border-t border-slate-800">
              Retracements: levels between A↔B • Extensions: project from C using A→B range
            </p>
          </div>
          
          {/* Retracements */}
          <div>
            <p className="text-xs text-blue-400 uppercase tracking-wide mb-2">Retracements (Support)</p>
            <div className="space-y-1">
              {fibonacci.retracements?.filter(r => [0, 38.2, 50, 61.8, 100].includes(r.percent)).map(fib => {
                const isNear = Math.abs(fib.price - currentPrice) / currentPrice < 0.015;
                return (
                  <div key={fib.level} className={`flex justify-between p-2 rounded ${isNear ? 'bg-amber-500/20' : 'bg-slate-800/30'}`}>
                    <span className={`text-sm ${fib.percent === 0 ? 'text-emerald-400' : fib.percent === 100 ? 'text-red-400' : 'text-blue-400'}`}>
                      {fib.level} {fib.percent === 0 && '(High)'}{fib.percent === 100 && '(Low)'}
                    </span>
                    <span className={`text-sm font-mono ${isNear ? 'text-amber-300' : 'text-slate-300'}`}>${formatPrice(fib.price)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Extensions */}
          <div>
            <p className="text-xs text-emerald-400 uppercase tracking-wide mb-2">Extensions (Targets)</p>
            <div className="space-y-1">
              {fibonacci.extensions?.map(ext => (
                <div key={ext.level} className="flex justify-between p-2 rounded bg-emerald-500/10">
                  <span className="text-sm text-emerald-400">↑ {ext.level}</span>
                  <span className="text-sm font-mono text-emerald-300">${formatPrice(ext.price)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {!expanded && (
        <div className="mt-2 space-y-2">
          {/* A/B/C points summary */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-emerald-400">A: ${formatPrice(fibonacci.low)}</span>
            <span className="text-red-400">B: ${formatPrice(fibonacci.high)}</span>
            {fibonacci.pullback && <span className="text-amber-400">C: ${formatPrice(fibonacci.pullback)}</span>}
          </div>
          {/* Key levels */}
          {fibonacci.retracements && (
            <div className="flex flex-wrap gap-1">
              {fibonacci.retracements.filter(l => [38.2, 50, 61.8].includes(l.percent)).map(fib => (
                <span key={fib.level} className="px-2 py-0.5 bg-blue-500/20 rounded text-xs text-blue-400">{fib.level}: ${formatPrice(fib.price)}</span>
              ))}
              {fibonacci.extensions?.slice(0, 2).map(ext => (
                <span key={ext.level} className="px-2 py-0.5 bg-emerald-500/20 rounded text-xs text-emerald-400">↑{ext.level}: ${formatPrice(ext.price)}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MRE Analysis Panel ─────────────────────────────────────────

interface MRESignalData {
  asset_class: string;
  symbol: string;
  signal: string;
  signal_strength: number;
  price: number;
  regime: string;
  hold_days: number;
  expected_sharpe: number;
  expected_accuracy: number;
  fibonacci: {
    nearest_support: number;
    nearest_resistance: number;
    entry_zone: string;
    profit_targets: number[];
    retracements: Record<string, number>;
  };
  regime_details: {
    regime: string;
    confidence: number;
    momentum_20d: number;
    regime_stage: string;
    regime_days: number;
    predicted_remaining_days: number;
    above_ema_20?: boolean;
    above_ema_50?: boolean;
    above_ema_200?: boolean;
    ema_20?: number;
    ema_50?: number;
    ema_200?: number;
    ema_slow?: number;
    ema_spread_pct?: number;
  };
}

function MREAnalysisPanel({ signal }: { signal: MRESignalData }) {
  const { regime_details: rd, fibonacci: fib } = signal;

  const signalColor = signal.signal === "BUY"
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
    : signal.signal === "HOLD"
    ? "bg-slate-500/20 text-slate-400 border-slate-500/50"
    : "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";

  const regimeColor = rd.regime === "bull"
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
    : rd.regime === "bear"
    ? "bg-red-500/20 text-red-400 border-red-500/40"
    : "bg-amber-500/20 text-amber-400 border-amber-500/40";

  const regimeIcon = rd.regime === "bull" ? "🟢" : rd.regime === "bear" ? "🔴" : "🟡";

  return (
    <div className="bg-slate-850 rounded-xl border border-primary-500/30 overflow-hidden">
      {/* Header */}
      <div className="bg-primary-600/20 border-b border-primary-500/30 px-4 py-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary-400" />
        <span className="font-semibold text-slate-100">MRE Signal Analysis</span>
        <span className={`ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-xs font-bold ${signalColor}`}>
          {signal.signal}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Signal Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Confidence</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${rd.confidence >= 70 ? "bg-emerald-500" : rd.confidence >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${rd.confidence}%` }} />
              </div>
              <span className="text-sm font-bold text-slate-200">{rd.confidence}%</span>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Expected Sharpe</p>
            <p className={`text-lg font-bold ${signal.expected_sharpe >= 1 ? "text-emerald-400" : "text-amber-400"}`}>{signal.expected_sharpe.toFixed(2)}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Expected Accuracy</p>
            <p className={`text-lg font-bold ${signal.expected_accuracy >= 60 ? "text-emerald-400" : "text-amber-400"}`}>{signal.expected_accuracy.toFixed(1)}%</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Hold Days</p>
            <p className="text-lg font-bold text-slate-200">{signal.hold_days}d</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Signal Strength</p>
            <p className="text-lg font-bold text-slate-200">{(signal.signal_strength * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Regime</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-medium capitalize ${regimeColor}`}>
              {regimeIcon} {rd.regime}
            </span>
          </div>
        </div>

        {/* Fibonacci Entry Zones from MRE */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
            <Target className="w-3.5 h-3.5" /> MRE Fibonacci Zones
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Entry Zone</p>
              <p className="text-slate-200 font-mono">${fib.entry_zone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Nearest Support</p>
              <p className="text-emerald-400 font-mono">${fib.nearest_support.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Nearest Resistance</p>
              <p className="text-red-400 font-mono">${fib.nearest_resistance.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Profit Targets</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {fib.profit_targets.map((t, i) => (
                  <span key={i} className="text-emerald-400 font-mono text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">${t.toFixed(2)}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Regime Details */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Regime Details
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Regime Duration</p>
              <p className="text-slate-200">{rd.regime_days} days</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Regime Stage</p>
              <p className="text-slate-200 capitalize">{rd.regime_stage}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Predicted Remaining</p>
              <p className="text-slate-200">{rd.predicted_remaining_days}d</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">20d Momentum</p>
              <p className={`font-mono ${rd.momentum_20d >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {rd.momentum_20d >= 0 ? "+" : ""}{rd.momentum_20d.toFixed(2)}%
              </p>
            </div>
            {rd.ema_spread_pct !== undefined && (
              <div>
                <p className="text-xs text-slate-500">EMA Spread</p>
                <p className="text-slate-200 font-mono">{rd.ema_spread_pct.toFixed(2)}%</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">EMA Position</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {rd.above_ema_20 !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${rd.above_ema_20 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {rd.above_ema_20 ? "↑" : "↓"} EMA20
                  </span>
                )}
                {rd.above_ema_50 !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${rd.above_ema_50 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {rd.above_ema_50 ? "↑" : "↓"} EMA50
                  </span>
                )}
                {rd.above_ema_200 !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${rd.above_ema_200 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {rd.above_ema_200 ? "↑" : "↓"} EMA200
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Markets Overview Component ──────────────────────────────────

interface MarketsOverviewProps {
  initialSymbol?: string | null;
  mreSignalData?: MRESignalData | null;
  onSymbolConsumed?: () => void;
}

export default function MarketsOverview({ initialSymbol, mreSignalData, onSymbolConsumed }: MarketsOverviewProps = {}) {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [symbolDetail, setSymbolDetail] = useState<SymbolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingMoreData, setLoadingMoreData] = useState(false);
  const [currentDataRange, setCurrentDataRange] = useState<string>('3mo'); // Will be set by initial fetch
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  
  // Derive range and interval from selected timeframe
  const currentTf = TIMEFRAMES.find(tf => tf.label === selectedTimeframe) || TIMEFRAMES[5]; // Default to 1D
  const range = currentTf.range;
  const interval = currentTf.interval;
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState<ChartSettings>(DEFAULT_SETTINGS);
  const [customFibPoints, setCustomFibPoints] = useState<CustomFibPoints>({ a: null, b: null, c: null });
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle initial symbol from Analyze feature
  useEffect(() => {
    if (initialSymbol) {
      setSelectedSymbol(initialSymbol);
      // Signal that we've consumed it so the parent can clear it if desired
      if (onSymbolConsumed) {
        // Delay slightly so the symbol has time to load
        const timer = setTimeout(onSymbolConsumed, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [initialSymbol, onSymbolConsumed]);

  // Load stored settings when symbol changes
  useEffect(() => {
    if (selectedSymbol) {
      setSettings(getStoredSettings(selectedSymbol));
      const storedTf = getStoredTimeframe(selectedSymbol);
      setSelectedTimeframe(storedTf);
      // Reset custom Fib points when symbol changes
      setCustomFibPoints({ a: null, b: null, c: null });
    }
  }, [selectedSymbol]);
  
  // Reset custom Fib points when timeframe changes
  useEffect(() => {
    setCustomFibPoints({ a: null, b: null, c: null });
  }, [selectedTimeframe]);

  // Save settings when they change
  useEffect(() => {
    if (selectedSymbol) {
      storeSettings(selectedSymbol, settings);
    }
  }, [settings, selectedSymbol]);

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

  const fetchSymbolDetail = useCallback(async (symbol: string, r: string, i: string, isExtending = false) => {
    if (!isExtending) {
      setDetailLoading(true);
      setCurrentDataRange(r);
    }
    try {
      const response = await fetch(`/api/markets?symbol=${symbol}&range=${r}&interval=${i}`);
      if (response.ok) {
        const data = await response.json();
        setSymbolDetail(data);
        setCurrentDataRange(r);
      }
    } catch (error) {
      console.error('Failed to fetch symbol detail:', error);
    } finally {
      setDetailLoading(false);
      setLoadingMoreData(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
    const timer = window.setInterval(fetchQuotes, 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchQuotes]);

  useEffect(() => {
    if (selectedSymbol) {
      setCurrentDataRange(range); // Reset to default range
      fetchSymbolDetail(selectedSymbol, range, interval);
    }
  }, [selectedSymbol, range, interval, fetchSymbolDetail]);

  useEffect(() => {
    if (quotes.length > 0 && !selectedSymbol) {
      setSelectedSymbol(quotes[0].symbol);
    }
  }, [quotes, selectedSymbol]);

  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const handleTimeframeChange = (label: string) => {
    setSelectedTimeframe(label);
    if (selectedSymbol) storeTimeframe(selectedSymbol, label);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchQuotes();
    if (selectedSymbol) fetchSymbolDetail(selectedSymbol, range, interval);
  };

  return (
    <div className="space-y-4 lg:space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />Markets Overview
          </h1>
          {lastUpdate && <p className="text-xs text-slate-500 mt-1"><Clock className="w-3 h-3 inline" /> {lastUpdate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>}
        </div>
        <button onClick={handleRefresh} disabled={loading} className="p-2 lg:px-4 lg:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden lg:inline text-sm">Refresh</span>
        </button>
      </div>

      {loading && quotes.length === 0 && (
        <div className="space-y-2">{[1,2,3,4,5,6].map(i => <div key={i} className="bg-slate-800/50 rounded-xl p-4 animate-pulse"><div className="h-5 bg-slate-700 rounded w-1/3 mb-2" /></div>)}</div>
      )}

      {(!loading || quotes.length > 0) && (
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="space-y-4">
            {Object.entries(SYMBOL_CATEGORIES).map(([cat, syms]) => {
              // Map category keys to display names and icons
              const categoryInfo = {
                broad_market: { name: "Broad Market", icon: "📊" },
                sectors: { name: "Sectors", icon: "🏭" },
                international: { name: "International", icon: "🌍" },
                bonds: { name: "Fixed Income", icon: "🏛️" },
                commodities: { name: "Commodities", icon: "🥇" }
              }[cat] || { name: cat, icon: "📈" };
              
              return (
              <div key={cat}>
                <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-2 px-1 flex items-center gap-2">
                  <span>{categoryInfo.icon}</span>
                  {categoryInfo.name}
                </h2>
                <div className="space-y-2">
                  {quotes.filter(q => syms.includes(q.symbol)).map(quote => (
                    <QuoteRow key={quote.symbol} quote={quote} onClick={() => handleSelectSymbol(quote.symbol)} selected={selectedSymbol === quote.symbol} />
                  ))}
                </div>
              </div>
              );
            })}
          </div>

          <div className="hidden lg:block lg:col-span-2 space-y-4">
            {selectedSymbol && symbolDetail && (
              <>
                <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">{symbolDetail.quote.symbol} — {symbolDetail.quote.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-2xl font-bold text-slate-100">${formatPrice(symbolDetail.quote.price)}</span>
                        <span className={`text-sm font-medium ${symbolDetail.quote.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {symbolDetail.quote.change >= 0 ? '+' : ''}{formatPrice(symbolDetail.quote.change)} ({safePercent(symbolDetail.quote.changePercent)}%)
                        </span>
                      </div>
                    </div>
                    <SettingsPanel settings={settings} onChange={setSettings} movingAverages={symbolDetail.movingAverages} />
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {TIMEFRAMES.map(tf => (
                      <button key={tf.label} onClick={() => handleTimeframeChange(tf.label)}
                        className={`px-2 py-1 rounded text-xs font-medium ${selectedTimeframe === tf.label ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                        {tf.label}
                      </button>
                    ))}
                  </div>

                  {detailLoading ? <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" /> :
                    <ChartCanvas 
                      candles={symbolDetail.candles} 
                      fibonacci={symbolDetail.fibonacci} 
                      movingAverages={symbolDetail.movingAverages} 
                      settings={settings} 
                      height={300}
                      customFibPoints={customFibPoints}
                      onCustomFib={setCustomFibPoints}
                      isLoadingMore={loadingMoreData}
                    />}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FibonacciPanel fibonacci={symbolDetail.fibonacci} currentPrice={symbolDetail.quote.price} />
                  <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
                    <h3 className="font-medium text-slate-200 mb-3">Key Statistics</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-slate-500">Open</p><p className="text-slate-200 font-mono">${formatPrice(symbolDetail.quote.open)}</p></div>
                      <div><p className="text-slate-500">Prev Close</p><p className="text-slate-200 font-mono">${formatPrice(symbolDetail.quote.prevClose)}</p></div>
                      <div><p className="text-slate-500">Day High</p><p className="text-emerald-400 font-mono">${formatPrice(symbolDetail.quote.high)}</p></div>
                      <div><p className="text-slate-500">Day Low</p><p className="text-red-400 font-mono">${formatPrice(symbolDetail.quote.low)}</p></div>
                      <div><p className="text-slate-500">52W High</p><p className="text-slate-200 font-mono">${formatPrice(symbolDetail.quote.fiftyTwoWeekHigh)}</p></div>
                      <div><p className="text-slate-500">52W Low</p><p className="text-slate-200 font-mono">${formatPrice(symbolDetail.quote.fiftyTwoWeekLow)}</p></div>
                      <div className="col-span-2"><p className="text-slate-500">Volume</p><p className="text-slate-200 font-mono">{formatVolume(symbolDetail.quote.volume)}</p></div>
                    </div>
                  </div>
                </div>

                {/* MRE Analysis Panel — shown when signal data is available */}
                {mreSignalData && mreSignalData.symbol === selectedSymbol && (
                  <MREAnalysisPanel signal={mreSignalData} />
                )}
              </>
            )}
            {!selectedSymbol && <div className="bg-slate-850 rounded-xl border border-slate-800 p-12 text-center"><BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-4" /><p className="text-slate-500">Select a symbol</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}