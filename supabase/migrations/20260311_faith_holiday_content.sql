-- Faith Holiday Content Cache
-- Stores AI-generated holiday detail content (history, tradition view, cross-tradition perspectives)
-- Generated on-demand when user taps a holiday, then cached for future requests

-- Holiday content (one row per holiday + tradition combo)
CREATE TABLE IF NOT EXISTS faith_holiday_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_name TEXT NOT NULL,           -- e.g. "Purim", "Passover (Pesach)"
  holiday_emoji TEXT,                   -- e.g. "🎭"
  tradition_slug TEXT NOT NULL,         -- e.g. "orthodox-judaism"
  tradition_id UUID REFERENCES faith_traditions(id),
  
  -- Content sections
  history TEXT,                         -- Historical origins of the holiday
  observance TEXT,                      -- How THIS tradition celebrates/observes it
  
  -- Metadata
  year INTEGER NOT NULL DEFAULT 2026,   -- Year-specific content (dates change)
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  model TEXT DEFAULT 'claude-sonnet',   -- Which model generated it
  
  -- Unique per holiday + tradition + year
  UNIQUE(holiday_name, tradition_slug, year)
);

-- Cross-tradition perspectives for a holiday
-- Only created for traditions that actually observe/acknowledge the holiday
CREATE TABLE IF NOT EXISTS faith_holiday_perspectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_name TEXT NOT NULL,           -- e.g. "Passover (Pesach)"
  source_tradition_slug TEXT NOT NULL,  -- The user's primary tradition
  comparing_tradition_slug TEXT NOT NULL, -- The exploring tradition being compared
  comparing_tradition_id UUID REFERENCES faith_traditions(id),
  
  -- How the comparing tradition views/relates to this holiday
  perspective_text TEXT NOT NULL,       -- How this tradition differs in observance/view
  connection_type TEXT,                 -- 'shared_origin', 'parallel_observance', 'cultural_connection', 'theological_link'
  
  year INTEGER NOT NULL DEFAULT 2026,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(holiday_name, source_tradition_slug, comparing_tradition_slug, year)
);

-- RLS policies
ALTER TABLE faith_holiday_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE faith_holiday_perspectives ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read holiday content"
  ON faith_holiday_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read holiday perspectives"
  ON faith_holiday_perspectives FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert/update (API generates content)
CREATE POLICY "Service role can manage holiday content"
  ON faith_holiday_content FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage holiday perspectives"
  ON faith_holiday_perspectives FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_holiday_content_lookup ON faith_holiday_content(holiday_name, year);
CREATE INDEX IF NOT EXISTS idx_holiday_perspectives_lookup ON faith_holiday_perspectives(holiday_name, source_tradition_slug, year);
