import { NextRequest, NextResponse } from 'next/server';
import { paperSupabase } from '@/lib/paper-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get agent portfolio snapshots from paper_portfolio_snapshots table
    // These are the 5 agents that match the advisor IDs
    const agentAccountIds = [
      'chris-vermeulen',
      'warren-buffett', 
      'peter-schiff',
      'raoul-pal',
      'peter-lynch'
    ];

    // Fetch snapshots for all agents at once
    const { data: snapshots, error } = await paperSupabase
      .from('paper_portfolio_snapshots')
      .select('account_id, date, equity, spy_price, spy_baseline')
      .in('account_id', agentAccountIds)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching agent snapshots:', error);
      return NextResponse.json({ error: 'Failed to fetch agent snapshots' }, { status: 500 });
    }

    // Group snapshots by agent — return raw equity so the chart can compute
    // returns relative to the same baseline as the portfolio (start of visible range)
    const agentSnapshots: Record<string, Array<{ date: string; return: number; equity: number }>> = {};

    for (const accountId of agentAccountIds) {
      const agentData = snapshots.filter(s => s.account_id === accountId);
      
      if (agentData.length === 0) {
        agentSnapshots[accountId] = [];
        continue;
      }

      // Return both equity and a default return (chart will recompute)
      const startingEquity = agentData[0]?.equity || 100000;
      
      agentSnapshots[accountId] = agentData.map(snapshot => {
        const returnPct = ((snapshot.equity - startingEquity) / startingEquity) * 100;
        return {
          date: snapshot.date,
          equity: snapshot.equity,
          return: Math.round(returnPct * 100) / 100
        };
      });
    }

    return NextResponse.json({ 
      agentSnapshots,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Agent snapshots API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}// RLS disabled Thu Mar  5 10:34:49 PST 2026
