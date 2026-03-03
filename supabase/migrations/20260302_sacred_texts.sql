-- Sacred Texts & RAG Pipeline for Faith Journey
-- Migration: 2026-03-02

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Enum types
DO $$ BEGIN
  CREATE TYPE text_type AS ENUM ('scripture', 'commentary', 'prayer_book', 'catechism', 'devotional', 'theological', 'liturgical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE canonical_status AS ENUM ('canonical', 'deuterocanonical', 'apocryphal', 'commentary', 'traditional');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE text_ingestion_status AS ENUM ('pending', 'ingesting', 'ingested', 'failed', 'licensed_pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sacred Texts (book-level metadata)
CREATE TABLE IF NOT EXISTS sacred_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Tradition & classification
  tradition TEXT NOT NULL,          -- 'judaism', 'christianity', 'islam', 'hinduism', 'buddhism', 'bahai', 'other'
  tradition_group TEXT,             -- 'torah', 'prophets', 'writings', 'old_testament', 'new_testament', etc.
  text_type text_type NOT NULL DEFAULT 'scripture',
  canonical_status canonical_status NOT NULL DEFAULT 'canonical',

  -- Identification
  title TEXT NOT NULL,
  original_title TEXT,              -- Original language title (e.g., "Bereshit")
  slug TEXT UNIQUE NOT NULL,        -- URL-friendly identifier
  author TEXT,
  original_language TEXT,           -- 'hebrew', 'greek', 'arabic', 'sanskrit', 'pali', etc.
  translation TEXT,                 -- 'KJV', 'ESV', 'Sahih International', etc.

  -- Content metadata
  chapter_count INTEGER,
  verse_count INTEGER,
  description TEXT,
  historical_context TEXT,
  theological_themes TEXT[],

  -- Ingestion status
  ingestion_status text_ingestion_status DEFAULT 'pending',
  ingested_at TIMESTAMPTZ,
  source_api TEXT,                  -- 'bible-api', 'sefaria', 'quran-api', 'manual', etc.
  source_url TEXT,

  -- Licensing
  is_public_domain BOOLEAN DEFAULT true,
  copyright_info JSONB,
  license_notes TEXT,

  -- Stats (updated after ingestion)
  passage_count INTEGER DEFAULT 0,
  embedding_count INTEGER DEFAULT 0
);

-- Text Passages (verse/chapter-level content with embeddings)
CREATE TABLE IF NOT EXISTS text_passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sacred_text_id UUID REFERENCES sacred_texts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Passage identification
  book_name TEXT NOT NULL,
  chapter INTEGER,
  verse_start INTEGER,
  verse_end INTEGER,
  passage_reference TEXT NOT NULL,  -- Human-readable: "Genesis 1:1", "Quran 2:255"

  -- Content
  content TEXT NOT NULL,
  content_length INTEGER,

  -- Context for RAG
  preceding_context TEXT,
  following_context TEXT,
  thematic_tags TEXT[],

  -- Embeddings for semantic search
  embedding VECTOR(1536)            -- OpenAI text-embedding-3-small dimensions
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sacred_texts_tradition ON sacred_texts(tradition);
CREATE INDEX IF NOT EXISTS idx_sacred_texts_status ON sacred_texts(ingestion_status);
CREATE INDEX IF NOT EXISTS idx_sacred_texts_slug ON sacred_texts(slug);
CREATE INDEX IF NOT EXISTS idx_text_passages_text_id ON text_passages(sacred_text_id);
CREATE INDEX IF NOT EXISTS idx_text_passages_reference ON text_passages(passage_reference);
CREATE INDEX IF NOT EXISTS idx_text_passages_book ON text_passages(book_name);

-- Vector similarity search index (IVFFlat)
-- Note: This index is created AFTER data is loaded for better index quality
-- CREATE INDEX idx_passages_embedding ON text_passages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS policies
ALTER TABLE sacred_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_passages ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated and anon users
CREATE POLICY "sacred_texts_read" ON sacred_texts FOR SELECT USING (true);
CREATE POLICY "text_passages_read" ON text_passages FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "sacred_texts_service" ON sacred_texts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "text_passages_service" ON text_passages FOR ALL USING (auth.role() = 'service_role');

-- Helper function: search passages by semantic similarity
CREATE OR REPLACE FUNCTION search_passages(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_tradition TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  passage_reference TEXT,
  content TEXT,
  book_name TEXT,
  tradition TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.id,
    tp.passage_reference,
    tp.content,
    tp.book_name,
    st.tradition,
    1 - (tp.embedding <=> query_embedding) AS similarity
  FROM text_passages tp
  JOIN sacred_texts st ON tp.sacred_text_id = st.id
  WHERE 1 - (tp.embedding <=> query_embedding) > match_threshold
    AND (filter_tradition IS NULL OR st.tradition = filter_tradition)
  ORDER BY tp.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
