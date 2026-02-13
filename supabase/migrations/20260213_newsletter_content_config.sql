-- Newsletter Auto-Content System Migration
-- Run against the Paper Trading Supabase instance
-- Date: 2026-02-13

-- 1. Content source configuration per newsletter
CREATE TABLE IF NOT EXISTS newsletter_content_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  newsletter_id UUID REFERENCES newsletters(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  label TEXT NOT NULL,
  params JSONB DEFAULT '{}',
  display_order INT DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add content_data and generation_status to newsletter_issues
ALTER TABLE newsletter_issues ADD COLUMN IF NOT EXISTS content_data JSONB DEFAULT NULL;
ALTER TABLE newsletter_issues ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT NULL;

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_content_config_newsletter ON newsletter_content_config(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_content_config_order ON newsletter_content_config(newsletter_id, display_order);
