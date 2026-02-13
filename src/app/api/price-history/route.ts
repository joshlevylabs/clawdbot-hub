import { NextRequest, NextResponse } from "next/server";

// In-memory cache: symbol+period → { data, timestamp }
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const period = searchParams.get("period") || "1mo";

  if (!symbol) {
    return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
  }

  const cacheKey = `${symbol.toUpperCase()}_${period}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Dynamic import to avoid SSR issues
    const yahooFinanceModule = await import("yahoo-finance2");
    const yahooFinance = yahooFinanceModule.default;

    // Calculate date range from period
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case "1w":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "2w":
        startDate.setDate(startDate.getDate() - 14);
        break;
      case "1mo":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "3mo":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "6mo":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const result: any = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: startDate.toISOString().split("T")[0],
      period2: endDate.toISOString().split("T")[0],
      interval: "1d" as any,
    });

    const quotes = result?.quotes || [];
    const data = quotes
      .filter((q: any) => q.close != null)
      .map((q: any) => ({
        date: new Date(q.date).toISOString().split("T")[0],
        close: Math.round(q.close * 100) / 100,
        high: q.high ? Math.round(q.high * 100) / 100 : null,
        low: q.low ? Math.round(q.low * 100) / 100 : null,
      }));

    const response = { symbol: symbol.toUpperCase(), data };

    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response);
  } catch (err: any) {
    console.error(`Yahoo Finance error for ${symbol}:`, err.message);
    return NextResponse.json(
      { error: `Failed to fetch price history for ${symbol}`, detail: err.message },
      { status: 500 }
    );
  }
}
