import { NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';

export async function GET() {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ texts: [] });
  }
  
  const { data, error } = await faithSupabase
    .from('sacred_texts')
    .select('id, tradition, tradition_group, title, original_title, slug, translation, chapter_count, verse_count, passage_count, embedding_count, ingestion_status, description')
    .order('tradition')
    .order('tradition_group')
    .order('title');
  
  if (error) {
    console.error('Error fetching sacred texts:', error);
    return NextResponse.json({ texts: [] });
  }
  
  return NextResponse.json({ texts: data || [] });
}