import { NextRequest, NextResponse } from 'next/server';
import { paperSupabase, isPaperSupabaseConfigured } from '@/lib/paper-supabase';
import { getSessionAny } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Valid agent IDs
const VALID_AGENTS = [
  'chris-vermeulen',
  'warren-buffett', 
  'peter-schiff',
  'raoul-pal',
  'peter-lynch',
] as const;

interface TradeRequest {
  agent_id: string;
  action: 'buy' | 'sell';
  symbol: string;
  qty: number;
  price: number;
  stop_loss?: number;
  take_profit?: number;
  rationale?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getSessionAny();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPaperSupabaseConfigured()) {
      return NextResponse.json({ error: 'Paper trading not configured' }, { status: 500 });
    }

    const body: TradeRequest = await request.json();
    const { agent_id, action, symbol, qty, price, stop_loss, take_profit, rationale } = body;

    // Validate input
    if (!agent_id || !VALID_AGENTS.includes(agent_id as any)) {
      return NextResponse.json({ error: 'Invalid agent_id' }, { status: 400 });
    }

    if (!action || !['buy', 'sell'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "buy" or "sell"' }, { status: 400 });
    }

    if (!symbol || !qty || !price || qty <= 0 || price <= 0) {
      return NextResponse.json({ error: 'Invalid symbol, qty, or price' }, { status: 400 });
    }

    if (action === 'buy') {
      // BUY: Check cash balance and create position
      const { data: accountData, error: accountError } = await paperSupabase
        .from('paper_accounts')
        .select('cash_balance')
        .eq('account_id', agent_id)
        .single();

      if (accountError) {
        return NextResponse.json({ error: 'Agent account not found' }, { status: 404 });
      }

      const cashBalance = accountData.cash_balance || 0;
      const totalCost = qty * price;

      if (cashBalance < totalCost) {
        return NextResponse.json({ 
          error: 'Insufficient funds',
          available: cashBalance,
          required: totalCost
        }, { status: 400 });
      }

      // Create position
      const { data: position, error: positionError } = await paperSupabase
        .from('paper_positions')
        .insert({
          account_id: agent_id,
          symbol: symbol.toUpperCase(),
          side: 'long',
          qty,
          entry_price: price,
          current_price: price,
          stop_loss,
          take_profit,
          opened_at: new Date().toISOString(),
          notes: rationale,
        })
        .select()
        .single();

      if (positionError) {
        console.error('Error creating position:', positionError);
        return NextResponse.json({ error: 'Failed to create position' }, { status: 500 });
      }

      // Update cash balance
      const { error: updateError } = await paperSupabase
        .from('paper_accounts')
        .update({ cash_balance: cashBalance - totalCost })
        .eq('account_id', agent_id);

      if (updateError) {
        console.error('Error updating cash balance:', updateError);
        // Note: In production, this should be a transaction to prevent inconsistent state
      }

      return NextResponse.json({
        success: true,
        trade: {
          action: 'buy',
          symbol,
          qty,
          price,
          total_cost: totalCost,
          position_id: position.id,
          remaining_cash: cashBalance - totalCost,
        }
      });

    } else if (action === 'sell') {
      // SELL: Find matching position and close it
      const { data: positions, error: positionsError } = await paperSupabase
        .from('paper_positions')
        .select('*')
        .eq('account_id', agent_id)
        .eq('symbol', symbol.toUpperCase())
        .eq('side', 'long');

      if (positionsError || !positions || positions.length === 0) {
        return NextResponse.json({ error: 'No matching position found to sell' }, { status: 400 });
      }

      // For simplicity, sell from the first matching position
      // In production, you might want FIFO/LIFO logic
      const position = positions[0];

      if (position.qty < qty) {
        return NextResponse.json({ 
          error: 'Insufficient position size',
          available: position.qty,
          requested: qty
        }, { status: 400 });
      }

      const pnl = (price - position.entry_price) * qty;
      const pnlPct = ((price - position.entry_price) / position.entry_price) * 100;
      const proceeds = qty * price;

      // Create trade record
      const { data: trade, error: tradeError } = await paperSupabase
        .from('paper_trades')
        .insert({
          account_id: agent_id,
          position_id: position.id,
          symbol: symbol.toUpperCase(),
          side: 'long',
          qty,
          entry_price: position.entry_price,
          exit_price: price,
          pnl,
          pnl_pct: pnlPct,
          opened_at: position.opened_at,
          closed_at: new Date().toISOString(),
          close_reason: rationale || 'Manual sale',
        })
        .select()
        .single();

      if (tradeError) {
        console.error('Error creating trade record:', tradeError);
        return NextResponse.json({ error: 'Failed to create trade record' }, { status: 500 });
      }

      if (position.qty === qty) {
        // Close entire position
        const { error: deleteError } = await paperSupabase
          .from('paper_positions')
          .delete()
          .eq('id', position.id);

        if (deleteError) {
          console.error('Error deleting position:', deleteError);
        }
      } else {
        // Reduce position size
        const { error: updatePosError } = await paperSupabase
          .from('paper_positions')
          .update({ qty: position.qty - qty })
          .eq('id', position.id);

        if (updatePosError) {
          console.error('Error updating position:', updatePosError);
        }
      }

      // Update cash balance
      const { data: accountData } = await paperSupabase
        .from('paper_accounts')
        .select('cash_balance')
        .eq('account_id', agent_id)
        .single();

      const currentCash = accountData?.cash_balance || 0;
      const { error: updateError } = await paperSupabase
        .from('paper_accounts')
        .update({ cash_balance: currentCash + proceeds })
        .eq('account_id', agent_id);

      if (updateError) {
        console.error('Error updating cash balance:', updateError);
      }

      return NextResponse.json({
        success: true,
        trade: {
          action: 'sell',
          symbol,
          qty,
          price,
          proceeds,
          pnl,
          pnl_pct: pnlPct,
          trade_id: trade.id,
          new_cash_balance: currentCash + proceeds,
        }
      });
    }

  } catch (error) {
    console.error('Error executing agent trade:', error);
    return NextResponse.json(
      { error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}