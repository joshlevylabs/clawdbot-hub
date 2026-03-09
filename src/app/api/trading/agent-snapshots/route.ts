import { NextRequest, NextResponse } from 'next/server';
import { paperSupabase } from '@/lib/paper-supabase';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const agentAccountIds = [
      'chris-vermeulen',
      'warren-buffett', 
      'peter-schiff',
      'raoul-pal',
      'peter-lynch',
      'ray-dalio'
    ];

    // Fetch snapshots — filter to last 30 days to stay under Supabase row limits
    // Supabase REST API returns max 1000 rows by default regardless of limit()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: snapshots, error } = await paperSupabase
      .from('paper_portfolio_snapshots')
      .select('account_id, date, equity, spy_price, spy_baseline')
      .in('account_id', agentAccountIds)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: true })
      .range(0, 4999);

    if (error) {
      console.error('Error fetching agent snapshots:', error);
      return NextResponse.json({ error: 'Failed to fetch agent snapshots', details: error.message }, { status: 500 });
    }

    // Group snapshots by agent — return raw equity
    const agentSnapshots: Record<string, Array<{ date: string; return: number; equity: number }>> = {};

    for (const accountId of agentAccountIds) {
      const agentData = (snapshots || []).filter((s: any) => s.account_id === accountId);
      
      if (agentData.length === 0) {
        agentSnapshots[accountId] = [];
        continue;
      }

      const startingEquity = agentData[0]?.equity || 100000;
      
      agentSnapshots[accountId] = agentData.map((snapshot: any) => {
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
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('Agent snapshots API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
