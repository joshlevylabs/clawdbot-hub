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

    // Fetch snapshots per agent to avoid Supabase 1000-row default limit
    // When using .in() across 6 agents, the 1000-row cap means later dates get truncated
    const agentSnapshots: Record<string, Array<{ date: string; return: number; equity: number }>> = {};

    const results = await Promise.all(
      agentAccountIds.map(accountId =>
        paperSupabase
          .from('paper_portfolio_snapshots')
          .select('account_id, date, equity')
          .eq('account_id', accountId)
          .order('date', { ascending: true })
          .limit(1000)
      )
    );

    let fetchError: string | null = null;
    for (let i = 0; i < agentAccountIds.length; i++) {
      const accountId = agentAccountIds[i];
      const { data, error: err } = results[i];
      
      if (err) {
        console.error(`Error fetching ${accountId}:`, err);
        fetchError = err.message;
        agentSnapshots[accountId] = [];
        continue;
      }

      const agentData = data || [];
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

    const error = fetchError;

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
