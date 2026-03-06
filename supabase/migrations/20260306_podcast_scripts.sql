-- Podcast episode scripts stored in Supabase
CREATE TABLE IF NOT EXISTS podcast_scripts (
  id TEXT PRIMARY KEY,           -- e.g. "005"
  episode_number INTEGER NOT NULL,
  title TEXT,
  script TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed EP 5 script
INSERT INTO podcast_scripts (id, episode_number, title, script) VALUES (
  '005', 5, 'Three Signal Flows, Six Agents, One Trading Desk — How the MRE Actually Makes Decisions',
  ''
) ON CONFLICT (id) DO NOTHING;
