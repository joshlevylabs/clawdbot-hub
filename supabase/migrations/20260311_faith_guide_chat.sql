-- Faith Guide Chat System Migration
-- Phase 1: Backend infrastructure for AI guide conversations

-- Guide personas (one per tradition)
CREATE TABLE faith_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tradition_slug TEXT NOT NULL, -- references faith_traditions.slug concept
  name TEXT NOT NULL, -- e.g., "Rabbi David"
  display_name TEXT NOT NULL,
  avatar_emoji TEXT, -- e.g., "🕎"
  system_prompt TEXT NOT NULL, -- the guide's persona/personality prompt
  personality_traits JSONB, -- warm, scholarly, pastoral, etc.
  tradition_knowledge TEXT, -- key beliefs, practices, texts this guide knows
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations (one per user+guide combo, can have multiple)
CREATE TABLE faith_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES faith_guides(id) ON DELETE CASCADE,
  title TEXT, -- auto-generated or user-set
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages within conversations
CREATE TABLE faith_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES faith_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reflections (moving from AsyncStorage to DB)
CREATE TABLE faith_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, reflection_date)
);

-- Engagement log (auto-tracked)
CREATE TABLE faith_engagement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('lesson_complete', 'prayer_listen', 'text_read', 'reflection_write', 'guide_chat', 'perspective_swipe')),
  event_data JSONB, -- lesson_id, tradition, duration, resonated, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies: users can only read/write their own data, guides readable by all authenticated

-- faith_guides: readable by all authenticated users
ALTER TABLE faith_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guides are viewable by all authenticated users" 
  ON faith_guides FOR SELECT 
  TO authenticated 
  USING (true);

-- faith_conversations: users can only see their own conversations
ALTER TABLE faith_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own conversations" 
  ON faith_conversations FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own conversations" 
  ON faith_conversations FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" 
  ON faith_conversations FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- faith_messages: users can only see messages from their own conversations
ALTER TABLE faith_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages from their own conversations" 
  ON faith_messages FOR SELECT 
  TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM faith_conversations fc 
    WHERE fc.id = faith_messages.conversation_id 
    AND fc.user_id = auth.uid()
  ));
CREATE POLICY "Users can create messages in their own conversations" 
  ON faith_messages FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (
    SELECT 1 FROM faith_conversations fc 
    WHERE fc.id = faith_messages.conversation_id 
    AND fc.user_id = auth.uid()
  ));

-- faith_reflections: users can only see their own reflections
ALTER TABLE faith_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reflections" 
  ON faith_reflections FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own reflections" 
  ON faith_reflections FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reflections" 
  ON faith_reflections FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- faith_engagement_log: users can only see their own engagement data
ALTER TABLE faith_engagement_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own engagement logs" 
  ON faith_engagement_log FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own engagement logs" 
  ON faith_engagement_log FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_faith_messages_conversation_created 
  ON faith_messages(conversation_id, created_at);

CREATE INDEX idx_faith_conversations_user_id 
  ON faith_conversations(user_id);

CREATE INDEX idx_faith_reflections_user_date 
  ON faith_reflections(user_id, reflection_date);

CREATE INDEX idx_faith_engagement_log_user_created 
  ON faith_engagement_log(user_id, created_at);

-- Additional indexes for common queries
CREATE INDEX idx_faith_conversations_guide_id 
  ON faith_conversations(guide_id);

CREATE INDEX idx_faith_guides_tradition_slug 
  ON faith_guides(tradition_slug);