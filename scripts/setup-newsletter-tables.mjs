#!/usr/bin/env node

/**
 * Setup newsletter tables in the Paper Trading Supabase instance.
 * Run: node scripts/setup-newsletter-tables.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local manually
const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  const key = trimmed.substring(0, eqIndex);
  let value = trimmed.substring(eqIndex + 1);
  // Strip quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const supabaseUrl = env.NEXT_PUBLIC_PAPER_SUPABASE_URL;
const supabaseKey = env.PAPER_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_PAPER_SUPABASE_URL or PAPER_SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log(`Supabase URL: ${supabaseUrl}`);

// Use the Supabase Management API or direct REST to execute SQL
// Since we can't use rpc('exec_sql'), we'll use the Supabase REST SQL endpoint
const FULL_SQL = `
-- newsletters
CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  category text,
  cadence text NOT NULL DEFAULT 'weekly'
    CHECK (cadence IN ('daily', 'weekly', 'biweekly', 'monthly')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused')),
  sender_name text NOT NULL DEFAULT 'Joshua Levy',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);

-- subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);

-- newsletter_subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  UNIQUE(newsletter_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_ns_newsletter ON newsletter_subscribers(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_ns_subscriber ON newsletter_subscribers(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_ns_status ON newsletter_subscribers(status);

-- newsletter_issues
CREATE TABLE IF NOT EXISTS newsletter_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  body_text text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sent')),
  recipient_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  sent_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issues_newsletter ON newsletter_issues(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON newsletter_issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_sent_at ON newsletter_issues(sent_at DESC);

-- newsletter_activity
CREATE TABLE IF NOT EXISTS newsletter_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid REFERENCES newsletters(id) ON DELETE SET NULL,
  type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON newsletter_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_newsletter ON newsletter_activity(newsletter_id);

-- Disable RLS
ALTER TABLE newsletters DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers DISABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers DISABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_activity DISABLE ROW LEVEL SECURITY;
`;

async function run() {
  console.log('Setting up newsletter tables via Supabase SQL API...\n');

  // Use the pg_net / SQL execution endpoint
  // Supabase exposes a /rest/v1/rpc endpoint, but for raw SQL we need the SQL API
  // The SQL API is at: POST /pg/query (Supabase Management API)
  // OR we can use the project ref to hit the SQL endpoint
  
  // Extract project ref from URL
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    console.error('Could not extract project ref from Supabase URL');
    process.exit(1);
  }
  const projectRef = match[1];
  
  // Try using the Supabase SQL API endpoint
  const sqlApiUrl = `${supabaseUrl}/rest/v1/rpc/`;
  
  // Alternative: use fetch directly against the postgres API
  // Supabase exposes pg endpoint at: https://<ref>.supabase.co/pg
  // But the easiest way is to use the supabase-js client to create tables via individual INSERT tests
  
  // Actually, the best approach: use the Supabase Management API
  // POST https://api.supabase.com/v1/projects/{ref}/database/query
  // But that requires a management API key
  
  // Simplest: just try to create tables via the REST API by testing if they exist
  // If tables don't exist, we'll output the SQL to run manually
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check if newsletters table exists by trying to select from it
  const { error: checkError } = await supabase.from('newsletters').select('id').limit(1);
  
  if (!checkError) {
    console.log('✅ newsletters table already exists');
    
    // Check other tables
    const tables = ['subscribers', 'newsletter_subscribers', 'newsletter_issues', 'newsletter_activity'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      console.log(error ? `❌ ${table} - ${error.message}` : `✅ ${table} already exists`);
    }
    
    console.log('\nAll tables appear to exist. If you need to recreate them, run the SQL manually.');
    return;
  }
  
  if (checkError.message.includes('does not exist') || checkError.code === '42P01') {
    console.log('Tables do not exist yet. Creating via SQL...\n');
    
    // Try to execute SQL via the pg endpoint
    // Supabase provides a way to execute SQL via the REST API using rpc
    // But we need a function for that. Let's try the direct approach.
    
    // Execute SQL statements one at a time via fetch to the SQL endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query: 'SELECT 1' }),
    });
    
    if (!response.ok) {
      console.log('\n⚠️  Cannot execute raw SQL via REST API (expected).');
      console.log('Please run the following SQL in the Supabase SQL Editor:');
      console.log('URL: https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
      console.log('--- Copy everything below this line ---\n');
      console.log(FULL_SQL);
      console.log('\n--- End SQL ---');
      return;
    }
  } else {
    console.log(`Unexpected error: ${checkError.message}`);
    console.log('Please run the SQL manually in the Supabase SQL Editor:');
    console.log('URL: https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
    console.log(FULL_SQL);
  }
}

run().catch(console.error);
