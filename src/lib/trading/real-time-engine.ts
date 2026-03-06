/**
 * Real-Time Trading Engine
 * Handles live price updates, P&L calculations, and portfolio analytics
 * 
 * Features:
 * - WebSocket-based price feeds
 * - Real-time P&L calculation
 * - Portfolio performance analytics
 * - Risk management monitoring
 * - Signal processing integration
 */

import { createClient } from '@supabase/supabase-js';
import { paperSupabase } from '@/lib/paper-supabase';

// Types
interface RealTimePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: 'alpha_vantage' | 'polygon' | 'yahoo';
}

export interface PortfolioAnalytics {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  beta: number;
  alpha: number;
  volatility: number;
}

interface RiskMetrics {
  portfolioRisk: number;
  valueAtRisk: number;
  concentrationRisk: number;
  correlationRisk: number;
  leverageRatio: number;
}

interface PositionMetrics {
  symbol: string;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
  beta: number;
  volatility: number;
  sharpeRatio: number;
  timeHeld: number;
  riskContribution: number;
}

// Real-Time Trading Engine Class
export class RealTimeTradingEngine {
  private priceSubscriptions = new Map<string, WebSocket>();
  private portfolioListeners = new Set<(analytics: PortfolioAnalytics) => void>();
  private positionListeners = new Set<(positions: PositionMetrics[]) => void>();
  private priceCache = new Map<string, RealTimePrice>();
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.initializePriceFeeds();
  }

  // ===== Core Engine Management =====

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startPriceUpdateLoop();
    console.log('Real-time trading engine started');
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.stopPriceUpdateLoop();
    this.closePriceSubscriptions();
    console.log('Real-time trading engine stopped');
  }

  // ===== Price Feed Management =====

  private async initializePriceFeeds(): Promise<void> {
    // Get all active symbols from current positions
    const { data: positions } = await paperSupabase
      .from('paper_positions')
      .select('symbol')
      .neq('symbol', '');

    const symbols = Array.from(new Set(positions?.map(p => p.symbol) || []));
    
    for (const symbol of symbols) {
      await this.subscribeToPriceFeed(symbol);
    }
  }

  private async subscribeToPriceFeed(symbol: string): Promise<void> {
    // Use Alpha Vantage for real-time quotes (with fallback to Yahoo)
    try {
      const price = await this.fetchLatestPrice(symbol);
      this.priceCache.set(symbol, price);
      
      // Set up periodic updates for this symbol
      this.schedulePriceUpdate(symbol);
    } catch (error) {
      console.error(`Failed to subscribe to price feed for ${symbol}:`, error);
    }
  }

  private async fetchLatestPrice(symbol: string): Promise<RealTimePrice> {
    const alphaVantageKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
    
    try {
      // Primary: Alpha Vantage Global Quote
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${alphaVantageKey}`
      );
      
      const data = await response.json();
      const quote = data['Global Quote'];
      
      if (quote && quote['05. price']) {
        return {
          symbol,
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
          volume: parseInt(quote['06. volume']),
          timestamp: new Date().toISOString(),
          source: 'alpha_vantage'
        };
      }
      
      throw new Error('Invalid Alpha Vantage response');
    } catch (error) {
      // Fallback: Yahoo Finance
      return await this.fetchYahooPrice(symbol);
    }
  }

  private async fetchYahooPrice(symbol: string): Promise<RealTimePrice> {
    try {
      // Use server-side proxy to avoid CORS issues with Yahoo Finance
      const response = await fetch(
        `/api/markets?symbols=${symbol}&range=1d`
      );
      
      const data = await response.json();
      
      if (data && data[symbol]) {
        const quote = data[symbol];
        return {
          symbol,
          price: quote.price || quote.regularMarketPrice || 0,
          change: quote.change || 0,
          changePercent: quote.changePercent || 0,
          volume: quote.volume || 0,
          timestamp: new Date().toISOString(),
          source: 'yahoo' as const
        };
      }
      
      // Fallback: try direct Yahoo (works server-side, may fail client-side)
      const directResponse = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
      ).catch(() => null);
      
      if (directResponse?.ok) {
        const directData = await directResponse.json();
        const result = directData.chart?.result?.[0];
        const meta = result?.meta;
        
        if (meta?.regularMarketPrice) {
          return {
            symbol,
            price: meta.regularMarketPrice,
            change: meta.regularMarketPrice - meta.previousClose,
            changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
            volume: meta.regularMarketVolume || 0,
            timestamp: new Date().toISOString(),
            source: 'yahoo'
          };
        }
      }
      
      throw new Error('No price data available');
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      throw error;
    }
  }

  private schedulePriceUpdate(symbol: string): void {
    const updateFrequency = this.getUpdateFrequency();
    
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const price = await this.fetchLatestPrice(symbol);
        const oldPrice = this.priceCache.get(symbol);
        
        this.priceCache.set(symbol, price);
        
        // Update database with new price
        await this.updatePositionPrices(symbol, price.price);
        
        // Trigger analytics recalculation if price changed significantly
        if (!oldPrice || Math.abs(price.price - oldPrice.price) / oldPrice.price > 0.001) {
          await this.recalculatePortfolioAnalytics();
        }
      } catch (error) {
        console.error(`Price update failed for ${symbol}:`, error);
      }
    }, updateFrequency);
  }

  private getUpdateFrequency(): number {
    const now = new Date();
    const marketOpen = this.isMarketOpen(now);
    
    if (marketOpen) {
      return 30000; // 30 seconds during market hours
    } else {
      return 300000; // 5 minutes during off-hours
    }
  }

  private isMarketOpen(date: Date): boolean {
    const easternTime = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hour = easternTime.getHours();
    const day = easternTime.getDay();
    
    // Weekend
    if (day === 0 || day === 6) return false;
    
    // Market hours: 9:30 AM - 4:00 PM ET
    return hour >= 9 && hour < 16;
  }

  // ===== Position and Portfolio Updates =====

  private async updatePositionPrices(symbol: string, newPrice: number): Promise<void> {
    try {
      // Update all positions for this symbol
      await paperSupabase
        .from('paper_positions')
        .update({
          current_price: newPrice,
          updated_at: new Date().toISOString()
        })
        .eq('symbol', symbol);

      // Cache the price
      await paperSupabase
        .from('price_cache')
        .upsert({
          symbol,
          price: newPrice,
          timestamp: new Date().toISOString(),
          source: this.priceCache.get(symbol)?.source || 'unknown',
          market_status: this.isMarketOpen(new Date()) ? 'open' : 'closed'
        });

    } catch (error) {
      console.error(`Failed to update position prices for ${symbol}:`, error);
    }
  }

  // ===== Portfolio Analytics Engine =====

  async calculatePortfolioAnalytics(userId?: string): Promise<PortfolioAnalytics> {
    try {
      // Fetch current positions and trade history
      const [positionsRes, tradesRes, snapshotsRes] = await Promise.all([
        paperSupabase
          .from('paper_positions')
          .select('*')
          .eq('user_id', userId || '')
          .is('account_id', null),

        paperSupabase
          .from('paper_trades')
          .select('*')
          .eq('user_id', userId || '')
          .is('account_id', null)
          .order('closed_at', { ascending: false })
          .limit(200),

        paperSupabase
          .from('paper_portfolio_snapshots')
          .select('*')
          .eq('user_id', userId || '')
          .is('account_id', null)
          .order('date', { ascending: true })
          .limit(365) // Last year of data
      ]);

      const positions = positionsRes.data || [];
      const trades = tradesRes.data || [];
      const snapshots = snapshotsRes.data || [];

      // Calculate current portfolio value
      const totalValue = positions.reduce((sum, pos) => 
        sum + (pos.qty * pos.current_price), 0
      );

      const totalCost = positions.reduce((sum, pos) => 
        sum + (pos.qty * pos.entry_price), 0
      );

      const totalPnL = totalValue - totalCost;
      const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

      // Calculate day P&L (requires yesterday's snapshot)
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const todaySnapshot = snapshots.find(s => s.date === today);
      const yesterdaySnapshot = snapshots.find(s => s.date === yesterday);
      
      const dayPnL = todaySnapshot && yesterdaySnapshot 
        ? todaySnapshot.equity - yesterdaySnapshot.equity 
        : 0;
      
      const dayPnLPercent = yesterdaySnapshot && yesterdaySnapshot.equity > 0
        ? (dayPnL / yesterdaySnapshot.equity) * 100 
        : 0;

      // Advanced analytics
      const returns = this.calculateReturns(snapshots);
      const sharpeRatio = this.calculateSharpe(returns);
      const maxDrawdown = this.calculateMaxDrawdown(snapshots);
      const winRate = this.calculateWinRate(trades);
      const profitFactor = this.calculateProfitFactor(trades);
      
      // Market comparison (Beta and Alpha vs SPY)
      const beta = await this.calculateBeta(positions);
      const alpha = await this.calculateAlpha(returns, beta);
      const volatility = this.calculateVolatility(returns);

      return {
        totalValue,
        totalPnL,
        totalPnLPercent,
        dayPnL,
        dayPnLPercent,
        sharpeRatio,
        maxDrawdown,
        winRate,
        profitFactor,
        beta,
        alpha,
        volatility
      };

    } catch (error) {
      console.error('Failed to calculate portfolio analytics:', error);
      throw error;
    }
  }

  private calculateReturns(snapshots: any[]): number[] {
    if (snapshots.length < 2) return [];
    
    const returns = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prevValue = snapshots[i - 1].equity;
      const currentValue = snapshots[i].equity;
      
      if (prevValue > 0) {
        returns.push(((currentValue - prevValue) / prevValue) * 100);
      }
    }
    
    return returns;
  }

  private calculateSharpe(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  }

  private calculateMaxDrawdown(snapshots: any[]): number {
    if (snapshots.length < 2) return 0;
    
    let peak = snapshots[0].equity;
    let maxDrawdown = 0;
    
    for (const snapshot of snapshots) {
      peak = Math.max(peak, snapshot.equity);
      const drawdown = (peak - snapshot.equity) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown * 100;
  }

  private calculateWinRate(trades: any[]): number {
    if (trades.length === 0) return 0;
    
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    return (winningTrades / trades.length) * 100;
  }

  private calculateProfitFactor(trades: any[]): number {
    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl <= 0);
    
    const totalWins = winners.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));
    
    return totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  }

  private async calculateBeta(positions: any[]): Promise<number> {
    // Simplified beta calculation against SPY
    // In a real implementation, this would fetch historical price data
    // and calculate correlation/covariance
    
    const techStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    const defensiveStocks = ['JNJ', 'PG', 'KO', 'WMT'];
    
    let weightedBeta = 0;
    let totalWeight = 0;
    
    for (const position of positions) {
      const weight = position.qty * position.current_price;
      let beta = 1.0; // Market beta
      
      if (techStocks.includes(position.symbol)) {
        beta = 1.3; // Tech stocks typically have higher beta
      } else if (defensiveStocks.includes(position.symbol)) {
        beta = 0.7; // Defensive stocks typically have lower beta
      }
      
      weightedBeta += beta * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedBeta / totalWeight : 1.0;
  }

  private async calculateAlpha(returns: number[], beta: number): Promise<number> {
    // Simplified alpha calculation
    // Alpha = Portfolio Return - (Risk-Free Rate + Beta * (Market Return - Risk-Free Rate))
    
    if (returns.length === 0) return 0;
    
    const portfolioReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const riskFreeRate = 0.05; // Assume 5% risk-free rate
    const marketReturn = 0.10; // Assume 10% market return
    
    const expectedReturn = riskFreeRate + beta * (marketReturn - riskFreeRate);
    return portfolioReturn - expectedReturn;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance * 252); // Annualized volatility
  }

  // ===== Risk Analytics =====

  async calculateRiskMetrics(positions: any[]): Promise<RiskMetrics> {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.qty * pos.current_price), 0);
    
    // Portfolio concentration risk
    const concentrations = positions.map(pos => (pos.qty * pos.current_price) / totalValue);
    const concentrationRisk = Math.max(...concentrations) * 100;
    
    // Value at Risk (95% confidence, 1-day)
    const returns = await this.getHistoricalReturns();
    returns.sort((a, b) => a - b);
    const varIndex = Math.floor(returns.length * 0.05);
    const valueAtRisk = returns[varIndex] || 0;
    
    // Correlation risk (simplified)
    const correlationRisk = concentrationRisk > 20 ? 'High' : 'Low';
    
    // Leverage ratio
    const leverageRatio = 1.0; // No leverage in paper trading
    
    return {
      portfolioRisk: concentrationRisk,
      valueAtRisk: Math.abs(valueAtRisk),
      concentrationRisk,
      correlationRisk: correlationRisk === 'High' ? 80 : 20,
      leverageRatio
    };
  }

  private async getHistoricalReturns(): Promise<number[]> {
    const { data } = await paperSupabase
      .from('paper_portfolio_snapshots')
      .select('daily_pnl_pct')
      .is('account_id', null)
      .not('daily_pnl_pct', 'is', null)
      .order('date', { ascending: false })
      .limit(252); // Last trading year
    
    return data?.map(s => s.daily_pnl_pct) || [];
  }

  // ===== Event Handling =====

  private startPriceUpdateLoop(): void {
    this.updateInterval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.recalculatePortfolioAnalytics();
      } catch (error) {
        console.error('Portfolio analytics update failed:', error);
      }
    }, 60000); // Update analytics every minute
  }

  private stopPriceUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private closePriceSubscriptions(): void {
    for (const ws of Array.from(this.priceSubscriptions.values())) {
      ws.close();
    }
    this.priceSubscriptions.clear();
  }

  private async recalculatePortfolioAnalytics(): Promise<void> {
    try {
      const analytics = await this.calculatePortfolioAnalytics();
      
      // Notify all listeners
      for (const listener of Array.from(this.portfolioListeners)) {
        listener(analytics);
      }
    } catch (error) {
      console.error('Failed to recalculate portfolio analytics:', error);
    }
  }

  // ===== Public API =====

  addPortfolioListener(listener: (analytics: PortfolioAnalytics) => void): void {
    this.portfolioListeners.add(listener);
  }

  removePortfolioListener(listener: (analytics: PortfolioAnalytics) => void): void {
    this.portfolioListeners.delete(listener);
  }

  addPositionListener(listener: (positions: PositionMetrics[]) => void): void {
    this.positionListeners.add(listener);
  }

  removePositionListener(listener: (positions: PositionMetrics[]) => void): void {
    this.positionListeners.delete(listener);
  }

  getCurrentPrice(symbol: string): number | null {
    return this.priceCache.get(symbol)?.price || null;
  }

  async subscribeToSymbol(symbol: string): Promise<void> {
    if (!this.priceCache.has(symbol)) {
      await this.subscribeToPriceFeed(symbol);
    }
  }

  async refreshPortfolio(): Promise<PortfolioAnalytics> {
    return await this.calculatePortfolioAnalytics();
  }
}

// Export singleton instance
export const realTimeTradingEngine = new RealTimeTradingEngine();