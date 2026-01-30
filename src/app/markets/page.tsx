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
// Timeframes: label = display name, range = data to fetch, interval = candle size
const TIMEFRAMES = [
  // Intraday candles (label = candle size)
  { label: '5m', range: '1d', interval: '5m' },
  { label: '15m', range: '5d', interval: '15m' },
  { label: '30m', range: '5d', interval: '30m' },
  { label: '1H', range: '5d', interval: '1h' },
  { label: '4H', range: '1mo', interval: '4h' },
  // Daily candles with different ranges (label = data range)
  { label: '1M', range: '1mo', interval: '1d' },
  { label: '3M', range: '3mo', interval: '1d' },
  { label: '6M', range: '6mo', interval: '1d' },
  { label: '1Y', range: '1y', interval: '1d' },
  // Weekly candles
  { label: '1W', range: '1y', interval: '1wk' },
];

const SYMBOL_CATEGORIES = {
  indices: ['SPY', 'QQQ'],
  tech: ['AAPL', 'MSFT'],
  metals: ['GLD', 'SLV'],
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

    // Draw Fib point markers (A/B/C) - for both custom and default
    const drawMarker = (globalIdx: number, label: string, color: string, priceOverride?: number) => {
      const localIdx = globalIdx - visibleStart;
      if (localIdx < 0 || localIdx >= visibleCandles.length) return;
      
      const x = scaleX(localIdx) + candleWidth / 2;
      const candle = candles[globalIdx];
      let y: number;
      if (priceOverride !== undefined) {
        y = scaleY(priceOverride);
      } else {
        y = label === 'A' ? scaleY(candle.low) : label === 'B' ? scaleY(candle.high) : scaleY(candle.low);
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + 3);
    };

    // Show markers when Fib is enabled (retracements OR extensions)
    const showFibMarkers = settings.showFibRetracements || settings.showFibExtensions;
    
    if (showFibMarkers && fibonacci) {
      // Use custom points if set, otherwise find from API data
      let aIdx = fibPoints.a;
      let bIdx = fibPoints.b;
      let cIdx = fibPoints.c;
      
      // If no custom points, find indices from API fibonacci data
      if (aIdx === null && fibonacci.low) {
        aIdx = findCandleIndexByDate(candles, fibonacci.swingLowDate) 
          ?? findCandleIndexByPrice(candles, fibonacci.low, 'low');
      }
      if (bIdx === null && fibonacci.high) {
        bIdx = findCandleIndexByDate(candles, fibonacci.swingHighDate)
          ?? findCandleIndexByPrice(candles, fibonacci.high, 'high');
      }
      if (cIdx === null && fibonacci.pullback) {
        cIdx = findCandleIndexByDate(candles, fibonacci.pullbackDate)
          ?? findCandleIndexByPrice(candles, fibonacci.pullback, 'low');
      }
      
      // Draw the markers
      if (aIdx !== null) drawMarker(aIdx, 'A', '#10b981', fibonacci.low);
      if (bIdx !== null) drawMarker(bIdx, 'B', '#ef4444', fibonacci.high);
      if (cIdx !== null && fibonacci.pullback) drawMarker(cIdx, 'C', '#f59e0b', fibonacci.pullback);
    }
    
    // Draw drag preview line
    if (dragPreview && selectMode !== 'none') {
      const previewLocalIdx = dragPreview.globalIndex - visibleStart;
      if (previewLocalIdx >= 0 && previewLocalIdx < visibleCandles.length) {
        const x = scaleX(previewLocalIdx) + candleWidth / 2;
        
        // Vertical line
        ctx.strokeStyle = dragPreview.isValid ? '#f59e0b' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, canvasHeight - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Label at top
        const label = selectMode.toUpperCase();
        const candle = visibleCandles[previewLocalIdx];
        ctx.fillStyle = dragPreview.isValid ? '#f59e0b' : '#ef4444';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, padding.top - 5);
        
        // Price indicator
        const price = selectMode === 'b' ? candle.high : candle.low;
        const priceY = scaleY(price);
        ctx.beginPath();
        ctx.arc(x, priceY, 6, 0, Math.PI * 2);
        ctx.fillStyle = dragPreview.isValid ? '#f59e0b' : '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

  }, [candles, visibleCandles, visibleStart, visibleEnd, viewRange, yScale, isOverYAxis, fibonacci, movingAverages, settings, fibPoints, dragPreview, selectMode]);

  // Calculate candle index from mouse position
  const getCandleIndexFromPosition = (clientX: number): { localIndex: number; globalIndex: number; x: number } | null => {
    if (!canvasRef.current || !chartDims.current || visibleCandles.length === 0) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const { padding, chartWidth, candleWidth } = chartDims.current;
    
    const viewRangeSize = viewRange.end - viewRange.start;
    const startOffset = visibleStart - viewRange.start;
    
    // Reverse the scaleX calculation
    const posInChart = (x - padding.left) / chartWidth * viewRangeSize;
    const localIndex = Math.floor(posInChart - startOffset);
    
    if (localIndex < 0 || localIndex >= visibleCandles.length) return null;
    const globalIndex = localIndex + visibleStart;
    
    // Calculate exact x position of this candle
    const candleX = padding.left + ((localIndex + startOffset) / viewRangeSize) * chartWidth + candleWidth / 2;
    
    return { localIndex, globalIndex, x: candleX };
  };
  
  // Validate if a Fib point can be placed at this index
  const isFibPointValid = (globalIndex: number): boolean => {
    if (selectMode === 'b' && fibPoints.a !== null && globalIndex <= fibPoints.a) return false;
    if (selectMode === 'c' && fibPoints.b !== null && globalIndex <= fibPoints.b) return false;
    return true;
  };
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;
    
    // If in select mode and not dragging, treat click as instant place
    if (selectMode !== 'none' && !isDraggingFib.current) {
      const pos = getCandleIndexFromPosition(e.clientX);
      if (!pos) return;
      
      if (!isFibPointValid(pos.globalIndex)) {
        // Show error feedback
        const rect = canvasRef.current!.getBoundingClientRect();
        const candle = candles[pos.globalIndex];
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          candle,
          index: pos.globalIndex,
          date: selectMode === 'b' ? '⚠️ Point B must be AFTER point A' : '⚠️ Point C must be AFTER point B',
        });
        return;
      }
      
      // Set the point
      const newPoints = { ...fibPoints, [selectMode]: pos.globalIndex };
      setFibPoints(newPoints);
      setDragPreview(null);
      
      // Advance to next point
      if (selectMode === 'a') setSelectMode('b');
      else if (selectMode === 'b') setSelectMode('c');
      else setSelectMode('none');
      return;
    }
    
    // Normal click - show tooltip
    const pos = getCandleIndexFromPosition(e.clientX);
    if (!pos) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const candle = candles[pos.globalIndex];
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      candle,
      index: pos.globalIndex,
      date: formatDate(candle.time) + ' ' + formatTime(candle.time),
    });
  };
  
  // Handle Fib drag start
  const handleFibDragStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (selectMode === 'none') return;
    
    isDraggingFib.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = getCandleIndexFromPosition(clientX);
    if (pos) {
      const preview = { globalIndex: pos.globalIndex, x: pos.x, isValid: isFibPointValid(pos.globalIndex) };
      dragPreviewRef.current = preview;
      setDragPreview(preview);
    }
  };
  
  // Handle Fib drag move
  const handleFibDragMove = (clientX: number) => {
    if (selectMode === 'none' || !isDraggingFib.current) return;
    
    const pos = getCandleIndexFromPosition(clientX);
    if (pos) {
      const preview = { globalIndex: pos.globalIndex, x: pos.x, isValid: isFibPointValid(pos.globalIndex) };
      dragPreviewRef.current = preview;
      setDragPreview(preview);
    }
  };
  
  // Handle Fib drag end
  const handleFibDragEnd = () => {
    const preview = dragPreviewRef.current;
    
    if (selectMode === 'none' || !isDraggingFib.current || !preview) {
      isDraggingFib.current = false;
      dragPreviewRef.current = null;
      setDragPreview(null);
      return;
    }
    
    isDraggingFib.current = false;
    
    if (preview.isValid) {
      // Set the point
      const newPoints = { ...fibPoints, [selectMode]: preview.globalIndex };
      setFibPoints(newPoints);
      
      // Advance to next point
      if (selectMode === 'a') setSelectMode('b');
      else if (selectMode === 'b') setSelectMode('c');
      else setSelectMode('none');
    }
    
    dragPreviewRef.current = null;
    setDragPreview(null);
  };

  const handleMouseLeave = () => {
    if (selectMode === 'none') setTooltip(null);
    setIsPanning(false);
    setIsOverYAxis(false);
    panStartRef.current = null;
  };
  
  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (candles.length === 0) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !chartDims.current) return;
    
    const mouseX = e.clientX - rect.left;
    const { padding, chartWidth, width } = chartDims.current;
    
    // Check if mouse is on Y-axis area (right side)
    const isOnYAxis = mouseX > width - padding.right;
    
    if (isOnYAxis) {
      // Y-axis zoom: scroll up = zoom in (smaller scale), scroll down = zoom out (larger scale)
      const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
      const newYScale = Math.max(0.2, Math.min(5, yScale * zoomFactor)); // Limit range 0.2x to 5x
      setYScale(newYScale);
      return;
    }
    
    // X-axis zoom (chart area)
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9; // Zoom out : Zoom in
    const currentRange = viewRange.end - viewRange.start;
    const maxRange = candles.length * (1 + SCROLL_BUFFER_RATIO * 2);
    const newRange = Math.max(10, Math.min(maxRange, currentRange * zoomFactor)); // Min 10 candles visible
    
    const ratio = Math.max(0, Math.min(1, (mouseX - padding.left) / chartWidth));
    
    // Calculate new start/end centered on mouse position
    const currentPos = viewRange.start + (viewRange.end - viewRange.start) * ratio;
    let newStart = currentPos - newRange * ratio;
    let newEnd = currentPos + newRange * (1 - ratio);
    
    // Clamp with buffer
    const buffer = newRange * SCROLL_BUFFER_RATIO;
    const minStart = -buffer;
    const maxEnd = candles.length + buffer;
    
    if (newStart < minStart) {
      newStart = minStart;
      newEnd = Math.min(maxEnd, newStart + newRange);
    }
    if (newEnd > maxEnd) {
      newEnd = maxEnd;
      newStart = Math.max(minStart, maxEnd - newRange);
    }
    
    setViewRange({ start: newStart, end: newEnd });
    setTooltip(null);
  };
  
  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectMode !== 'none') {
      handleFibDragStart(e);
      return;
    }
    panStartRef.current = {
      x: e.clientX,
      viewStart: viewRange.start,
      viewEnd: viewRange.end,
    };
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle Fib drag preview
    if (selectMode !== 'none') {
      handleFibDragMove(e.clientX);
    }
    
    // Check if over Y-axis for visual feedback
    if (chartDims.current) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const { width, padding } = chartDims.current;
        setIsOverYAxis(mouseX > width - padding.right);
      }
    }
    
    if (!panStartRef.current || !chartDims.current) return;
    
    const dx = e.clientX - panStartRef.current.x;
    const { chartWidth } = chartDims.current;
    const candlesInView = panStartRef.current.viewEnd - panStartRef.current.viewStart;
    const candlesPanned = -(dx / chartWidth) * candlesInView;
    
    let newStart = panStartRef.current.viewStart + candlesPanned;
    let newEnd = panStartRef.current.viewEnd + candlesPanned;
    
    // Allow scrolling beyond boundaries by buffer amount
    const buffer = candlesInView * SCROLL_BUFFER_RATIO;
    const minStart = -buffer;
    const maxEnd = candles.length + buffer;
    
    if (newStart < minStart) {
      newEnd -= (newStart - minStart);
      newStart = minStart;
    }
    if (newEnd > maxEnd) {
      newStart -= (newEnd - maxEnd);
      newEnd = maxEnd;
    }
    
    if (Math.abs(dx) > 5) setIsPanning(true);
    setViewRange({ start: Math.max(minStart, newStart), end: Math.min(maxEnd, newEnd) });
    setTooltip(null);
  };
  
  const handleMouseUp = () => {
    if (selectMode !== 'none') {
      handleFibDragEnd();
    }
    panStartRef.current = null;
    setTimeout(() => setIsPanning(false), 50);
  };
  
  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (selectMode !== 'none') {
      handleFibDragStart(e);
      return;
    }
    
    const touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    touchStartRef.current = {
      touches,
      viewStart: viewRange.start,
      viewEnd: viewRange.end,
      yScale,
    };
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Handle Fib drag on mobile
    if (selectMode !== 'none' && e.touches.length === 1) {
      e.preventDefault();
      handleFibDragMove(e.touches[0].clientX);
      return;
    }
    
    if (!touchStartRef.current || !chartDims.current) return;
    e.preventDefault();
    
    const currentTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    const { touches: startTouches, viewStart, viewEnd } = touchStartRef.current;
    const { chartWidth } = chartDims.current;
    const candlesInView = viewEnd - viewStart;
    
    if (currentTouches.length === 1 && startTouches.length === 1) {
      // Single finger pan
      const dx = currentTouches[0].x - startTouches[0].x;
      const candlesPanned = -(dx / chartWidth) * candlesInView;
      
      let newStart = viewStart + candlesPanned;
      let newEnd = viewEnd + candlesPanned;
      
      // Allow scrolling beyond boundaries by buffer amount
      const buffer = candlesInView * SCROLL_BUFFER_RATIO;
      const minStart = -buffer;
      const maxEnd = candles.length + buffer;
      
      if (newStart < minStart) {
        newEnd -= (newStart - minStart);
        newStart = minStart;
      }
      if (newEnd > maxEnd) {
        newStart -= (newEnd - maxEnd);
        newEnd = maxEnd;
      }
      
      setViewRange({ start: Math.max(minStart, newStart), end: Math.min(maxEnd, newEnd) });
    } else if (currentTouches.length === 2 && startTouches.length === 2) {
      // Pinch zoom - horizontal for X, vertical for Y
      const startDistX = Math.abs(startTouches[1].x - startTouches[0].x);
      const currentDistX = Math.abs(currentTouches[1].x - currentTouches[0].x);
      const startDistY = Math.abs(startTouches[1].y - startTouches[0].y);
      const currentDistY = Math.abs(currentTouches[1].y - currentTouches[0].y);
      
      // Horizontal pinch - X axis zoom
      if (startDistX > 20) {
        const scaleX = startDistX / Math.max(1, currentDistX);
        const maxRange = candles.length * (1 + SCROLL_BUFFER_RATIO * 2);
        const newRange = Math.max(10, Math.min(maxRange, candlesInView * scaleX));
        const centerRatio = 0.5;
        const currentCenter = viewStart + candlesInView * centerRatio;
        
        let newStart = currentCenter - newRange * centerRatio;
        let newEnd = currentCenter + newRange * (1 - centerRatio);
        
        const buffer = newRange * SCROLL_BUFFER_RATIO;
        const minStart = -buffer;
        const maxEnd = candles.length + buffer;
        
        if (newStart < minStart) {
          newStart = minStart;
          newEnd = Math.min(maxEnd, newStart + newRange);
        }
        if (newEnd > maxEnd) {
          newEnd = maxEnd;
          newStart = Math.max(minStart, maxEnd - newRange);
        }
        
        setViewRange({ start: newStart, end: newEnd });
      }
      
      // Vertical pinch - Y axis zoom
      if (startDistY > 20) {
        const scaleY = startDistY / Math.max(1, currentDistY);
        const startYScale = touchStartRef.current?.yScale ?? 1;
        const newYScale = Math.max(0.2, Math.min(5, startYScale * scaleY));
        setYScale(newYScale);
      }
    }
    
    setTooltip(null);
  };
  
  const handleTouchEnd = () => {
    if (selectMode !== 'none') {
      handleFibDragEnd();
    }
    touchStartRef.current = null;
  };
  
  const resetView = () => {
    setViewRange({ start: 0, end: candles.length });
    setYScale(1);
  };

  const startFibSelection = () => {
    setFibPoints({ a: null, b: null, c: null });
    setSelectMode('a');
    setTooltip(null);
  };

  const clearCustomFib = () => {
    setFibPoints({ a: null, b: null, c: null });
    setSelectMode('none');
  };

  if (candles.length === 0) {
    return (
      <div className="w-full bg-slate-800/30 rounded-lg flex items-center justify-center text-slate-600 text-sm" style={{ height }}>
        Loading...
      </div>
    );
  }

  const hasCustomFib = fibPoints.a !== null || fibPoints.b !== null || fibPoints.c !== null;

  return (
    <div className="space-y-2">
      {/* Chart controls - OUTSIDE the chart */}
      <div className="flex items-center justify-between">
        {/* Selection mode indicator */}
        {selectMode !== 'none' ? (
          <div className="bg-slate-900/90 border border-amber-500/50 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-amber-400">Click to set point {selectMode.toUpperCase()}</span>
            <span className="text-slate-500 ml-2">
              {selectMode === 'a' && '(Swing Low)'}
              {selectMode === 'b' && '(after A, Swing High)'}
              {selectMode === 'c' && '(after B, Pullback)'}
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 lg:hidden">
            Scroll to pan • Pinch to zoom
          </div>
        )}
        
        {/* Controls */}
        <div className="flex gap-1 ml-auto">
          {isZoomed && (
            <button 
              onClick={resetView}
              className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 px-2 py-1 rounded flex items-center gap-1"
            >
              <span className="text-[10px]">⟲</span> Reset
            </button>
          )}
          {!hasCustomFib && selectMode === 'none' && (
            <button 
              onClick={startFibSelection}
              className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 px-2 py-1 rounded"
            >
              Custom A-B-C
            </button>
          )}
          {(hasCustomFib || selectMode !== 'none') && (
            <button 
              onClick={clearCustomFib}
              className="bg-red-900/50 hover:bg-red-900 text-xs text-red-300 px-2 py-1 rounded"
            >
              Reset Fib
            </button>
          )}
        </div>
      </div>
      
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
          onClick={handleCanvasClick}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      
        {/* Vertical crosshair line when tooltip visible */}
        {tooltip && selectMode === 'none' && chartDims.current && (
          <div 
            className="absolute pointer-events-none"
            style={{ 
              left: tooltip.x,
              top: chartDims.current.padding.top,
              width: 1,
              height: chartDims.current.drawHeight,
              background: 'rgba(148, 163, 184, 0.4)',
            }}
          />
        )}
        
        {/* Tooltip */}
        {tooltip && selectMode === 'none' && (
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

// Mobile Modal
function DetailModal({ detail, onClose, selectedTimeframe, setTimeframe, settings, setSettings, onRequestMoreData, isLoadingMore }: { 
  detail: SymbolDetail; onClose: () => void; selectedTimeframe: string;
  setTimeframe: (label: string) => void; settings: ChartSettings; setSettings: (s: ChartSettings) => void;
  onRequestMoreData?: () => void; isLoadingMore?: boolean;
}) {
  const isPositive = detail.quote.change >= 0;
  
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-auto">
      <div className="sticky top-0 z-[60] bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{detail.quote.symbol}</h2>
            <p className="text-sm text-slate-500">{detail.quote.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <SettingsPanel settings={settings} onChange={setSettings} movingAverages={detail.movingAverages} />
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
        </div>
        <div className="flex items-baseline gap-3 mt-2">
          <span className="text-3xl font-bold text-slate-100">${formatPrice(detail.quote.price)}</span>
          <span className={`text-lg font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{formatPrice(detail.quote.change)} ({safePercent(detail.quote.changePercent)}%)
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-1">
          {TIMEFRAMES.map(tf => (
            <button key={tf.label} onClick={() => setTimeframe(tf.label)}
              className={`px-2 py-1 rounded text-xs font-medium ${selectedTimeframe === tf.label ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {tf.label}
            </button>
          ))}
        </div>
        
        <ChartCanvas candles={detail.candles} fibonacci={detail.fibonacci} movingAverages={detail.movingAverages} settings={settings} height={280} onRequestMoreData={onRequestMoreData} isLoadingMore={isLoadingMore} />
        <FibonacciPanel fibonacci={detail.fibonacci} currentPrice={detail.quote.price} />
        
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-medium text-slate-200 mb-3">Statistics</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Open</span><span className="text-slate-200">${formatPrice(detail.quote.open)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Close</span><span className="text-slate-200">${formatPrice(detail.quote.prevClose)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">High</span><span className="text-emerald-400">${formatPrice(detail.quote.high)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Low</span><span className="text-red-400">${formatPrice(detail.quote.low)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">52W H</span><span className="text-slate-200">${formatPrice(detail.quote.fiftyTwoWeekHigh)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">52W L</span><span className="text-slate-200">${formatPrice(detail.quote.fiftyTwoWeekLow)}</span></div>
            <div className="col-span-2 flex justify-between"><span className="text-slate-500">Volume</span><span className="text-slate-200">{formatVolume(detail.quote.volume)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Calculate custom Fibonacci from user-selected A-B-C points
function calculateCustomFibonacci(candles: CandleData[], points: CustomFibPoints): FibonacciData | null {
  if (points.a === null || points.b === null) return null;
  
  const swingLow = candles[points.a].low;
  const swingHigh = candles[points.b].high;
  const range = swingHigh - swingLow;
  
  // Retracements
  const retracementLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const retracements = retracementLevels.map(fib => ({
    level: `${(fib * 100).toFixed(1)}%`,
    price: Math.round((swingHigh - range * fib) * 100) / 100,
    percent: fib * 100,
  }));
  
  // Extensions (only if we have point C)
  let extensions: { level: string; price: number; percent: number }[] = [];
  const pullback = points.c !== null ? candles[points.c].low : null;
  
  if (pullback !== null) {
    const extLevels = [1.0, 1.272, 1.414, 1.618, 2.0, 2.618];
    extensions = extLevels.map(ext => ({
      level: `${(ext * 100).toFixed(1)}%`,
      price: Math.round((pullback + range * ext) * 100) / 100,
      percent: ext * 100,
    }));
  }
  
  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString();
  
  return {
    high: swingHigh,
    low: swingLow,
    pullback,
    retracements,
    extensions,
    trend: 'up' as const,
    swingLowDate: formatDate(candles[points.a].time),
    swingHighDate: formatDate(candles[points.b].time),
    pullbackDate: points.c !== null ? formatDate(candles[points.c].time) : undefined,
  };
}

// Map ranges to extended ranges for loading more historical data
const EXTENDED_RANGES: Record<string, string> = {
  '1d': '5d',
  '5d': '1mo',
  '1mo': '3mo',
  '3mo': '6mo',
  '6mo': '1y',
  '1y': '3y',
  '3y': '5y',
  '5y': '10y',
  '10y': '10y', // Max
};

export default function MarketsPage() {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [symbolDetail, setSymbolDetail] = useState<SymbolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingMoreData, setLoadingMoreData] = useState(false);
  const [currentDataRange, setCurrentDataRange] = useState<string>('3mo'); // Will be set by initial fetch
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('3M');
  
  // Derive range and interval from selected timeframe
  const currentTf = TIMEFRAMES.find(tf => tf.label === selectedTimeframe) || TIMEFRAMES[6]; // Default to 3M
  const range = currentTf.range;
  const interval = currentTf.interval;
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState<ChartSettings>(DEFAULT_SETTINGS);
  const [customFibPoints, setCustomFibPoints] = useState<CustomFibPoints>({ a: null, b: null, c: null });
  
  // Calculate effective fibonacci (custom if set, otherwise API-provided)
  const effectiveFibonacci = symbolDetail ? (
    (customFibPoints.a !== null && customFibPoints.b !== null)
      ? calculateCustomFibonacci(symbolDetail.candles, customFibPoints)
      : symbolDetail.fibonacci
  ) : null;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Load more historical data when user scrolls to the start
  const loadMoreHistoricalData = useCallback(() => {
    if (!selectedSymbol) {
      console.log('No symbol selected');
      return;
    }
    if (loadingMoreData) {
      console.log('Already loading more data');
      return;
    }
    
    const extendedRange = EXTENDED_RANGES[currentDataRange];
    if (!extendedRange || extendedRange === currentDataRange) {
      console.log(`Already at maximum data range: ${currentDataRange}`);
      return;
    }
    
    console.log(`Loading more historical data: ${currentDataRange} → ${extendedRange} (interval: ${interval})`);
    setLoadingMoreData(true);
    fetchSymbolDetail(selectedSymbol, extendedRange, interval, true);
  }, [selectedSymbol, loadingMoreData, currentDataRange, interval, fetchSymbolDetail]);

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
    if (isMobile) setShowModal(true);
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

  if (isMobile && showModal && symbolDetail) {
    return <DetailModal detail={symbolDetail} onClose={() => setShowModal(false)} selectedTimeframe={selectedTimeframe}
      setTimeframe={handleTimeframeChange} settings={settings} setSettings={setSettings} 
      onRequestMoreData={loadMoreHistoricalData} isLoadingMore={loadingMoreData} />;
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />Markets
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
            {Object.entries(SYMBOL_CATEGORIES).map(([cat, syms]) => (
              <div key={cat}>
                <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-2 px-1 flex items-center gap-2">
                  {cat === 'indices' && <Activity className="w-3 h-3" />}
                  {cat === 'tech' && <TrendingUp className="w-3 h-3" />}
                  {cat === 'metals' && <span className="text-amber-400">◆</span>}
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </h2>
                <div className="space-y-2">
                  {quotes.filter(q => syms.includes(q.symbol)).map(quote => (
                    <QuoteRow key={quote.symbol} quote={quote} onClick={() => handleSelectSymbol(quote.symbol)} selected={selectedSymbol === quote.symbol} />
                  ))}
                </div>
              </div>
            ))}
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
                      fibonacci={effectiveFibonacci || symbolDetail.fibonacci} 
                      movingAverages={symbolDetail.movingAverages} 
                      settings={settings} 
                      height={300}
                      customFibPoints={customFibPoints}
                      onCustomFib={setCustomFibPoints}
                      onRequestMoreData={loadMoreHistoricalData}
                      isLoadingMore={loadingMoreData}
                    />}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FibonacciPanel fibonacci={effectiveFibonacci || symbolDetail.fibonacci} currentPrice={symbolDetail.quote.price} />
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
              </>
            )}
            {!selectedSymbol && <div className="bg-slate-850 rounded-xl border border-slate-800 p-12 text-center"><BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-4" /><p className="text-slate-500">Select a symbol</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}
