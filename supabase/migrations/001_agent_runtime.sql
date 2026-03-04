-- Phase 1: Hosted Agent Runtime API - Database Schema
-- Migration: 001_agent_runtime.sql

-- Step 1: Add columns to existing agent_configs table
ALTER TABLE agent_configs 
ADD COLUMN IF NOT EXISTS soul_prompt text,
ADD COLUMN IF NOT EXISTS temperature float DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS max_tokens int DEFAULT 2000,
ADD COLUMN IF NOT EXISTS knowledge_sources jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS integrations jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS endpoint_enabled boolean DEFAULT false;

-- Step 2: Create agent_conversations table
CREATE TABLE IF NOT EXISTS agent_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id text NOT NULL REFERENCES agent_configs(id),
    user_id text NOT NULL,
    title text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Step 3: Create agent_messages table
CREATE TABLE IF NOT EXISTS agent_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Step 4: Create agent_memories table
CREATE TABLE IF NOT EXISTS agent_memories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id text NOT NULL REFERENCES agent_configs(id),
    user_id text NOT NULL,
    content text NOT NULL,
    memory_type text DEFAULT 'observation' CHECK (memory_type IN ('observation', 'preference', 'learning_progress', 'relationship')),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_user ON agent_conversations(agent_id, user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_updated_at ON agent_conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memories_agent_user ON agent_memories(agent_id, user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_created_at ON agent_memories(created_at DESC);

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies (permissive for now - we'll lock down later)
-- Allow anonymous read/write access for development
CREATE POLICY IF NOT EXISTS "Allow anon access to conversations" 
    ON agent_conversations FOR ALL 
    TO anon 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anon access to messages" 
    ON agent_messages FOR ALL 
    TO anon 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anon access to memories" 
    ON agent_memories FOR ALL 
    TO anon 
    USING (true) 
    WITH CHECK (true);

-- Step 8: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 9: Create trigger for agent_conversations updated_at
DROP TRIGGER IF EXISTS update_agent_conversations_updated_at ON agent_conversations;
CREATE TRIGGER update_agent_conversations_updated_at
    BEFORE UPDATE ON agent_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migration complete
-- Note: Run this SQL via Supabase Dashboard > SQL Editor or via service role key