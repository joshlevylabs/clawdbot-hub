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

    for (const agent of AGENTS) {
      // Get agent account info (cash balance)
      const { data: accountData, error: accountError } = await paperSupabase
        .from('paper_accounts')
        .select('cash_balance')
        .eq('account_id', agent.id)
        .single();

      const cashBalance = accountData?.cash_balance || 100000; // Default to starting $100k

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

      // Get latest portfolio snapshot for P&L calculations
      const { data: latestSnapshot, error: snapshotError } = await paperSupabase
        .from('paper_portfolio_snapshots')
        .select('daily_pnl, total_pnl, daily_pnl_pct, total_pnl_pct')
        .eq('account_id', agent.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      const dailyPnl = latestSnapshot?.daily_pnl || 0;
      const totalPnl = latestSnapshot?.total_pnl || (totalEquity - 100000); // Calculate from starting capital
      const dailyPnlPct = latestSnapshot?.daily_pnl_pct || 0;
      const totalPnlPct = latestSnapshot?.total_pnl_pct || ((totalEquity - 100000) / 100000 * 100);

      portfolios.push({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        theme: agent.theme,
        cashBalance,
        positionsValue,
        totalEquity,
        positionCount,
        dailyPnl,
        totalPnl,
        dailyPnlPct,
        totalPnlPct,
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