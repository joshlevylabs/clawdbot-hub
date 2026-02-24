"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Target,
  Clock,
  DollarSign,
  BarChart3,
  Eye,
  X
} from 'lucide-react';
import { realTimeTradingEngine } from '@/lib/trading/real-time-engine';

interface Position {
  id: string;
  symbol: string;
  qty: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  market_value: number;
  day_change: number;
  day_change_pct: number;
  hold_days: number;
  signal_confidence?: number;
  signal_regime?: string;
  stop_loss?: number;
  take_profit?: number;
  updated_at: string;
  beta?: number;
  volatility?: number;
  risk_contribution?: number;
}

interface RealTimePositionsTableProps {
  userId?: string;
  maxHeight?: string;
  showRiskMetrics?: boolean;
  allowPositionActions?: boolean;
}

export default function RealTimePositionsTable({ 
  userId, 
  maxHeight = "400px",
  showRiskMetrics = true,
  allowPositionActions = false 
}: RealTimePositionsTableProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Position>('unrealized_pnl_pct');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [priceUpdates, setPriceUpdates] = useState<Map<string, number>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch and subscribe to position updates
  useEffect(() => {
    const fetchPositions = async () => {
      setLoading(true);
      try {
        // Fetch positions from Supabase
        const response = await fetch('/api/paper-trading', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Failed to fetch positions');
        
        const data = await response.json();
        
        // Process positions with additional metrics
        const processedPositions = data.positions.map((pos: any) => ({
          ...pos,
          market_value: pos.qty * pos.current_price,
          unrealized_pnl: pos.qty * (pos.current_price - pos.entry_price),
          unrealized_pnl_pct: ((pos.current_price - pos.entry_price) / pos.entry_price) * 100,
          hold_days: Math.floor((Date.now() - new Date(pos.opened_at).getTime()) / (1000 * 60 * 60 * 24)),
          day_change: 0, // Will be calculated
          day_change_pct: 0, // Will be calculated
        }));
        
        setPositions(processedPositions);
        
        // Subscribe to price updates for all symbols
        for (const pos of processedPositions) {
          await realTimeTradingEngine.subscribeToSymbol(pos.symbol);
        }
        
      } catch (error) {
        console.error('Failed to fetch positions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();

    // Set up real-time price update monitoring
    const priceUpdateInterval = setInterval(async () => {
      const updatedPrices = new Map<string, number>();
      let hasUpdates = false;

      for (const position of positions) {
        const currentPrice = realTimeTradingEngine.getCurrentPrice(position.symbol);
        if (currentPrice && currentPrice !== position.current_price) {
          updatedPrices.set(position.symbol, currentPrice);
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        setPriceUpdates(updatedPrices);
        setLastUpdate(new Date());
        
        // Update positions with new prices
        setPositions(prev => prev.map(pos => {
          const newPrice = updatedPrices.get(pos.symbol);
          if (newPrice) {
            return {
              ...pos,
              current_price: newPrice,
              market_value: pos.qty * newPrice,
              unrealized_pnl: pos.qty * (newPrice - pos.entry_price),
              unrealized_pnl_pct: ((newPrice - pos.entry_price) / pos.entry_price) * 100,
              updated_at: new Date().toISOString()
            };
          }
          return pos;
        }));
      }
    }, 5000); // Check for updates every 5 seconds

    return () => {
      clearInterval(priceUpdateInterval);
    };
  }, []);

  // Sorted positions
  const sortedPositions = useMemo(() => {
    return [...positions].sort((a, b) => {
      const aVal = a[sortField] as number;
      const bVal = b[sortField] as number;
      
      if (sortDirection === 'asc') {
        return aVal - bVal;
      }
      return bVal - aVal;
    });
  }, [positions, sortField, sortDirection]);

  // Handle sorting
  const handleSort = (field: keyof Position) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Format helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number, decimals = 2) => {
    return value.toFixed(decimals);
  };

  const getColorClass = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPriceChangeIndicator = (symbol: string) => {
    const hasUpdate = priceUpdates.has(symbol);
    if (!hasUpdate) return null;
    
    return (
      <div className="flex items-center">
        <Activity className="h-3 w-3 text-blue-500 animate-pulse mr-1" />
        <span className="text-xs text-blue-500">Live</span>
      </div>
    );
  };

  const getRiskLevel = (pnlPercent: number, volatility?: number) => {
    const absChange = Math.abs(pnlPercent);
    const vol = volatility || 20; // Default volatility
    
    if (absChange > 15 || vol > 40) return { level: 'High', color: 'text-red-600', bg: 'bg-red-50' };
    if (absChange > 5 || vol > 25) return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { level: 'Low', color: 'text-green-600', bg: 'bg-green-50' };
  };

  // Position detail modal
  const PositionDetailModal = ({ position, onClose }: { position: Position; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{position.symbol} Position Details</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Position Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Position Information</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{position.qty.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Entry Price:</span>
                <span className="font-medium">{formatCurrency(position.entry_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Price:</span>
                <span className="font-medium">{formatCurrency(position.current_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Market Value:</span>
                <span className="font-medium">{formatCurrency(position.market_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days Held:</span>
                <span className="font-medium">{position.hold_days}</span>
              </div>
            </div>
          </div>

          {/* P&L Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Performance</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Unrealized P&L:</span>
                <span className={`font-medium ${getColorClass(position.unrealized_pnl)}`}>
                  {formatCurrency(position.unrealized_pnl)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Return %:</span>
                <span className={`font-medium ${getColorClass(position.unrealized_pnl)}`}>
                  {formatPercent(position.unrealized_pnl_pct)}
                </span>
              </div>
              {position.signal_confidence && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Signal Confidence:</span>
                  <span className="font-medium">{position.signal_confidence}%</span>
                </div>
              )}
              {position.signal_regime && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Market Regime:</span>
                  <span className="font-medium">{position.signal_regime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Risk Management */}
          {(position.stop_loss || position.take_profit) && (
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Risk Management</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {position.stop_loss && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-600 mb-1">Stop Loss</div>
                    <div className="text-lg font-semibold text-red-700">
                      {formatCurrency(position.stop_loss)}
                    </div>
                    <div className="text-xs text-red-600">
                      {((position.stop_loss - position.current_price) / position.current_price * 100).toFixed(1)}% away
                    </div>
                  </div>
                )}
                
                {position.take_profit && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm text-green-600 mb-1">Take Profit</div>
                    <div className="text-lg font-semibold text-green-700">
                      {formatCurrency(position.take_profit)}
                    </div>
                    <div className="text-xs text-green-600">
                      {((position.take_profit - position.current_price) / position.current_price * 100).toFixed(1)}% away
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-gray-600">Loading positions...</span>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No open positions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-600" />
            Real-Time Positions ({positions.length})
          </h3>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center text-gray-500">
              <div className="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Live Updates
            </div>
            <div className="text-gray-400">
              Last: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ maxHeight, overflowY: 'auto' }}>
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('symbol')}
              >
                Symbol
                {sortField === 'symbol' && (
                  sortDirection === 'asc' ? <TrendingUp className="inline h-3 w-3 ml-1" /> : <TrendingDown className="inline h-3 w-3 ml-1" />
                )}
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('qty')}
              >
                Quantity
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('current_price')}
              >
                Price
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('market_value')}
              >
                Market Value
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('unrealized_pnl')}
              >
                Unrealized P&L
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('unrealized_pnl_pct')}
              >
                Return %
              </th>

              {showRiskMetrics && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
              )}
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPositions.map((position) => {
              const risk = getRiskLevel(position.unrealized_pnl_pct, position.volatility);
              const hasLiveUpdate = priceUpdates.has(position.symbol);
              
              return (
                <tr 
                  key={position.id}
                  className={`hover:bg-gray-50 ${hasLiveUpdate ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{position.symbol}</span>
                      {getPriceChangeIndicator(position.symbol)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {position.hold_days}d held
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{position.qty.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">
                      @ {formatCurrency(position.entry_price)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(position.current_price)}
                    </div>
                    {hasLiveUpdate && (
                      <div className="text-xs text-blue-600 font-medium">Updated</div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(position.market_value)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getColorClass(position.unrealized_pnl)}`}>
                      {formatCurrency(position.unrealized_pnl)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getColorClass(position.unrealized_pnl)}`}>
                      {formatPercent(position.unrealized_pnl_pct)}
                    </div>
                  </td>

                  {showRiskMetrics && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${risk.bg} ${risk.color}`}>
                        {risk.level}
                      </span>
                    </td>
                  )}
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => setSelectedPosition(position)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Position Detail Modal */}
      {selectedPosition && (
        <PositionDetailModal 
          position={selectedPosition} 
          onClose={() => setSelectedPosition(null)} 
        />
      )}
    </div>
  );
}