-- ============================================================
-- faith_holidays: Canonical holiday dates computed programmatically
-- Single source of truth for both Hub dashboard and mobile app
-- Dates computed from Hebrew, Hijri, Gregorian calendars etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS faith_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                        -- e.g. "Purim", "Easter", "Eid al-Fitr"
  tradition TEXT NOT NULL,                   -- e.g. "Judaism", "Christianity", "Islam"
  start_date DATE NOT NULL,                  -- Gregorian start date
  end_date DATE,                             -- Gregorian end date (null if single-day)
  year INTEGER NOT NULL,                     -- Calendar year for easy querying
  description TEXT,                          -- Short description
  emoji TEXT,                                -- Display emoji
  calendar_system TEXT,                      -- "hebrew", "hijri", "gregorian", "lunar"
  native_date TEXT,                          -- Date in native calendar, e.g. "14 Adar 5786"
  source TEXT DEFAULT 'computed',            -- "hebcal", "hijri-converter", "computus", "manual"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(name, year)
);

-- Index for querying by date range
CREATE INDEX IF NOT EXISTS idx_faith_holidays_dates ON faith_holidays(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_faith_holidays_year ON faith_holidays(year);
CREATE INDEX IF NOT EXISTS idx_faith_holidays_tradition ON faith_holidays(tradition);

-- RLS: anyone authenticated can read, service role can write
ALTER TABLE faith_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read holidays"
  ON faith_holidays FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage holidays"
  ON faith_holidays FOR ALL
  USING (auth.role() = 'service_role');
