import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Newsletter tables live on the Paper Trading Supabase instance
const paperSupabaseUrl = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || '';
const paperServiceRoleKey = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY || '';
const paperAnonKey = process.env.NEXT_PUBLIC_PAPER_SUPABASE_ANON_KEY || '';

const paperSupabaseKey = paperServiceRoleKey || paperAnonKey;

export const newsletterSupabase: SupabaseClient = paperSupabaseUrl && paperSupabaseKey
  ? createClient(paperSupabaseUrl, paperSupabaseKey)
  : null as unknown as SupabaseClient;

export const isNewsletterConfigured = () => Boolean(paperSupabaseUrl && paperSupabaseKey);
