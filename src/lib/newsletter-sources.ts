import fs from 'fs';
import path from 'path';
import { paperSupabase, isPaperSupabaseConfigured } from './paper-supabase';

// ---------- Types ----------

export interface ContentSourceDef {
  key: string;
  label: string;
  description: string;
  category: 'trading' | 'marriage' | 'podcast' | 'prayer' | 'news';
  availableParams: ParamDef[];
}

export interface ParamDef {
  key: string;
  label: string;
  type: 'select' | 'number';
  options?: { value: string; label: string }[];
  default?: string | number;
}

export interface ContentBlock {
  source_key: string;
  label: string;
  params: Record<string, unknown>;
  data: unknown;
  error?: string;
}

// ---------- Source Registry ----------

export const CONTENT_SOURCES: ContentSourceDef[] = [
  {
    key: 'portfolio-performance',
    label: 'Portfolio Performance',
    description: 'MRE portfolio performance vs SPY',
    category: 'trading',
    availableParams: [
      {
        key: 'range',
        label: 'Time Range',
        type: 'select',
        options: [
          { value: '1w', label: '1 Week' },
          { value: '1m', label: '1 Month' },
          { value: 'all', label: 'All Time' },
        ],
        default: 'all',
      },
    ],
  },
  {
    key: 'current-positions',
    label: 'Current Positions',
    description: 'Open positions in the portfolio',
    category: 'trading',
    availableParams: [],
  },
  {
    key: 'active-signals',
    label: 'Active Signals',
    description: 'Current trading signals from MRE',
    category: 'trading',
    availableParams: [],
  },
  {
    key: 'recent-trades',
    label: 'Recent Trades',
    description: 'Trade log with P&L',
    category: 'trading',
    availableParams: [
      {
        key: 'limit',
        label: 'Max Trades',
        type: 'number',
        default: 10,
      },
    ],
  },
  {
    key: 'fear-greed',
    label: 'Fear & Greed Index',
    description: 'Market sentiment indicator',
    category: 'trading',
    availableParams: [],
  },
  {
    key: 'regime',
    label: 'Market Regime',
    description: 'Current market regime classification',
    category: 'trading',
    availableParams: [],
  },
  {
    key: 'strategy-improvements',
    label: 'Strategy Improvements',
    description: 'Recent Pit optimizations, version changes, and model improvements',
    category: 'trading',
    availableParams: [],
  },
  {
    key: 'signal-accuracy',
    label: 'Historical Signal Accuracy',
    description: 'Signal accuracy by asset class, strategy win rates, and backtest performance',
    category: 'trading',
    availableParams: [
      {
        key: 'include',
        label: 'Include',
        type: 'select',
        options: [
          { value: 'all', label: 'All (Signals + Backtests)' },
          { value: 'signals', label: 'Signal Accuracy Only' },
          { value: 'backtests', label: 'Strategy Backtests Only' },
        ],
        default: 'all',
      },
    ],
  },
  {
    key: 'compass-state',
    label: 'Compass State',
    description: 'Marriage compass scores and quadrant',
    category: 'marriage',
    availableParams: [],
  },
  {
    key: 'compass-weekly',
    label: 'Weekly Analysis',
    description: 'Weekly relationship analysis highlights',
    category: 'marriage',
    availableParams: [],
  },
  {
    key: 'compass-nudges',
    label: 'Recent Nudges',
    description: 'Recent nudge history',
    category: 'marriage',
    availableParams: [
      {
        key: 'limit',
        label: 'Max Nudges',
        type: 'number',
        default: 5,
      },
    ],
  },
  {
    key: 'family-ideas',
    label: 'Date & Activity Ideas',
    description: 'Date night and family activity ideas',
    category: 'marriage',
    availableParams: [
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { value: 'date', label: 'Date Ideas' },
          { value: 'activity', label: 'Activities' },
          { value: 'conversation', label: 'Conversation Starters' },
        ],
        default: 'date',
      },
    ],
  },
  {
    key: 'podcast-latest',
    label: 'Latest Episodes',
    description: 'Latest podcast episode summaries',
    category: 'podcast',
    availableParams: [
      {
        key: 'count',
        label: 'Episode Count',
        type: 'number',
        default: 1,
      },
    ],
  },
  {
    key: 'prayer-weekly',
    label: 'Weekly Prayer',
    description: 'Weekly parsha, psalms, proverbs, and intentions',
    category: 'prayer',
    availableParams: [],
  },
  {
    key: 'news-highlights',
    label: 'News Highlights',
    description: 'Recent news from morning brief',
    category: 'news',
    availableParams: [
      {
        key: 'category',
        label: 'Region',
        type: 'select',
        options: [
          { value: 'all', label: 'All News' },
          { value: 'israel', label: 'Israel' },
          { value: 'us', label: 'United States' },
          { value: 'world', label: 'Global' },
          { value: 'ai', label: 'AI Intel' },
        ],
        default: 'all',
      },
    ],
  },
];

// ---------- Data Fetchers ----------

function readDataFile(relativePath: string): unknown {
  try {
    const fullPath = path.join(process.cwd(), 'public', 'data', relativePath);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readTextFile(absolutePath: string): string | null {
  try {
    return fs.readFileSync(absolutePath, 'utf-8');
  } catch {
    return null;
  }
}

type DataFetcher = (params: Record<string, unknown>) => unknown | Promise<unknown>;

const fetchers: Record<string, DataFetcher> = {
  'portfolio-performance': async (params) => {
    const range = (params.range as string) || 'all';
    
    if (isPaperSupabaseConfigured()) {
      // Fetch intraday snapshots from Supabase for rich chart data
      const { data: intraday } = await paperSupabase
        .from('paper_portfolio_snapshots_intraday')
        .select('timestamp,equity,cash,spy_price')
        .order('timestamp', { ascending: true })
        .limit(2000);
      
      const { data: daily } = await paperSupabase
        .from('paper_portfolio_snapshots')
        .select('*')
        .order('date', { ascending: true })
        .limit(500);

      // Use intraday for 1w, daily for longer ranges
      let chartData = (daily || []) as Array<Record<string, unknown>>;
      if (range === '1w' && intraday && intraday.length > 0) {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        chartData = intraday.filter((s: Record<string, unknown>) => String(s.timestamp) >= oneWeekAgo);
      } else if (range === '1m') {
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        chartData = (daily || []).filter((s: Record<string, unknown>) => String(s.date) >= oneMonthAgo);
      }

      if (chartData.length === 0) chartData = (daily || []) as Array<Record<string, unknown>>;

      // Calculate returns from first to last
      const first = chartData[0] || {};
      const last = chartData[chartData.length - 1] || {};
      const firstEquity = Number(first.equity || 100000);
      const lastEquity = Number(last.equity || 100000);
      const firstSpy = Number(first.spy_price || 1);
      const lastSpy = Number(last.spy_price || 1);
      const portfolioReturn = ((lastEquity / firstEquity) - 1) * 100;
      const spyReturn = ((lastSpy / firstSpy) - 1) * 100;

      // Build performance array for chart (normalize to % returns)
      const performance = chartData.map((s: Record<string, unknown>) => ({
        date: s.timestamp || s.date,
        equity: s.equity,
        spy_price: s.spy_price,
        cash: s.cash,
      }));

      return {
        range,
        data_points: performance.length,
        equity: lastEquity,
        portfolio_return_pct: Number(portfolioReturn.toFixed(2)),
        spy_return_pct: Number(spyReturn.toFixed(2)),
        alpha_pct: Number((portfolioReturn - spyReturn).toFixed(2)),
        performance,
      };
    }

    // Fallback to JSON file
    const data = readDataFile('paper-portfolio.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No portfolio data available' };
    const performance = (data.performance || []) as Array<Record<string, unknown>>;
    const latest = performance[performance.length - 1] || {};
    return {
      range,
      data_points: performance.length,
      equity: latest.equity,
      portfolio_return_pct: latest.portfolio_return_pct ?? 0,
      spy_return_pct: latest.spy_return_pct ?? 0,
      alpha_pct: latest.alpha_pct ?? 0,
      performance,
    };
  },

  'current-positions': async () => {
    if (isPaperSupabaseConfigured()) {
      const { data: positions } = await paperSupabase
        .from('paper_positions')
        .select('symbol,side,qty,entry_price,current_price,signal_confidence,signal_regime,signal_version,notes,opened_at')
        .order('opened_at', { ascending: false });

      const { data: config } = await paperSupabase
        .from('paper_trading_config')
        .select('starting_capital,cash')
        .limit(1)
        .single();

      return {
        positions: (positions || []).map((p: Record<string, unknown>) => ({
          symbol: p.symbol,
          side: p.side,
          qty: p.qty,
          entry_price: p.entry_price,
          current_price: p.current_price,
          confidence: p.signal_confidence,
          regime: p.signal_regime,
          version: p.signal_version,
          notes: p.notes,
        })),
        cash: config?.cash ?? 0,
        source: 'alpaca',
      };
    }

    // Fallback to JSON files
    const data = readDataFile('paper-portfolio.json') as Record<string, unknown> | null;
    return {
      positions: data?.positions || [],
      cash: (data?.account as Record<string, unknown>)?.cash ?? 0,
      source: 'json-fallback',
    };
  },

  'active-signals': () => {
    const data = readDataFile('trading/mre-signals.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No signals data available' };
    return {
      signals: data.signals || [],
      timestamp: data.timestamp,
      last_updated: data.last_updated,
    };
  },

  'recent-trades': (params) => {
    const data = readDataFile('paper-portfolio.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No trade data available' };
    const trades = (data.trades || []) as unknown[];
    const limit = Number(params.limit) || 10;
    return {
      trades: trades.slice(-limit),
      total: trades.length,
    };
  },

  'fear-greed': () => {
    const data = readDataFile('trading/mre-signals.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No fear & greed data available' };
    return data.fear_greed || { error: 'Fear & Greed data not present' };
  },

  'regime': () => {
    const data = readDataFile('trading/mre-signals.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No regime data available' };
    return {
      regime: data.regime,
      rotation: data.rotation,
      breadth: data.breadth,
      cycle: data.cycle,
    };
  },

  'strategy-improvements': () => {
    const versions = readDataFile('trading/mre-versions.json') as Record<string, unknown> | null;
    const pitRecs = readDataFile('trading/pit-recommendations.json') as Record<string, unknown> | null;
    const optimDir = path.join(process.cwd(), 'public', 'data', 'trading', 'optimization');
    
    // Read optimization files for recent improvements
    let optimizationSummary: Record<string, unknown> | null = null;
    try {
      const calibrationFile = fs.readdirSync(optimDir)
        .filter(f => f.startsWith('calibration_'))
        .sort()
        .pop();
      if (calibrationFile) {
        const raw = fs.readFileSync(path.join(optimDir, calibrationFile), 'utf-8');
        const cal = JSON.parse(raw) as Record<string, unknown>;
        optimizationSummary = {
          file: calibrationFile,
          date: calibrationFile.replace('calibration_', '').replace('.json', ''),
          total_assets: cal.total_assets ?? null,
          calibrated: cal.calibrated ?? null,
          summary: cal.summary ?? null,
        };
      }
    } catch {
      // ignore
    }

    return {
      versions: versions || {},
      pit_recommendations: pitRecs ? {
        generated: pitRecs.generated,
        version: pitRecs.version,
        thesis: (pitRecs.global_context as Record<string, unknown>)?.thesis ?? null,
        key_risks: (pitRecs.global_context as Record<string, unknown>)?.key_risks ?? null,
        removed_assets: pitRecs.removed_assets ?? null,
      } : null,
      latest_optimization: optimizationSummary,
    };
  },

  'signal-accuracy': (params) => {
    const include = (params.include as string) || 'all';
    const result: Record<string, unknown> = {};

    // Signal-level accuracy from MRE signals
    if (include === 'all' || include === 'signals') {
      const signalsData = readDataFile('trading/mre-signals.json') as Record<string, unknown> | null;
      if (signalsData) {
        const signals = signalsData.signals as Record<string, unknown> | undefined;
        const byAssetClass = (signals?.by_asset_class || []) as Array<Record<string, unknown>>;
        
        // Extract accuracy data per asset class
        const accuracyByClass: Array<Record<string, unknown>> = [];
        for (const assetClass of byAssetClass) {
          const assets = (assetClass.assets || []) as Array<Record<string, unknown>>;
          const classAccuracies = assets
            .filter((a) => a.expected_accuracy != null || a.historical_accuracy != null)
            .map((a) => ({
              symbol: a.symbol,
              signal: a.signal,
              expected_accuracy: a.expected_accuracy,
              historical_accuracy: a.historical_accuracy,
              confidence: a.confidence,
            }));
          if (classAccuracies.length > 0) {
            accuracyByClass.push({
              asset_class: assetClass.name || assetClass.asset_class,
              assets: classAccuracies,
            });
          }
        }
        
        // Prediction markets accuracy
        const predictionMarkets = signalsData.prediction_markets as Record<string, unknown> | undefined;
        
        result.signal_accuracy = {
          by_asset_class: accuracyByClass,
          prediction_markets: predictionMarkets || null,
          last_updated: signalsData.last_updated,
        };
      }
    }

    // Strategy backtest results
    if (include === 'all' || include === 'backtests') {
      const backtestData = readDataFile('trading/backtest-report.json') as Record<string, unknown> | null;
      if (backtestData) {
        result.backtest_results = {
          generated_at: backtestData.generated_at,
          total_tests: backtestData.total_tests,
          strategy_rankings: backtestData.strategy_rankings,
        };
      }
    }

    if (Object.keys(result).length === 0) {
      return { error: 'No accuracy data available' };
    }
    return result;
  },

  'compass-state': () => {
    const data = readDataFile('compass-state.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No compass data available' };
    return {
      current: data.current,
      trend: data.trend,
      recentCount: data.recentCount,
    };
  },

  'compass-weekly': () => {
    const text = readTextFile(path.join(process.env.HOME || '', 'clawd', 'agents', 'compass', 'shared', 'weekly-analysis.md'));
    if (!text) return { error: 'No weekly analysis available' };
    return { markdown: text };
  },

  'compass-nudges': (params) => {
    const raw = readTextFile(path.join(process.env.HOME || '', 'clawd', 'agents', 'compass', 'shared', 'nudge-history.json'));
    if (!raw) return { error: 'No nudge history available' };
    try {
      const data = JSON.parse(raw);
      const limit = Number(params.limit) || 5;
      const nudges = Array.isArray(data) ? data.slice(-limit) : (data.nudges || []).slice(-limit);
      return { nudges };
    } catch {
      return { error: 'Failed to parse nudge history' };
    }
  },

  'family-ideas': (params) => {
    const data = readDataFile('family.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No family data available' };
    const category = (params.category as string) || 'date';
    
    if (category === 'date') return { ideas: (data as Record<string, unknown>).date_ideas || [] };
    if (category === 'activity') return { ideas: (data as Record<string, unknown>).activities || [] };
    if (category === 'conversation') return { ideas: (data as Record<string, unknown>).conversation_starters || [] };
    return { ideas: [] };
  },

  'podcast-latest': (params) => {
    const data = readDataFile('podcast/index.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No podcast data available' };
    const episodes = ((data as Record<string, unknown>).episodes || data) as unknown[];
    const count = Number(params.count) || 1;
    const latest = Array.isArray(episodes) ? episodes.slice(0, count) : [];
    return { episodes: latest };
  },

  'prayer-weekly': () => {
    const data = readDataFile('morning-brief.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No prayer data available' };
    const sections = data.sections as Record<string, unknown> | undefined;
    return {
      prayer: sections?.prayer || null,
      date: data.date,
    };
  },

  'news-highlights': (params) => {
    const data = readDataFile('morning-brief.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No news data available' };
    const sections = data.sections as Record<string, unknown> | undefined;
    const news = sections?.news as Record<string, unknown> | undefined;
    const ai = sections?.ai as Record<string, unknown> | undefined;
    const category = (params.category as string) || 'all';

    if (category === 'ai') return { ai: ai || {} };
    if (category === 'all') return { news: news || {}, ai: ai || {} };
    
    const subsections = (news?.subsections || {}) as Record<string, unknown>;
    return { [category]: subsections[category] || {} };
  },
};

// ---------- Public API ----------

export function getSourceDef(key: string): ContentSourceDef | undefined {
  return CONTENT_SOURCES.find(s => s.key === key);
}

export function getSourcesByCategory(category: string): ContentSourceDef[] {
  return CONTENT_SOURCES.filter(s => s.category === category);
}

export async function fetchSourceData(sourceKey: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const fetcher = fetchers[sourceKey];
  if (!fetcher) return { error: `Unknown source: ${sourceKey}` };
  try {
    return await fetcher(params);
  } catch (e) {
    return { error: `Failed to fetch ${sourceKey}: ${String(e)}` };
  }
}

// Map newsletter categories/names to suggested source keys
export const NEWSLETTER_SOURCE_SUGGESTIONS: Record<string, string[]> = {
  "Today's Plays": ['portfolio-performance', 'current-positions', 'active-signals', 'signal-accuracy', 'strategy-improvements', 'fear-greed', 'regime', 'recent-trades'],
  'Marriage Compass': ['compass-state', 'compass-weekly', 'compass-nudges', 'family-ideas'],
  "The Builder's Frequency": ['podcast-latest', 'news-highlights'],
  'Prayer & Bible Study': ['prayer-weekly', 'news-highlights'],
};
