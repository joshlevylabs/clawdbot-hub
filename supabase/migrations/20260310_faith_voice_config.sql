-- Faith voice configuration: tradition → ElevenLabs voice mappings
-- Allows Hub admin to change voice assignments without code deploys

CREATE TABLE IF NOT EXISTS faith_voice_config (
  tradition_slug TEXT PRIMARY KEY,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  tradition_family TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom voices added via Hub (beyond the hardcoded list)
CREATE TABLE IF NOT EXISTS faith_custom_voices (
  voice_id TEXT PRIMARY KEY,
  voice_name TEXT NOT NULL,
  category TEXT DEFAULT 'custom',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE faith_voice_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE faith_custom_voices ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use service role key)
CREATE POLICY "service_role_all_voice_config" ON faith_voice_config
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_custom_voices" ON faith_custom_voices
  FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "authenticated_read_voice_config" ON faith_voice_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_custom_voices" ON faith_custom_voices
  FOR SELECT TO authenticated USING (true);
