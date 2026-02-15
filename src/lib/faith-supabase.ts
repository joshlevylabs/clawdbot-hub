import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Faith Journey uses the same Supabase instance as paper trading (unified with Lever app)
const faithSupabaseUrl = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || '';
const faithServiceRoleKey = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY || '';
const faithAnonKey = process.env.NEXT_PUBLIC_PAPER_SUPABASE_ANON_KEY || '';

const faithSupabaseKey = faithServiceRoleKey || faithAnonKey;

export const faithSupabase: SupabaseClient = faithSupabaseUrl && faithSupabaseKey
  ? createClient(faithSupabaseUrl, faithSupabaseKey)
  : null as unknown as SupabaseClient;

export const isFaithSupabaseConfigured = () => Boolean(faithSupabaseUrl && faithSupabaseKey);

// ===== Types =====

export interface FaithDimension {
  id: string;
  slug: string;
  name: string;
  description: string;
  left_label: string;
  right_label: string;
  display_order: number;
}

export interface FaithTradition {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  color: string;
  canonical_scores: Record<string, number>;
  display_order: number;
}

export interface FaithLesson {
  id: string;
  date: string;
  topic: string;
  baseline_text: string;
  scripture_ref: string | null;
  hebrew_date: string | null;
  parsha: string | null;
  calendar_context: string | null;
  dimensions: string[];
  created_at: string;
}

export interface FaithPerspective {
  id: string;
  lesson_id: string;
  tradition_id: string;
  perspective_text: string;
  source_citations: string[] | null;
  dimension_scores: Record<string, number>;
  created_at: string;
  // Joined
  tradition?: FaithTradition;
}

export interface FaithResponse {
  id: string;
  user_id: string;
  lesson_id: string;
  selected_tradition_id: string;
  notes: string | null;
  date: string;
  created_at: string;
  // Joined
  lesson?: FaithLesson;
  tradition?: FaithTradition;
}

export interface FaithCompassState {
  id: string;
  user_id: string;
  dimension_scores: Record<string, number>;
  primary_alignment: string | null;
  secondary_alignment: string | null;
  alignment_confidence: number | null;
  total_responses: number;
  streak_days: number;
  last_response_date: string | null;
  updated_at: string;
}
