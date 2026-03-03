-- Faith Engine: Daily Lesson Pipeline
-- 24 denominations × 24 perspectives = 576 perspectives/day

-- ============================================
-- 1. Denominations table (24 rows)
-- ============================================
CREATE TABLE IF NOT EXISTS faith_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  tradition TEXT NOT NULL,           -- parent tradition (Judaism, Christianity, Islam, etc.)
  name TEXT NOT NULL,
  calendar_system TEXT NOT NULL,     -- hebrew, liturgical-western, liturgical-eastern, hijri, hindu-panchang, buddhist, secular
  expert_persona TEXT,               -- AI persona description for generation
  key_sources TEXT[],                -- canonical texts this denomination draws from
  theological_emphasis TEXT,         -- core theological focus
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. Daily lessons table (24 rows/day)
-- ============================================
CREATE TABLE IF NOT EXISTS faith_daily_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  denomination_id UUID NOT NULL REFERENCES faith_denominations(id),
  topic TEXT NOT NULL,                -- universal topic title
  subtitle TEXT,                      -- optional subtitle
  baseline_text TEXT NOT NULL,        -- the core teaching (anonymous, 400-600 words)
  scripture_ref TEXT,                 -- relevant text reference (anonymized)
  calendar_context JSONB,            -- what this denomination's calendar says for this date
  calendar_date_key TEXT,            -- normalized calendar key for year-over-year reuse (e.g., "hebrew:15-shevat", "hijri:1-ramadan")
  estimated_reading_time INT DEFAULT 3,
  generation_model TEXT,             -- which AI model generated this
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, denomination_id)      -- one lesson per denomination per day
);

CREATE INDEX idx_fdl_date ON faith_daily_lessons(date);
CREATE INDEX idx_fdl_denomination ON faith_daily_lessons(denomination_id);
CREATE INDEX idx_fdl_calendar_key ON faith_daily_lessons(calendar_date_key);

-- ============================================
-- 3. Perspectives table (up to 576 rows/day)
-- ============================================
CREATE TABLE IF NOT EXISTS faith_daily_perspectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES faith_daily_lessons(id) ON DELETE CASCADE,
  source_denomination_id UUID NOT NULL REFERENCES faith_denominations(id),
  perspective_text TEXT NOT NULL,     -- anonymous perspective (300-500 words, NO tradition-specific language)
  anonymous_label TEXT NOT NULL,      -- "Perspective A", "Perspective B", etc. (randomized per lesson)
  display_order INT NOT NULL,         -- randomized so position doesn't reveal identity
  dimension_scores JSONB,            -- compass dimension scores for this perspective
  generation_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lesson_id, source_denomination_id)  -- one perspective per denomination per lesson
);

CREATE INDEX idx_fdp_lesson ON faith_daily_perspectives(lesson_id);

-- ============================================
-- 4. Calendar events cache
-- ============================================
CREATE TABLE IF NOT EXISTS faith_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  calendar_system TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT,                    -- 'major_holiday', 'minor_holiday', 'fast', 'reading', 'observance'
  description TEXT,
  tradition TEXT,                     -- parent tradition
  metadata JSONB,                    -- calendar-specific data (parsha name, surah, panchang details, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fce_date ON faith_calendar_events(date);
CREATE INDEX idx_fce_calendar ON faith_calendar_events(calendar_system, date);

-- ============================================
-- 5. User preferences for perspective filtering
-- ============================================
ALTER TABLE fj_user_profiles 
  ADD COLUMN IF NOT EXISTS primary_denomination_id UUID REFERENCES faith_denominations(id),
  ADD COLUMN IF NOT EXISTS visible_traditions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS perspective_filter TEXT DEFAULT 'all';  -- 'all', 'selected', 'none'

-- ============================================
-- 6. Enable RLS
-- ============================================
ALTER TABLE faith_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE faith_daily_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE faith_daily_perspectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE faith_calendar_events ENABLE ROW LEVEL SECURITY;

-- Public read for all faith content
CREATE POLICY "Public read denominations" ON faith_denominations FOR SELECT USING (true);
CREATE POLICY "Public read daily lessons" ON faith_daily_lessons FOR SELECT USING (true);
CREATE POLICY "Public read daily perspectives" ON faith_daily_perspectives FOR SELECT USING (true);
CREATE POLICY "Public read calendar events" ON faith_calendar_events FOR SELECT USING (true);

-- Service role can write
CREATE POLICY "Service write denominations" ON faith_denominations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write daily lessons" ON faith_daily_lessons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write daily perspectives" ON faith_daily_perspectives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write calendar events" ON faith_calendar_events FOR ALL USING (true) WITH CHECK (true);
