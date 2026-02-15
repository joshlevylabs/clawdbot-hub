-- Faith Guide Conversations table
-- Stores conversation threads between users and the AI Guide
CREATE TABLE IF NOT EXISTS faith_guide_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  lesson_id UUID NOT NULL REFERENCES faith_lessons(id),
  messages JSONB NOT NULL DEFAULT '[]',
  selected_perspectives TEXT[] NOT NULL DEFAULT '{}',
  committed_tradition_id UUID REFERENCES faith_traditions(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, committed, abandoned
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_faith_guide_conversations_user_lesson 
  ON faith_guide_conversations(user_id, lesson_id);

-- RLS policies
ALTER TABLE faith_guide_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON faith_guide_conversations
  FOR ALL USING (true) WITH CHECK (true);
