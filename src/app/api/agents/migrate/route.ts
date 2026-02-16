import { NextResponse } from "next/server";

/**
 * POST /api/agents/migrate
 * 
 * Creates the agent_configs table in Supabase if it doesn't exist.
 * Uses a temporary RPC function to execute DDL.
 * 
 * This is a one-time setup endpoint. Call it once to initialize the table.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY || "";

async function supabaseRpc(functionName: string, params: Record<string, unknown> = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  return res;
}

export async function POST() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    // Step 1: Create a temporary helper function that can run DDL
    const createHelperSQL = `
      CREATE OR REPLACE FUNCTION _create_agent_configs_table()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        CREATE TABLE IF NOT EXISTS agent_configs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          title TEXT,
          emoji TEXT,
          model TEXT,
          department TEXT,
          status TEXT DEFAULT 'standby',
          description TEXT,
          reports_to TEXT,
          direct_reports TEXT[] DEFAULT '{}',
          files JSONB DEFAULT '{}',
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Ensure RLS is disabled for service role access
        ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
        
        -- Create a policy that allows service role full access
        DROP POLICY IF EXISTS "service_role_all" ON agent_configs;
        CREATE POLICY "service_role_all" ON agent_configs
          FOR ALL
          USING (true)
          WITH CHECK (true);
      END;
      $$;
    `;

    // We can't run raw SQL via PostgREST directly.
    // Instead, we'll use the Supabase SQL endpoint if available.
    // The workaround: use fetch to the /pg endpoint or management API.
    
    // Actually, let's try a different approach: just check if table exists
    // and if not, provide the SQL to run manually.
    
    // Check if table exists
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/agent_configs?select=id&limit=0`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (checkRes.ok) {
      return NextResponse.json({ 
        status: "ok", 
        message: "Table agent_configs already exists" 
      });
    }

    // Table doesn't exist — try to call the helper function (maybe it was already created)
    const rpcRes = await supabaseRpc("_create_agent_configs_table");
    
    if (rpcRes.ok) {
      return NextResponse.json({ 
        status: "created", 
        message: "Table agent_configs created successfully" 
      });
    }

    // If RPC doesn't exist either, return the SQL to run manually
    return NextResponse.json({
      status: "manual_required",
      message: "Cannot auto-create table. Run this SQL in Supabase SQL Editor:",
      sql: createHelperSQL + "\nSELECT _create_agent_configs_table();\nDROP FUNCTION _create_agent_configs_table();",
    }, { status: 503 });

  } catch (error) {
    return NextResponse.json(
      { error: "Migration failed", detail: String(error) },
      { status: 500 }
    );
  }
}
