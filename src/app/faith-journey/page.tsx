"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  MessageSquare,
  GraduationCap,
  Scroll,
  RefreshCw,
  Heart,
  Calendar,
  Clock,
  User,
  MessageCircle,
  Mail,
  Database,
  AlertTriangle,
  Star,
  TrendingUp,
  Volume2,
  Play,
  Pause,
  Music,
  Mic,
  Download,
  Settings,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  BarChart3,
  Globe,
  Moon,
  X,
  Send,
  Loader,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

// ===== Types =====

interface DashboardData {
  overview: {
    totalUsers: number;
    activeGuides: number;
    totalLessons: number;
    totalPrayers: number;
  };
  users: Array<{
    id: string;
    email: string;
    guideName: string;
    tradition: string;
    onboardingDate: string;
    lastActive: string;
  }>;
  guides: {
    traditions: Array<{
      id: string;
      name: string;
      displayName: string;
      shortName: string;
      description: string;
      expert: {
        name: string;
        title: string;
        avatar: string;
      };
      color: string;
      iconEmoji: string;
    }>;
    conversations: Array<{
      id: string;
      userId: string;
      guideName: string;
      messageCount: number;
      lastMessageDate: string;
      status: string;
      createdAt: string;
    }>;
  };
  lessons: Array<{
    id: string;
    title: string;
    tradition: string;
    difficulty: string;
    completionCount: number;
    date: string;
    createdAt: string;
    content?: string;
    estimatedReadingTime?: number;
    scriptureRef?: string | null;
    parsha?: string | null;
    hebrewDate?: string | null;
    calendarContext?: string | null;
    baselineTraditionId?: string | null;
    baselineText?: string | null;
    calendarSystem?: string | null;
    calendarKey?: string | null;
    calendarDisplayName?: string | null;
  }>;
  texts: Array<{
    id: string;
    title: string;
    tradition: string;
    type: 'library' | 'daily';
    dateCreated: string;
  }>;
  conversations: Array<{
    id: string;
    userId: string;
    guideName: string;
    messageCount: number;
    lastMessageDate: string;
    status: string;
    createdAt: string;
  }>;
  timestamp: string;
}

interface HolidayEvent {
  name: string;
  date: string;
  tradition: string;
  denomination?: string;
  description: string;
  color: string;
}

interface DenominationAgent {
  name: string;
  denomination: string;
  tradition: string;
  emoji: string;
  focus: string;
  description: string;
  color: string;
  coreTexts: string[];
}

interface SacredText {
  id: string;
  tradition: string;
  tradition_group?: string;
  title: string;
  original_title?: string;
  slug: string;
  translation?: string;
  chapter_count: number;
  verse_count: number;
  passage_count: number;
  embedding_count: number;
  ingestion_status: string;
  description?: string;
}

interface TextPassage {
  id: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  passage_reference: string;
  content: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

type ActiveTab = "overview" | "guides" | "calendar" | "audio" | "texts" | "conversations";

// ===== Data =====

const denominationAgents: DenominationAgent[] = [
  // Judaism
  {
    name: "Rabbi Moshe",
    denomination: "Orthodox",
    tradition: "Judaism",
    emoji: "🕯️",
    focus: "Talmudic wisdom, strict halachic observance",
    description: "Deep expertise in traditional Jewish law and Talmudic interpretation. Guides students through rigorous study of Torah and halakha.",
    color: "#3B82F6",
    coreTexts: ["Torah (Pentateuch)", "Tanakh", "Talmud Bavli", "Talmud Yerushalmi", "Mishnah", "Shulchan Aruch"]
  },
  {
    name: "Rabbi Sarah",
    denomination: "Conservative/Masorti",
    tradition: "Judaism",
    emoji: "⭐",
    focus: "Traditional with modern adaptation",
    description: "Balances reverence for tradition with thoughtful adaptation to contemporary life. Expert in Jewish history and progressive halakha.",
    color: "#3B82F6",
    coreTexts: ["Torah (Pentateuch)", "Tanakh", "Talmud Bavli", "Mishnah", "Midrash", "Modern Responsa"]
  },
  {
    name: "Rabbi David",
    denomination: "Reform",
    tradition: "Judaism",
    emoji: "🌿",
    focus: "Progressive interpretation, social justice focus",
    description: "Emphasizes ethical teachings and social justice. Guides students through liberal Jewish thought and community engagement.",
    color: "#3B82F6",
    coreTexts: ["Torah (Pentateuch)", "Tanakh", "Mishnah", "Modern Jewish Ethics", "Social Justice Teachings"]
  },
  {
    name: "Rabbi Yeshua",
    denomination: "Messianic",
    tradition: "Judaism",
    emoji: "✡️",
    focus: "Jewish roots with Yeshua as Messiah",
    description: "Bridges Jewish tradition with Messianic faith. Expert in Hebrew scriptures and Jewish cultural observance within Christian context.",
    color: "#3B82F6",
    coreTexts: ["Torah (Pentateuch)", "Tanakh", "New Testament", "Messianic Writings", "Hebrew Roots Texts"]
  },
  
  // Christianity
  {
    name: "Father Thomas",
    denomination: "Catholic",
    tradition: "Christianity",
    emoji: "⛪",
    focus: "Sacramental theology, Church tradition",
    description: "Deep knowledge of Catholic doctrine, sacraments, and 2,000 years of Church tradition. Spiritual director and theologian.",
    color: "#8B5CF6",
    coreTexts: ["Old Testament", "New Testament", "Catechism", "Church Fathers", "Papal Encyclicals"]
  },
  {
    name: "Pastor James",
    denomination: "Protestant/Evangelical",
    tradition: "Christianity",
    emoji: "✝️",
    focus: "Sola Scriptura, personal relationship",
    description: "Passionate about Biblical authority and personal relationship with Christ. Expert in Protestant theology and evangelism.",
    color: "#8B5CF6",
    coreTexts: ["Old Testament", "New Testament", "Reformation Texts", "Evangelical Writings"]
  },
  {
    name: "Father Alexei",
    denomination: "Orthodox Christian",
    tradition: "Christianity",
    emoji: "☦️",
    focus: "Eastern mysticism, theosis, icons",
    description: "Guides through Eastern Orthodox spirituality, mystical traditions, and the journey toward theosis (deification).",
    color: "#8B5CF6",
    coreTexts: ["Old Testament", "New Testament", "Philokalia", "Church Fathers", "Liturgical Texts"]
  },
  {
    name: "Reverend Grace",
    denomination: "Mainline Protestant",
    tradition: "Christianity",
    emoji: "🕊️",
    focus: "Social gospel, inclusive theology",
    description: "Emphasizes Christ's call to social justice and inclusive community. Expert in progressive Christian thought and activism.",
    color: "#8B5CF6",
    coreTexts: ["Old Testament", "New Testament", "Book of Common Prayer", "Liberation Theology"]
  },
  
  // Islam
  {
    name: "Sheikh Ahmad",
    denomination: "Sunni",
    tradition: "Islam",
    emoji: "☪️",
    focus: "Mainstream Islamic scholarship",
    description: "Traditional Sunni scholar with expertise in Quran, Hadith, and Islamic jurisprudence. Guides through orthodox Islamic practice.",
    color: "#10B981",
    coreTexts: ["Quran", "Sahih Bukhari", "Sahih Muslim", "Tafsir", "Fiqh Texts"]
  },
  {
    name: "Ayatollah Hassan",
    denomination: "Shia",
    tradition: "Islam",
    emoji: "🌙",
    focus: "Imamate theology, Husayn's sacrifice",
    description: "Shia Islamic authority with deep knowledge of the Twelve Imams and the spiritual significance of Karbala and martyrdom.",
    color: "#10B981",
    coreTexts: ["Quran", "Hadith", "Nahj al-Balagha", "Shi'a Fiqh", "Imamate Texts"]
  },
  {
    name: "Sufi Master Rumi",
    denomination: "Sufi",
    tradition: "Islam",
    emoji: "🌀",
    focus: "Mystical Islam, divine love, poetry",
    description: "Mystical teacher emphasizing inner purification, divine love, and the spiritual journey toward union with Allah through poetry and dhikr.",
    color: "#10B981",
    coreTexts: ["Quran", "Hadith", "Masnavi", "Sufi Poetry", "Mystical Texts"]
  },
  
  // Hinduism
  {
    name: "Swami Vivekananda",
    denomination: "Vedanta",
    tradition: "Hinduism",
    emoji: "🕉️",
    focus: "Non-dualistic philosophy",
    description: "Teacher of Advaita Vedanta emphasizing the unity of all existence and the realization of the Self (Atman) as Brahman.",
    color: "#F59E0B",
    coreTexts: ["Vedas (Rigveda)", "Upanishads", "Bhagavad Gita", "Brahma Sutras", "Advaita Texts"]
  },
  {
    name: "Pandit Krishna",
    denomination: "Vaishnavism",
    tradition: "Hinduism",
    emoji: "🪷",
    focus: "Devotion to Vishnu/Krishna",
    description: "Devotional teacher emphasizing bhakti (devotion) to Lord Krishna and the path of loving surrender to the Divine.",
    color: "#F59E0B",
    coreTexts: ["Bhagavad Gita", "Ramayana", "Mahabharata", "Puranas", "Vaishnava Texts"]
  },
  {
    name: "Guru Shiva",
    denomination: "Shaivism",
    tradition: "Hinduism",
    emoji: "🔱",
    focus: "Shiva worship, yoga, tantra",
    description: "Tantric master teaching the path of Shiva through yoga, meditation, and the integration of spiritual and material existence.",
    color: "#F59E0B",
    coreTexts: ["Vedas", "Upanishads", "Shiva Puranas", "Tantric Texts", "Yoga Sutras"]
  },
  
  // Buddhism
  {
    name: "Thich Minh",
    denomination: "Theravada",
    tradition: "Buddhism",
    emoji: "🧘",
    focus: "Original teachings, mindfulness, Pali canon",
    description: "Theravada monk emphasizing the original Buddha's teachings, vipassana meditation, and the Four Noble Truths.",
    color: "#EAB308",
    coreTexts: ["Pali Canon (Tipitaka)", "Vinaya Pitaka", "Sutta Pitaka", "Abhidhamma Pitaka"]
  },
  {
    name: "Roshi Kenji",
    denomination: "Zen/Mahayana",
    tradition: "Buddhism",
    emoji: "⚫",
    focus: "Zazen, koans, sudden enlightenment",
    description: "Zen master teaching the direct path to awakening through seated meditation, koan study, and sudden realization.",
    color: "#EAB308",
    coreTexts: ["Heart Sutra", "Diamond Sutra", "Lotus Sutra", "Zen Koans", "Platform Sutra"]
  },
  {
    name: "Lama Tenzin",
    denomination: "Tibetan/Vajrayana",
    tradition: "Buddhism",
    emoji: "🏔️",
    focus: "Tantric practices, compassion",
    description: "Tibetan Buddhist teacher emphasizing bodhisattva compassion, tantric visualization, and the Dalai Lama's lineage.",
    color: "#EAB308",
    coreTexts: ["Lotus Sutra", "Tibetan Book of the Dead", "Tantric Texts", "Lamrim", "Madhyamaka Texts"]
  },
  
  // Other Traditions
  {
    name: "Elder Miriam",
    denomination: "Bahá'í",
    tradition: "Bahá'í",
    emoji: "🌟",
    focus: "Unity of religion, progressive revelation",
    description: "Bahá'í teacher emphasizing the unity of God, religions, and humanity. Expert in progressive revelation and social justice.",
    color: "#EC4899",
    coreTexts: ["Kitáb-i-Aqdas", "Kitáb-i-Íqán", "Gleanings", "Some Answered Questions", "Writings of Bahá'u'lláh"]
  },
  {
    name: "Humanist Guide",
    denomination: "Secular Humanism",
    tradition: "Secular",
    emoji: "🌍",
    focus: "Ethics without theology",
    description: "Philosophical guide emphasizing human reason, ethics, and dignity without supernatural beliefs. Focus on this-world solutions.",
    color: "#6B7280",
    coreTexts: ["Humanist Manifestos", "Philosophical Works", "Ethical Texts", "Scientific Literature", "Secular Philosophy"]
  },
  {
    name: "Mystic",
    denomination: "Interfaith/Spiritual",
    tradition: "Interfaith",
    emoji: "✨",
    focus: "Perennial philosophy, direct experience",
    description: "Interfaith mystic drawing wisdom from all traditions. Emphasizes direct spiritual experience and universal spiritual principles.",
    color: "#A855F7",
    coreTexts: ["Perennial Philosophy", "Mystical Texts", "Cross-Traditional Wisdom", "Universal Spiritual Principles"]
  }
];

const religiousHolidays: HolidayEvent[] = [
  // Jewish Holidays 2026
  { name: "Tu BiShvat", date: "2026-02-03", tradition: "Judaism", description: "New Year of the Trees", color: "#3B82F6" },
  { name: "Purim", date: "2026-03-24", tradition: "Judaism", description: "Festival celebrating deliverance from Haman", color: "#3B82F6" },
  { name: "Passover (Pesach)", date: "2026-04-13", tradition: "Judaism", description: "Celebration of exodus from Egypt", color: "#3B82F6" },
  { name: "Yom HaShoah", date: "2026-05-05", tradition: "Judaism", description: "Holocaust Remembrance Day", color: "#3B82F6" },
  { name: "Shavuot", date: "2026-06-02", tradition: "Judaism", description: "Festival of Weeks, giving of Torah", color: "#3B82F6" },
  { name: "Rosh Hashanah", date: "2026-09-21", tradition: "Judaism", description: "Jewish New Year", color: "#3B82F6" },
  { name: "Yom Kippur", date: "2026-09-30", tradition: "Judaism", description: "Day of Atonement", color: "#3B82F6" },
  { name: "Sukkot", date: "2026-10-05", tradition: "Judaism", description: "Festival of Booths", color: "#3B82F6" },
  { name: "Hanukkah", date: "2026-12-18", tradition: "Judaism", description: "Festival of Lights", color: "#3B82F6" },

  // Christian Holidays 2026
  { name: "Epiphany", date: "2026-01-06", tradition: "Christianity", description: "Manifestation of Christ to the Gentiles", color: "#8B5CF6" },
  { name: "Ash Wednesday", date: "2026-02-18", tradition: "Christianity", description: "Beginning of Lent", color: "#8B5CF6" },
  { name: "Palm Sunday", date: "2026-03-29", tradition: "Christianity", description: "Jesus' triumphal entry into Jerusalem", color: "#8B5CF6" },
  { name: "Good Friday", date: "2026-04-03", tradition: "Christianity", description: "Crucifixion of Jesus", color: "#8B5CF6" },
  { name: "Easter", date: "2026-04-05", tradition: "Christianity", description: "Resurrection of Jesus", color: "#8B5CF6" },
  { name: "Pentecost", date: "2026-05-24", tradition: "Christianity", description: "Descent of Holy Spirit", color: "#8B5CF6" },
  { name: "All Saints' Day", date: "2026-11-01", tradition: "Christianity", description: "Honoring all saints", color: "#8B5CF6" },
  { name: "Advent", date: "2026-11-29", tradition: "Christianity", description: "Beginning of Christian liturgical year", color: "#8B5CF6" },
  { name: "Christmas", date: "2026-12-25", tradition: "Christianity", description: "Birth of Jesus Christ", color: "#8B5CF6" },

  // Islamic Holidays 2026 (approximate)
  { name: "Islamic New Year", date: "2026-01-18", tradition: "Islam", description: "Beginning of Islamic calendar year", color: "#10B981" },
  { name: "Ashura", date: "2026-01-27", tradition: "Islam", description: "Day of remembrance, especially for Shia Muslims", color: "#10B981" },
  { name: "Ramadan Begins", date: "2026-02-28", tradition: "Islam", description: "Month of fasting begins", color: "#10B981" },
  { name: "Laylat al-Qadr", date: "2026-03-25", tradition: "Islam", description: "Night of Power", color: "#10B981" },
  { name: "Eid al-Fitr", date: "2026-03-30", tradition: "Islam", description: "End of Ramadan", color: "#10B981" },
  { name: "Eid al-Adha", date: "2026-06-07", tradition: "Islam", description: "Festival of Sacrifice", color: "#10B981" },
  { name: "Mawlid", date: "2026-08-26", tradition: "Islam", description: "Prophet Muhammad's birthday", color: "#10B981" },

  // Hindu Holidays 2026 (approximate)
  { name: "Vasant Panchami", date: "2026-01-23", tradition: "Hinduism", description: "Spring festival honoring Saraswati", color: "#F59E0B" },
  { name: "Maha Shivratri", date: "2026-02-20", tradition: "Hinduism", description: "Great Night of Shiva", color: "#F59E0B" },
  { name: "Holi", date: "2026-03-14", tradition: "Hinduism", description: "Festival of Colors", color: "#F59E0B" },
  { name: "Ram Navami", date: "2026-04-10", tradition: "Hinduism", description: "Birth of Lord Rama", color: "#F59E0B" },
  { name: "Janmashtami", date: "2026-08-14", tradition: "Hinduism", description: "Birth of Lord Krishna", color: "#F59E0B" },
  { name: "Ganesh Chaturthi", date: "2026-08-29", tradition: "Hinduism", description: "Birth of Lord Ganesha", color: "#F59E0B" },
  { name: "Navratri", date: "2026-09-17", tradition: "Hinduism", description: "Nine nights honoring Goddess Durga", color: "#F59E0B" },
  { name: "Diwali", date: "2026-11-08", tradition: "Hinduism", description: "Festival of Lights", color: "#F59E0B" },

  // Buddhist Holidays 2026 (approximate)
  { name: "Magha Puja", date: "2026-02-11", tradition: "Buddhism", description: "Sangha Day", color: "#EAB308" },
  { name: "Vesak", date: "2026-05-15", tradition: "Buddhism", description: "Buddha's birth, enlightenment, and passing", color: "#EAB308" },
  { name: "Dharma Day", date: "2026-07-09", tradition: "Buddhism", description: "Buddha's first teaching", color: "#EAB308" },
  { name: "Kathina", date: "2026-10-15", tradition: "Buddhism", description: "Robe-offering ceremony", color: "#EAB308" },
  { name: "Losar", date: "2026-02-19", tradition: "Buddhism", denomination: "Tibetan", description: "Tibetan New Year", color: "#EAB308" },

  // Other Religious Holidays
  { name: "Ridván", date: "2026-04-21", tradition: "Bahá'í", description: "Most holy Bahá'í festival", color: "#EC4899" },
  { name: "Declaration of the Báb", date: "2026-05-23", tradition: "Bahá'í", description: "Beginning of Bahá'í Faith", color: "#EC4899" },
  { name: "Birth of Bahá'u'lláh", date: "2026-11-12", tradition: "Bahá'í", description: "Founder of Bahá'í Faith", color: "#EC4899" },
];

// Sample lessons for when no data is available
const sampleLessons = [
  {
    id: "sample-1",
    title: "Introduction to Mindfulness Meditation",
    tradition: "Buddhism",
    difficulty: "beginner",
    completionCount: 0,
    date: "2026-01-15",
    createdAt: "2026-01-15",
    content: "Mindfulness meditation is a foundational practice in Buddhism that involves paying attention to the present moment with an attitude of acceptance and non-judgment. This lesson will guide you through the basic techniques of mindful breathing, body awareness, and observing thoughts without attachment. The practice begins with finding a comfortable seated position, closing your eyes, and focusing on your natural breath. When thoughts arise, simply notice them and gently return your attention to the breath. Regular practice helps develop concentration, emotional regulation, and insight into the nature of mind and reality.",
    estimatedReadingTime: 3
  },
  {
    id: "sample-2",
    title: "The Five Pillars of Islam",
    tradition: "Islam",
    difficulty: "beginner",
    completionCount: 0,
    date: "2026-01-20",
    createdAt: "2026-01-20",
    content: "The Five Pillars of Islam form the foundation of Muslim practice and belief. They are: 1) Shahada (Faith) - The declaration that there is no god but Allah and Muhammad is His messenger. 2) Salah (Prayer) - Five daily prayers facing Mecca. 3) Zakat (Charity) - Giving a portion of wealth to those in need. 4) Sawm (Fasting) - Fasting during the month of Ramadan. 5) Hajj (Pilgrimage) - The pilgrimage to Mecca for those who are able. These pillars provide structure to a Muslim's spiritual life and connect them to the global community of believers (ummah).",
    estimatedReadingTime: 4
  },
  {
    id: "sample-3",
    title: "Understanding the Trinity",
    tradition: "Christianity",
    difficulty: "intermediate",
    completionCount: 0,
    date: "2026-01-25",
    createdAt: "2026-01-25",
    content: "The Trinity is one of Christianity's central mysteries: the belief that God exists as three persons - Father, Son, and Holy Spirit - in one divine essence. This doctrine, formalized at early church councils, attempts to reconcile biblical references to Jesus' divinity with monotheism. The Father is the source, the Son (Jesus) is the Word made flesh who redeemed humanity, and the Holy Spirit is God's presence active in the world and believers' lives. While the term 'Trinity' doesn't appear in the Bible, Christians see it reflected in passages like the Great Commission (Matthew 28:19) and various references to the three persons working together in salvation history.",
    estimatedReadingTime: 5
  }
];

// ===== Tradition Map =====

const TRADITION_MAP: Record<string, { name: string; emoji: string; color: string }> = {
  'c13ecfa9-a977-48ec-8b7a-637a21d7ff80': { name: 'Orthodox Judaism', emoji: '✡️', color: '#0047AB' },
  '621564b2-d131-4c24-ac64-281658481f15': { name: 'Conservative Judaism', emoji: '✡️', color: '#2E5CB8' },
  '95612ae9-a8e4-4824-8a88-440dc0862bf1': { name: 'Reform Judaism', emoji: '✡️', color: '#4A90D9' },
  'dcbfa96f-e023-471b-9047-0cf42c06a521': { name: 'Reconstructionist Judaism', emoji: '✡️', color: '#6BA3E8' },
  '07e9bc55-8ded-4951-b856-4e9d2fc95ec7': { name: 'Messianic Judaism', emoji: '✡️✝️', color: '#3D6098' },
  'd2211e0e-1cb7-4c5c-b4cf-e87e44f00203': { name: 'Catholicism', emoji: '✝️', color: '#8B0000' },
  'dcf8478c-62ea-4e6f-95cc-821ff763af26': { name: 'Eastern Orthodox', emoji: '☦️', color: '#8B4513' },
  'e18e894d-011c-43a8-87c4-d95ca8e13394': { name: 'Evangelical Protestant', emoji: '📖', color: '#4169E1' },
  '7e4cebb8-8a43-4e21-a26d-a12d1f1f3f1c': { name: 'Sunni Islam', emoji: '☪️', color: '#006400' },
  '12e600a9-a55a-4952-ad8b-4fa2354ebb94': { name: 'Shia Islam', emoji: '☪️', color: '#228B22' },
};

// ===== Perspective Types =====

interface Perspective {
  id: string;
  lesson_id: string;
  tradition_id: string;
  perspective_text: string;
  source_citations: string[];
  dimension_scores: Record<string, number>;
  tradition?: {
    name: string;
    icon: string;
    color: string;
  };
}

// ===== Simple Markdown Renderer =====

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let currentBlockquote: string[] = [];
  let key = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-2 text-slate-300">
          {currentList.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
        </ul>
      );
      currentList = [];
    }
  };

  const flushBlockquote = () => {
    if (currentBlockquote.length > 0) {
      elements.push(
        <blockquote key={key++} className="border-l-4 pl-4 my-3 italic text-slate-400" style={{ borderColor: '#D4A020' }}>
          {currentBlockquote.map((line, i) => <p key={i} className="my-1">{renderInline(line)}</p>)}
        </blockquote>
      );
      currentBlockquote = [];
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    // Handle **bold**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line — flush and add spacing
    if (trimmed === '') {
      flushList();
      flushBlockquote();
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      flushBlockquote();
      elements.push(<h3 key={key++} className="text-lg font-semibold text-slate-100 mt-4 mb-2">{renderInline(trimmed.slice(4))}</h3>);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      flushBlockquote();
      elements.push(<h2 key={key++} className="text-xl font-bold text-slate-100 mt-4 mb-2">{renderInline(trimmed.slice(3))}</h2>);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      flushBlockquote();
      elements.push(<h1 key={key++} className="text-2xl font-bold text-slate-100 mt-4 mb-2">{renderInline(trimmed.slice(2))}</h1>);
      continue;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushBlockquote();
      currentList.push(trimmed.slice(2));
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      currentBlockquote.push(trimmed.slice(2));
      continue;
    }

    // Plain paragraph
    flushList();
    flushBlockquote();
    elements.push(<p key={key++} className="text-slate-300 leading-relaxed my-1">{renderInline(trimmed)}</p>);
  }

  flushList();
  flushBlockquote();
  return <>{elements}</>;
}

// ===== Calendar Context Parser =====

interface CalendarPanel {
  key: string;
  emoji: string;
  label: string;
  text: string;
  color: string; // border color
}

// Tradition-level calendar panels with distinct info per tradition group
const CALENDAR_TRADITION_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  'orthodox_judaism':         { emoji: '✡️', label: 'Orthodox Judaism', color: '#3B82F650' },
  'conservative_judaism':     { emoji: '✡️', label: 'Conservative Judaism', color: '#3B82F650' },
  'reform_judaism':           { emoji: '✡️', label: 'Reform Judaism', color: '#3B82F650' },
  'reconstructionist_judaism':{ emoji: '✡️', label: 'Reconstructionist Judaism', color: '#3B82F650' },
  'messianic_judaism':        { emoji: '✡️✝️', label: 'Messianic Judaism', color: '#6366F150' },
  'catholicism':              { emoji: '✝️', label: 'Catholicism', color: '#8B5CF650' },
  'eastern_orthodox':         { emoji: '☦️', label: 'Eastern Orthodox', color: '#A855F750' },
  'evangelical_protestant':   { emoji: '✝️', label: 'Evangelical Protestant', color: '#8B5CF650' },
  'sunni_islam':              { emoji: '☪️', label: 'Sunni Islam', color: '#10B98150' },
  'shia_islam':               { emoji: '☪️', label: 'Shia Islam', color: '#14B8A650' },
  // Legacy 3-family keys
  'jewish':                   { emoji: '✡️', label: 'Jewish', color: '#3B82F650' },
  'christian':                { emoji: '✝️', label: 'Christian', color: '#8B5CF650' },
  'islamic':                  { emoji: '☪️', label: 'Islamic', color: '#10B98150' },
};

function parseCalendarContext(calendarContext: string | null | undefined): CalendarPanel[] {
  if (!calendarContext) return [];
  const parts = calendarContext.split('|').map(p => p.trim()).filter(Boolean);
  const panels: CalendarPanel[] = [];

  for (const part of parts) {
    // Try labeled format: [key]: text
    const labelMatch = part.match(/^\[([^\]]+)\]:\s*(.+)$/s);
    if (labelMatch) {
      const key = labelMatch[1].toLowerCase().replace(/\s+/g, '_');
      const text = labelMatch[2].trim();
      const config = CALENDAR_TRADITION_CONFIG[key];
      if (config && text) {
        panels.push({ key, emoji: config.emoji, label: config.label, text, color: config.color });
      }
      continue;
    }

    // Legacy fallback: detect by content
    const lower = part.toLowerCase();
    if (lower.startsWith('torah portion') || lower.startsWith('jewish') || lower.startsWith('hebrew')) {
      const cfg = CALENDAR_TRADITION_CONFIG['jewish'];
      panels.push({ key: 'jewish', emoji: cfg.emoji, label: cfg.label, text: part, color: cfg.color });
    } else if (lower.startsWith('christian') || lower.startsWith('liturgical')) {
      const cfg = CALENDAR_TRADITION_CONFIG['christian'];
      panels.push({ key: 'christian', emoji: cfg.emoji, label: cfg.label, text: part, color: cfg.color });
    } else if (lower.startsWith('islamic') || lower.startsWith('hijri')) {
      const cfg = CALENDAR_TRADITION_CONFIG['islamic'];
      panels.push({ key: 'islamic', emoji: cfg.emoji, label: cfg.label, text: part, color: cfg.color });
    }
  }
  return panels;
}

// ===== Shuffle helper =====

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== Formatting =====

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric",
    hour: "numeric", 
    minute: "2-digit"
  });
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function getDifficultyLevel(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy': return 'Beginner';
    case 'medium': return 'Intermediate';
    case 'hard': return 'Advanced';
    default: return difficulty;
  }
}

function getReadingTime(content: string): number {
  // Average reading speed: 200-300 words per minute
  const words = content.split(' ').length;
  return Math.ceil(words / 250); // Assume 250 wpm
}

// ===== Components =====

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend = "neutral",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-400";
  return (
    <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${trendColor}`} />
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${trendColor}`}>{value}</p>
      {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="rounded-xl p-12 border text-center" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
      <Icon className="w-8 h-8 text-slate-600 mx-auto mb-3" />
      <h3 className="text-slate-400 font-medium mb-1">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
  );
}

// ===== Modals =====

function TextReaderModal({ 
  text, 
  onClose 
}: { 
  text: SacredText; 
  onClose: () => void;
}) {
  const [passages, setPassages] = useState<TextPassage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchPassages = async (chapter?: number, page: number = 1, search?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `/api/faith/texts/${text.id}/passages?page=${page}`;
      if (chapter !== null && chapter !== undefined) {
        url += `&chapter=${chapter}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch passages');
      }
      
      const data = await response.json();
      setPassages(data.passages || []);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load passages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassages(selectedChapter || undefined, 1, searchQuery);
  }, [text.id, selectedChapter, searchQuery]);

  const chapters = Array.from({ length: text.chapter_count }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="w-full max-w-6xl max-h-[90vh] rounded-xl border overflow-hidden flex flex-col"
        style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: "#2A2A38" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-300"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Texts
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 mb-1">{text.title}</h1>
              {text.original_title && (
                <p className="text-slate-400 text-sm mb-2">{text.original_title}</p>
              )}
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>{text.tradition}</span>
                {text.translation && <span>• {text.translation}</span>}
                <span>• {text.chapter_count} chapters</span>
                <span>• {(text.passage_count ?? 0).toLocaleString()} passages</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Chapter selector */}
              <select
                value={selectedChapter || ""}
                onChange={(e) => {
                  const chapter = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedChapter(chapter);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-lg text-sm border"
                style={{ 
                  backgroundColor: "#13131B", 
                  borderColor: "#2A2A38", 
                  color: "#D4A020" 
                }}
              >
                <option value="">All chapters</option>
                {chapters.map(chapter => (
                  <option key={chapter} value={chapter}>Chapter {chapter}</option>
                ))}
              </select>
              
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search passages..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 rounded-lg text-sm border"
                  style={{ 
                    backgroundColor: "#13131B", 
                    borderColor: "#2A2A38", 
                    color: "#D4A020" 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin" style={{ color: "#D4A020" }} />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-300">{error}</p>
            </div>
          ) : passages.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <h3 className="text-slate-400 font-medium mb-1">No passages found</h3>
              <p className="text-slate-600 text-sm">Try adjusting your search or chapter filter.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {passages.map((passage, index) => (
                <div 
                  key={passage.id}
                  className="rounded-xl p-6 border"
                  style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold text-slate-300">{passage.passage_reference}</h3>
                    <span className="text-xs px-2 py-1 rounded border text-slate-400"
                          style={{ backgroundColor: "rgba(212, 160, 32, 0.1)", borderColor: "rgba(212, 160, 32, 0.3)" }}>
                      Chapter {passage.chapter}
                      {passage.verse_start && `:${passage.verse_start}`}
                      {passage.verse_end && passage.verse_end !== passage.verse_start && `-${passage.verse_end}`}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed text-lg">{passage.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: "#2A2A38" }}>
            <div className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                    fetchPassages(selectedChapter || undefined, currentPage - 1, searchQuery);
                  }
                }}
                disabled={currentPage <= 1}
                className="p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#2A2A38" }}
              >
                <ChevronLeft className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={() => {
                  if (currentPage < totalPages) {
                    setCurrentPage(currentPage + 1);
                    fetchPassages(selectedChapter || undefined, currentPage + 1, searchQuery);
                  }
                }}
                disabled={currentPage >= totalPages}
                className="p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#2A2A38" }}
              >
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GuideChatModal({
  guide,
  onClose
}: {
  guide: DenominationAgent;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "properties">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local state for properties editing
  const [editedGuide, setEditedGuide] = useState<DenominationAgent>(guide);

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/faith/guides/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guideName: guide.name,
          denomination: guide.denomination,
          tradition: guide.tradition,
          focus: guide.focus,
          description: guide.description,
          message: userMessage.content,
          history: messages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="w-full max-w-4xl max-h-[90vh] rounded-xl border overflow-hidden flex flex-col"
        style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: "#2A2A38" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{guide.emoji}</span>
              <div>
                <h1 className="text-lg font-bold text-slate-100">{guide.name}</h1>
                <p className="text-sm text-slate-400">{guide.denomination} • {guide.tradition}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1">
            {[
              { key: "chat", label: "Chat" },
              { key: "properties", label: "Properties" }
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as "chat" | "properties")}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? "rgba(212, 160, 32, 0.15)" : "transparent",
                    color: isActive ? "#D4A020" : "#8B8B80",
                    border: isActive ? "1px solid rgba(212, 160, 32, 0.3)" : "1px solid transparent",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-slate-400 font-medium mb-1">Start a conversation</h3>
                  <p className="text-slate-600 text-sm">Ask {guide.name} for guidance on your spiritual journey.</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-xl text-sm ${
                        message.role === "user"
                          ? "text-slate-900"
                          : "text-slate-100 border"
                      }`}
                      style={{
                        backgroundColor: message.role === "user" 
                          ? "#D4A020" 
                          : "#13131B",
                        borderColor: message.role === "user" ? "transparent" : guide.color
                      }}
                    >
                      {message.content}
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div 
                    className="px-4 py-3 rounded-xl border text-sm text-slate-100"
                    style={{ backgroundColor: "#13131B", borderColor: guide.color }}
                  >
                    <Loader className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              
              {error && (
                <div className="text-center">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t" style={{ borderColor: "#2A2A38" }}>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`Ask ${guide.name} for guidance...`}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-lg border text-sm"
                  style={{ 
                    backgroundColor: "#13131B", 
                    borderColor: "#2A2A38", 
                    color: "#D4A020" 
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isLoading}
                  className="px-6 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
                >
                  {isLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Properties Tab */}
        {activeTab === "properties" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editedGuide.name}
                  onChange={(e) => setEditedGuide(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ 
                    backgroundColor: "#13131B", 
                    borderColor: "#2A2A38", 
                    color: "#D4A020" 
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Denomination</label>
                <input
                  type="text"
                  value={editedGuide.denomination}
                  onChange={(e) => setEditedGuide(prev => ({ ...prev, denomination: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ 
                    backgroundColor: "#13131B", 
                    borderColor: "#2A2A38", 
                    color: "#D4A020" 
                  }}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Focus</label>
                <input
                  type="text"
                  value={editedGuide.focus}
                  onChange={(e) => setEditedGuide(prev => ({ ...prev, focus: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ 
                    backgroundColor: "#13131B", 
                    borderColor: "#2A2A38", 
                    color: "#D4A020" 
                  }}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={editedGuide.description}
                  onChange={(e) => setEditedGuide(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ 
                    backgroundColor: "#13131B", 
                    borderColor: "#2A2A38", 
                    color: "#D4A020" 
                  }}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Core Texts (one per line)</label>
                <textarea
                  value={editedGuide.coreTexts.join('\n')}
                  onChange={(e) => setEditedGuide(prev => ({ 
                    ...prev, 
                    coreTexts: e.target.value.split('\n').filter(t => t.trim()) 
                  }))}
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none font-mono"
                  style={{ 
                    backgroundColor: "#13131B", 
                    borderColor: "#2A2A38", 
                    color: "#D4A020" 
                  }}
                />
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-4">
                Note: Properties are editable here for preview but not saved to database in this MVP.
              </p>
              <button
                className="px-6 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
                onClick={() => {
                  // For MVP, just close the modal
                  // In future, save to database
                  onClose();
                }}
              >
                Done Editing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Main Page =====

export default function FaithJourneyPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [holidayFilters, setHolidayFilters] = useState<Set<string>>(new Set(["Judaism", "Christianity", "Islam", "Hinduism", "Buddhism", "Bahá'í"]));
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  
  // Perspectives state
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [perspectivesLoading, setPerspectivesLoading] = useState(false);
  const [expandedPerspectives, setExpandedPerspectives] = useState<Set<string>>(new Set());
  const [revealedTraditions, setRevealedTraditions] = useState<Set<string>>(new Set());

  // Sacred texts and reader modal
  const [sacredTexts, setSacredTexts] = useState<SacredText[]>([]);
  const [selectedText, setSelectedText] = useState<SacredText | null>(null);
  const [textSearchQuery, setTextSearchQuery] = useState("");
  
  // Guide chat modal
  const [selectedGuide, setSelectedGuide] = useState<DenominationAgent | null>(null);

  // Fetch perspectives when a lesson is selected
  useEffect(() => {
    if (!selectedLesson || selectedLesson.id?.startsWith('sample-')) {
      setPerspectives([]);
      return;
    }
    const fetchPerspectives = async () => {
      setPerspectivesLoading(true);
      setExpandedPerspectives(new Set());
      setRevealedTraditions(new Set());
      try {
        const res = await fetch(`/api/faith/lessons/${selectedLesson.id}/perspectives`);
        if (res.ok) {
          const data = await res.json();
          setPerspectives(shuffleArray(data.perspectives || []));
        } else {
          setPerspectives([]);
        }
      } catch {
        setPerspectives([]);
      } finally {
        setPerspectivesLoading(false);
      }
    };
    fetchPerspectives();
  }, [selectedLesson?.id]);

  // Fetch sacred texts status from Supabase
  useEffect(() => {
    fetch('/api/faith/texts')
      .then(r => r.json())
      .then(data => setSacredTexts(data.texts || []))
      .catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/faith/dashboard");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      const dashboardData: DashboardData = await res.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "guides", label: "Guides", icon: MessageSquare },
    { key: "calendar", label: "Calendar", icon: Calendar },
    { key: "audio", label: "Audio", icon: Volume2 },
    { key: "texts", label: "Texts", icon: Scroll },
    { key: "conversations", label: "Conversations", icon: MessageCircle },
  ];

  const toggleLessonExpansion = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId);
    } else {
      newExpanded.add(lessonId);
    }
    setExpandedLessons(newExpanded);
  };

  const toggleHolidayFilter = (tradition: string) => {
    const newFilters = new Set(holidayFilters);
    if (newFilters.has(tradition)) {
      newFilters.delete(tradition);
    } else {
      newFilters.add(tradition);
    }
    setHolidayFilters(newFilters);
  };

  // Calendar helper functions
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const holidays = getFilteredHolidays().filter(holiday => holiday.date === dateStr);
    const lessons = data?.lessons?.filter(lesson => lesson.date === dateStr) || [];
    return { holidays, lessons };
  };

  const getTraditionColors = () => ({
    "Judaism": "#3B82F6",
    "Christianity": "#8B5CF6", 
    "Islam": "#10B981",
    "Hinduism": "#F59E0B",
    "Buddhism": "#EAB308",
    "Bahá'í": "#EC4899"
  });

  // Helper function to render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ingested':
        return (
          <span className="text-xs px-1.5 py-0.5 rounded border" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", borderColor: "rgba(34, 197, 94, 0.3)", color: "#22C55E" }}>
            ✅ Ingested
          </span>
        );
      case 'ingesting':
        return (
          <span className="text-xs px-1.5 py-0.5 rounded border" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", borderColor: "rgba(59, 130, 246, 0.3)", color: "#3B82F6" }}>
            🔄 Ingesting
          </span>
        );
      case 'licensed_pending':
        return (
          <span className="text-xs px-1.5 py-0.5 rounded border" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)", color: "#EF4444" }}>
            🔴 Licensed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="text-xs px-1.5 py-0.5 rounded border" style={{ backgroundColor: "rgba(234, 179, 8, 0.1)", borderColor: "rgba(234, 179, 8, 0.3)", color: "#EAB308" }}>
            🟡 Pending
          </span>
        );
    }
  };

  // Calculate stats for the summary
  const getTextsStats = () => {
    const total = sacredTexts.length;
    const ingested = sacredTexts.filter(t => t.ingestion_status === 'ingested');
    const pending = sacredTexts.filter(t => t.ingestion_status === 'pending' || !t.ingestion_status);
    const totalVerses = ingested.reduce((sum, t) => sum + (t.verse_count || 0), 0);
    const totalEmbeddings = ingested.reduce((sum, t) => sum + (t.embedding_count || 0), 0);
    
    return {
      total,
      ingestedCount: ingested.length,
      pendingCount: pending.length,
      totalVerses,
      totalEmbeddings
    };
  };

  const groupAgentsByTradition = () => {
    const groups: { [tradition: string]: DenominationAgent[] } = {};
    denominationAgents.forEach(agent => {
      if (!groups[agent.tradition]) {
        groups[agent.tradition] = [];
      }
      groups[agent.tradition].push(agent);
    });
    return groups;
  };

  const getFilteredHolidays = () => {
    return religiousHolidays.filter(holiday => holidayFilters.has(holiday.tradition));
  };

  const getUpcomingHolidays = () => {
    const now = new Date();
    const upcoming = getFilteredHolidays()
      .filter(holiday => new Date(holiday.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
    return upcoming;
  };

  // Group texts by tradition
  const groupedTexts = sacredTexts.reduce((acc, text) => {
    if (!acc[text.tradition]) {
      acc[text.tradition] = [];
    }
    acc[text.tradition].push(text);
    return acc;
  }, {} as { [key: string]: SacredText[] });

  // Filter texts by search query
  const filteredTexts = Object.fromEntries(
    Object.entries(groupedTexts).map(([tradition, texts]) => [
      tradition,
      texts.filter(text => 
        !textSearchQuery || 
        text.title.toLowerCase().includes(textSearchQuery.toLowerCase()) ||
        (text.original_title && text.original_title.toLowerCase().includes(textSearchQuery.toLowerCase())) ||
        (text.description && text.description.toLowerCase().includes(textSearchQuery.toLowerCase()))
      )
    ]).filter(([_, texts]) => texts.length > 0)
  );

  // Helper function to match guide core texts to actual texts
  // Map guide coreText labels to DB matching logic
  const coreTextMatchers: Record<string, (t: SacredText) => boolean> = {
    // Judaism
    "torah (pentateuch)": (t) => t.tradition_group === "torah" && (t.tradition === "judaism" || t.tradition === "christianity"),
    "torah": (t) => t.tradition_group === "torah",
    "tanakh": (t) => t.tradition === "judaism",
    "talmud bavli": (t) => t.title.toLowerCase().includes("talmud"),
    "talmud yerushalmi": (t) => t.title.toLowerCase().includes("talmud yerushalmi"),
    "mishnah": (t) => t.title.toLowerCase().includes("mishnah"),
    "midrash": (t) => t.title.toLowerCase().includes("midrash"),
    "shulchan aruch": (t) => t.title.toLowerCase().includes("shulchan"),
    // Christianity
    "old testament": (t) => t.tradition === "christianity" && (t.tradition_group === "old_testament" || t.tradition_group === "torah"),
    "new testament": (t) => t.tradition === "christianity" && t.tradition_group === "new_testament",
    "catechism": (t) => t.title.toLowerCase().includes("catechism"),
    "church fathers": (t) => t.title.toLowerCase().includes("church father"),
    "philokalia": (t) => t.title.toLowerCase().includes("philokalia"),
    "book of common prayer": (t) => t.title.toLowerCase().includes("book of common prayer"),
    // Islam
    "quran": (t) => t.tradition === "islam" && (t.tradition_group === "meccan" || t.tradition_group === "medinan" || t.title.toLowerCase().includes("quran")),
    "sahih bukhari": (t) => t.title.toLowerCase().includes("bukhari"),
    "sahih muslim": (t) => t.title.toLowerCase().includes("sahih muslim"),
    "hadith": (t) => t.title.toLowerCase().includes("hadith"),
    "nahj al-balagha": (t) => t.title.toLowerCase().includes("nahj"),
    "masnavi": (t) => t.title.toLowerCase().includes("masnavi") || t.title.toLowerCase().includes("rumi"),
    // Hinduism
    "vedas (rigveda)": (t) => t.title.toLowerCase().includes("veda") || t.title.toLowerCase().includes("rigveda"),
    "vedas": (t) => t.title.toLowerCase().includes("veda"),
    "upanishads": (t) => t.title.toLowerCase().includes("upanishad"),
    "bhagavad gita": (t) => t.title.toLowerCase().includes("bhagavad") || t.title.toLowerCase().includes("gita"),
    "ramayana": (t) => t.title.toLowerCase().includes("ramayana"),
    "mahabharata": (t) => t.title.toLowerCase().includes("mahabharata"),
    "puranas": (t) => t.title.toLowerCase().includes("purana"),
    "yoga sutras": (t) => t.title.toLowerCase().includes("yoga sutra"),
    "brahma sutras": (t) => t.title.toLowerCase().includes("brahma sutra"),
    // Buddhism
    "pali canon (tipitaka)": (t) => t.title.toLowerCase().includes("tipitaka") || t.title.toLowerCase().includes("pali canon"),
    "heart sutra": (t) => t.title.toLowerCase().includes("heart sutra"),
    "diamond sutra": (t) => t.title.toLowerCase().includes("diamond sutra"),
    "lotus sutra": (t) => t.title.toLowerCase().includes("lotus sutra"),
    "platform sutra": (t) => t.title.toLowerCase().includes("platform sutra"),
    "tibetan book of the dead": (t) => t.title.toLowerCase().includes("tibetan book"),
    // Bahá'í
    "kitáb-i-aqdas": (t) => t.title.toLowerCase().includes("aqdas"),
    "kitáb-i-íqán": (t) => t.title.toLowerCase().includes("iqan") || t.title.toLowerCase().includes("íqán"),
    "gleanings": (t) => t.title.toLowerCase().includes("gleanings"),
  };

  const getGuideTextStats = (guide: DenominationAgent) => {
    const matchedTexts = sacredTexts.filter(text => 
      guide.coreTexts.some(coreText => {
        const matcher = coreTextMatchers[coreText.toLowerCase()];
        if (matcher) return matcher(text);
        // Fallback: substring match on title or original_title
        return text.title.toLowerCase().includes(coreText.toLowerCase()) ||
          (text.original_title && text.original_title.toLowerCase().includes(coreText.toLowerCase()));
      })
    );

    const totalPassages = matchedTexts.reduce((sum, text) => sum + (text.passage_count || 0), 0);
    const totalEmbeddings = matchedTexts.reduce((sum, text) => sum + (text.embedding_count || 0), 0);
    const coverage = totalPassages > 0 ? Math.round((totalEmbeddings / totalPassages) * 100) : 0;

    return {
      matchedTexts,
      totalPassages,
      totalEmbeddings,
      coverage
    };
  };

  const allGuideStats = denominationAgents.map(guide => ({
    guide,
    stats: getGuideTextStats(guide)
  }));

  const overallGuideStats = {
    totalPassages: allGuideStats.reduce((sum, { stats }) => sum + stats.totalPassages, 0),
    totalEmbeddings: allGuideStats.reduce((sum, { stats }) => sum + stats.totalEmbeddings, 0)
  };
  const overallCoverage = overallGuideStats.totalPassages > 0 
    ? Math.round((overallGuideStats.totalEmbeddings / overallGuideStats.totalPassages) * 100) 
    : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0B0B11" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b px-3 sm:px-4 lg:px-6 py-3 sm:py-4" 
           style={{ 
             backgroundColor: "#0B0B11", 
             borderColor: "#2A2A38",
             backdropFilter: "blur(8px)"
           }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5" style={{ color: "#D4A020" }} />
              Faith Journey
            </h1>
            <span className="text-xs px-2 py-1 rounded-full" 
                  style={{ backgroundColor: "rgba(212, 160, 32, 0.2)", color: "#D4A020" }}>
              Admin Dashboard v2.0
            </span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
            style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#B8860B";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#D4A020";
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? "rgba(212, 160, 32, 0.15)" : "transparent",
                  color: isActive ? "#D4A020" : "#8B8B80",
                  border: isActive ? "1px solid rgba(212, 160, 32, 0.3)" : "1px solid transparent",
                }}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-2 sm:p-4 lg:p-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#D4A020" }} />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex items-center justify-center py-24">
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-300">{error}</p>
              <button 
                onClick={loadData} 
                className="mt-4 px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && !error && (
          <div className="space-y-6">

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={Users}
                    label="Total Users"
                    value={data?.overview.totalUsers || 0}
                    subValue="Onboarded users"
                    trend={data?.overview.totalUsers && data.overview.totalUsers > 0 ? "up" : "neutral"}
                  />
                  <StatCard
                    icon={MessageSquare}
                    label="Active Guides"
                    value={denominationAgents.length}
                    subValue={`${new Set(denominationAgents.map(a => a.tradition)).size} traditions`}
                    trend="up"
                  />
                  <StatCard
                    icon={GraduationCap}
                    label="Total Lessons"
                    value={data?.overview.totalLessons || sampleLessons.length}
                    subValue="Available content"
                    trend="neutral"
                  />
                  <StatCard
                    icon={Calendar}
                    label="Upcoming Holidays"
                    value={getUpcomingHolidays().length}
                    subValue="Next 3 months"
                    trend="neutral"
                  />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tradition Distribution */}
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5" style={{ color: "#D4A020" }} />
                      Available Traditions ({new Set(denominationAgents.map(a => a.tradition)).size})
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(groupAgentsByTradition()).map(([tradition, agents]) => (
                        <div key={tradition} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span style={{ color: agents[0].color }}>●</span>
                            <span className="text-slate-300">{tradition}</span>
                          </div>
                          <span className="text-slate-400 text-sm">{agents.length} guides</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upcoming Holidays */}
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" style={{ color: "#D4A020" }} />
                      Next Religious Holidays
                    </h3>
                    <div className="space-y-3">
                      {getUpcomingHolidays().slice(0, 5).map((holiday, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span style={{ color: holiday.color }}>●</span>
                            <div>
                              <span className="text-slate-300 text-sm">{holiday.name}</span>
                              <p className="text-slate-500 text-xs">{holiday.tradition}</p>
                            </div>
                          </div>
                          <span className="text-slate-400 text-sm">{formatDate(holiday.date)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Guides Tab - NEW: Enhanced with embedding stats and chat */}
            {activeTab === "guides" && (
              <div className="space-y-6">
                {/* Summary Stats Card */}
                <div className="rounded-xl p-6 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Embedding Coverage Summary
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-100">{denominationAgents.length}</p>
                      <p className="text-sm text-slate-400">Total Guides</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-100">{overallGuideStats.totalPassages.toLocaleString()}</p>
                      <p className="text-sm text-slate-400">Total Passages</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-100">{overallGuideStats.totalEmbeddings.toLocaleString()}</p>
                      <p className="text-sm text-slate-400">Total Embeddings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: overallCoverage >= 80 ? "#22C55E" : overallCoverage >= 50 ? "#EAB308" : "#EF4444" }}>
                        {overallCoverage}%
                      </p>
                      <p className="text-sm text-slate-400">Coverage</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-400">Overall Coverage</span>
                      <span className="text-slate-300">{overallGuideStats.totalEmbeddings.toLocaleString()} / {overallGuideStats.totalPassages.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          backgroundColor: overallCoverage >= 80 ? "#22C55E" : overallCoverage >= 50 ? "#EAB308" : "#EF4444", 
                          width: `${Math.min(overallCoverage, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {Object.entries(groupAgentsByTradition()).map(([tradition, agents]) => (
                  <div key={tradition} className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <span style={{ color: agents[0].color }}>●</span>
                      {tradition} ({agents.length} guides)
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {agents.map((agent) => {
                        const { matchedTexts, totalPassages, totalEmbeddings, coverage } = getGuideTextStats(agent);
                        
                        return (
                          <div key={`${agent.tradition}-${agent.name}`} 
                               className="rounded-lg p-4 border transition-all hover:border-opacity-50"
                               style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-2xl">{agent.emoji}</span>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-200">{agent.name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs px-2 py-1 rounded-lg border inline-block"
                                       style={{ 
                                         backgroundColor: `${agent.color}20`, 
                                         borderColor: `${agent.color}50`,
                                         color: agent.color 
                                       }}>
                                      {agent.denomination}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedGuide(agent)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#B8860B";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#D4A020";
                                }}
                              >
                                Chat
                              </button>
                            </div>
                            
                            <p className="text-sm font-medium mb-2" style={{ color: "#D4A020" }}>
                              {agent.focus}
                            </p>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                              {agent.description}
                            </p>
                            
                            {/* Embedding Stats */}
                            <div className="mb-4">
                              <h4 className="text-xs font-medium text-slate-300 mb-2">Text Coverage:</h4>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-400">{matchedTexts.length} texts • {totalEmbeddings.toLocaleString()} / {totalPassages.toLocaleString()} passages</span>
                                <span style={{ color: coverage >= 80 ? "#22C55E" : coverage >= 50 ? "#EAB308" : "#EF4444" }}>
                                  {coverage}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-1.5">
                                <div 
                                  className="h-1.5 rounded-full" 
                                  style={{ 
                                    backgroundColor: coverage >= 80 ? "#22C55E" : coverage >= 50 ? "#EAB308" : "#EF4444", 
                                    width: `${Math.min(coverage, 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                            
                            {/* Core Texts */}
                            <div>
                              <h4 className="text-xs font-medium text-slate-300 mb-2">Core Texts:</h4>
                              <div className="grid grid-cols-1 gap-1">
                                {agent.coreTexts.slice(0, 3).map((textTitle, index) => {
                                  const matcher = coreTextMatchers[textTitle.toLowerCase()];
                                  const matchedText = matcher 
                                    ? matchedTexts.find(t => matcher(t))
                                    : matchedTexts.find(t => 
                                        t.title.toLowerCase().includes(textTitle.toLowerCase()) ||
                                        (t.original_title && t.original_title.toLowerCase().includes(textTitle.toLowerCase()))
                                      );
                                  const matchCount = matcher 
                                    ? matchedTexts.filter(t => matcher(t)).length 
                                    : 0;
                                  
                                  return (
                                    <div key={index} className="flex items-center justify-between text-xs">
                                      <span className="text-slate-400 truncate flex-1">{textTitle}</span>
                                      {matchedText ? (
                                        <div className="flex items-center gap-2 ml-2">
                                          {matchCount > 1 && (
                                            <span className="text-slate-500">{matchCount} texts</span>
                                          )}
                                          {renderStatusBadge(matchedText.ingestion_status)}
                                          {matchedText.ingestion_status === 'ingested' && (
                                            <span className="text-slate-500">
                                              {(matchedText.embedding_count || 0)}/{(matchedText.passage_count || 0)}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs px-1 py-0.5 rounded text-slate-500 ml-2">
                                          Not found
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                                {agent.coreTexts.length > 3 && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    +{agent.coreTexts.length - 3} more texts
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}


            {/* Unified Calendar Tab */}
            {activeTab === "calendar" && (
              <div className="space-y-6">
                {/* Calendar Header with Filters */}
                <div className="rounded-xl p-3 sm:p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-100 flex items-center gap-2">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: "#D4A020" }} />
                      <span className="sm:hidden">{new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      <span className="hidden sm:inline">Faith Calendar - {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (selectedMonth === 0) {
                            setSelectedMonth(11);
                            setSelectedYear(selectedYear - 1);
                          } else {
                            setSelectedMonth(selectedMonth - 1);
                          }
                        }}
                        className="p-2 rounded text-slate-400 hover:text-slate-200"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (selectedMonth === 11) {
                            setSelectedMonth(0);
                            setSelectedYear(selectedYear + 1);
                          } else {
                            setSelectedMonth(selectedMonth + 1);
                          }
                        }}
                        className="p-2 rounded text-slate-400 hover:text-slate-200"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Tradition Filters */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {["Judaism", "Christianity", "Islam", "Hinduism", "Buddhism", "Bahá'í"].map((tradition) => {
                      const isActive = holidayFilters.has(tradition);
                      const colors = getTraditionColors();
                      const color = colors[tradition as keyof typeof colors];
                      return (
                        <button
                          key={tradition}
                          onClick={() => toggleHolidayFilter(tradition)}
                          className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm transition-all"
                          style={{
                            backgroundColor: isActive ? `${color}20` : "#0B0B11",
                            borderColor: isActive ? `${color}50` : "#2A2A38",
                            color: isActive ? color : "#8B8B80",
                            border: "1px solid"
                          }}
                        >
                          <span style={{ color: color }}>●</span>
                          {tradition}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="rounded-xl p-2 sm:p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  {/* Days of week header */}
                  <div className="grid grid-cols-7 gap-px sm:gap-1 mb-1 sm:mb-2">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                      <div key={i} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-slate-400">
                        <span className="sm:hidden">{day}</span>
                        <span className="hidden sm:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-px sm:gap-1">
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: getFirstDayOfMonth(selectedYear, selectedMonth) }, (_, i) => (
                      <div key={`empty-${i}`} className="p-1 sm:p-2 h-10 sm:h-16"></div>
                    ))}
                    
                    {/* Days of the month */}
                    {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => {
                      const day = i + 1;
                      const date = new Date(selectedYear, selectedMonth, day);
                      const events = getEventsForDate(date);
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = selectedDay?.toDateString() === date.toDateString();
                      
                      return (
                        <div
                          key={day}
                          onClick={() => setSelectedDay(date)}
                          className={`p-1 sm:p-2 h-10 sm:h-16 border rounded-sm cursor-pointer transition-all relative ${
                            isSelected ? 'ring-2 ring-yellow-500' : 'hover:border-gray-500'
                          }`}
                          style={{ 
                            backgroundColor: isToday ? "#1a1a2e" : "#0B0B11",
                            borderColor: isSelected ? "#D4A020" : "#2A2A38"
                          }}
                        >
                          <div className="text-xs sm:text-sm text-slate-200 font-medium text-center sm:text-left">
                            {day}
                            {isToday && (
                              <div className="w-1.5 h-1.5 sm:w-1 sm:h-1 bg-yellow-500 rounded-full absolute top-0.5 right-0.5 sm:top-1 sm:right-1"></div>
                            )}
                          </div>
                          
                          {/* Event dots */}
                          {events.holidays.length > 0 || events.lessons.length > 0 ? (
                            <div className="flex gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 flex-wrap justify-center sm:justify-start">
                              {events.holidays.slice(0, 3).map((holiday, idx) => (
                                <div
                                  key={`holiday-${idx}`}
                                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                                  style={{ backgroundColor: holiday.color }}
                                  title={holiday.name}
                                ></div>
                              ))}
                              {events.lessons.length > 0 && (
                                <div
                                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                                  style={{ backgroundColor: "#D4A020" }}
                                  title={`${events.lessons.length} lesson(s)`}
                                ></div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Day Detail Panel */}
                {selectedDay && (
                  <div className="rounded-xl p-3 sm:p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-100">
                        {selectedDay.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </h3>
                      <button
                        onClick={() => setSelectedDay(null)}
                        className="text-slate-400 hover:text-slate-200 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {(() => {
                      const events = getEventsForDate(selectedDay);
                      const firstLessonWithContext = events.lessons.find((l: any) => l.calendarContext);
                      const calPanels = firstLessonWithContext ? parseCalendarContext((firstLessonWithContext as any).calendarContext) : [];
                      const hebrewDate = events.lessons.find((l: any) => l.hebrewDate)?.hebrewDate as string | undefined;
                      const parsha = events.lessons.find((l: any) => l.parsha)?.parsha as string | undefined;

                      // Inject Hebrew date/parsha into the first Jewish panel if present
                      const enrichedPanels = calPanels.map(p => {
                        if ((p.key === 'jewish' || p.key === 'orthodox_judaism') && (hebrewDate || parsha)) {
                          const prefix = [hebrewDate, parsha ? `Torah portion: ${parsha}` : ''].filter(Boolean).join('\n');
                          return { ...p, text: prefix + (p.text ? '\n' + p.text : '') };
                        }
                        return p;
                      });
                      // If we have Hebrew date/parsha but no Jewish panel, prepend one
                      if ((hebrewDate || parsha) && !enrichedPanels.some(p => p.key === 'jewish' || p.key === 'orthodox_judaism')) {
                        const cfg = CALENDAR_TRADITION_CONFIG['jewish'];
                        enrichedPanels.unshift({
                          key: 'jewish', emoji: cfg.emoji, label: cfg.label, color: cfg.color,
                          text: [hebrewDate, parsha ? `Torah portion: ${parsha}` : ''].filter(Boolean).join('\n')
                        });
                      }

                      return (
                        <div className="space-y-4">
                          {/* Religious Calendar Context from Lessons */}
                          {enrichedPanels.length > 0 && (
                            <div>
                              <h4 className="text-sm sm:text-md font-medium text-slate-200 mb-2 sm:mb-3 flex items-center gap-2">
                                <Globe className="w-4 h-4" style={{ color: "#D4A020" }} />
                                Religious Calendar Context
                                <span className="text-xs text-slate-500 font-normal">({enrichedPanels.length})</span>
                              </h4>
                              {/* Horizontal scroll on mobile, grid on desktop */}
                              <div className="flex sm:hidden gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x" style={{ WebkitOverflowScrolling: "touch" }}>
                                {enrichedPanels.map((panel) => (
                                  <div key={panel.key} className="p-2.5 rounded-lg border flex-shrink-0 w-[220px] snap-start" style={{ backgroundColor: "#0B0B11", borderColor: panel.color }}>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <span className="text-base">{panel.emoji}</span>
                                      <h5 className="font-medium text-slate-200 text-xs">{panel.label}</h5>
                                    </div>
                                    {panel.text.split('\n').map((line, i) => (
                                      <p key={i} className={`text-[11px] leading-relaxed ${i === 0 ? 'text-slate-300' : 'text-slate-400'}`}>{line}</p>
                                    ))}
                                  </div>
                                ))}
                              </div>
                              {/* Grid on tablet/desktop */}
                              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {enrichedPanels.map((panel) => (
                                  <div key={panel.key} className="p-3 rounded-lg border" style={{ backgroundColor: "#0B0B11", borderColor: panel.color }}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-lg">{panel.emoji}</span>
                                      <h5 className="font-medium text-slate-200 text-sm">{panel.label}</h5>
                                    </div>
                                    {panel.text.split('\n').map((line, i) => (
                                      <p key={i} className={`text-xs leading-relaxed ${i === 0 ? 'text-slate-300' : 'text-slate-400'}`}>{line}</p>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Religious Events */}
                          {events.holidays.length > 0 && (
                            <div>
                              <h4 className="text-md font-medium text-slate-200 mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" style={{ color: "#D4A020" }} />
                                Religious Events ({events.holidays.length})
                              </h4>
                              <div className="space-y-2">
                                {events.holidays.map((holiday, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-lg border"
                                    style={{ 
                                      backgroundColor: "#0B0B11", 
                                      borderColor: holiday.color + "50"
                                    }}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span style={{ color: holiday.color }}>●</span>
                                      <h5 className="font-medium text-slate-200">{holiday.name}</h5>
                                      <span
                                        className="text-xs px-2 py-1 rounded"
                                        style={{
                                          backgroundColor: `${holiday.color}20`,
                                          color: holiday.color
                                        }}
                                      >
                                        {holiday.tradition}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-400">{holiday.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Lessons */}
                          {events.lessons.length > 0 && (
                            <div>
                              <h4 className="text-md font-medium text-slate-200 mb-3 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" style={{ color: "#D4A020" }} />
                                Lessons ({events.lessons.length})
                              </h4>
                              <div className="space-y-2">
                                {events.lessons.map((lesson, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => setSelectedLesson(lesson)}
                                    className="p-3 rounded-lg border cursor-pointer hover:border-yellow-500"
                                    style={{ 
                                      backgroundColor: "#0B0B11", 
                                      borderColor: "#2A2A38"
                                    }}
                                  >
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h5 className="font-medium text-slate-200">{lesson.title}</h5>
                                      {(lesson as any).calendarDisplayName && (
                                        <span
                                          className="text-xs px-2 py-1 rounded"
                                          style={{
                                            backgroundColor: (lesson as any).calendarSystem === 'hebrew' ? 'rgba(59, 130, 246, 0.15)' :
                                              (lesson as any).calendarSystem === 'christian_liturgical' ? 'rgba(139, 92, 246, 0.15)' :
                                              'rgba(16, 185, 129, 0.15)',
                                            color: (lesson as any).calendarSystem === 'hebrew' ? '#3B82F6' :
                                              (lesson as any).calendarSystem === 'christian_liturgical' ? '#8B5CF6' :
                                              '#10B981'
                                          }}
                                        >
                                          {(lesson as any).calendarSystem === 'hebrew' ? '✡️' :
                                           (lesson as any).calendarSystem === 'christian_liturgical' ? '✝️' : '☪️'}{' '}
                                          {(lesson as any).calendarDisplayName}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-400">
                                      {lesson.content ? lesson.content.substring(0, 100) + '...' : 'Click to view lesson content'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {events.holidays.length === 0 && events.lessons.length === 0 && (
                            <div className="text-center py-8">
                              <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                              <p className="text-slate-400">No events or lessons for this day</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Lesson Detail View */}
                {selectedLesson && (
                  <div className="rounded-xl p-3 sm:p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-100 line-clamp-2">{selectedLesson.title}</h3>
                      <button
                        onClick={() => setSelectedLesson(null)}
                        className="text-slate-400 hover:text-slate-200 flex-shrink-0 p-1"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Lesson metadata */}
                      <div className="flex flex-wrap gap-2">
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: "rgba(212, 160, 32, 0.2)",
                            color: "#D4A020"
                          }}
                        >
                          {selectedLesson.tradition}
                        </span>
                        {selectedLesson.scriptureRef && (
                          <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400">
                            📖 {selectedLesson.scriptureRef}
                          </span>
                        )}
                        {selectedLesson.hebrewDate && (
                          <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400">
                            ✡️ {selectedLesson.hebrewDate}
                          </span>
                        )}
                        {selectedLesson.parsha && (
                          <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400">
                            📜 Parsha: {selectedLesson.parsha}
                          </span>
                        )}
                        {selectedLesson.baselineTraditionId && TRADITION_MAP[selectedLesson.baselineTraditionId] && (
                          <span className="text-xs px-2 py-1 rounded" style={{
                            backgroundColor: TRADITION_MAP[selectedLesson.baselineTraditionId].color + '20',
                            color: TRADITION_MAP[selectedLesson.baselineTraditionId].color
                          }}>
                            {TRADITION_MAP[selectedLesson.baselineTraditionId].emoji} {TRADITION_MAP[selectedLesson.baselineTraditionId].name}
                          </span>
                        )}
                        {selectedLesson.calendarDisplayName && (
                          <span className="text-xs px-2 py-1 rounded" style={{
                            backgroundColor: selectedLesson.calendarSystem === 'hebrew' ? 'rgba(59, 130, 246, 0.15)' :
                              selectedLesson.calendarSystem === 'christian_liturgical' ? 'rgba(139, 92, 246, 0.15)' :
                              'rgba(16, 185, 129, 0.15)',
                            color: selectedLesson.calendarSystem === 'hebrew' ? '#3B82F6' :
                              selectedLesson.calendarSystem === 'christian_liturgical' ? '#8B5CF6' :
                              '#10B981'
                          }}>
                            🗓️ {selectedLesson.calendarDisplayName}
                          </span>
                        )}
                      </div>

                      {/* Religious Calendar Context for this lesson */}
                      {selectedLesson.calendarContext && (() => {
                        const lessonPanels = parseCalendarContext(selectedLesson.calendarContext);
                        // Inject Hebrew date/parsha into first Jewish panel
                        const enriched = lessonPanels.map(p => {
                          if ((p.key === 'jewish' || p.key === 'orthodox_judaism') && (selectedLesson.hebrewDate || selectedLesson.parsha)) {
                            const prefix = [selectedLesson.hebrewDate, selectedLesson.parsha ? `Torah: ${selectedLesson.parsha}` : ''].filter(Boolean).join('\n');
                            return { ...p, text: prefix + (p.text ? '\n' + p.text : '') };
                          }
                          return p;
                        });
                        if ((selectedLesson.hebrewDate || selectedLesson.parsha) && !enriched.some(p => p.key === 'jewish' || p.key === 'orthodox_judaism')) {
                          const cfg = CALENDAR_TRADITION_CONFIG['jewish'];
                          enriched.unshift({
                            key: 'jewish', emoji: cfg.emoji, label: cfg.label, color: cfg.color,
                            text: [selectedLesson.hebrewDate, selectedLesson.parsha ? `Torah: ${selectedLesson.parsha}` : ''].filter(Boolean).join('\n')
                          });
                        }
                        if (enriched.length === 0) return null;
                        return (
                          <>
                            {/* Horizontal scroll on mobile */}
                            <div className="flex sm:hidden gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x" style={{ WebkitOverflowScrolling: "touch" }}>
                              {enriched.map((panel) => (
                                <div key={panel.key} className="p-2.5 rounded-lg border flex-shrink-0 w-[220px] snap-start" style={{ backgroundColor: "#0B0B11", borderColor: panel.color }}>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-base">{panel.emoji}</span>
                                    <span className="font-medium text-slate-200 text-xs">{panel.label}</span>
                                  </div>
                                  {panel.text.split('\n').map((line, i) => (
                                    <p key={i} className={`text-[11px] leading-relaxed ${i === 0 ? 'text-slate-300' : 'text-slate-400'}`}>{line}</p>
                                  ))}
                                </div>
                              ))}
                            </div>
                            {/* Grid on tablet/desktop */}
                            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {enriched.map((panel) => (
                                <div key={panel.key} className="p-3 rounded-lg border" style={{ backgroundColor: "#0B0B11", borderColor: panel.color }}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span>{panel.emoji}</span>
                                    <span className="font-medium text-slate-200 text-xs">{panel.label}</span>
                                  </div>
                                  {panel.text.split('\n').map((line, i) => (
                                    <p key={i} className={`text-xs leading-relaxed ${i === 0 ? 'text-slate-300' : 'text-slate-400'}`}>{line}</p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                      
                      {/* Lesson content with markdown rendering */}
                      {(selectedLesson.baselineText || selectedLesson.content) && (
                        <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: "#0B0B11" }}>
                          <h4 className="font-medium text-slate-200 mb-2 sm:mb-3 text-sm sm:text-base">Lesson Content</h4>
                          <div className="prose prose-invert prose-sm max-w-none">
                            {renderMarkdown(selectedLesson.baselineText || selectedLesson.content || '')}
                          </div>
                        </div>
                      )}
                      
                      {/* Tradition Perspectives — fetched from API */}
                      <div className="p-3 sm:p-4 rounded-lg border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                        <h4 className="font-medium text-slate-200 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                          <Users className="w-4 h-4" style={{ color: "#D4A020" }} />
                          Tradition Perspectives
                        </h4>
                        
                        {perspectivesLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader className="w-6 h-6 animate-spin" style={{ color: "#D4A020" }} />
                            <span className="ml-2 text-slate-400 text-sm">Loading perspectives...</span>
                          </div>
                        ) : perspectives.length === 0 ? (
                          <p className="text-slate-500 text-sm py-4 text-center">
                            No tradition perspectives available for this lesson yet.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {perspectives.map((perspective, idx) => {
                              const letter = String.fromCharCode(65 + idx);
                              const isExpanded = expandedPerspectives.has(perspective.id);
                              const isRevealed = revealedTraditions.has(perspective.id);
                              const tradition = perspective.tradition_id ? TRADITION_MAP[perspective.tradition_id] : null;
                              
                              return (
                                <div 
                                  key={perspective.id}
                                  className="rounded-lg border overflow-hidden"
                                  style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}
                                >
                                  {/* Accordion header */}
                                  <button
                                    onClick={() => {
                                      const newSet = new Set(expandedPerspectives);
                                      if (newSet.has(perspective.id)) {
                                        newSet.delete(perspective.id);
                                      } else {
                                        newSet.add(perspective.id);
                                      }
                                      setExpandedPerspectives(newSet);
                                    }}
                                    className="w-full flex items-center justify-between p-2.5 sm:p-3 text-left hover:bg-white/5 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-semibold px-2 py-1 rounded" style={{ backgroundColor: "rgba(212, 160, 32, 0.15)", color: "#D4A020" }}>
                                        {isRevealed && tradition ? `${tradition.emoji} ${tradition.name}` : `Perspective ${letter}`}
                                      </span>
                                      {isRevealed && tradition && (
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tradition.color }} />
                                      )}
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    )}
                                  </button>
                                  
                                  {/* Accordion body */}
                                  {isExpanded && (
                                    <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3 sm:space-y-4">
                                      {/* Perspective text */}
                                      <div className="text-sm text-slate-300 leading-relaxed">
                                        {renderMarkdown(perspective.perspective_text || '')}
                                      </div>
                                      
                                      {/* Source Citations */}
                                      {perspective.source_citations && perspective.source_citations.length > 0 && (
                                        <div>
                                          <h5 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Sources</h5>
                                          <ul className="list-disc list-inside space-y-1">
                                            {perspective.source_citations.map((citation: any, ci: number) => (
                                              <li key={ci} className="text-xs text-slate-400">
                                                {typeof citation === 'string' ? citation : (
                                                  <><span className="font-medium text-slate-300">{citation.ref}</span>{citation.text ? ` — "${citation.text}"` : ''}</>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {/* Dimension Scores — horizontal bar charts */}
                                      {perspective.dimension_scores && Object.keys(perspective.dimension_scores).length > 0 && (
                                        <div>
                                          <h5 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Dimension Scores</h5>
                                          <div className="space-y-2">
                                            {Object.entries(perspective.dimension_scores).map(([dim, score]) => (
                                              <div key={dim} className="flex items-center gap-1.5 sm:gap-2">
                                                <span className="text-[10px] sm:text-xs text-slate-400 w-20 sm:w-40 truncate capitalize">{dim.replace(/-/g, ' ')}</span>
                                                <div className="flex-1 bg-slate-700 rounded-full h-1.5 sm:h-2">
                                                  <div 
                                                    className="h-1.5 sm:h-2 rounded-full transition-all"
                                                    style={{ 
                                                      width: `${Math.min((score as number) * 10, 100)}%`,
                                                      backgroundColor: "#D4A020"
                                                    }}
                                                  />
                                                </div>
                                                <span className="text-[10px] sm:text-xs text-slate-300 w-5 sm:w-6 text-right">{score as number}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Reveal Tradition button */}
                                      {!isRevealed && tradition && (
                                        <button
                                          onClick={() => {
                                            const newSet = new Set(revealedTraditions);
                                            newSet.add(perspective.id);
                                            setRevealedTraditions(newSet);
                                          }}
                                          className="px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                                          style={{ backgroundColor: "rgba(212, 160, 32, 0.15)", color: "#D4A020", border: "1px solid rgba(212, 160, 32, 0.3)" }}
                                        >
                                          🔍 Reveal Tradition
                                        </button>
                                      )}
                                      {isRevealed && tradition && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: tradition.color + '15', border: `1px solid ${tradition.color}30` }}>
                                          <span className="text-lg">{tradition.emoji}</span>
                                          <span className="text-sm font-medium" style={{ color: tradition.color }}>{tradition.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audio Tab - Keep exactly as before */}
            {activeTab === "audio" && (
              <div className="space-y-6">
                {/* Available Voices */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Mic className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Available Voices (ElevenLabs)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: "Joshua", description: "Personal voice clone", type: "Cloned", recommended: true },
                      { name: "Rabbi Voice", description: "Warm, authoritative male", type: "Generated", recommended: false },
                      { name: "Narrator Voice", description: "Clear, neutral storytelling", type: "Generated", recommended: false },
                    ].map((voice, index) => (
                      <div key={index} 
                           className="rounded-lg p-3 border"
                           style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-slate-200">{voice.name}</h3>
                          <div className="flex items-center gap-2">
                            {voice.recommended && (
                              <span className="text-xs px-2 py-0.5 rounded border"
                                    style={{ 
                                      backgroundColor: "rgba(34, 197, 94, 0.1)", 
                                      borderColor: "rgba(34, 197, 94, 0.3)",
                                      color: "#22C55E" 
                                    }}>
                                Recommended
                              </span>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded border"
                                  style={{ 
                                    backgroundColor: "rgba(100, 116, 139, 0.1)", 
                                    borderColor: "rgba(100, 116, 139, 0.3)",
                                    color: "#64748B" 
                                  }}>
                              {voice.type}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">{voice.description}</p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              if (window.speechSynthesis) {
                                const utterance = new SpeechSynthesisUtterance("Peace be with you on your spiritual journey");
                                window.speechSynthesis.speak(utterance);
                              }
                            }}
                            className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            Sample
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ElevenLabs Account Management */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" style={{ color: "#D4A020" }} />
                    ElevenLabs Account Management
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Account Status */}
                    <div>
                      <h3 className="text-slate-300 font-medium mb-3">Account Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">API Key:</span>
                          <span className="text-slate-300 font-mono">sk-...7x3f</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Plan Tier:</span>
                          <span className="text-emerald-400 font-medium">Creator</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Rate Limit:</span>
                          <span className="text-slate-300">120 requests/min</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Concurrent Requests:</span>
                          <span className="text-slate-300">3 max</span>
                        </div>
                      </div>

                      {/* Usage Progress */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-400">Monthly Usage</span>
                          <span className="text-slate-300">45,000 / 100,000 characters</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              backgroundColor: "#D4A020", 
                              width: "45%" 
                            }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                          <span>Resets Feb 1st</span>
                          <span>55% used</span>
                        </div>
                      </div>

                      {/* Usage Warning */}
                      <div className="mt-4">
                        <label className="text-sm text-slate-400">Warning threshold:</label>
                        <select className="w-full mt-1 px-2 py-1 rounded text-sm" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}>
                          <option>80% of monthly limit</option>
                          <option>90% of monthly limit</option>
                          <option>95% of monthly limit</option>
                        </select>
                      </div>
                    </div>

                    {/* Available Models */}
                    <div>
                      <h3 className="text-slate-300 font-medium mb-3">Available Models</h3>
                      <div className="space-y-3">
                        {[
                          { name: "eleven_v3", description: "Highest quality, most natural voice", recommended: true },
                          { name: "eleven_turbo_v2", description: "Fast generation, good quality", recommended: false },
                          { name: "eleven_multilingual_v2", description: "Supports multiple languages", recommended: false }
                        ].map((model, index) => (
                          <div key={index} 
                               className="rounded-lg p-3 border"
                               style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-slate-200">{model.name}</h4>
                              {model.recommended && (
                                <span className="text-xs px-2 py-0.5 rounded border"
                                      style={{ 
                                        backgroundColor: "rgba(34, 197, 94, 0.1)", 
                                        borderColor: "rgba(34, 197, 94, 0.3)",
                                        color: "#22C55E" 
                                      }}>
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">{model.description}</p>
                          </div>
                        ))}
                      </div>

                      {/* Default Model Selection */}
                      <div className="mt-4">
                        <label className="text-sm text-slate-400">Default model for voices:</label>
                        <select className="w-full mt-1 px-2 py-1 rounded text-sm" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}>
                          <option>eleven_v3 (Recommended)</option>
                          <option>eleven_turbo_v2</option>
                          <option>eleven_multilingual_v2</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Prayer Audio — ALL Religions & Denominations */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Daily Prayer Audio — ALL Religions & Denominations
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-slate-300 font-medium mb-2">Tradition & Denomination</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-slate-500">Tradition:</label>
                          <select className="w-full px-2 py-1 rounded text-sm" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}>
                            <option>Judaism</option>
                            <option>Christianity</option>
                            <option>Islam</option>
                            <option>Hinduism</option>
                            <option>Buddhism</option>
                            <option>Bahá'í</option>
                            <option>Secular Humanism</option>
                            <option>Interfaith</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-slate-500">Denomination:</label>
                          <select className="w-full px-2 py-1 rounded text-sm" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}>
                            <option>Orthodox</option>
                            <option>Conservative/Masorti</option>
                            <option>Reform</option>
                            <option>Messianic</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-slate-500">Voice Assignment:</label>
                          <select className="w-full px-2 py-1 rounded text-sm" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}>
                            <option>Rabbi Voice</option>
                            <option>Joshua</option>
                            <option>Narrator Voice</option>
                          </select>
                        </div>
                      </div>
                      
                      <h3 className="text-slate-300 font-medium mb-2 mt-4">Today's Prayer Preview</h3>
                      <div className="rounded-lg p-3 border text-sm" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                        <p className="text-slate-400 italic">
                          "Baruch Atah Adonai, Eloheinu Melech ha'olam, asher kidshanu b'mitzvotav v'tzivanu al netilat yadayim..."
                        </p>
                        <p className="text-slate-500 text-xs mt-2">
                          Orthodox tradition • Morning blessings • Hebrew with English translation
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-slate-300 font-medium mb-2">Generation Status</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Status:</span>
                          <span className="text-emerald-400">Ready to generate</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Last generated:</span>
                          <span className="text-slate-500">Yesterday 7:00 AM</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Current tradition:</span>
                          <span className="text-slate-300">Judaism • Orthodox</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Estimated duration:</span>
                          <span className="text-slate-300">~3 minutes</span>
                        </div>
                        <button className="w-full py-2 mt-3 rounded-lg text-sm transition-colors"
                                style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}>
                          Generate Audio
                        </button>
                      </div>
                      
                      <h3 className="text-slate-300 font-medium mb-2 mt-4">Recent Audio</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm p-2 rounded border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                          <span className="text-slate-400">Jan 26 - Morning Prayers</span>
                          <button className="text-slate-500 hover:text-slate-400">
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-sm p-2 rounded border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                          <span className="text-slate-400">Jan 25 - Evening Prayers</span>
                          <button className="text-slate-500 hover:text-slate-400">
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Texts Tab - NEW: Data-driven with reader modal */}
            {activeTab === "texts" && (
              <div className="space-y-6">
                {/* Header with search and stats */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
                        <Database className="w-5 h-5" style={{ color: "#D4A020" }} />
                        Sacred Texts Library
                      </h2>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                        <span>Total: <span className="text-slate-300 font-medium">{getTextsStats().total}</span></span>
                        <span>Ingested: <span className="text-green-400 font-medium">{getTextsStats().ingestedCount}</span> ({getTextsStats().totalVerses.toLocaleString()} verses)</span>
                        <span>Pending: <span className="text-yellow-400 font-medium">{getTextsStats().pendingCount}</span></span>
                        <span>Embeddings: <span className="text-blue-400 font-medium">{getTextsStats().totalEmbeddings.toLocaleString()}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Search texts..." 
                        value={textSearchQuery}
                        onChange={(e) => setTextSearchQuery(e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm border"
                        style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Texts by tradition */}
                {Object.entries(filteredTexts)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([tradition, texts]) => {
                    const traditionColors = {
                      "Judaism": "#3B82F6",
                      "Christianity": "#8B5CF6", 
                      "Islam": "#10B981",
                      "Hinduism": "#F59E0B",
                      "Buddhism": "#EAB308",
                      "Bahá'í": "#EC4899",
                      "Other": "#6B7280"
                    };
                    const color = traditionColors[tradition as keyof typeof traditionColors] || "#6B7280";

                    return (
                      <div key={tradition} className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                          <span style={{ color }}>●</span>
                          {tradition} ({(texts as SacredText[]).length} texts)
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(texts as SacredText[])
                            .sort((a: SacredText, b: SacredText) => a.title.localeCompare(b.title))
                            .map((text: SacredText) => (
                              <div 
                                key={text.id}
                                className={`rounded-lg p-4 border transition-all cursor-pointer hover:border-opacity-70 ${
                                  text.ingestion_status === 'ingested' ? '' : 'opacity-75'
                                }`}
                                style={{ backgroundColor: "#0B0B11", borderColor: color + "30" }}
                                onClick={() => {
                                  if (text.ingestion_status === 'ingested') {
                                    setSelectedText(text);
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-200 truncate">{text.title}</h4>
                                    {text.original_title && (
                                      <p className="text-xs text-slate-400 mt-1 truncate">{text.original_title}</p>
                                    )}
                                  </div>
                                  <div className="ml-2 flex-shrink-0">
                                    {renderStatusBadge(text.ingestion_status)}
                                  </div>
                                </div>
                                
                                {text.translation && (
                                  <p className="text-xs text-slate-500 mb-2">{text.translation}</p>
                                )}
                                
                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                                  <div>
                                    <span className="block">Chapters: {text.chapter_count ?? 0}</span>
                                    <span className="block">Verses: {(text.verse_count ?? 0).toLocaleString()}</span>
                                  </div>
                                  <div>
                                    <span className="block">Passages: {(text.passage_count ?? 0).toLocaleString()}</span>
                                    {text.ingestion_status === 'ingested' && (
                                      <span className="block">
                                        Embeddings: <span className="text-blue-400">{(text.embedding_count ?? 0).toLocaleString()}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {text.description && (
                                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{text.description}</p>
                                )}
                                
                                {text.ingestion_status === 'ingested' && (
                                  <div className="mt-3">
                                    <button
                                      className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                      style={{ backgroundColor: color + "20", color }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedText(text);
                                      }}
                                    >
                                      Read Text
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}

                {Object.keys(filteredTexts).length === 0 && (
                  <EmptyState 
                    icon={Search}
                    title="No texts found"
                    description="Try adjusting your search query to find texts."
                  />
                )}
              </div>
            )}

            {/* Conversations Tab - Keep exactly as before */}
            {activeTab === "conversations" && data && (
              <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" style={{ color: "#D4A020" }} />
                  Recent Conversations ({data.conversations.length})
                </h2>
                {data.conversations.length === 0 ? (
                  <EmptyState 
                    icon={MessageCircle}
                    title="No conversations yet"
                    description="Guide conversations will appear here once users start engaging."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                          <th className="text-left py-2 px-2">Guide</th>
                          <th className="text-left py-2 px-2">User</th>
                          <th className="text-right py-2 px-2">Messages</th>
                          <th className="text-left py-2 px-2">Status</th>
                          <th className="text-left py-2 px-2">Last Message</th>
                          <th className="text-left py-2 px-2">Started</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.conversations
                          .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime())
                          .slice(0, 20)
                          .map((conv) => (
                            <tr key={conv.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                              <td className="py-3 px-2">
                                <span className="text-slate-300 font-medium">{conv.guideName}</span>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-slate-600" />
                                  <span className="text-slate-400 font-mono text-sm">
                                    {conv.userId.slice(0, 8)}...
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <MessageCircle className="w-3 h-3 text-slate-600" />
                                  <span className="text-slate-400">{conv.messageCount}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  conv.status === 'active' 
                                    ? 'bg-emerald-900/30 text-emerald-400' 
                                    : conv.status === 'committed'
                                    ? 'bg-blue-900/30 text-blue-400'
                                    : 'bg-slate-900/30 text-slate-400'
                                }`}>
                                  {conv.status}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-slate-400 text-sm">{formatDateTime(conv.lastMessageDate)}</td>
                              <td className="py-3 px-2 text-slate-400 text-sm">{formatDate(conv.createdAt)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Timestamp */}
            {data && (
              <div className="text-center">
                <p className="text-xs text-slate-600">
                  Last updated: {formatDateTime(data.timestamp)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedText && (
        <TextReaderModal 
          text={selectedText}
          onClose={() => setSelectedText(null)}
        />
      )}
      
      {selectedGuide && (
        <GuideChatModal
          guide={selectedGuide}
          onClose={() => setSelectedGuide(null)}
        />
      )}
    </div>
  );
}