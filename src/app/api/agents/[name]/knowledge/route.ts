import { NextRequest, NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Map agent IDs to their core texts (same mapping as faith-journey page)
const AGENT_CORE_TEXTS: Record<string, string[]> = {
  'rabbi-moshe': ["Torah (Pentateuch)", "Tanakh", "Talmud Bavli", "Talmud Yerushalmi", "Mishnah", "Shulchan Aruch"],
  'rabbi-sarah': ["Torah (Pentateuch)", "Tanakh", "Talmud Bavli", "Mishnah", "Midrash", "Modern Responsa"],
  'rabbi-david': ["Torah (Pentateuch)", "Tanakh", "Mishnah", "Modern Jewish Ethics", "Social Justice Teachings"],
  'rabbi-yeshua': ["Torah (Pentateuch)", "Tanakh", "New Testament", "Messianic Writings", "Hebrew Roots Texts"],
  'rabbi-leah': ["Torah (Pentateuch)", "Tanakh", "Talmud Bavli", "Mishnah", "Modern Israeli Writings"],
  'father-thomas': ["Old Testament", "New Testament", "Catechism", "Church Fathers", "Papal Encyclicals"],
  'pastor-james': ["Old Testament", "New Testament", "Reformation Texts", "Evangelical Writings"],
  'father-alexei': ["Old Testament", "New Testament", "Philokalia", "Church Fathers", "Liturgical Texts"],
  'reverend-grace': ["Old Testament", "New Testament", "Book of Common Prayer", "Liberation Theology"],
  'sheikh-ahmad': ["Quran", "Sahih Bukhari", "Sahih Muslim", "Tafsir", "Fiqh Texts"],
  'ayatollah-hassan': ["Quran", "Hadith", "Nahj al-Balagha", "Shi'a Fiqh", "Imamate Texts"],
  'sufi-master-rumi': ["Quran", "Hadith", "Masnavi", "Sufi Poetry", "Mystical Texts"],
  'swami-vivekananda': ["Vedas (Rigveda)", "Upanishads", "Bhagavad Gita", "Brahma Sutras", "Advaita Texts"],
  'pandit-krishna': ["Bhagavad Gita", "Ramayana", "Mahabharata", "Puranas", "Vaishnava Texts"],
  'guru-shiva': ["Vedas", "Upanishads", "Shiva Puranas", "Tantric Texts", "Yoga Sutras"],
  'thich-minh': ["Pali Canon (Tipitaka)", "Vinaya Pitaka", "Sutta Pitaka", "Abhidhamma Pitaka"],
  'roshi-kenji': ["Heart Sutra", "Diamond Sutra", "Lotus Sutra", "Zen Koans", "Platform Sutra"],
  'lama-tenzin': ["Lotus Sutra", "Tibetan Book of the Dead", "Tantric Texts", "Lamrim", "Madhyamaka Texts"],
  'elder-miriam': ["Kitáb-i-Aqdas", "Kitáb-i-Íqán", "Gleanings", "Some Answered Questions", "Writings of Bahá'u'lláh"],
  'professor-marcus': ["Humanist Manifestos", "Philosophical Works", "Ethical Texts", "Scientific Literature", "Secular Philosophy"],
  'mystic': ["Perennial Philosophy", "Mystical Texts", "Cross-Traditional Wisdom", "Universal Spiritual Principles"],
  'devi-lakshmi': ["Devi Mahatmya", "Lalita Sahasranama", "Soundarya Lahari", "Shakta Texts", "Goddess Traditions"],
  'bhai-harpreet': ["Guru Granth Sahib", "Dasam Granth", "Janamsakhis", "Rahitnamas", "Sikh Philosophy"],
  'acharya-pradeep': ["Tattvartha Sutra", "Uttaradhyayana Sutra", "Kalpa Sutra", "Jain Agamas", "Jain Philosophy"],
  'mobed-cyrus': ["Avesta", "Gathas", "Vendidad", "Yasna", "Zoroastrian Liturgy"],
};

// Core text matchers (simplified version of faith-journey page logic)
const coreTextMatchers: Record<string, (text: { title: string; original_title?: string; tradition?: string }) => boolean> = {
  'torah (pentateuch)': (t) => ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'].some(b => t.title.includes(b)) || t.title.includes('Torah'),
  'tanakh': (t) => t.tradition === 'Judaism' && !t.title.includes('Talmud') && !t.title.includes('Mishnah'),
  'talmud bavli': (t) => t.title.includes('Talmud') || t.title.includes('Bavli'),
  'talmud yerushalmi': (t) => t.title.includes('Yerushalmi') || t.title.includes('Jerusalem Talmud'),
  'mishnah': (t) => t.title.includes('Mishnah') || t.title.includes('Mishna'),
  'old testament': (t) => t.tradition === 'Christianity' && !t.title.includes('New Testament'),
  'new testament': (t) => t.title.includes('New Testament') || t.title.includes('Gospel') || t.title.includes('Epistle') || t.title.includes('Acts') || t.title.includes('Revelation'),
  'catechism': (t) => t.title.includes('Catechism'),
  'quran': (t) => t.title.includes('Quran') || t.title.includes("Qur'an") || t.title.includes('Surah'),
  'sahih bukhari': (t) => t.title.includes('Bukhari'),
  'sahih muslim': (t) => t.title.includes('Muslim') && t.tradition === 'Islam',
  'hadith': (t) => t.title.includes('Hadith') || t.title.includes('Bukhari') || t.title.includes('Muslim'),
  'bhagavad gita': (t) => t.title.includes('Bhagavad Gita') || t.title.includes('Gita'),
  'vedas': (t) => t.title.includes('Veda') || t.title.includes('Rig'),
  'vedas (rigveda)': (t) => t.title.includes('Veda') || t.title.includes('Rig'),
  'upanishads': (t) => t.title.includes('Upanishad'),
  'pali canon (tipitaka)': (t) => t.title.includes('Tipitaka') || t.title.includes('Pali'),
  'lotus sutra': (t) => t.title.includes('Lotus Sutra'),
  'heart sutra': (t) => t.title.includes('Heart Sutra'),
  'diamond sutra': (t) => t.title.includes('Diamond Sutra'),
  'guru granth sahib': (t) => t.title.includes('Guru Granth') || t.title.includes('Granth Sahib'),
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: agentId } = await params;

    // Get agent config
    const { data: agent } = await supabase
      .from('agent_configs')
      .select('id, name, department, knowledge_sources')
      .eq('id', agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const result: any = {
      agentId: agent.id,
      agentName: agent.name,
      department: agent.department,
      // Local knowledge sources (files from agent directory)
      localKnowledge: agent.knowledge_sources || [],
      // Sacred text embeddings (for faith guides)
      sacredTexts: [],
      embeddingStats: null,
    };

    // For faith guides, fetch sacred text coverage from faith DB
    const coreTexts = AGENT_CORE_TEXTS[agentId];
    if (coreTexts && isFaithSupabaseConfigured()) {
      const { data: allTexts } = await faithSupabase
        .from('sacred_texts')
        .select('id, tradition, tradition_group, title, original_title, slug, passage_count, embedding_count, ingestion_status')
        .order('tradition')
        .order('title');

      if (allTexts) {
        // Match texts to this guide's core texts
        const matchedTexts = allTexts.filter(text =>
          coreTexts.some(coreText => {
            const matcher = coreTextMatchers[coreText.toLowerCase()];
            if (matcher) return matcher(text);
            return text.title.toLowerCase().includes(coreText.toLowerCase()) ||
              (text.original_title && text.original_title.toLowerCase().includes(coreText.toLowerCase()));
          })
        );

        const totalPassages = matchedTexts.reduce((sum, t) => sum + (t.passage_count || 0), 0);
        const totalEmbeddings = matchedTexts.reduce((sum, t) => sum + (t.embedding_count || 0), 0);
        const coverage = totalPassages > 0 ? Math.round((totalEmbeddings / totalPassages) * 100) : 0;

        result.sacredTexts = matchedTexts;
        result.coreTexts = coreTexts;
        result.embeddingStats = {
          totalTexts: matchedTexts.length,
          totalPassages,
          totalEmbeddings,
          coverage,
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching agent knowledge:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
