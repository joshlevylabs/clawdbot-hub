/**
 * Scripture RAG (Retrieval-Augmented Generation) for Faith Guides
 * 
 * Searches 54,762 embedded scripture passages across 13 traditions
 * using OpenAI text-embedding-3-small (1536-dim) + Supabase pgvector.
 */

import { faithSupabase, isFaithSupabaseConfigured } from "./faith-supabase";

interface ScripturePassage {
  id: string;
  passage_reference: string;
  content: string;
  book_name: string;
  tradition: string;
  similarity: number;
}

// Map guide traditions to sacred_texts tradition keys
const TRADITION_MAP: Record<string, string> = {
  // Judaism
  "orthodox judaism": "judaism",
  "conservative judaism": "judaism",
  "reform judaism": "judaism",
  "reconstructionist judaism": "judaism",
  "messianic judaism": "judaism",
  // Christianity
  "catholicism": "christianity",
  "eastern orthodox": "christianity",
  "evangelical protestantism": "christianity",
  // Islam
  "sunni islam": "islam",
  "shia islam": "islam",
  "sufism": "islam",
  // Eastern
  "theravada buddhism": "buddhism",
  "mahayana buddhism": "buddhism",
  "zen buddhism": "buddhism",
  "tibetan buddhism": "buddhism",
  "hinduism": "hinduism",
  "advaita vedanta": "hinduism",
  "vaishnavism": "hinduism",
  "shaivism": "hinduism",
  "sikhism": "sikhism",
  "jainism": "jainism",
  "zoroastrianism": "zoroastrianism",
  "bahá'í": "bahai",
  "taoism": "taoism",
  "confucianism": "confucianism",
  "shinto": "shinto",
};

/**
 * Generate an embedding vector for a text query using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error("OPENAI_API_KEY not configured for embedding generation");
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI embedding error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (err) {
    console.error("Failed to generate embedding:", err);
    return null;
  }
}

/**
 * Search scripture passages relevant to a user's message.
 * Returns passages from the guide's tradition (+ optionally cross-tradition).
 */
export async function searchScriptures(
  message: string,
  tradition?: string,
  options?: {
    matchCount?: number;
    matchThreshold?: number;
    includeCrossTradition?: boolean;
  }
): Promise<ScripturePassage[]> {
  if (!isFaithSupabaseConfigured()) {
    console.warn("Faith Supabase not configured, skipping scripture search");
    return [];
  }

  const matchCount = options?.matchCount ?? 5;
  const matchThreshold = options?.matchThreshold ?? 0.65;
  const includeCross = options?.includeCrossTradition ?? false;

  // Generate embedding for the user's query
  const embedding = await generateEmbedding(message);
  if (!embedding) {
    return [];
  }

  // Map the guide's tradition to the sacred_texts tradition key
  const traditionKey = tradition
    ? TRADITION_MAP[tradition.toLowerCase()] || tradition.toLowerCase()
    : null;

  try {
    // Search within the guide's tradition
    const { data: passages, error } = await faithSupabase.rpc("search_passages", {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_tradition: traditionKey,
    });

    if (error) {
      console.error("Scripture search error:", error);
      return [];
    }

    let results: ScripturePassage[] = passages || [];

    // Optionally add cross-tradition results (fewer, higher threshold)
    if (includeCross && results.length < matchCount) {
      const remaining = matchCount - results.length;
      const { data: crossPassages, error: crossError } = await faithSupabase.rpc("search_passages", {
        query_embedding: embedding,
        match_threshold: 0.75, // Higher threshold for cross-tradition
        match_count: remaining,
        filter_tradition: null, // No tradition filter
      });

      if (!crossError && crossPassages) {
        // Deduplicate
        const existingIds = new Set(results.map((r) => r.id));
        const newPassages = crossPassages.filter((p: ScripturePassage) => !existingIds.has(p.id));
        results = [...results, ...newPassages];
      }
    }

    return results;
  } catch (err) {
    console.error("Scripture search failed:", err);
    return [];
  }
}

/**
 * Format scripture passages into a context block for the AI system prompt.
 */
export function formatScriptureContext(passages: ScripturePassage[]): string {
  if (!passages || passages.length === 0) return "";

  const lines = passages.map(
    (p) => `📖 ${p.passage_reference} (${p.book_name}): "${p.content.substring(0, 300)}${p.content.length > 300 ? "..." : ""}"`
  );

  return `\n\n## Relevant Scripture Passages\nThe following passages from sacred texts are relevant to the user's question. Reference them naturally in your response when appropriate — don't force citations, but weave them in where they add depth:\n\n${lines.join("\n\n")}`;
}
