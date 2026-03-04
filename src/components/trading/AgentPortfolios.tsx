'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Users } from 'lucide-react';

interface AgentPortfolio {
  id: string;
  name: string;
  emoji: string;
  theme: string;
  cashBalance: number;
  positionsValue: number;
  totalEquity: number;
  positionCount: number;
  dailyPnl: number;
  totalPnl: number;
  dailyPnlPct: number;
  totalPnlPct: number;
}

interface AgentPortfoliosProps {
  onAgentClick?: (agentId: string) => void;
}

const themeClasses = {
  amber: {
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    accent: 'text-amber-300',
  },
  emerald: {
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    accent: 'text-emerald-300',
  },
  yellow: {
    bg: 'bg-yellow-500/10 hover:bg-yellow-500/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    accent: 'text-yellow-300',
  },
  cyan: {
    bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    accent: 'text-cyan-300',
  },
  violet: {
    bg: 'bg-violet-500/10 hover:bg-violet-500/20',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    accent: 'text-violet-300',
  },
} as const;

export default function AgentPortfolios({ onAgentClick }: AgentPortfoliosProps) {
  const [portfolios, setPortfolios] = useState<AgentPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trading/agent-portfolios');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch portfolios');
      }
      
      setPortfolios(data.portfolios || []);
    } catch (err) {
      console.error('Error fetching agent portfolios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-slate-100">AI Trading Agents</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-slate-700/30 rounded-lg h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-slate-100">AI Trading Agents</h2>
        </div>
        <div className="text-red-400 text-sm">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-5 w-5 text-primary-400" />
        <h2 className="text-lg font-semibold text-slate-100">AI Trading Agents</h2>
        <span className="text-xs text-slate-400 ml-auto">
          {portfolios.length} agents • $100k each
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {portfolios.map((portfolio) => {
          const theme = themeClasses[portfolio.theme as keyof typeof themeClasses] || themeClasses.amber;
          const isProfitable = portfolio.totalPnl >= 0;
          const isDailyGain = portfolio.dailyPnl >= 0;

          return (
            <div
              key={portfolio.id}
              className={`${theme.bg} ${theme.border} border rounded-lg p-4 transition-all cursor-pointer`}
              onClick={() => onAgentClick?.(portfolio.id)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{portfolio.emoji}</span>
                  <div>
                    <h3 className="text-sm font-medium text-slate-100 truncate">
                      {portfolio.name}
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">{portfolio.positionCount} pos</div>
                </div>
              </div>

              {/* Equity */}
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-400">Total Equity</span>
                </div>
                <div className={`text-lg font-semibold ${theme.text}`}>
                  {formatCurrency(portfolio.totalEquity)}
                </div>
              </div>

              {/* P&L */}
              <div className="space-y-2">
                {/* Daily P&L */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Today</span>
                  <div className={`flex items-center gap-1 text-xs ${isDailyGain ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isDailyGain ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatPercentage(portfolio.dailyPnlPct)}
                  </div>
                </div>

                {/* Total P&L */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total</span>
                  <div className={`flex items-center gap-1 text-xs ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isProfitable ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatPercentage(portfolio.totalPnlPct)}
                  </div>
                </div>
              </div>

              {/* Cash Balance */}
              <div className="mt-3 pt-3 border-t border-slate-600/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cash</span>
                  <span className={theme.accent}>
                    {formatCurrency(portfolio.cashBalance)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      {portfolios.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-400 mb-1">Total AUM</div>
              <div className="text-sm font-semibold text-primary-400">
                {formatCurrency(portfolios.reduce((sum, p) => sum + p.totalEquity, 0))}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Avg Return</div>
              <div className="text-sm font-semibold text-slate-100">
                {formatPercentage(portfolios.reduce((sum, p) => sum + p.totalPnlPct, 0) / portfolios.length)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Best Performer</div>
              <div className="text-sm font-semibold text-emerald-400">
                {portfolios.reduce((best, p) => p.totalPnlPct > best.totalPnlPct ? p : best).name.split(' ')[0]}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Total Positions</div>
              <div className="text-sm font-semibold text-slate-100">
                {portfolios.reduce((sum, p) => sum + p.positionCount, 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}