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
      'peter-lynch'
    ];

    // Fetch snapshots — add explicit limit to avoid default truncation
    const { data: snapshots, error, count } = await paperSupabase
      .from('paper_portfolio_snapshots')
      .select('account_id, date, equity, spy_price, spy_baseline', { count: 'exact' })
      .in('account_id', agentAccountIds)
      .order('date', { ascending: true })
      .limit(5000);

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

    // Debug: show raw first Buffett snapshot
    const buffettRaw = (snapshots || []).filter((s: any) => s.account_id === 'warren-buffett');

    return NextResponse.json({ 
      agentSnapshots,
      timestamp: new Date().toISOString(),
      debug: {
        supabaseUrl: process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL?.slice(0, 40),
        keyType: process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY ? 'service' : 'anon',
        totalCount: count,
        totalReturned: snapshots?.length || 0,
        buffettCount: buffettRaw.length,
        buffettFirstDate: buffettRaw[0]?.date,
        buffettFirstEquity: buffettRaw[0]?.equity,
        buffettLastDate: buffettRaw[buffettRaw.length - 1]?.date,
        buffettLastEquity: buffettRaw[buffettRaw.length - 1]?.equity,
      }
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
