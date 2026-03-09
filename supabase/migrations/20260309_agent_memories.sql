-- Agent Memories: Unified memory layer for all hosted agents
-- Supports knowledge (books, texts), episodes (conversations), preferences, facts, reflections

-- Core memories table
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,                    -- agent identifier (e.g., 'chris-vermeulen', 'faith-christian')
  user_id TEXT DEFAULT 'system',             -- multi-tenant: 'system' for shared knowledge, user UUID for personal
  kind TEXT NOT NULL CHECK (kind IN ('knowledge', 'episode', 'preference', 'fact', 'reflection', 'skill')),
  content TEXT NOT NULL,                     -- the actual memory content
  summary TEXT,                              -- compressed version for context injection
  source TEXT,                               -- origin: 'book:principles', 'youtube:abc123', 'conversation:session-xyz', 'standup:STD-30'
  source_metadata JSONB DEFAULT '{}',        -- flexible: chapter, page, timestamp, url, etc.
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  embedding VECTOR(1536),                    -- text-embedding-3-small
  tags TEXT[] DEFAULT '{}',                  -- searchable tags
  recalled_count INT DEFAULT 0,             -- tracks retrieval frequency
  last_recalled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                    -- optional TTL
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_agent_memories_agent ON agent_memories(agent_id);
CREATE INDEX idx_agent_memories_agent_user ON agent_memories(agent_id, user_id);
CREATE INDEX idx_agent_memories_kind ON agent_memories(kind);
CREATE INDEX idx_agent_memories_importance ON agent_memories(importance DESC);
CREATE INDEX idx_agent_memories_tags ON agent_memories USING gin(tags);
CREATE INDEX idx_agent_memories_source ON agent_memories(source);
CREATE INDEX idx_agent_memories_created ON agent_memories(created_at DESC);

-- Vector similarity search index
CREATE INDEX idx_agent_memories_embedding ON agent_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full text search
ALTER TABLE agent_memories ADD COLUMN fts tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, '') || ' ' || coalesce(summary, ''))) STORED;
CREATE INDEX idx_agent_memories_fts ON agent_memories USING gin(fts);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_agent_memories_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_memories_updated
  BEFORE UPDATE ON agent_memories
  FOR EACH ROW EXECUTE FUNCTION update_agent_memories_timestamp();

-- Memory stats view
CREATE OR REPLACE VIEW agent_memory_stats AS
SELECT 
  agent_id,
  kind,
  COUNT(*) as memory_count,
  AVG(importance) as avg_importance,
  SUM(recalled_count) as total_recalls,
  MIN(created_at) as oldest_memory,
  MAX(created_at) as newest_memory,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as embedded_count
FROM agent_memories
GROUP BY agent_id, kind;

-- RPC function for semantic search with importance + recency weighting
CREATE OR REPLACE FUNCTION search_agent_memories(
  p_agent_id TEXT,
  p_embedding VECTOR(1536),
  p_user_id TEXT DEFAULT 'system',
  p_kinds TEXT[] DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_min_importance FLOAT DEFAULT 0.0
)
RETURNS TABLE (
  id UUID,
  agent_id TEXT,
  kind TEXT,
  content TEXT,
  summary TEXT,
  source TEXT,
  importance FLOAT,
  tags TEXT[],
  similarity FLOAT,
  score FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.agent_id,
    m.kind,
    m.content,
    m.summary,
    m.source,
    m.importance::FLOAT,
    m.tags,
    (1 - (m.embedding <=> p_embedding))::FLOAT as similarity,
    -- Weighted score: 60% similarity + 25% importance + 15% recency
    (
      0.6 * (1 - (m.embedding <=> p_embedding)) +
      0.25 * m.importance +
      0.15 * GREATEST(0, 1 - EXTRACT(EPOCH FROM (now() - m.created_at)) / (86400 * 90))
    )::FLOAT as score
  FROM agent_memories m
  WHERE m.agent_id = p_agent_id
    AND (m.user_id = p_user_id OR m.user_id = 'system')
    AND m.embedding IS NOT NULL
    AND m.importance >= p_min_importance
    AND (p_kinds IS NULL OR m.kind = ANY(p_kinds))
    AND (m.expires_at IS NULL OR m.expires_at > now())
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- RPC to increment recall count
CREATE OR REPLACE FUNCTION recall_memory(p_memory_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_memories 
  SET recalled_count = recalled_count + 1,
      last_recalled_at = now(),
      -- Boost importance slightly on recall (max 1.0)
      importance = LEAST(1.0, importance + 0.02)
  WHERE id = p_memory_id;
END;
$$ LANGUAGE plpgsql;

-- Disable RLS for service role access
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON agent_memories
  FOR ALL USING (true) WITH CHECK (true);
