import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  findTickerDetails,
  getRelatedTickers, 
  getSignalHistory,
  type HistoricalPoint
} from "@/lib/signal-flow-transform";

async function loadMRESignals(request: NextRequest) {
  try {
    const origin = request.headers.get('host');
    const protocol = origin?.includes('localhost') ? 'http' : 'https';
    const res = await fetch(`${protocol}://${origin}/api/trading/signals?type=core`);
    if (!res.ok) throw new Error(`Signal data unavailable (${res.status})`);
    return await res.json();
  } catch (error) {
    console.error("Failed to load MRE signals:", error);
    return null;
  }
}

/**
 * Find related pairs for a symbol from pairs data
 */
function getRelatedPairs(mreSignals: any, symbol: string) {
  const pairs = mreSignals.pairs?.pairs || [];
  const divergenceSignals = mreSignals.divergence_signals?.signals || [];
  
  // Find pairs where this symbol appears
  const relatedPairs = pairs.filter((pair: any) => 
    pair.symbol1 === symbol || pair.symbol2 === symbol
  );
  
  // Find divergence signals for this symbol
  const relatedDivergence = divergenceSignals.filter((signal: any) => 
    signal.symbol1 === symbol || signal.symbol2 === symbol
  );
  
  return {
    correlationPairs: relatedPairs,
    divergenceSignals: relatedDivergence
  };
}

/**
 * Extract strategy attribution for a ticker
 */
function getStrategyAttribution(ticker: any) {
  return {
    primaryStrategy: ticker.asset_class,
    role: ticker.role,
    roleAction: ticker.role_action,
    confidence: {
      base: ticker.asset_confidence || 1.0,
      adjusted: ticker.confidence_adjusted || false,
      rotationModifier: ticker.rotation_modifier || 1.0,
    },
    thresholds: {
      fearConservative: ticker.fear_threshold_conservative,
      fearOpportunistic: ticker.fear_threshold_opportunistic,
      currentFearGreed: ticker.current_fg,
    },
    backtest: {
      expectedSharpe: ticker.expected_sharpe,
      expectedAccuracy: ticker.expected_accuracy,
      holdDays: ticker.hold_days,
    }
  };
}

/**
 * GET /api/signal-flow/[symbol]
 * 
 * Returns detailed information for a specific ticker including:
 * - Current signal and metadata
 * - Historical signal data  
 * - Strategy attribution
 * - Related tickers in same asset class
 * - Related pairs/correlations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();
    
    const mreSignals = await loadMRESignals(request);
    if (!mreSignals) {
      return NextResponse.json(
        { error: "Failed to load MRE signals data" },
        { status: 500 }
      );
    }

    // Find ticker details
    const ticker = findTickerDetails(mreSignals, symbol);
    if (!ticker) {
      return NextResponse.json(
        { error: `Ticker ${symbol} not found in signals data` },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const historyDays = parseInt(searchParams.get("days") || "30");

    // Fetch historical data
    const history = await getSignalHistory(symbol, historyDays);

    // Get related data
    const relatedTickers = getRelatedTickers(mreSignals, symbol);
    const relatedPairs = getRelatedPairs(mreSignals, symbol);
    const strategyAttribution = getStrategyAttribution(ticker);

    // Extract Fibonacci and regime details if available
    const fibonacci = (ticker as any).fibonacci || null;
    const regimeDetails = (ticker as any).regime_details || null;

    const response = {
      symbol,
      currentSignal: {
        signal: ticker.signal,
        strength: ticker.signal_strength,
        signalSource: ticker.signal_source || 'none',
        strategiesAgreeing: ticker.strategies_agreeing || 0,
        signalTrack: ticker.signal_track || 'none',
      },
      currentData: {
        price: ticker.price,
        regime: ticker.regime,
        assetClass: ticker.asset_class,
        volatility: ticker.volatility_data?.volatility_20d_pct || null,
        rsi: ticker.rsi_14 || null,
        momentum20d: ticker.momentum_20d || null,
        dip5dPct: ticker.dip_5d_pct || null,
      },
      fibonacci,
      regimeDetails,
      strategyAttribution,
      relatedTickers: relatedTickers.map(t => ({
        symbol: t.symbol,
        signal: t.signal,
        strength: t.signal_strength,
        regime: t.regime,
        price: t.price,
        role: t.role,
      })),
      relatedPairs,
      history,
      meta: {
        generated: new Date().toISOString(),
        lastUpdated: mreSignals.last_updated,
        historyDays,
        historyPoints: history.length,
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error in signal-flow/${params.symbol} API:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}