import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { paperSupabase, isPaperSupabaseConfigured } from '@/lib/paper-supabase';

/**
 * Real-Time Trading API Endpoint
 * 
 * Enhanced endpoint for real-time trading data with:
 * - Live P&L calculations
 * - Portfolio analytics
 * - Risk metrics
 * - Performance metrics
 * - Real-time price data integration
 */

interface RealTimePortfolioData {
  portfolio: {
    totalValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    dayPnL: number;
    dayPnLPercent: number;
    cash: number;
    investedValue: number;
    openPositions: number;
  };
  performance: {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    beta: number;
    alpha: number;
    volatility: number;
    calmarRatio: number;
    sortinoRatio: number;
  };
  risk: {
    portfolioRisk: number;
    valueAtRisk: number;
    concentrationRisk: number;
    correlationRisk: number;
    leverageRatio: number;
    riskAdjustedReturn: number;
  };
  positions: Array<{
    id: string;
    symbol: string;
    qty: number;
    entry_price: number;
    current_price: number;
    market_value: number;
    unrealized_pnl: number;
    unrealized_pnl_pct: number;
    day_pnl: number;
    day_pnl_pct: number;
    hold_days: number;
    risk_contribution: number;
    beta: number;
    volatility: number;
    stop_loss?: number;
    take_profit?: number;
    signal_confidence?: number;
    signal_regime?: string;
  }>;
  trades: Array<{
    id: string;
    symbol: string;
    side: string;
    qty: number;
    entry_price: number;
    exit_price: number;
    pnl: number;
    pnl_pct: number;
    hold_duration: number;
    closed_at: string;
    was_profitable: boolean;
    signal_was_correct: boolean;
  }>;
  timeSeries: Array<{
    timestamp: string;
    totalValue: number;
    totalPnL: number;
    dayPnL: number;
    cash: number;
    investedValue: number;
  }>;
  lastUpdate: string;
}

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getSession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPaperSupabaseConfigured()) {
    return NextResponse.json({ error: 'Paper trading database not configured' }, { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const timeframe = url.searchParams.get('timeframe') || '1d'; // 1d, 1w, 1m, 3m, 1y, all

    // Fetch all required data in parallel
    const [
      positionsRes,
      tradesRes,
      snapshotsRes,
      intradaySnapshotsRes,
      configRes
    ] = await Promise.all([
      // Current positions
      paperSupabase
        .from('paper_positions')
        .select('*')
        .eq(userId ? 'user_id' : 'id', userId || '')
        .order('opened_at', { ascending: false }),

      // Trade history
      paperSupabase
        .from('paper_trades')
        .select('*')
        .eq(userId ? 'user_id' : 'id', userId || '')
        .order('closed_at', { ascending: false })
        .limit(500),

      // Daily portfolio snapshots
      paperSupabase
        .from('paper_portfolio_snapshots')
        .select('*')
        .eq(userId ? 'user_id' : 'id', userId || '')
        .order('date', { ascending: false })
        .limit(getSnapshotLimit(timeframe)),

      // Intraday snapshots for real-time charting
      paperSupabase
        .from('paper_portfolio_snapshots_intraday')
        .select('*')
        .eq(userId ? 'user_id' : 'id', userId || '')
        .gte('timestamp', getIntradayStartTime(timeframe))
        .order('timestamp', { ascending: false })
        .limit(500),

      // Trading config
      paperSupabase
        .from('paper_trading_config')
        .select('*')
        .eq(userId ? 'user_id' : 'id', userId || '')
        .limit(1)
        .single()
    ]);

    const positions = positionsRes.data || [];
    const trades = tradesRes.data || [];
    const snapshots = snapshotsRes.data || [];
    const intradaySnapshots = intradaySnapshotsRes.data || [];
    const config = configRes.data;

    // Calculate real-time portfolio metrics
    const portfolioData = calculatePortfolioMetrics(positions, config);
    const performanceData = calculatePerformanceMetrics(trades, snapshots);
    const riskData = calculateRiskMetrics(positions, portfolioData.totalValue);
    const enhancedPositions = enhancePositionsWithMetrics(positions);
    const enhancedTrades = enhanceTradesWithMetrics(trades);
    const timeSeries = buildTimeSeries(snapshots, intradaySnapshots, timeframe);

    const response: RealTimePortfolioData = {
      portfolio: portfolioData,
      performance: performanceData,
      risk: riskData,
      positions: enhancedPositions,
      trades: enhancedTrades,
      timeSeries: timeSeries,
      lastUpdate: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Real-time trading API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real-time trading data' },
      { status: 500 }
    );
  }
}

// ===== Helper Functions =====

function calculatePortfolioMetrics(positions: any[], config: any) {
  const currentCash = config?.current_cash || 100000;
  const startingCapital = config?.starting_capital || 100000;

  const investedValue = positions.reduce((sum, pos) => 
    sum + (pos.qty * pos.current_price), 0
  );
  
  const totalCost = positions.reduce((sum, pos) => 
    sum + (pos.qty * pos.entry_price), 0
  );

  const totalValue = currentCash + investedValue;
  const totalPnL = totalValue - startingCapital;
  const totalPnLPercent = startingCapital > 0 ? (totalPnL / startingCapital) * 100 : 0;

  // Calculate day P&L (simplified - would need yesterday's portfolio value)
  const dayPnL = 0; // TODO: Implement with yesterday's snapshot
  const dayPnLPercent = 0;

  return {
    totalValue,
    totalPnL,
    totalPnLPercent,
    dayPnL,
    dayPnLPercent,
    cash: currentCash,
    investedValue,
    openPositions: positions.length
  };
}

function calculatePerformanceMetrics(trades: any[], snapshots: any[]) {
  if (trades.length === 0 || snapshots.length === 0) {
    return {
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      beta: 1.0,
      alpha: 0,
      volatility: 0,
      calmarRatio: 0,
      sortinoRatio: 0
    };
  }

  // Calculate returns from snapshots
  const returns = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prevValue = snapshots[i - 1].equity;
    const currentValue = snapshots[i].equity;
    if (prevValue > 0) {
      returns.push(((currentValue - prevValue) / prevValue) * 100);
    }
  }

  // Win rate
  const profitableTrades = trades.filter(t => t.pnl > 0);
  const winRate = trades.length > 0 ? (profitableTrades.length / trades.length) * 100 : 0;

  // Profit factor
  const totalWins = profitableTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(trades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  // Sharpe ratio
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Max drawdown
  let peak = snapshots[0]?.equity || 0;
  let maxDrawdown = 0;
  for (const snapshot of snapshots) {
    peak = Math.max(peak, snapshot.equity);
    const drawdown = (peak - snapshot.equity) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  // Volatility (annualized)
  const volatility = stdDev * Math.sqrt(252);

  // Calmar ratio (annual return / max drawdown)
  const calmarRatio = maxDrawdown > 0 ? (avgReturn * 252) / (maxDrawdown * 100) : 0;

  // Sortino ratio (return / downside deviation)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDeviation > 0 ? (avgReturn / downsideDeviation) * Math.sqrt(252) : 0;

  return {
    sharpeRatio,
    maxDrawdown: maxDrawdown * 100,
    winRate,
    profitFactor,
    beta: 1.0, // Simplified
    alpha: 0, // Simplified
    volatility,
    calmarRatio,
    sortinoRatio
  };
}

function calculateRiskMetrics(positions: any[], totalValue: number) {
  if (positions.length === 0 || totalValue <= 0) {
    return {
      portfolioRisk: 0,
      valueAtRisk: 0,
      concentrationRisk: 0,
      correlationRisk: 0,
      leverageRatio: 1.0,
      riskAdjustedReturn: 0
    };
  }

  // Concentration risk (largest position as % of portfolio)
  const positionValues = positions.map(pos => pos.qty * pos.current_price);
  const concentrationRisk = Math.max(...positionValues) / totalValue * 100;

  // Portfolio risk (simplified volatility estimate)
  const portfolioRisk = concentrationRisk > 20 ? 25 : concentrationRisk > 10 ? 15 : 10;

  // Value at Risk (95% confidence, simplified)
  const valueAtRisk = totalValue * 0.05; // 5% of portfolio value

  return {
    portfolioRisk,
    valueAtRisk,
    concentrationRisk,
    correlationRisk: concentrationRisk > 30 ? 80 : 20, // Simplified
    leverageRatio: 1.0, // No leverage in paper trading
    riskAdjustedReturn: 0 // Would need more historical data
  };
}

function enhancePositionsWithMetrics(positions: any[]) {
  return positions.map(pos => {
    const marketValue = pos.qty * pos.current_price;
    const unrealizedPnL = pos.qty * (pos.current_price - pos.entry_price);
    const unrealizedPnLPct = ((pos.current_price - pos.entry_price) / pos.entry_price) * 100;
    const holdDays = Math.floor((Date.now() - new Date(pos.opened_at).getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: pos.id,
      symbol: pos.symbol,
      qty: pos.qty,
      entry_price: pos.entry_price,
      current_price: pos.current_price,
      market_value: marketValue,
      unrealized_pnl: unrealizedPnL,
      unrealized_pnl_pct: unrealizedPnLPct,
      day_pnl: 0, // TODO: Calculate from price change since yesterday
      day_pnl_pct: 0,
      hold_days: holdDays,
      risk_contribution: Math.abs(unrealizedPnLPct) / 100, // Simplified
      beta: 1.0, // Simplified
      volatility: 20, // Simplified
      stop_loss: pos.stop_loss,
      take_profit: pos.take_profit,
      signal_confidence: pos.signal_confidence,
      signal_regime: pos.signal_regime
    };
  });
}

function enhanceTradesWithMetrics(trades: any[]) {
  return trades.map(trade => ({
    id: trade.id,
    symbol: trade.symbol,
    side: trade.side,
    qty: trade.qty,
    entry_price: trade.entry_price,
    exit_price: trade.exit_price,
    pnl: trade.pnl,
    pnl_pct: trade.pnl_pct,
    hold_duration: trade.hold_days_actual || 0,
    closed_at: trade.closed_at,
    was_profitable: trade.pnl > 0,
    signal_was_correct: trade.signal_was_correct || false
  }));
}

function buildTimeSeries(snapshots: any[], intradaySnapshots: any[], timeframe: string) {
  // Use intraday snapshots for short timeframes, daily for longer ones
  const useIntraday = ['1d', '1w'].includes(timeframe);
  const data = useIntraday ? intradaySnapshots : snapshots;
  
  return data.map(snapshot => ({
    timestamp: snapshot.timestamp || snapshot.date,
    totalValue: snapshot.equity,
    totalPnL: snapshot.total_pnl || 0,
    dayPnL: snapshot.daily_pnl || 0,
    cash: snapshot.cash || 0,
    investedValue: snapshot.positions_value || 0
  })).reverse(); // Chronological order
}

function getSnapshotLimit(timeframe: string): number {
  switch (timeframe) {
    case '1d': return 1;
    case '1w': return 7;
    case '1m': return 30;
    case '3m': return 90;
    case '1y': return 365;
    default: return 1000;
  }
}

function getIntradayStartTime(timeframe: string): string {
  const now = new Date();
  switch (timeframe) {
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '1w':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
}