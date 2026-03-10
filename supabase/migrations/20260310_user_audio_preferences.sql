-- Track user tradition selections for auto audio generation
-- Synced from mobile app onboarding via API

CREATE TABLE IF NOT EXISTS user_audio_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tradition_id UUID NOT NULL REFERENCES faith_traditions(id) ON DELETE CASCADE,
  voice_id TEXT DEFAULT 'VTn3ZhBirl7Eonh6soN9', -- Default: Josh clone
  is_primary BOOLEAN DEFAULT false, -- User's identifying tradition
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tradition_id)
);

-- Enable RLS
ALTER TABLE user_audio_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own preferences
CREATE POLICY "Users can manage own preferences" ON user_audio_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Service role can read all (for audio generation pipeline)
CREATE POLICY "Service role full access" ON user_audio_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- Index for pipeline queries
CREATE INDEX idx_user_audio_prefs_tradition ON user_audio_preferences(tradition_id);
CREATE INDEX idx_user_audio_prefs_primary ON user_audio_preferences(is_primary) WHERE is_primary = true;

-- View: unique traditions that need audio generation
CREATE OR REPLACE VIEW active_audio_traditions AS
SELECT DISTINCT 
  uap.tradition_id,
  ft.name as tradition_name,
  ft.slug as tradition_slug,
  uap.voice_id as default_voice,
  COUNT(DISTINCT uap.user_id) as user_count
FROM user_audio_preferences uap
JOIN faith_traditions ft ON ft.id = uap.tradition_id
WHERE uap.is_primary = true
GROUP BY uap.tradition_id, ft.name, ft.slug, uap.voice_id;
