"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Activity,
  AlertTriangle,
} from "lucide-react";

interface PreviewBlockProps {
  label: string;
  sourceKey: string;
  data: Record<string, unknown>;
}

export function PreviewBlock({ label, sourceKey, data }: PreviewBlockProps) {
  if (data?.error) {
    return (
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
        <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {label}
        </h3>
        <p className="text-xs text-amber-400/70 mt-1">{String(data.error)}</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">{label}</h3>
      <div className="text-sm text-slate-300">
        {renderSourceData(sourceKey, data)}
      </div>
    </div>
  );
}

function renderSourceData(sourceKey: string, data: Record<string, unknown>) {
  switch (sourceKey) {
    case "portfolio-performance":
      return <PortfolioPerformance data={data} />;
    case "current-positions":
      return <CurrentPositions data={data} />;
    case "active-signals":
      return <ActiveSignals data={data} />;
    case "recent-trades":
      return <RecentTrades data={data} />;
    case "fear-greed":
      return <FearGreed data={data} />;
    case "regime":
      return <Regime data={data} />;
    case "signal-accuracy":
      return <SignalAccuracy data={data} />;
    case "strategy-improvements":
      return <StrategyImprovements data={data} />;
    case "compass-state":
      return <CompassState data={data} />;
    case "compass-weekly":
      return <MarkdownContent data={data} />;
    case "compass-nudges":
      return <NudgeList data={data} />;
    case "prayer-weekly":
      return <PrayerWeekly data={data} />;
    case "news-highlights":
      return <NewsHighlights data={data} />;
    default:
      return <GenericData data={data} />;
  }
}

function PctBadge({ value }: { value: number }) {
  const color = value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-slate-400";
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <Icon className="w-3 h-3" />
      {value > 0 ? "+" : ""}{Number(value).toFixed(2)}%
    </span>
  );
}

function MiniChart({ performance }: { performance: Array<Record<string, unknown>> }) {
  if (!performance || performance.length < 2) return null;
  
  const w = 320;
  const h = 60;
  const pad = 2;
  
  // Calculate normalized portfolio and SPY returns
  const firstEquity = Number(performance[0].equity ?? 100000);
  const firstSpy = Number(performance[0].spy_price ?? 1);
  
  const portfolioPoints = performance.map((p) => 
    ((Number(p.equity ?? firstEquity) / firstEquity) - 1) * 100
  );
  const spyPoints = performance.map((p) => 
    ((Number(p.spy_price ?? firstSpy) / firstSpy) - 1) * 100
  );
  
  const allValues = [...portfolioPoints, ...spyPoints];
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 0);
  const range = maxVal - minVal || 1;
  
  const toX = (i: number) => pad + (i / (performance.length - 1)) * (w - pad * 2);
  const toY = (val: number) => pad + (1 - (val - minVal) / range) * (h - pad * 2);
  
  const makePath = (points: number[]) =>
    points.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  const zeroY = toY(0);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16 mt-1">
      {/* Zero line */}
      <line x1={pad} y1={zeroY} x2={w - pad} y2={zeroY} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
      {/* SPY line */}
      <path d={makePath(spyPoints)} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.6" />
      {/* Portfolio line */}
      <path d={makePath(portfolioPoints)} fill="none" stroke="#22c55e" strokeWidth="2" />
    </svg>
  );
}

function PortfolioPerformance({ data }: { data: Record<string, unknown> }) {
  const portfolioReturn = Number(data.portfolio_return_pct ?? 0);
  const spyReturn = Number(data.spy_return_pct ?? 0);
  const alpha = Number(data.alpha_pct ?? 0);
  const performance = (data.performance || []) as Array<Record<string, unknown>>;
  
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 bg-slate-900/50 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase">Portfolio</div>
          <div className="text-sm font-semibold mt-0.5">
            <PctBadge value={portfolioReturn} />
          </div>
        </div>
        <div className="text-center p-2 bg-slate-900/50 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase">SPY</div>
          <div className="text-sm font-semibold mt-0.5">
            <PctBadge value={spyReturn} />
          </div>
        </div>
        <div className="text-center p-2 bg-slate-900/50 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase">Alpha</div>
          <div className="text-sm font-semibold mt-0.5">
            <PctBadge value={alpha} />
          </div>
        </div>
      </div>
      {performance.length >= 2 && (
        <div>
          <MiniChart performance={performance} />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>
              <span className="inline-block w-2 h-0.5 bg-emerald-500 mr-1 align-middle rounded" />
              MRE
            </span>
            <span>
              <span className="inline-block w-2 h-0.5 bg-red-500 mr-1 align-middle rounded opacity-60" />
              SPY
            </span>
          </div>
        </div>
      )}
      <div className="text-[11px] text-slate-500">
        Range: {String(data.range || "all")} • {String(data.data_points || 0)} data points
      </div>
    </div>
  );
}

function CurrentPositions({ data }: { data: Record<string, unknown> }) {
  const positions = (data.positions || []) as Array<Record<string, unknown>>;
  const cash = Number(data.cash || 0);
  const snapshot = data.snapshot as Record<string, unknown> | undefined;
  const source = String(data.source || 'unknown');
  
  return (
    <div>
      {/* Alpaca snapshot summary */}
      {snapshot && (
        <div className="flex items-center gap-4 mb-2 text-xs">
          <div>
            <span className="text-slate-500">Equity: </span>
            <span className="text-slate-200 font-medium">${Number(snapshot.equity).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500">Positions: </span>
            <span className="text-slate-200">${Number(snapshot.positions_value).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500">Open: </span>
            <span className="text-slate-200">{String(snapshot.open_positions)}</span>
          </div>
        </div>
      )}
      {positions.length === 0 && !snapshot ? (
        <div className="text-xs text-slate-500 italic">No open positions (100% cash)</div>
      ) : positions.length === 0 && snapshot ? (
        <div className="text-xs text-slate-500 italic">
          {Number(snapshot.open_positions) > 0 
            ? `${snapshot.open_positions} open positions (details in Alpaca dashboard)`
            : 'No open positions (100% cash)'}
        </div>
      ) : (
        <div className="space-y-1">
          {positions.map((pos, i) => {
            const qty = Number(pos.qty || pos.quantity || 0);
            const entry = Number(pos.entry_price || 0);
            const current = Number(pos.current_price || entry);
            const pnl = qty * (current - entry);
            const pnlPct = entry > 0 ? ((current / entry) - 1) * 100 : 0;
            return (
              <div key={i} className="flex justify-between text-xs items-center">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-mono font-medium w-10">{String(pos.symbol)}</span>
                  {pos.regime != null && (
                    <span className={`text-[10px] px-1 rounded ${
                      String(pos.regime) === 'bull' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
                    }`}>{String(pos.regime)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{qty}</span>
                  <span className="text-slate-500">${entry.toFixed(2)}</span>
                  <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-2 text-xs text-slate-500">
        Cash: ${cash.toLocaleString()}
        {source === 'crypto-bot' && <span className="ml-2 text-slate-600">(crypto bot)</span>}
      </div>
    </div>
  );
}

function ActiveSignals({ data }: { data: Record<string, unknown> }) {
  const signals = (data.signals || []) as Array<Record<string, unknown>>;
  
  if (signals.length === 0) {
    return <div className="text-xs text-slate-500 italic">No active signals</div>;
  }

  return (
    <div className="space-y-2">
      {signals.map((sig, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              sig.direction === "BUY" || sig.type === "BUY"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {String(sig.direction || sig.type || "—")}
          </span>
          <span className="font-mono text-slate-300">{String(sig.symbol || sig.asset)}</span>
          <span className="text-slate-500">{String(sig.rationale || sig.reason || "")}</span>
        </div>
      ))}
    </div>
  );
}

function RecentTrades({ data }: { data: Record<string, unknown> }) {
  const trades = (data.trades || []) as Array<Record<string, unknown>>;
  
  if (trades.length === 0) {
    return <div className="text-xs text-slate-500 italic">No recent trades</div>;
  }

  return (
    <div className="space-y-1">
      {trades.map((trade, i) => (
        <div key={i} className="flex justify-between text-xs">
          <span className="text-slate-300">
            {String(trade.side || trade.action)} {String(trade.symbol)} @ ${String(trade.price)}
          </span>
          {trade.pnl !== undefined && (
            <span className={Number(trade.pnl) >= 0 ? "text-emerald-400" : "text-red-400"}>
              {Number(trade.pnl) >= 0 ? "+" : ""}${Number(trade.pnl).toFixed(2)}
            </span>
          )}
        </div>
      ))}
      <div className="text-[11px] text-slate-500 mt-1">
        {String(data.total || trades.length)} total trades
      </div>
    </div>
  );
}

function FearGreed({ data }: { data: Record<string, unknown> }) {
  const current = Number(data.current ?? 50);
  const rating = String(data.rating || "neutral");
  const color =
    current <= 25
      ? "text-red-400"
      : current <= 45
      ? "text-amber-400"
      : current <= 55
      ? "text-slate-400"
      : current <= 75
      ? "text-emerald-400"
      : "text-emerald-300";

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-slate-500" />
        <span className={`text-2xl font-bold ${color}`}>{current.toFixed(0)}</span>
      </div>
      <div>
        <div className="text-xs text-slate-400 capitalize">{rating}</div>
        <div className="text-[10px] text-slate-600">Fear & Greed Index</div>
      </div>
    </div>
  );
}

function Regime({ data }: { data: Record<string, unknown> }) {
  const regime = data.regime as Record<string, Record<string, unknown>> | undefined;
  const rotation = data.rotation as Record<string, unknown> | undefined;
  const breadth = data.breadth as Record<string, unknown> | undefined;
  const cycle = data.cycle as Record<string, unknown> | undefined;

  return (
    <div className="space-y-3">
      {regime != null && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Market Regime</div>
          <div className="space-y-1">
            {Object.entries(regime).map(([idx, r]) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-slate-400 w-8 uppercase">{String(idx)}</span>
                <span className={
                  String(r?.regime) === 'bull' ? 'text-emerald-400 font-medium' :
                  String(r?.regime) === 'bear' ? 'text-red-400 font-medium' : 'text-yellow-400 font-medium'
                }>{String(r?.regime)}</span>
                {r?.regime_stage != null && (
                  <span className="text-slate-600">({String(r.regime_stage)})</span>
                )}
                {r?.confidence != null && (
                  <span className="text-slate-600">{String(r.confidence)}% conf</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {rotation != null && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Sector Rotation</div>
          {rotation.summary != null && (
            <div className="text-xs text-slate-400 mb-1">{String(rotation.summary)}</div>
          )}
          <div className="flex gap-4 text-xs">
            {rotation.leaders != null && (
              <div>
                <span className="text-emerald-500">Leaders: </span>
                <span className="text-slate-300 font-mono">{(rotation.leaders as string[]).slice(0, 4).join(', ')}</span>
              </div>
            )}
            {rotation.laggards != null && (
              <div>
                <span className="text-red-400">Laggards: </span>
                <span className="text-slate-300 font-mono">{(rotation.laggards as string[]).slice(0, 4).join(', ')}</span>
              </div>
            )}
          </div>
          {rotation.cycle_phase != null && (
            <div className="text-xs text-slate-500 mt-0.5">Phase: {String(rotation.cycle_phase)} ({String(rotation.cycle_confidence)}%)</div>
          )}
        </div>
      )}
      {breadth != null && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Market Breadth</div>
          <div className="flex items-center gap-3 text-xs">
            <span className={
              String(breadth.signal) === 'BULL' ? 'text-emerald-400 font-medium' :
              String(breadth.signal) === 'BEAR' ? 'text-red-400 font-medium' : 'text-yellow-400 font-medium'
            }>{String(breadth.signal)}</span>
            {breadth.trend_5d != null && <span className="text-slate-500">Trend: {String(breadth.trend_5d)}</span>}
          </div>
        </div>
      )}
      {cycle != null && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Market Cycle</div>
          <div className="text-xs text-slate-400">{String(cycle.summary || cycle.phase)}</div>
        </div>
      )}
    </div>
  );
}

function CompassState({ data }: { data: Record<string, unknown> }) {
  const current = (data.current || {}) as Record<string, unknown>;
  const trend = (data.trend || {}) as Record<string, unknown>;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 bg-slate-900/50 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase">Power</div>
          <div className="text-lg font-bold text-blue-400">{Number(current.power ?? 0).toFixed(2)}</div>
          {trend.power !== undefined && Number(trend.power) !== 0 && (
            <div className="text-[10px]">
              <PctBadge value={Number(trend.power)} />
            </div>
          )}
        </div>
        <div className="text-center p-2 bg-slate-900/50 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase">Safety</div>
          <div className="text-lg font-bold text-purple-400">{Number(current.safety ?? 0).toFixed(2)}</div>
          {trend.safety !== undefined && Number(trend.safety) !== 0 && (
            <div className="text-[10px]">
              <PctBadge value={Number(trend.safety)} />
            </div>
          )}
        </div>
      </div>
      <div className="text-xs text-slate-500">
        {String(current.quadrantName || current.quadrant || "Unknown")} •{" "}
        {current.inIdealZone ? "✅ In Ideal Zone" : "Outside Ideal Zone"}
      </div>
    </div>
  );
}

function MarkdownContent({ data }: { data: Record<string, unknown> }) {
  const markdown = String(data.markdown || "");
  const lines = markdown.split("\n").slice(0, 15);
  return (
    <div className="text-xs text-slate-400 space-y-1 font-mono whitespace-pre-wrap">
      {lines.join("\n")}
      {markdown.split("\n").length > 15 && (
        <div className="text-slate-600 italic">... truncated</div>
      )}
    </div>
  );
}

function NudgeList({ data }: { data: Record<string, unknown> }) {
  const nudges = (data.nudges || []) as Array<Record<string, unknown>>;
  
  if (nudges.length === 0) {
    return <div className="text-xs text-slate-500 italic">No nudges recorded</div>;
  }

  return (
    <div className="space-y-2">
      {nudges.map((nudge, i) => (
        <div key={i} className="text-xs border-l-2 border-slate-700 pl-3">
          <div className="text-slate-300">{String(nudge.text || nudge.nudge || JSON.stringify(nudge))}</div>
          {nudge.date != null && <div className="text-slate-600 mt-0.5">{String(nudge.date)}</div>}
        </div>
      ))}
    </div>
  );
}

function PrayerWeekly({ data }: { data: Record<string, unknown> }) {
  const prayer = (data.prayer || {}) as Record<string, unknown>;

  return (
    <div className="space-y-2 text-xs">
      {prayer.parsha != null && (
        <div>
          <span className="text-slate-500">Parsha: </span>
          <span className="text-slate-300 font-medium">{String(prayer.parsha)}</span>
          {prayer.parsha_theme != null && (
            <span className="text-slate-500"> — {String(prayer.parsha_theme)}</span>
          )}
        </div>
      )}
      {prayer.psalm != null && (
        <div className="text-slate-400 italic">{String(prayer.psalm)}</div>
      )}
      {prayer.proverb != null && (
        <div className="text-slate-400 italic">{String(prayer.proverb)}</div>
      )}
      {prayer.intention != null && (
        <div className="text-slate-300 mt-1">
          <span className="text-slate-500">Intention: </span>
          {String(prayer.intention)}
        </div>
      )}
      {data.date != null && (
        <div className="text-slate-600 text-[10px]">From brief: {String(data.date)}</div>
      )}
    </div>
  );
}

function NewsHighlights({ data }: { data: Record<string, unknown> }) {
  const sections: Array<{ key: string; items: Array<Record<string, unknown>> }> = [];

  // Handle various shapes
  const news = (data.news || {}) as Record<string, unknown>;
  const ai = (data.ai || {}) as Record<string, unknown>;
  const subsections = (news.subsections || {}) as Record<string, Record<string, unknown>>;

  // News subsections
  for (const [key, section] of Object.entries(subsections)) {
    const items = ((section as Record<string, unknown>).items || []) as Array<Record<string, unknown>>;
    if (items.length > 0) {
      sections.push({ key, items });
    }
  }

  // AI
  const aiItems = ((ai as Record<string, unknown>).items || []) as Array<Record<string, unknown>>;
  if (aiItems.length > 0) {
    sections.push({ key: "ai", items: aiItems });
  }

  // Direct category (e.g., data.israel)
  for (const [key, val] of Object.entries(data)) {
    if (key !== "news" && key !== "ai" && val && typeof val === "object") {
      const items = ((val as Record<string, unknown>).items || []) as Array<Record<string, unknown>>;
      if (items.length > 0) {
        sections.push({ key, items });
      }
    }
  }

  if (sections.length === 0) {
    return <div className="text-xs text-slate-500 italic">No news available</div>;
  }

  return (
    <div className="space-y-3">
      {sections.map(({ key, items }) => (
        <div key={key}>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">
            {key === "ai" ? "🤖 AI Intel" : key === "israel" ? "🇮🇱 Israel" : key === "us" ? "🇺🇸 US" : `🌐 ${key}`}
          </div>
          <div className="space-y-1">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="text-xs text-slate-400">
                • {String(item.headline || item.title || JSON.stringify(item))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalAccuracy({ data }: { data: Record<string, unknown> }) {
  const signalAcc = data.signal_accuracy as Record<string, unknown> | undefined;
  const backtests = data.backtest_results as Record<string, unknown> | undefined;

  if (!signalAcc && !backtests) {
    return <div className="text-xs text-slate-500 italic">No accuracy data available yet</div>;
  }

  // Supabase format: total_signals, accuracy_5d/10d/20d, by_signal_type
  const totalSignals = signalAcc?.total_signals as number | undefined;
  const acc5d = signalAcc?.accuracy_5d as Record<string, unknown> | null | undefined;
  const acc10d = signalAcc?.accuracy_10d as Record<string, unknown> | null | undefined;
  const acc20d = signalAcc?.accuracy_20d as Record<string, unknown> | null | undefined;
  const bySignalType = signalAcc?.by_signal_type as Record<string, Record<string, number>> | undefined;
  // Legacy format: by_asset_class
  const byAssetClass = (signalAcc?.by_asset_class || []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-3">
      {signalAcc && totalSignals != null && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">
            Signal Accuracy ({totalSignals} signals tracked)
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { label: '5-Day', data: acc5d },
              { label: '10-Day', data: acc10d },
              { label: '20-Day', data: acc20d },
            ].map(({ label, data: accData }) => (
              <div key={label} className="text-center p-2 bg-slate-900/50 rounded-lg">
                <div className="text-[10px] text-slate-500">{label}</div>
                <div className="text-sm font-semibold mt-0.5">
                  {accData ? (
                    <span className={Number(accData.pct) >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                      {String(accData.pct)}%
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-600">
                  {accData ? `${accData.correct}/${accData.evaluated}` : 'pending'}
                </div>
              </div>
            ))}
          </div>
          {bySignalType && Object.keys(bySignalType).length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">By Signal Type</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(bySignalType).map(([sig, stats]) => {
                  const pct = stats.evaluated_5d > 0 ? ((stats.correct_5d / stats.evaluated_5d) * 100).toFixed(0) : null;
                  return (
                    <span key={sig} className="text-xs bg-slate-800/60 px-2 py-0.5 rounded">
                      <span className={
                        sig === 'BUY' ? 'text-emerald-400' : sig === 'SELL' ? 'text-red-400' : 'text-slate-400'
                      }>{sig}</span>
                      <span className="text-slate-500 ml-1">
                        {pct != null ? `${pct}%` : '—'} ({stats.total})
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {signalAcc.latest_version != null && (
            <div className="text-[10px] text-slate-600 mt-1">Version: {String(signalAcc.latest_version)}</div>
          )}
        </div>
      )}
      {/* Legacy format: by asset class */}
      {signalAcc && byAssetClass.length > 0 && !totalSignals && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Signal Accuracy by Asset Class</div>
          {byAssetClass.map((ac, i) => (
            <div key={i} className="mb-2">
              <div className="text-xs font-medium text-slate-300 mb-0.5">{String(ac.asset_class)}</div>
              <div className="space-y-0.5">
                {((ac.assets || []) as Array<Record<string, unknown>>).slice(0, 5).map((a, j) => (
                  <div key={j} className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="font-mono text-slate-300 w-16">{String(a.symbol)}</span>
                    <span className={
                      String(a.signal) === 'BUY' ? 'text-emerald-400' :
                      String(a.signal) === 'SELL' ? 'text-red-400' : 'text-slate-500'
                    }>{String(a.signal)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {backtests && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Strategy Backtest Rankings</div>
          <div className="space-y-1">
            {((backtests.strategy_rankings || []) as Array<Record<string, unknown>>).map((s, i) => {
              const avgReturn = Number(s.avg_return_pct) || 0;
              const winRate = Number(s.avg_win_rate) || 0;
              return (
                <div key={i} className="text-xs flex items-center gap-3">
                  <span className="text-slate-500 w-4">#{String(s.rank)}</span>
                  <span className="text-slate-300 font-medium w-28">{String(s.strategy)}</span>
                  <span className={avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(1)}%
                  </span>
                  <span className="text-slate-500">WR: {winRate.toFixed(1)}%</span>
                  <span className="text-slate-500">{String(s.test_count)} tests</span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            Generated {String(backtests.generated_at).split('T')[0]} • {String(backtests.total_tests)} total tests
          </div>
        </div>
      )}
    </div>
  );
}

function StrategyImprovements({ data }: { data: Record<string, unknown> }) {
  const versions = data.versions as Record<string, string> | undefined;
  const pit = data.pit_recommendations as Record<string, unknown> | undefined;
  const optim = data.latest_optimization as Record<string, unknown> | undefined;

  if (!versions && !pit && !optim) {
    return <div className="text-xs text-slate-500 italic">No improvement data available</div>;
  }

  return (
    <div className="space-y-3">
      {versions && Object.keys(versions).length > 0 && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">System Versions</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(versions).map(([key, ver]) => (
              <span key={key} className="text-xs bg-slate-700/40 px-2 py-0.5 rounded text-slate-300">
                {key}: <span className="font-mono text-primary-400">v{String(ver)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {pit && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Pit Recommendations</div>
          {pit.thesis != null && (
            <div className="text-xs text-slate-400 mb-1">{String(pit.thesis)}</div>
          )}
          {pit.key_risks != null && (
            <div className="space-y-0.5">
              {(pit.key_risks as string[]).slice(0, 3).map((risk, i) => (
                <div key={i} className="text-xs text-yellow-400/70">⚠ {risk}</div>
              ))}
            </div>
          )}
          {pit.removed_assets != null && (
            <div className="text-xs text-red-400/70 mt-1">
              Removed: {(pit.removed_assets as string[]).join(', ')}
            </div>
          )}
        </div>
      )}
      {optim && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Latest Optimization</div>
          <div className="text-xs text-slate-400">
            Calibration run on {String(optim.date)}
            {optim.total_assets != null && ` • ${String(optim.total_assets)} assets`}
            {optim.calibrated != null && ` • ${String(optim.calibrated)} calibrated`}
          </div>
        </div>
      )}
    </div>
  );
}

function GenericData({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="text-xs text-slate-400 font-mono">
      <BarChart3 className="w-4 h-4 text-slate-500 mb-1 inline" />
      <pre className="whitespace-pre-wrap mt-1">
        {JSON.stringify(data, null, 2).slice(0, 500)}
      </pre>
    </div>
  );
}
