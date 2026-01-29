-- Compass Interactions table for Marriage Compass feature
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS compass_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('positive', 'negative', 'daily_checkin')),
  description TEXT,
  power NUMERIC(3,1) NOT NULL,
  safety NUMERIC(3,1) NOT NULL,
  answers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_compass_interactions_date ON compass_interactions(date DESC);

-- Enable Row Level Security (optional, for multi-user)
-- ALTER TABLE compass_interactions ENABLE ROW LEVEL SECURITY;

-- Grant access to anon role (for public API access)
GRANT SELECT, INSERT ON compass_interactions TO anon;
GRANT USAGE ON SCHEMA public TO anon;
