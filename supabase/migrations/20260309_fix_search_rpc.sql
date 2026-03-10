-- Fix search_agent_memories RPC: make agent_id optional, fix column count
CREATE OR REPLACE FUNCTION search_agent_memories(
  p_agent_id TEXT DEFAULT NULL,
  p_embedding VECTOR(1536) DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
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
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.id,
    am.agent_id,
    am.kind,
    am.content,
    am.summary,
    am.source,
    am.importance::FLOAT,
    am.tags,
    (1 - (am.embedding <=> p_embedding))::FLOAT as similarity,
    am.created_at
  FROM agent_memories am
  WHERE 
    (p_agent_id IS NULL OR am.agent_id = p_agent_id)
    AND (p_user_id IS NULL OR am.user_id = p_user_id)
    AND (p_kinds IS NULL OR am.kind = ANY(p_kinds))
    AND am.importance >= p_min_importance
    AND am.embedding IS NOT NULL
  ORDER BY am.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
