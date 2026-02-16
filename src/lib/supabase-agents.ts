/**
 * Supabase-backed agent persistence
 * Uses raw fetch to Supabase REST API (no SDK dependency)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY || "";

const REST_URL = `${SUPABASE_URL}/rest/v1`;

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...extra,
  };
}

export interface AgentRow {
  id: string;
  name: string;
  title: string | null;
  emoji: string | null;
  model: string | null;
  department: string | null;
  status: string | null;
  description: string | null;
  reports_to: string | null;
  direct_reports: string[];
  files: Record<string, string>;
  updated_at: string;
}

/**
 * Check if the agent_configs table exists by trying a lightweight query
 */
async function tableExists(): Promise<boolean> {
  try {
    const res = await fetch(`${REST_URL}/agent_configs?select=id&limit=0`, {
      headers: headers(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Create the agent_configs table using a Supabase RPC function.
 * We first create a helper function, then call it, then drop it.
 * 
 * Since we can't run raw SQL via PostgREST, we use a workaround:
 * Create a temporary RPC function that creates the table.
 */
async function ensureTable(): Promise<boolean> {
  if (await tableExists()) return true;

  // We can't create tables via PostgREST alone.
  // The table must be created via Supabase dashboard, CLI, or migration.
  // For now, log the error and return false — the API will fall back to defaults.
  console.error(
    "[supabase-agents] agent_configs table does not exist. " +
    "Create it via Supabase dashboard or run the migration SQL."
  );
  return false;
}

/**
 * Fetch all agents from Supabase
 */
export async function getAllAgents(): Promise<Record<string, AgentRow> | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const exists = await ensureTable();
    if (!exists) return null;

    const res = await fetch(`${REST_URL}/agent_configs?select=*`, {
      headers: headers(),
      // Don't cache — always fresh
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[supabase-agents] GET failed:", res.status, await res.text());
      return null;
    }

    const rows: AgentRow[] = await res.json();
    const result: Record<string, AgentRow> = {};
    for (const row of rows) {
      result[row.id] = row;
    }
    return result;
  } catch (err) {
    console.error("[supabase-agents] getAllAgents error:", err);
    return null;
  }
}

/**
 * Upsert a single agent to Supabase
 */
export async function upsertAgent(agent: Partial<AgentRow> & { id: string }): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;

  try {
    const exists = await ensureTable();
    if (!exists) return false;

    const row: Record<string, unknown> = {
      id: agent.id,
      updated_at: new Date().toISOString(),
    };

    if (agent.name !== undefined) row.name = agent.name;
    if (agent.title !== undefined) row.title = agent.title;
    if (agent.emoji !== undefined) row.emoji = agent.emoji;
    if (agent.model !== undefined) row.model = agent.model;
    if (agent.department !== undefined) row.department = agent.department;
    if (agent.status !== undefined) row.status = agent.status;
    if (agent.description !== undefined) row.description = agent.description;
    if (agent.reports_to !== undefined) row.reports_to = agent.reports_to;
    if (agent.direct_reports !== undefined) row.direct_reports = agent.direct_reports;
    if (agent.files !== undefined) row.files = agent.files;

    const res = await fetch(`${REST_URL}/agent_configs`, {
      method: "POST",
      headers: headers({
        Prefer: "resolution=merge-duplicates,return=representation",
      }),
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      console.error("[supabase-agents] upsert failed:", res.status, await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[supabase-agents] upsertAgent error:", err);
    return false;
  }
}

/**
 * Upsert multiple agents at once (for seeding)
 */
export async function upsertAgents(agents: (Partial<AgentRow> & { id: string })[]): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;

  try {
    const exists = await ensureTable();
    if (!exists) return false;

    const rows = agents.map((agent) => ({
      id: agent.id,
      name: agent.name || agent.id,
      title: agent.title || null,
      emoji: agent.emoji || null,
      model: agent.model || null,
      department: agent.department || null,
      status: agent.status || "standby",
      description: agent.description || null,
      reports_to: agent.reports_to ?? null,
      direct_reports: agent.direct_reports || [],
      files: agent.files || {},
      updated_at: new Date().toISOString(),
    }));

    const res = await fetch(`${REST_URL}/agent_configs`, {
      method: "POST",
      headers: headers({
        Prefer: "resolution=merge-duplicates,return=representation",
      }),
      body: JSON.stringify(rows),
    });

    if (!res.ok) {
      console.error("[supabase-agents] bulk upsert failed:", res.status, await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[supabase-agents] upsertAgents error:", err);
    return false;
  }
}

/**
 * Get a single agent's file content from the files JSONB column
 */
export async function getAgentFile(agentId: string, filename: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const res = await fetch(
      `${REST_URL}/agent_configs?id=eq.${encodeURIComponent(agentId)}&select=files`,
      {
        headers: headers(),
        cache: "no-store",
      }
    );

    if (!res.ok) return null;

    const rows = await res.json();
    if (rows.length === 0) return null;

    const files = rows[0].files || {};
    return files[filename] ?? null;
  } catch {
    return null;
  }
}

/**
 * Update a single file in the agent's files JSONB column
 * Uses PATCH with a JSON merge to update just the one file key
 */
export async function updateAgentFile(
  agentId: string,
  filename: string,
  content: string
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;

  try {
    // First get current files
    const res = await fetch(
      `${REST_URL}/agent_configs?id=eq.${encodeURIComponent(agentId)}&select=files`,
      {
        headers: headers(),
        cache: "no-store",
      }
    );

    if (!res.ok) return false;

    const rows = await res.json();
    if (rows.length === 0) {
      // Agent doesn't exist in DB yet — create a minimal row with this file
      const insertRes = await fetch(`${REST_URL}/agent_configs`, {
        method: "POST",
        headers: headers({
          Prefer: "resolution=merge-duplicates,return=representation",
        }),
        body: JSON.stringify({
          id: agentId,
          name: agentId,
          files: { [filename]: content },
          updated_at: new Date().toISOString(),
        }),
      });
      return insertRes.ok;
    }

    const currentFiles = rows[0].files || {};
    const updatedFiles = { ...currentFiles, [filename]: content };

    const patchRes = await fetch(
      `${REST_URL}/agent_configs?id=eq.${encodeURIComponent(agentId)}`,
      {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          files: updatedFiles,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!patchRes.ok) {
      console.error("[supabase-agents] updateAgentFile failed:", patchRes.status, await patchRes.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[supabase-agents] updateAgentFile error:", err);
    return false;
  }
}
