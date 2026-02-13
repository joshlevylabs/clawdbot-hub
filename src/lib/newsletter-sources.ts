import fs from 'fs';
import path from 'path';

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

type DataFetcher = (params: Record<string, unknown>) => unknown;

const fetchers: Record<string, DataFetcher> = {
  'portfolio-performance': (params) => {
    const data = readDataFile('paper-portfolio.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No portfolio data available' };

    const performance = (data.performance || []) as Array<Record<string, unknown>>;
    const range = (params.range as string) || 'all';
    
    let filtered = performance;
    if (range === '1w') {
      filtered = performance.slice(-7);
    } else if (range === '1m') {
      filtered = performance.slice(-30);
    }
    
    const latest = filtered[filtered.length - 1] || {};
    const first = filtered[0] || {};

    return {
      range,
      latest,
      first,
      data_points: filtered.length,
      equity: latest.equity,
      portfolio_return_pct: latest.portfolio_return_pct ?? 0,
      spy_return_pct: latest.spy_return_pct ?? 0,
      alpha_pct: latest.alpha_pct ?? 0,
      performance: filtered,
    };
  },

  'current-positions': () => {
    const data = readDataFile('paper-portfolio.json') as Record<string, unknown> | null;
    if (!data) return { error: 'No portfolio data available' };
    return {
      positions: data.positions || [],
      cash: (data.account as Record<string, unknown>)?.cash ?? 0,
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

export function fetchSourceData(sourceKey: string, params: Record<string, unknown> = {}): unknown {
  const fetcher = fetchers[sourceKey];
  if (!fetcher) return { error: `Unknown source: ${sourceKey}` };
  try {
    return fetcher(params);
  } catch (e) {
    return { error: `Failed to fetch ${sourceKey}: ${String(e)}` };
  }
}

// Map newsletter categories/names to suggested source keys
export const NEWSLETTER_SOURCE_SUGGESTIONS: Record<string, string[]> = {
  "Today's Plays": ['portfolio-performance', 'current-positions', 'active-signals', 'signal-accuracy', 'fear-greed', 'regime', 'recent-trades'],
  'Marriage Compass': ['compass-state', 'compass-weekly', 'compass-nudges', 'family-ideas'],
  "The Builder's Frequency": ['podcast-latest', 'news-highlights'],
  'Prayer & Bible Study': ['prayer-weekly', 'news-highlights'],
};
