import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin SQL endpoint — protected by service role key
// Usage: POST /api/admin/sql { "query": "SELECT 1" }
// Auth: Bearer <SUPABASE_SERVICE_ROLE_KEY>

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceKey || !authHeader || authHeader !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query } = await req.json()
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 })
    }

    // Safety: block destructive operations
    const lower = query.toLowerCase().trim()
    if (lower.startsWith('drop database') || lower.startsWith('drop schema')) {
      return NextResponse.json({ error: 'Operation not allowed' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    // Execute SQL via PostgREST pg/query endpoint (requires service role)
    // This uses Supabase's built-in SQL execution endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/run_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ sql_query: query }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorJson: any
      try {
        errorJson = JSON.parse(errorText)
      } catch {
        errorJson = { message: errorText }
      }

      // If run_sql function doesn't exist, return setup instructions
      if (errorJson?.message?.includes('run_sql') || errorJson?.code === '42883') {
        return NextResponse.json({
          error: 'run_sql function not found in database',
          setup_required: true,
          instructions: 'Create the function in Supabase SQL Editor (https://supabase.com/dashboard/project/atldnpjaxaeqzgtqbrpy/sql/new)',
          sql: `CREATE OR REPLACE FUNCTION run_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- For SELECT queries, return results as JSON
  IF LOWER(TRIM(sql_query)) LIKE 'select%' THEN
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::jsonb);
  ELSE
    -- For DDL/DML, execute and return success
    EXECUTE sql_query;
    RETURN jsonb_build_object('success', true, 'message', 'Query executed successfully');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

-- Restrict to service_role only (no anon/authenticated access)
REVOKE ALL ON FUNCTION run_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION run_sql(TEXT) FROM anon;
REVOKE ALL ON FUNCTION run_sql(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION run_sql(TEXT) TO service_role;`,
        }, { status: 503 })
      }

      return NextResponse.json({
        error: errorJson?.message || 'Query execution failed',
        detail: errorJson,
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}

// GET endpoint — health check + setup status
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey || !authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Check if run_sql function exists
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/run_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ sql_query: 'SELECT 1 as health' }),
  })

  if (response.ok) {
    return NextResponse.json({ status: 'ready', run_sql_function: true })
  }

  return NextResponse.json({
    status: 'setup_required',
    run_sql_function: false,
    instructions: 'Create the run_sql function via Supabase SQL Editor',
  })
}
