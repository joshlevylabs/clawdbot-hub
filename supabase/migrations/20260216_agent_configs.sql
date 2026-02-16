-- Agent configs table for org-chart persistence
-- Created: 2026-02-16
-- Purpose: Persist agent configurations in Supabase instead of filesystem
--          (Vercel serverless has no access to local ~/clawd/agents/)

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
  direct_reports TEXT[] DEFAULT '{}'::TEXT[],
  files JSONB DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS disabled — service role key used for all access
ALTER TABLE agent_configs DISABLE ROW LEVEL SECURITY;
