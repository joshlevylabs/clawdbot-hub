"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  BarChart3,
  Activity,
  Clock,
  DollarSign,
  Percent,
  LineChart,
  Save,
  Download,
} from "lucide-react";
import ActionsDashboard from "@/components/ActionsDashboard";

const STORAGE_KEY = "mre-paper-portfolio";

interface Position {
  symbol: string;
  qty: number;
  entry_price: number;
  entry_date: string;
  current_price?: number;
  market_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_pct?: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  total: number;
  date: string;
}

interface PendingOrder {
  id: string;
  symbol: string;
  type: "take_profit" | "stop_loss";
  qty: number;
  trigger_price: number;
  created_at: string;
}

interface QueuedTrade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  target?: number;
  stop?: number;
  queued_at: string;
}

// US Stock Market Holidays (2024-2027)
// Format: "YYYY-MM-DD"
const MARKET_HOLIDAYS: Set<string> = new Set([
  // 2024
  "2024-01-01", // New Year's Day
  "2024-01-15", // MLK Day
  "2024-02-19", // Presidents Day
  "2024-03-29", // Good Friday
  "2024-05-27", // Memorial Day
  "2024-06-19", // Juneteenth
  "2024-07-04", // Independence Day
  "2024-09-02", // Labor Day
  "2024-11-28", // Thanksgiving
  "2024-12-25", // Christmas
  // 2025
  "2025-01-01", // New Year's Day
  "2025-01-20", // MLK Day
  "2025-02-17", // Presidents Day
  "2025-04-18", // Good Friday
  "2025-05-26", // Memorial Day
  "2025-06-19", // Juneteenth
  "2025-07-04", // Independence Day
  "2025-09-01", // Labor Day
  "2025-11-27", // Thanksgiving
  "2025-12-25", // Christmas
  // 2026
  "2026-01-01", // New Year's Day
  "2026-01-19", // MLK Day
  "2026-02-16", // Presidents Day
  "2026-04-03", // Good Friday
  "2026-05-25", // Memorial Day
  "2026-06-19", // Juneteenth
  "2026-07-03", // Independence Day (observed - 7/4 is Saturday)
  "2026-09-07", // Labor Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas
  // 2027
  "2027-01-01", // New Year's Day
  "2027-01-18", // MLK Day
  "2027-02-15", // Presidents Day
  "2027-03-26", // Good Friday
  "2027-05-31", // Memorial Day
  "2027-06-18", // Juneteenth (observed - 6/19 is Saturday)
  "2027-07-05", // Independence Day (observed - 7/4 is Sunday)
  "2027-09-06", // Labor Day
  "2027-11-25", // Thanksgiving
  "2027-12-24", // Christmas (observed - 12/25 is Saturday)
]);

function isMarketHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split("T")[0];
  return MARKET_HOLIDAYS.has(dateStr);
}

function getHolidayName(date: Date): string | null {
  const dateStr = date.toISOString().split("T")[0];
  const holidayNames: Record<string, string> = {
    "2026-01-01": "New Year's Day",
    "2026-01-19": "MLK Day",
    "2026-02-16": "Presidents Day",
    "2026-04-03": "Good Friday",
    "2026-05-25": "Memorial Day",
    "2026-06-19": "Juneteenth",
    "2026-07-03": "Independence Day",
    "2026-09-07": "Labor Day",
    "2026-11-26": "Thanksgiving",
    "2026-12-25": "Christmas",
  };
  return holidayNames[dateStr] || "Market Holiday";
}

// Check if US stock market is open
function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  // Holiday check
  if (isMarketHoliday(et)) return false;
  
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // Market hours: 9:30 AM - 4:00 PM ET
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;      // 4:00 PM
  
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}

function getMarketStatus(): { open: boolean; message: string } {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  
  // Weekend check
  if (day === 0 || day === 6) {
    return { open: false, message: "Market closed (weekend)" };
  }
  
  // Holiday check
  if (isMarketHoliday(et)) {
    const holidayName = getHolidayName(et);
    return { open: false, message: `Market closed (${holidayName})` };
  }
  
  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  
  if (timeInMinutes < marketOpen) {
    const minsUntil = marketOpen - timeInMinutes;
    const h = Math.floor(minsUntil / 60);
    const m = minsUntil % 60;
    return { open: false, message: `Pre-market (opens in ${h}h ${m}m)` };
  }
  
  if (timeInMinutes >= marketClose) {
    return { open: false, message: "After hours (closed)" };
  }
  
  return { open: true, message: "Market open" };
}

interface PerformancePoint {
  date: string;
  equity: number;
  cash: number;
  spy_price: number;
  spy_baseline: number;
}

interface PaperPortfolio {
  account: {
    starting_capital: number;
    cash: number;
    created_at: string;
  };
  positions: Position[];
  trades: Trade[];
  pending_orders: PendingOrder[];
  queued_trades: QueuedTrade[];
  performance: PerformancePoint[];
  updated_at: string;
}

interface MREAsset {
  symbol: string;
  price: number;
  asset_class: string;
}

const STARTING_CAPITAL = 100000;

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-slate-400";

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${trendColor}`} />
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold ${trendColor}`}>{value}</p>
      {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}

function PerformanceChart({ data }: { data: PerformancePoint[] }) {
  if (data.length < 2) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 text-center">
        <LineChart className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-400">Performance chart appears after more data</p>
      </div>
    );
  }

  const startEquity = data[0].equity;
  const startSpy = data[0].spy_baseline;

  const portfolioReturns = data.map((d) => ((d.equity - startEquity) / startEquity) * 100);
  const spyReturns = data.map((d) => ((d.spy_price - startSpy) / startSpy) * 100);

  const maxReturn = Math.max(...portfolioReturns, ...spyReturns, 5);
  const minReturn = Math.min(...portfolioReturns, ...spyReturns, -5);
  const range = maxReturn - minReturn;

  const chartHeight = 120;
  const chartWidth = 100;

  const getY = (val: number) => ((maxReturn - val) / range) * chartHeight;

  const portfolioPath = portfolioReturns
    .map((r, i) => {
      const x = (i / (data.length - 1)) * chartWidth;
      const y = getY(r);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const spyPath = spyReturns
    .map((r, i) => {
      const x = (i / (data.length - 1)) * chartWidth;
      const y = getY(r);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const latestPortfolioReturn = portfolioReturns[portfolioReturns.length - 1];
  const latestSpyReturn = spyReturns[spyReturns.length - 1];
  const alpha = latestPortfolioReturn - latestSpyReturn;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <LineChart className="w-4 h-4 text-primary-400" />
          Performance vs SPY
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-primary-400 rounded" /> Portfolio
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-400 rounded" /> SPY
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32">
        <line
          x1="0"
          y1={getY(0)}
          x2={chartWidth}
          y2={getY(0)}
          stroke="#475569"
          strokeDasharray="2,2"
        />
        <path d={spyPath} fill="none" stroke="#fbbf24" strokeWidth="1.5" />
        <path d={portfolioPath} fill="none" stroke="#818cf8" strokeWidth="2" />
      </svg>

      <div className="flex justify-between mt-3 text-sm">
        <div>
          <p className="text-slate-500">Portfolio</p>
          <p className={latestPortfolioReturn >= 0 ? "text-emerald-400" : "text-red-400"}>
            {formatPercent(latestPortfolioReturn)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">SPY</p>
          <p className={latestSpyReturn >= 0 ? "text-emerald-400" : "text-red-400"}>
            {formatPercent(latestSpyReturn)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Alpha</p>
          <p className={alpha >= 0 ? "text-emerald-400" : "text-red-400"}>
            {formatPercent(alpha)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TradingPage() {
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
  const [mreAssets, setMreAssets] = useState<MREAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Try localStorage first for persisted data
      let data: PaperPortfolio | null = null;
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        try {
          data = JSON.parse(stored);
          console.log("Loaded portfolio from localStorage");
        } catch (e) {
          console.error("Failed to parse localStorage:", e);
        }
      }

      // If no localStorage, fetch baseline from static file
      if (!data) {
        const portfolioRes = await fetch("/data/paper-portfolio.json");
        if (portfolioRes.ok) {
          data = await portfolioRes.json();
          console.log("Loaded portfolio from static file");
        }
      }

      // Load MRE signals for current prices
      const mreRes = await fetch("/data/trading/mre-signals.json");
      if (mreRes.ok) {
        const mre = await mreRes.json();
        const assets: MREAsset[] = mre.signals.by_asset_class.map((a: any) => ({
          symbol: a.symbol,
          price: a.price,
          asset_class: a.asset_class,
        }));
        setMreAssets(assets);

        // Update position prices with current MRE prices
        if (data) {
          data.positions = data.positions.map((pos: Position) => {
            const asset = assets.find((a) => a.symbol === pos.symbol);
            if (asset) {
              const currentPrice = asset.price;
              const marketValue = pos.qty * currentPrice;
              const costBasis = pos.qty * pos.entry_price;
              return {
                ...pos,
                current_price: currentPrice,
                market_value: marketValue,
                unrealized_pnl: marketValue - costBasis,
                unrealized_pnl_pct: ((marketValue - costBasis) / costBasis) * 100,
              };
            }
            return pos;
          });
        }
      }

      if (data) {
        // Ensure arrays exist
        if (!data.pending_orders) {
          data.pending_orders = [];
        }
        if (!data.queued_trades) {
          data.queued_trades = [];
        }

        // Update market status
        const status = getMarketStatus();
        setMarketStatus(status);

        // Process queued trades if market is open
        if (status.open && data.queued_trades.length > 0) {
          console.log(`📈 Market open - processing ${data.queued_trades.length} queued trades`);
          
          for (const queued of data.queued_trades) {
            const asset = mreAssets.find((a) => a.symbol === queued.symbol);
            if (!asset) continue;

            const price = asset.price;
            const total = queued.qty * price;

            if (queued.side === "buy") {
              if (total <= data.account.cash) {
                data.account.cash -= total;

                const existingIdx = data.positions.findIndex((p) => p.symbol === queued.symbol);
                if (existingIdx >= 0) {
                  const existing = data.positions[existingIdx];
                  const totalQty = existing.qty + queued.qty;
                  const avgPrice = (existing.qty * existing.entry_price + queued.qty * price) / totalQty;
                  data.positions[existingIdx] = { ...existing, qty: totalQty, entry_price: avgPrice };
                } else {
                  data.positions.push({
                    symbol: queued.symbol,
                    qty: queued.qty,
                    entry_price: price,
                    entry_date: new Date().toISOString(),
                  });
                }

                // Create pending orders
                if (queued.target) {
                  data.pending_orders.push({
                    id: `tp-${Date.now()}`,
                    symbol: queued.symbol,
                    type: "take_profit",
                    qty: queued.qty,
                    trigger_price: queued.target,
                    created_at: new Date().toISOString(),
                  });
                }
                if (queued.stop) {
                  data.pending_orders.push({
                    id: `sl-${Date.now()}`,
                    symbol: queued.symbol,
                    type: "stop_loss",
                    qty: queued.qty,
                    trigger_price: queued.stop,
                    created_at: new Date().toISOString(),
                  });
                }

                data.trades.unshift({
                  id: Date.now().toString(),
                  symbol: queued.symbol,
                  side: "buy",
                  qty: queued.qty,
                  price,
                  total,
                  date: new Date().toISOString(),
                });

                console.log(`✅ Queued BUY executed: ${queued.qty} ${queued.symbol} @ $${price.toFixed(2)}`);
              }
            } else {
              const position = data.positions.find((p) => p.symbol === queued.symbol);
              if (position && position.qty >= queued.qty) {
                data.account.cash += total;
                if (queued.qty >= position.qty) {
                  data.positions = data.positions.filter((p) => p.symbol !== queued.symbol);
                  data.pending_orders = data.pending_orders.filter((o) => o.symbol !== queued.symbol);
                } else {
                  position.qty -= queued.qty;
                }

                data.trades.unshift({
                  id: Date.now().toString(),
                  symbol: queued.symbol,
                  side: "sell",
                  qty: queued.qty,
                  price,
                  total,
                  date: new Date().toISOString(),
                });

                console.log(`✅ Queued SELL executed: ${queued.qty} ${queued.symbol} @ $${price.toFixed(2)}`);
              }
            }
          }

          // Clear queued trades
          data.queued_trades = [];
          data.updated_at = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }

        // Check and trigger pending orders
        const triggeredOrders: PendingOrder[] = [];
        const remainingOrders: PendingOrder[] = [];

        for (const order of data.pending_orders) {
          const asset = mreAssets.find((a) => a.symbol === order.symbol);
          if (!asset) {
            remainingOrders.push(order);
            continue;
          }

          const currentPrice = asset.price;
          let triggered = false;

          if (order.type === "take_profit" && currentPrice >= order.trigger_price) {
            triggered = true;
          } else if (order.type === "stop_loss" && currentPrice <= order.trigger_price) {
            triggered = true;
          }

          if (triggered) {
            triggeredOrders.push(order);
            // Execute the sell
            const position = data.positions.find((p) => p.symbol === order.symbol);
            if (position && position.qty >= order.qty) {
              const total = order.qty * currentPrice;
              data.account.cash += total;

              // Update or remove position
              if (order.qty >= position.qty) {
                data.positions = data.positions.filter((p) => p.symbol !== order.symbol);
              } else {
                position.qty -= order.qty;
              }

              // Add trade record
              data.trades.unshift({
                id: Date.now().toString(),
                symbol: order.symbol,
                side: "sell",
                qty: order.qty,
                price: currentPrice,
                total,
                date: new Date().toISOString(),
              });

              console.log(`🎯 ${order.type.toUpperCase()} triggered: SELL ${order.qty} ${order.symbol} @ $${currentPrice.toFixed(2)}`);

              // Remove all pending orders for this symbol (both TP and SL)
              data.pending_orders = data.pending_orders.filter((o) => o.symbol !== order.symbol);
            }
          } else {
            remainingOrders.push(order);
          }
        }

        // Update pending orders to remaining
        if (triggeredOrders.length > 0) {
          data.pending_orders = remainingOrders;
          data.updated_at = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }

        setPortfolio(data);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const executeTrade = useCallback(
    (symbol: string, side: "buy" | "sell", qty: number, price: number, target?: number, stop?: number) => {
      if (!portfolio) return;

      const total = qty * price;
      const newPortfolio = JSON.parse(JSON.stringify(portfolio)) as PaperPortfolio;
      
      // Ensure arrays exist
      if (!newPortfolio.pending_orders) {
        newPortfolio.pending_orders = [];
      }
      if (!newPortfolio.queued_trades) {
        newPortfolio.queued_trades = [];
      }

      // Check market hours
      const status = getMarketStatus();
      setMarketStatus(status);

      if (!status.open) {
        // Queue the trade for market open
        newPortfolio.queued_trades.push({
          id: `q-${Date.now()}`,
          symbol,
          side,
          qty,
          target,
          stop,
          queued_at: new Date().toISOString(),
        });

        newPortfolio.updated_at = new Date().toISOString();
        setPortfolio(newPortfolio);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPortfolio));
        
        console.log(`⏰ Trade queued (${status.message}): ${side.toUpperCase()} ${qty} ${symbol}`);
        alert(`Trade queued for market open.\n\n${side.toUpperCase()} ${qty} ${symbol}\n\n${status.message}`);
        return;
      }

      if (side === "buy") {
        if (total > newPortfolio.account.cash) {
          alert("Insufficient cash!");
          return;
        }

        newPortfolio.account.cash -= total;

        const existingIdx = newPortfolio.positions.findIndex((p) => p.symbol === symbol);
        if (existingIdx >= 0) {
          const existing = newPortfolio.positions[existingIdx];
          const totalQty = existing.qty + qty;
          const avgPrice = (existing.qty * existing.entry_price + qty * price) / totalQty;
          newPortfolio.positions[existingIdx] = {
            ...existing,
            qty: totalQty,
            entry_price: avgPrice,
          };
        } else {
          newPortfolio.positions.push({
            symbol,
            qty,
            entry_price: price,
            entry_date: new Date().toISOString(),
          });
        }

        // Create pending orders for take-profit and stop-loss
        // Remove any existing pending orders for this symbol first
        newPortfolio.pending_orders = newPortfolio.pending_orders.filter((o) => o.symbol !== symbol);

        if (target) {
          newPortfolio.pending_orders.push({
            id: `tp-${Date.now()}`,
            symbol,
            type: "take_profit",
            qty,
            trigger_price: target,
            created_at: new Date().toISOString(),
          });
        }

        if (stop) {
          newPortfolio.pending_orders.push({
            id: `sl-${Date.now()}`,
            symbol,
            type: "stop_loss",
            qty,
            trigger_price: stop,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        newPortfolio.account.cash += total;

        const existingIdx = newPortfolio.positions.findIndex((p) => p.symbol === symbol);
        if (existingIdx >= 0) {
          const existing = newPortfolio.positions[existingIdx];
          if (qty >= existing.qty) {
            newPortfolio.positions.splice(existingIdx, 1);
            // Remove all pending orders for this symbol
            newPortfolio.pending_orders = newPortfolio.pending_orders.filter((o) => o.symbol !== symbol);
          } else {
            newPortfolio.positions[existingIdx] = {
              ...existing,
              qty: existing.qty - qty,
            };
          }
        }
      }

      newPortfolio.trades.unshift({
        id: Date.now().toString(),
        symbol,
        side,
        qty,
        price,
        total,
        date: new Date().toISOString(),
      });

      newPortfolio.updated_at = new Date().toISOString();

      // Update positions with current prices
      newPortfolio.positions = newPortfolio.positions.map((pos) => {
        const asset = mreAssets.find((a) => a.symbol === pos.symbol);
        if (asset) {
          const currentPrice = asset.price;
          const marketValue = pos.qty * currentPrice;
          const costBasis = pos.qty * pos.entry_price;
          return {
            ...pos,
            current_price: currentPrice,
            market_value: marketValue,
            unrealized_pnl: marketValue - costBasis,
            unrealized_pnl_pct: ((marketValue - costBasis) / costBasis) * 100,
          };
        }
        return pos;
      });

      setPortfolio(newPortfolio);

      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPortfolio));
      console.log("Trade executed and saved:", { symbol, side, qty, price, total });
    },
    [portfolio, mreAssets]
  );

  // Download portfolio as JSON
  const downloadPortfolio = () => {
    if (!portfolio) return;
    const blob = new Blob([JSON.stringify(portfolio, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paper-portfolio-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Cancel a queued trade
  const cancelQueuedTrade = (tradeId: string) => {
    if (!portfolio) return;
    const newPortfolio = JSON.parse(JSON.stringify(portfolio)) as PaperPortfolio;
    newPortfolio.queued_trades = newPortfolio.queued_trades.filter((t) => t.id !== tradeId);
    newPortfolio.updated_at = new Date().toISOString();
    setPortfolio(newPortfolio);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPortfolio));
  };

  // Cancel a pending order
  const cancelPendingOrder = (orderId: string) => {
    if (!portfolio) return;
    const newPortfolio = JSON.parse(JSON.stringify(portfolio)) as PaperPortfolio;
    newPortfolio.pending_orders = newPortfolio.pending_orders.filter((o) => o.id !== orderId);
    newPortfolio.updated_at = new Date().toISOString();
    setPortfolio(newPortfolio);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPortfolio));
  };

  // Cancel all pending orders for a symbol
  const cancelAllOrdersForSymbol = (symbol: string) => {
    if (!portfolio) return;
    const newPortfolio = JSON.parse(JSON.stringify(portfolio)) as PaperPortfolio;
    newPortfolio.pending_orders = newPortfolio.pending_orders.filter((o) => o.symbol !== symbol);
    newPortfolio.updated_at = new Date().toISOString();
    setPortfolio(newPortfolio);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPortfolio));
  };

  // Reset portfolio
  const resetPortfolio = () => {
    if (confirm("Reset portfolio to $100K? All trades will be lost.")) {
      const fresh: PaperPortfolio = {
        account: { starting_capital: 100000, cash: 100000, created_at: new Date().toISOString() },
        positions: [],
        trades: [],
        pending_orders: [],
        queued_trades: [],
        performance: [{ date: new Date().toISOString().split("T")[0], equity: 100000, cash: 100000, spy_price: mreAssets.find(a => a.symbol === "SPY")?.price || 690, spy_baseline: mreAssets.find(a => a.symbol === "SPY")?.price || 690 }],
        updated_at: new Date().toISOString(),
      };
      setPortfolio(fresh);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const account = portfolio?.account;
  const positions = portfolio?.positions || [];
  const trades = portfolio?.trades || [];
  const performance = portfolio?.performance || [];

  const positionsValue = positions.reduce(
    (sum, p) => sum + (p.market_value || p.qty * p.entry_price),
    0
  );
  const equity = (account?.cash || 0) + positionsValue;
  const totalPnl = equity - STARTING_CAPITAL;
  const totalPnlPercent = (totalPnl / STARTING_CAPITAL) * 100;

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary-400" />
              MRE Paper Trading
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-slate-500">
                One-click trading from Today's Plays
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                marketStatus.open 
                  ? "bg-emerald-900/50 text-emerald-400" 
                  : "bg-amber-900/50 text-amber-400"
              }`}>
                {marketStatus.open ? "🟢 " : "🔴 "}{marketStatus.message}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadPortfolio}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
              title="Download portfolio JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={resetPortfolio}
              className="flex items-center gap-2 px-3 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg transition-colors text-sm"
              title="Reset to $100K"
            >
              Reset
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Wallet}
            label="Total Equity"
            value={`$${formatCurrency(equity)}`}
            subValue={`Started: $${formatCurrency(STARTING_CAPITAL)}`}
            trend={totalPnl >= 0 ? "up" : "down"}
          />
          <StatCard
            icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
            label="Total P/L"
            value={`${totalPnl >= 0 ? "+" : ""}$${formatCurrency(totalPnl)}`}
            subValue={formatPercent(totalPnlPercent)}
            trend={totalPnl >= 0 ? "up" : "down"}
          />
          <StatCard
            icon={DollarSign}
            label="Cash Available"
            value={`$${formatCurrency(account?.cash || 0)}`}
            subValue={`${((account?.cash || 0) / equity * 100).toFixed(0)}% of portfolio`}
            trend="neutral"
          />
          <StatCard
            icon={Activity}
            label="Positions"
            value={positions.length.toString()}
            subValue={`$${formatCurrency(positionsValue)} invested`}
            trend="neutral"
          />
        </div>

        {/* Actions Dashboard with Trading */}
        <ActionsDashboard
          positions={positions}
          cash={account?.cash || 0}
          onTrade={executeTrade}
          tradingEnabled={true}
        />

        {/* Performance Chart */}
        <PerformanceChart data={performance} />

        {/* Open Positions */}
        {positions.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-400" />
              Open Positions ({positions.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                    <th className="text-left py-2 px-2">Symbol</th>
                    <th className="text-right py-2 px-2">Shares</th>
                    <th className="text-right py-2 px-2">Entry</th>
                    <th className="text-right py-2 px-2">Current</th>
                    <th className="text-right py-2 px-2">Value</th>
                    <th className="text-right py-2 px-2">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => {
                    const isProfit = (pos.unrealized_pnl || 0) >= 0;
                    return (
                      <tr key={pos.symbol} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-3 px-2 font-bold text-slate-100">{pos.symbol}</td>
                        <td className="py-3 px-2 text-right font-mono text-slate-300">
                          {pos.qty.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-400">
                          ${formatCurrency(pos.entry_price)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-300">
                          ${formatCurrency(pos.current_price || pos.entry_price)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-200">
                          ${formatCurrency(pos.market_value || pos.qty * pos.entry_price)}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                          {isProfit ? "+" : ""}${formatCurrency(pos.unrealized_pnl || 0)}
                          <br />
                          <span className="text-xs">{formatPercent(pos.unrealized_pnl_pct || 0)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Orders */}
        {(portfolio?.pending_orders?.length || 0) > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Pending Orders ({portfolio?.pending_orders?.length || 0})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                    <th className="text-left py-2 px-2">Symbol</th>
                    <th className="text-left py-2 px-2">Type</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Trigger Price</th>
                    <th className="text-right py-2 px-2">Current Price</th>
                    <th className="text-right py-2 px-2">Distance</th>
                    <th className="text-center py-2 px-2">Cancel</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio?.pending_orders?.map((order) => {
                    const asset = mreAssets.find((a) => a.symbol === order.symbol);
                    const currentPrice = asset?.price || 0;
                    const distance = order.type === "take_profit"
                      ? ((order.trigger_price - currentPrice) / currentPrice) * 100
                      : ((currentPrice - order.trigger_price) / currentPrice) * 100;
                    
                    return (
                      <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-3 px-2 font-bold text-slate-100">{order.symbol}</td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              order.type === "take_profit"
                                ? "bg-emerald-900/50 text-emerald-400"
                                : "bg-red-900/50 text-red-400"
                            }`}
                          >
                            {order.type === "take_profit" ? "TAKE PROFIT" : "STOP LOSS"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-300">
                          {order.qty.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-200">
                          ${formatCurrency(order.trigger_price)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-400">
                          ${formatCurrency(currentPrice)}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono ${distance > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                          {distance > 0 ? `${distance.toFixed(1)}% away` : "TRIGGERED"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => cancelPendingOrder(order.id)}
                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 px-2 py-1 rounded transition-colors"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Orders execute automatically when price reaches trigger level on refresh.
            </p>
          </div>
        )}

        {/* Queued Trades (off-hours) */}
        {(portfolio?.queued_trades?.length || 0) > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-cyan-500/30">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Queued for Market Open ({portfolio?.queued_trades?.length || 0})
            </h2>
            <div className="space-y-2">
              {portfolio?.queued_trades?.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        trade.side === "buy"
                          ? "bg-emerald-900/50 text-emerald-400"
                          : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {trade.side.toUpperCase()}
                    </span>
                    <span className="font-bold text-slate-100">{trade.qty} {trade.symbol}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      Queued {new Date(trade.queued_at).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => cancelQueuedTrade(trade.id)}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 px-2 py-1 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              These trades will execute at market open (9:30 AM ET).
            </p>
          </div>
        )}

        {/* Trade History */}
        {trades.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Trade History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Symbol</th>
                    <th className="text-left py-2 px-2">Side</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Price</th>
                    <th className="text-right py-2 px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 20).map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 px-2 text-sm text-slate-400">{formatDate(trade.date)}</td>
                      <td className="py-2 px-2 font-medium text-slate-200">{trade.symbol}</td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            trade.side === "buy"
                              ? "bg-emerald-900/50 text-emerald-400"
                              : "bg-red-900/50 text-red-400"
                          }`}
                        >
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">
                        {trade.qty.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">
                        ${formatCurrency(trade.price)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-200">
                        ${formatCurrency(trade.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
