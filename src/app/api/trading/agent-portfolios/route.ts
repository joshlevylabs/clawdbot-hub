import { NextRequest, NextResponse } from 'next/server';
import { paperSupabase, isPaperSupabaseConfigured } from '@/lib/paper-supabase';
import { getSessionAny } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Agent configuration with themes
const AGENTS = [
  { id: 'chris-vermeulen', name: 'Chris Vermeulen', emoji: '📊', theme: 'amber' },
  { id: 'warren-buffett', name: 'Warren Buffett', emoji: '🏦', theme: 'emerald' },
  { id: 'peter-schiff', name: 'Peter Schiff', emoji: '🥇', theme: 'yellow' },
  { id: 'raoul-pal', name: 'Raoul Pal', emoji: '🚀', theme: 'cyan' },
  { id: 'peter-lynch', name: 'Peter Lynch', emoji: '🎯', theme: 'violet' },
  { id: 'ray-dalio', name: 'Ray Dalio', emoji: '⚖️', theme: 'orange' },
] as const;

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

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getSessionAny();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPaperSupabaseConfigured()) {
      return NextResponse.json({ error: 'Paper trading not configured' }, { status: 500 });
    }

    const portfolios: AgentPortfolio[] = [];

    // Get today's date and yesterday's date for daily P&L calculation
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    for (const agent of AGENTS) {
      // Get agent account info (cash balance)
      const { data: accountData, error: accountError } = await paperSupabase
        .from('paper_accounts')
        .select('cash_balance, starting_capital')
        .eq('account_id', agent.id)
        .single();

      const cashBalance = accountData?.cash_balance || 100000;
      const startingCapital = accountData?.starting_capital || 100000;

      // Get current positions for this agent
      const { data: positions, error: positionsError } = await paperSupabase
        .from('paper_positions')
        .select('qty, current_price, entry_price')
        .eq('account_id', agent.id);

      const positionCount = positions?.length || 0;
      const positionsValue = positions?.reduce((total, pos) => {
        const currentPrice = pos.current_price || pos.entry_price;
        return total + (pos.qty * currentPrice);
      }, 0) || 0;

      const totalEquity = cashBalance + positionsValue;
      const totalPnl = totalEquity - startingCapital;
      const totalPnlPct = (totalPnl / startingCapital) * 100;

      // Get previous day's closing snapshot for daily P&L calculation
      // Look for most recent snapshot BEFORE today
      const { data: prevSnapshot } = await paperSupabase
        .from('paper_portfolio_snapshots')
        .select('equity, date')
        .eq('account_id', agent.id)
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      // Daily P&L = current equity - previous day's closing equity
      // If no previous snapshot, use starting capital (agent just started)
      const prevEquity = prevSnapshot?.equity || startingCapital;
      const dailyPnl = totalEquity - prevEquity;
      const dailyPnlPct = (dailyPnl / prevEquity) * 100;

      portfolios.push({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        theme: agent.theme,
        cashBalance,
        positionsValue,
        totalEquity,
        positionCount,
        dailyPnl: Math.round(dailyPnl * 100) / 100,
        totalPnl: Math.round(totalPnl * 100) / 100,
        dailyPnlPct: Math.round(dailyPnlPct * 100) / 100,
        totalPnlPct: Math.round(totalPnlPct * 100) / 100,
      });
    }

    return NextResponse.json({ portfolios });

  } catch (error) {
    console.error('Error fetching agent portfolios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent portfolios' },
      { status: 500 }
    );
  }
}