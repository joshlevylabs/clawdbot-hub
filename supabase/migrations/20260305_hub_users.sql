-- Hub user accounts for authentication
CREATE TABLE IF NOT EXISTS hub_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT, -- NULL = use env var fallback
  scope TEXT NOT NULL DEFAULT 'tv', -- 'admin' or 'tv'
  reset_token TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the two users (passwords managed via env vars initially, updated via forgot password)
INSERT INTO hub_users (id, email, name, scope) VALUES
  ('joshua', 'josh@joshlevylabs.com', 'Joshua', 'admin'),
  ('aaron', 'aarongentry29@gmail.com', 'Aaron', 'tv')
ON CONFLICT (id) DO NOTHING;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_hub_users_email ON hub_users(email);
CREATE INDEX IF NOT EXISTS idx_hub_users_reset_token ON hub_users(reset_token) WHERE reset_token IS NOT NULL;
