import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client only if we have the required env vars
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as unknown as SupabaseClient;

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);

// Types matching our schema
export interface DbTask {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface DbSkill {
  id: string;
  name: string;
  description: string | null;
  trigger: string | null;
  enabled: boolean;
  usage_count: number;
  last_used: string | null;
  created_at: string;
}

export interface DbConnection {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync: string | null;
  created_at: string;
}

export interface DbUsage {
  id: string;
  date: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  model: string | null;
  created_at: string;
}

export interface DbCompassInteraction {
  id: string;
  timestamp: string;
  date: string;
  type: 'positive' | 'negative' | 'daily_checkin';
  description: string | null;
  power: number;
  safety: number;
  answers: Record<string, unknown> | null;
  created_at: string;
}
