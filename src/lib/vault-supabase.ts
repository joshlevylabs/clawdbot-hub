import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Vault needs the service role key to bypass RLS (tables have RLS enabled)
// Cast to non-null — callers check isVaultConfigured() before use
export const vaultSupabase: SupabaseClient = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null as unknown as SupabaseClient;

export const isVaultConfigured = () => Boolean(supabaseUrl && supabaseServiceKey);
