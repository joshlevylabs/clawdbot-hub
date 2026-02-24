"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Percent,
  Target,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  BarChart,
  Area,
  AreaChart
} from 'recharts';
import { realTimeTradingEngine, type PortfolioAnalytics } from '@/lib/trading/real-time-engine';

interface RealTimePnLProps {
  userId?: string;
  compact?: boolean;
}

interface PnLTimeSeries {
  timestamp: string;
  totalPnL: number;
  dayPnL: number;
  portfolioValue: number;
  marketValue?: number; // SPY comparison
}

interface PositionPnL {
  symbol: string;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
  marketValue: number;
  riskContribution: number;
}

export default function RealTimePnLDashboard({ userId, compact = false }: RealTimePnLProps) {
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [positions, setPositions] = useState<PositionPnL[]>([]);
  const [pnlHistory, setPnLHistory] = useState<PnLTimeSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [updateCount, setUpdateCount] = useState(0);

  // Initialize real-time engine and subscribe to updates
  useEffect(() => {
    const initializeEngine = async () => {
      setIsLoading(true);
      
      try {
        // Start the engine if not already running
        realTimeTradingEngine.start();
        
        // Subscribe to portfolio updates
        const handlePortfolioUpdate = (newAnalytics: PortfolioAnalytics) => {
          setAnalytics(newAnalytics);
          setLastUpdate(new Date());
          setUpdateCount(prev => prev + 1);
          
          // Add to P&L history
          setPnLHistory(prev => {
            const newEntry: PnLTimeSeries = {
              timestamp: new Date().toISOString(),
              totalPnL: newAnalytics.totalPnL,
              dayPnL: newAnalytics.dayPnL,
              portfolioValue: newAnalytics.totalValue,
            };
            
            // Keep only last 100 data points for performance
            const updated = [...prev, newEntry].slice(-100);
            return updated;
          });
        };
        
        realTimeTradingEngine.addPortfolioListener(handlePortfolioUpdate);
        
        // Initial load
        const initialAnalytics = await realTimeTradingEngine.calculatePortfolioAnalytics(userId);
        setAnalytics(initialAnalytics);
        
        setIsLoading(false);
        
        // Cleanup subscription on unmount
        return () => {
          realTimeTradingEngine.removePortfolioListener(handlePortfolioUpdate);
        };
        
      } catch (error) {
        console.error('Failed to initialize real-time P&L dashboard:', error);
        setIsLoading(false);
      }
    };
    
    initializeEngine();
  }, [userId]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }, []);

  const formatPercent = useCallback((value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }, []);

  const getColorClass = useCallback((value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  }, []);

  const getBgColorClass = useCallback((value: number) => {
    if (value > 0) return 'bg-green-50 border-green-200';
    if (value < 0) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      const freshAnalytics = await realTimeTradingEngine.refreshPortfolio();
      setAnalytics(freshAnalytics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to refresh portfolio data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading && !analytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading real-time data...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
          <span className="text-yellow-700">No portfolio data available</span>
        </div>
      </div>
    );
  }

  // Compact view for smaller spaces
  if (compact) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Portfolio P&L</h3>
          <div className="flex items-center text-xs text-gray-500">
            <Activity className="h-3 w-3 mr-1" />
            <span>{updateCount} updates</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(analytics.totalValue)}
            </div>
            <div className={`text-sm ${getColorClass(analytics.totalPnL)}`}>
              {formatCurrency(analytics.totalPnL)} ({formatPercent(analytics.totalPnLPercent)})
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Day P&L</div>
            <div className={`text-lg font-semibold ${getColorClass(analytics.dayPnL)}`}>
              {formatCurrency(analytics.dayPnL)}
            </div>
            <div className={`text-xs ${getColorClass(analytics.dayPnL)}`}>
              {formatPercent(analytics.dayPnLPercent)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full dashboard view
  return (
    <div className="space-y-6">
      {/* Header with Real-Time Indicators */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
            Real-Time P&L Dashboard
          </h2>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              <div className="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Live
            </div>
            <div className="text-xs text-gray-400">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Portfolio Value */}
          <div className={`p-4 rounded-lg border ${getBgColorClass(analytics.totalPnL)}`}>
            <div className="flex items-center justify-between">
              <DollarSign className="h-8 w-8 text-blue-600" />
              {analytics.totalPnL >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.totalValue)}
              </div>
              <div className="text-sm text-gray-600">Total Portfolio</div>
            </div>
          </div>

          {/* Total P&L */}
          <div className={`p-4 rounded-lg border ${getBgColorClass(analytics.totalPnL)}`}>
            <div className="flex items-center justify-between">
              <Percent className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold ${getColorClass(analytics.totalPnL)}`}>
                {formatCurrency(analytics.totalPnL)}
              </div>
              <div className={`text-sm ${getColorClass(analytics.totalPnL)}`}>
                {formatPercent(analytics.totalPnLPercent)} Total Return
              </div>
            </div>
          </div>

          {/* Day P&L */}
          <div className={`p-4 rounded-lg border ${getBgColorClass(analytics.dayPnL)}`}>
            <div className="flex items-center justify-between">
              <Activity className="h-8 w-8 text-orange-600" />
              <Zap className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold ${getColorClass(analytics.dayPnL)}`}>
                {formatCurrency(analytics.dayPnL)}
              </div>
              <div className={`text-sm ${getColorClass(analytics.dayPnL)}`}>
                {formatPercent(analytics.dayPnLPercent)} Today
              </div>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <Target className="h-8 w-8 text-red-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900">
                {analytics.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Sharpe Ratio</div>
              <div className="text-xs text-gray-500 mt-1">
                Max DD: {analytics.maxDrawdown.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* P&L Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Time Series */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">P&L Over Time</h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={pnlHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                stroke="#666"
              />
              <YAxis stroke="#666" />
              <Tooltip 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: any, name: any) => [
                  formatCurrency(Number(value) || 0),
                  name === 'totalPnL' ? 'Total P&L' : 
                  name === 'dayPnL' ? 'Day P&L' : 
                  'Portfolio Value'
                ]) as any}
                labelFormatter={(value) => new Date(value).toLocaleString()}
              />
              
              <Area
                type="monotone"
                dataKey="totalPnL"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
                name="Total P&L"
              />
              
              <Line
                type="monotone"
                dataKey="dayPnL"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Day P&L"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Analytics</h3>
          
          <div className="space-y-4">
            {/* Win Rate */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Win Rate</span>
              <span className="font-semibold">{analytics.winRate.toFixed(1)}%</span>
            </div>
            
            {/* Profit Factor */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Profit Factor</span>
              <span className="font-semibold">{analytics.profitFactor.toFixed(2)}</span>
            </div>
            
            {/* Beta */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Beta (vs Market)</span>
              <span className="font-semibold">{analytics.beta.toFixed(2)}</span>
            </div>
            
            {/* Alpha */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Alpha</span>
              <span className={`font-semibold ${getColorClass(analytics.alpha)}`}>
                {formatPercent(analytics.alpha)}
              </span>
            </div>
            
            {/* Volatility */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Volatility (Annual)</span>
              <span className="font-semibold">{analytics.volatility.toFixed(1)}%</span>
            </div>

            {/* Risk-Adjusted Return Bar Chart */}
            <div className="mt-6">
              <div className="text-sm text-gray-600 mb-2">Risk-Adjusted Performance</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={[
                  { name: 'Sharpe', value: analytics.sharpeRatio, target: 1.0 },
                  { name: 'Alpha', value: analytics.alpha, target: 0 },
                  { name: 'Beta', value: analytics.beta, target: 1.0 }
                ]}>
                  <XAxis dataKey="name" />
                  <YAxis hide />
                  <Tooltip 
                    formatter={((value: any) => Number(value || 0).toFixed(2)) as any}
                  />
                  <Bar dataKey="value" fill="#3b82f6" />
                  <Line dataKey="target" stroke="#ef4444" strokeDasharray="2 2" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Activity Feed */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Real-Time Activity</h3>
          <div className="text-sm text-gray-500">
            Updates: {updateCount} | Live since {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          <p>• Portfolio analytics updating every 60 seconds</p>
          <p>• Price feeds refreshing every 30 seconds (market hours)</p>
          <p>• Risk metrics calculated in real-time</p>
          <p>• {pnlHistory.length} data points captured this session</p>
        </div>
      </div>
    </div>
  );
}