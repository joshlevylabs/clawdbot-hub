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
  ImageIcon,
  Upload,
  Trash2,
  Edit3,
  Save,
  Plus,
  Check,
  CheckCircle,
  Eye,
  Radio,
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

type ActiveTab = "overview" | "users" | "guides" | "calendar" | "audio" | "texts" | "conversations" | "images";

interface FaithImage {
  id: string;
  date: string;
  tradition_family: string;
  image_url: string;
  prompt: string;
  description: string;
  tags: string[];
  subject: string;
  style: string;
  model: string;
  guide_name: string;
  guide_reflection: string;
  embedding_text: string;
  reused_from: string | null;
  created_at: string;
}

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
  {
    name: "Pastor Mark",
    denomination: "Non-Denominational",
    tradition: "Christianity",
    emoji: "✝️",
    focus: "Bible-centered faith, local church autonomy",
    description: "Passionate about Scripture-based Christianity without denominational constraints. Emphasizes personal relationship with Christ and local church independence.",
    color: "#8B5CF6",
    coreTexts: ["Old Testament", "New Testament", "Early Church History"]
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
    color: "#06B6D4",
    coreTexts: ["Pali Canon (Tipitaka)", "Vinaya Pitaka", "Sutta Pitaka", "Abhidhamma Pitaka"]
  },
  {
    name: "Roshi Kenji",
    denomination: "Zen/Mahayana",
    tradition: "Buddhism",
    emoji: "⚫",
    focus: "Zazen, koans, sudden enlightenment",
    description: "Zen master teaching the direct path to awakening through seated meditation, koan study, and sudden realization.",
    color: "#0891B2",
    coreTexts: ["Heart Sutra", "Diamond Sutra", "Lotus Sutra", "Zen Koans", "Platform Sutra"]
  },
  {
    name: "Lama Tenzin",
    denomination: "Tibetan/Vajrayana",
    tradition: "Buddhism",
    emoji: "🏔️",
    focus: "Tantric practices, compassion",
    description: "Tibetan Buddhist teacher emphasizing bodhisattva compassion, tantric visualization, and the Dalai Lama's lineage.",
    color: "#0E7490",
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
  },
  
  // New guides for existing traditions
  {
    name: "Rabbi Leah",
    denomination: "Reconstructionist",
    tradition: "Judaism",
    emoji: "🌱",
    focus: "Judaism as evolving civilization",
    description: "Reconstructionist rabbi viewing Judaism as an evolving religious civilization. Community-centered, democratic decision-making, creative reinterpretation.",
    color: "#3B82F6",
    coreTexts: ["Torah (Pentateuch)", "Tanakh", "Mishnah", "Kaplan's Writings", "Reconstructionist Liturgy"]
  },
  {
    name: "Devi Lakshmi",
    denomination: "Shaktism",
    tradition: "Hinduism",
    emoji: "🔥",
    focus: "Sacred feminine, Shakti worship, tantra",
    description: "Shakta priestess devoted to the Divine Mother in all her forms — Durga, Kali, Lakshmi, Saraswati. Expert in tantric philosophy and goddess worship.",
    color: "#F59E0B",
    coreTexts: ["Devi Mahatmya", "Devi Bhagavata Purana", "Lalita Sahasranama", "Soundarya Lahari", "Tantric Agamas"]
  },
  {
    name: "Bhai Harpreet",
    denomination: "Sikh",
    tradition: "Sikhism",
    emoji: "🪯",
    focus: "Guru Granth Sahib, seva, equality",
    description: "Devout Sikh scholar and granthi. Expert in Guru Granth Sahib, Sikh history, the lives of the ten Gurus, and the Khalsa tradition of service and justice.",
    color: "#1E40AF",
    coreTexts: ["Guru Granth Sahib", "Dasam Granth", "Janamsakhis", "Rehat Maryada", "Vars of Bhai Gurdas"]
  },
  {
    name: "Acharya Pradeep",
    denomination: "Jain",
    tradition: "Jainism",
    emoji: "🙏",
    focus: "Ahimsa, asceticism, karma, liberation",
    description: "Jain monk-scholar teaching the path of non-violence, self-discipline, and liberation. Expert in Jain philosophy, the lives of the Tirthankaras, and ethical practice.",
    color: "#059669",
    coreTexts: ["Tattvartha Sutra", "Kalpa Sutra", "Acharanga Sutra", "Uttaradhyayana Sutra", "Samayasara"]
  },
  {
    name: "Mobed Cyrus",
    denomination: "Zoroastrian",
    tradition: "Zoroastrianism",
    emoji: "🔥",
    focus: "Sacred fire, good thoughts/words/deeds, cosmic dualism",
    description: "Zoroastrian priest (mobed) with deep knowledge of the Avesta, Zarathustra's teachings, and the cosmic struggle between truth (asha) and falsehood (druj).",
    color: "#DC2626",
    coreTexts: ["Avesta", "Gathas", "Vendidad", "Yasna", "Bundahishn"]
  }
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
  // Abrahamic (original 10)
  'c13ecfa9-a977-48ec-8b7a-637a21d7ff80': { name: 'Orthodox Judaism', emoji: '✡️', color: '#0047AB' },
  '621564b2-d131-4c24-ac64-281658481f15': { name: 'Conservative Judaism', emoji: '✡️', color: '#2E5CB8' },
  '95612ae9-a8e4-4824-8a88-440dc0862bf1': { name: 'Reform Judaism', emoji: '✡️', color: '#4A90D9' },
  'dcbfa96f-e023-471b-9047-0cf42c06a521': { name: 'Reconstructionist Judaism', emoji: '✡️', color: '#6BA3E8' },
  '07e9bc55-8ded-4951-b856-4e9d2fc95ec7': { name: 'Messianic Judaism', emoji: '✡️✝️', color: '#3D6098' },
  'd2211e0e-1cb7-4c5c-b4cf-e87e44f00203': { name: 'Catholicism', emoji: '✝️', color: '#8B0000' },
  'dcf8478c-62ea-4e6f-95cc-821ff763af26': { name: 'Eastern Orthodox', emoji: '☦️', color: '#8B4513' },
  'e18e894d-011c-43a8-87c4-d95ca8e13394': { name: 'Evangelical Protestant', emoji: '📖', color: '#4169E1' },
  'c8b1d2f3-e4a5-4c6d-8e9f-0a1b2c3d4e5f': { name: 'Non-Denominational Christianity', emoji: '✝️', color: '#EF4444' },
  '7e4cebb8-8a43-4e21-a26d-a12d1f1f3f1c': { name: 'Sunni Islam', emoji: '☪️', color: '#006400' },
  '12e600a9-a55a-4952-ad8b-4fa2354ebb94': { name: 'Shia Islam', emoji: '☪️', color: '#228B22' },
  // Hindu (3)
  '8c2f4013-68db-463b-a562-662c36273948': { name: 'Vaishnavism', emoji: '🕉️', color: '#FF6B00' },
  '79e853c3-89f6-4c85-ba0c-10f265fd6ea6': { name: 'Shaivism', emoji: '🕉️', color: '#E85D04' },
  '4b7ca317-bc0f-4544-a656-4d59d3a12189': { name: 'Shaktism', emoji: '🕉️', color: '#DC2F02' },
  // Buddhist (3)
  '26bf9037-e1d8-4f80-85c5-a7b51cbe10a4': { name: 'Theravada Buddhism', emoji: '☸️', color: '#06B6D4' },
  '6074fe56-2c15-46f7-86e6-fd0ffe4b1733': { name: 'Mahayana Buddhism', emoji: '☸️', color: '#0891B2' },
  'e0e6a849-5b1a-45a7-ae71-105657dbd6d5': { name: 'Vajrayana Buddhism', emoji: '☸️', color: '#0E7490' },
  // Other world religions (4)
  '75089521-6139-4c54-8548-6aff1a94357d': { name: 'Sikhism', emoji: '🪯', color: '#1E40AF' },
  '1f0d8d43-9e42-404b-a6e5-7ac7e6954abf': { name: "Bahá'í Faith", emoji: '✯', color: '#7C3AED' },
  'bfffb7e8-6bf7-4d4a-b24b-a963879e86ec': { name: 'Jainism', emoji: '🙏', color: '#059669' },
  '7cefcdfe-363f-45ad-b1f7-d7d562ef8ef7': { name: 'Zoroastrianism', emoji: '🔥', color: '#DC2626' },
  // New 5 (matching existing guides)
  '5768728a-75b3-4e4c-a7b8-3107f903f339': { name: 'Sufi Islam', emoji: '🌀', color: '#047857' },
  '57c9140c-03bc-466d-a06e-fe221b7a66fa': { name: 'Mainline Protestant', emoji: '🕊️', color: '#6366F1' },
  'b2c0cdd8-ffb9-4b78-81f0-a4409109aac8': { name: 'Advaita Vedanta', emoji: '🕉️', color: '#CA8A04' },
  'efd93870-4118-400a-93fe-25cd09cf3bd0': { name: 'Secular Humanism', emoji: '🌍', color: '#6B7280' },
  '3ad57c60-b6be-419d-8bf3-3e5b1d5875a6': { name: 'Interfaith Mysticism', emoji: '✨', color: '#A855F7' },
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
  // Hindu
  'vaishnavism':              { emoji: '🕉️', label: 'Vaishnavism', color: '#FF6B0050' },
  'shaivism':                 { emoji: '🕉️', label: 'Shaivism', color: '#E85D0450' },
  'shaktism':                 { emoji: '🕉️', label: 'Shaktism', color: '#DC2F0250' },
  // Buddhist
  'theravada_buddhism':       { emoji: '☸️', label: 'Theravada Buddhism', color: '#06B6D450' },
  'mahayana_buddhism':        { emoji: '☸️', label: 'Mahayana Buddhism', color: '#0891B250' },
  'vajrayana_buddhism':       { emoji: '☸️', label: 'Vajrayana Buddhism', color: '#0E749050' },
  // Other
  'sikhism':                  { emoji: '🪯', label: 'Sikhism', color: '#1E40AF50' },
  'bahai_faith':              { emoji: '✯', label: "Bahá'í Faith", color: '#7C3AED50' },
  'jainism':                  { emoji: '🙏', label: 'Jainism', color: '#05966950' },
  'zoroastrianism':           { emoji: '🔥', label: 'Zoroastrianism', color: '#DC262650' },
  // New 5
  'sufi_islam':               { emoji: '🌀', label: 'Sufi Islam', color: '#04785750' },
  'mainline_protestant':      { emoji: '🕊️', label: 'Mainline Protestant', color: '#6366F150' },
  'advaita_vedanta':          { emoji: '🕉️', label: 'Advaita Vedanta', color: '#CA8A0450' },
  'secular_humanism':         { emoji: '🌍', label: 'Secular Humanism', color: '#6B728050' },
  'interfaith_mysticism':     { emoji: '✨', label: 'Interfaith Mysticism', color: '#A855F750' },
  // Legacy 3-family keys
  'jewish':                   { emoji: '✡️', label: 'Jewish', color: '#3B82F650' },
  'christian':                { emoji: '✝️', label: 'Christian', color: '#8B5CF650' },
  'islamic':                  { emoji: '☪️', label: 'Islamic', color: '#10B98150' },
};

function parseCalendarContext(calendarContext: string | null | undefined): CalendarPanel[] {
  if (!calendarContext) return [];
  
  // Try JSON format first (new generation format)
  try {
    const parsed = JSON.parse(calendarContext);
    if (parsed && typeof parsed === 'object' && parsed.tradition_slug) {
      const slug = parsed.tradition_slug as string;
      // Normalize slug to config key: "orthodox-judaism" → "orthodox_judaism"
      const key = slug.replace(/-/g, '_');
      const config = CALENDAR_TRADITION_CONFIG[key];
      const text = parsed.calendar_context_text || '';
      // Build rich text from available fields
      const lines: string[] = [];
      if (parsed.calendar_date) lines.push(`${parsed.calendar_date}`);
      if (parsed.season && parsed.season !== 'Ordinary Time') lines.push(`Season: ${parsed.season}`);
      if (parsed.parsha) lines.push(`Torah portion: ${typeof parsed.parsha === 'string' ? parsed.parsha : JSON.stringify(parsed.parsha)}`);
      if (parsed.observances?.length > 0) lines.push(`Observances: ${parsed.observances.join(', ')}`);
      if (text && !lines.some(l => l === text)) lines.push(text);
      
      const displayText = lines.join('\n');
      if (config && displayText) {
        return [{ key, emoji: config.emoji, label: config.label, text: displayText, color: config.color }];
      }
      // Fallback: use tradition_name for label
      if (displayText) {
        const name = parsed.tradition_name || slug;
        return [{ key, emoji: '📖', label: name, text: displayText, color: '#94A3B8' }];
      }
      return [];
    }
  } catch {
    // Not JSON — fall through to pipe/legacy parsing
  }
  
  const parts = calendarContext.split('|').map(p => p.trim()).filter(Boolean);
  const panels: CalendarPanel[] = [];

  for (const part of parts) {
    // Try labeled format: [key]: text
    const labelMatch = part.match(/^\[([^\]]+)\]:\s*(.+)$/);
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

// Collect calendar context panels from ALL lessons (not just the first one)
function collectAllCalendarContexts(lessons: any[]): CalendarPanel[] {
  const seen = new Set<string>();
  const allPanels: CalendarPanel[] = [];
  for (const lesson of lessons) {
    if (!lesson.calendarContext) continue;
    const panels = parseCalendarContext(lesson.calendarContext);
    for (const panel of panels) {
      // Deduplicate by key
      if (!seen.has(panel.key)) {
        seen.add(panel.key);
        allPanels.push(panel);
      }
    }
  }
  return allPanels;
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

  const [conversationId, setConversationId] = useState<string | null>(null);

  // Generate or retrieve user ID
  const getUserId = () => {
    let userId = localStorage.getItem('faith-journey-user-id');
    if (!userId) {
      userId = `faith-user-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('faith-journey-user-id', userId);
    }
    return userId;
  };

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
      // Map guide tradition to agent ID - use the tradition from the guide
      // The agent_configs should have IDs matching the tradition IDs from faith-traditions.ts
      const agentId = guide.tradition?.toLowerCase().replace(/\s+/g, '-') || 'spiritual-not-religious';
      const userId = getUserId();

      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          userId: userId,
          conversationId: conversationId
        })
      });

      if (!response.ok) {
        // Fall back to old API if new one fails
        const fallbackResponse = await fetch('/api/faith/guides/chat', {
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

        if (!fallbackResponse.ok) {
          throw new Error('Failed to get response');
        }

        const fallbackData = await fallbackResponse.json();
        
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: fallbackData.response,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      const data = await response.json();
      
      // Store conversation ID for future messages
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      
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

// ===== Holiday Detail Modal =====

function HolidayDetailModal({ 
  holiday, 
  onClose 
}: { 
  holiday: any; 
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'history' | 'traditions'>('history');
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTradition, setExpandedTradition] = useState<string | null>(null);

  useEffect(() => {
    const fetchHolidayDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams({
          name: holiday.name,
          year: '2026'
        });
        
        const response = await fetch(`/api/faith/holiday-detail?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch holiday detail');
        }
        
        const data = await response.json();
        setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load holiday detail');
      } finally {
        setLoading(false);
      }
    };

    fetchHolidayDetail();
  }, [holiday.name]);

  const traditionsCount = detail?.traditions?.filter((t: any) => t.observance)?.length || 0;

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
              <span className="text-2xl">{holiday.emoji || '🎉'}</span>
              <div>
                <h1 className="text-lg font-bold text-slate-100">{holiday.name}</h1>
                <p className="text-sm text-slate-400">{holiday.tradition} • {holiday.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation — 2 tabs: History + Traditions */}
          <div className="flex gap-1">
            {[
              { key: "history", label: "History", icon: BookOpen },
              { key: "traditions", label: traditionsCount > 0 ? `Traditions (${traditionsCount})` : "Traditions", icon: Globe },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'history' | 'traditions')}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  style={{
                    backgroundColor: isActive ? "rgba(212, 160, 32, 0.15)" : "transparent",
                    color: isActive ? "#D4A020" : "#8B8B80",
                    border: isActive ? "1px solid rgba(212, 160, 32, 0.3)" : "1px solid transparent",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "#D4A020" }} />
              <h3 className="text-slate-400 font-medium mb-1">Generating holiday content...</h3>
              <p className="text-slate-600 text-sm">This may take a moment for first-time generation</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <h3 className="text-red-400 font-medium mb-1">Error Loading Content</h3>
              <p className="text-slate-600 text-sm">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-slate-100">History & Origins</h3>
                  {detail?.history ? (
                    <div className="text-slate-300 prose-sm max-w-none">
                      {renderMarkdown(detail.history)}
                    </div>
                  ) : (
                    <p className="text-slate-400">No historical information available for this holiday.</p>
                  )}
                </div>
              )}

              {activeTab === 'traditions' && (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-slate-100">How Each Tradition Observes</h3>
                  <p className="text-sm text-slate-500">
                    {traditionsCount} tradition{traditionsCount !== 1 ? 's' : ''} with content for {holiday.name}
                  </p>
                  {detail?.traditions?.length > 0 ? (
                    <div className="space-y-2">
                      {detail.traditions.filter((t: any) => t.observance).map((tradition: any, idx: number) => {
                        const isExpanded = expandedTradition === tradition.slug;
                        return (
                          <div 
                            key={idx} 
                            className="rounded-lg border overflow-hidden"
                            style={{ backgroundColor: "#13131B", borderColor: isExpanded ? "#D4A02050" : "#2A2A38" }}
                          >
                            {/* Tradition header — clickable accordion */}
                            <button
                              onClick={() => setExpandedTradition(isExpanded ? null : tradition.slug)}
                              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/20 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{tradition.icon || '📖'}</span>
                                <h4 className="text-base font-medium text-slate-100">{tradition.name}</h4>
                                {tradition.cached && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400">cached</span>
                                )}
                              </div>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>
                            
                            {/* Expanded content */}
                            {isExpanded && (
                              <div className="px-4 pb-4 border-t" style={{ borderColor: "#2A2A3850" }}>
                                <div className="pt-3 text-slate-300 prose-sm max-w-none">
                                  {renderMarkdown(tradition.observance)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-400">No tradition observances found for this holiday.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [religiousHolidays, setReligiousHolidays] = useState<HolidayEvent[]>([]);
  const [selectedReligion, setSelectedReligion] = useState<string | null>(null);
  const [selectedDenomination, setSelectedDenomination] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  
  // Calendar tab compact features
  const [expandedContextTraditions, setExpandedContextTraditions] = useState<Set<string>>(new Set());
  const [lessonTraditionFilters, setLessonTraditionFilters] = useState<Set<string>>(new Set(["Judaism", "Christianity", "Islam", "Hinduism", "Buddhism", "Bahá'í", "Other"]));
  
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

  // Holiday detail modal
  const [selectedHoliday, setSelectedHoliday] = useState<any | null>(null);

  // Images tab state
  const [images, setImages] = useState<FaithImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageFilter, setImageFilter] = useState<string>("all");
  const [selectedTraditions, setSelectedTraditions] = useState<Set<string>>(new Set(["all"]));
  const [imageSearch, setImageSearch] = useState("");
  const [imageDate, setImageDate] = useState<string>("all");
  const [expandedTraditions, setExpandedTraditions] = useState<Set<string>>(new Set());

  // Audio tab state
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioFilter, setAudioFilter] = useState<string>("all");
  const [audioSearch, setAudioSearch] = useState("");
  const [audioDate, setAudioDate] = useState<string>("all");
  const [audioTypeFilter, setAudioTypeFilter] = useState<string>("all");
  const [audioViewMode, setAudioViewMode] = useState<"tradition" | "date">("tradition");
  const [elevenlabsUsage, setElevenlabsUsage] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({});
  const [ambientTracks, setAmbientTracks] = useState<any[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<any>(null);
  const [voiceConfigLoading, setVoiceConfigLoading] = useState(false);
  const [editingVoice, setEditingVoice] = useState<string | null>(null); // tradition slug being edited
  const [editingFamily, setEditingFamily] = useState<string | null>(null); // tradition family being edited
  const [editVoiceId, setEditVoiceId] = useState('');
  const [voiceSaving, setVoiceSaving] = useState(false);
  const [addingCustomVoice, setAddingCustomVoice] = useState(false);
  const [newVoiceId, setNewVoiceId] = useState('');
  const [newVoiceName, setNewVoiceName] = useState('');

  // Audio Library Modal state
  const [selectedTraditionModal, setSelectedTraditionModal] = useState<string | null>(null);
  const [modalAudioFilter, setModalAudioFilter] = useState<string>("all");

  // Pipeline status state
  const [pipelineStatus, setPipelineStatus] = useState<any>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  // Prayer data state  
  const [dailyPrayers, setDailyPrayers] = useState<any[]>([]);
  const [sleepPrayers, setSleepPrayers] = useState<any[]>([]);

  // Calendar content sections collapse state
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Users tab state
  const [usersData, setUsersData] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [totalAuthUsers, setTotalAuthUsers] = useState<number>(0);
  const [traditionBreakdown, setTraditionBreakdown] = useState<Record<string, number>>({});

  // Fetch voice configuration from API
  const fetchVoiceConfig = async () => {
    setVoiceConfigLoading(true);
    try {
      const res = await fetch('/api/faith/voice-config');
      if (res.ok) {
        const data = await res.json();
        setVoiceConfig(data);
      }
    } catch (e) {
      console.error('Failed to fetch voice config:', e);
    }
    setVoiceConfigLoading(false);
  };

  // Save voice mapping change
  const saveVoiceMapping = async (slug: string, voiceId: string) => {
    setVoiceSaving(true);
    try {
      const res = await fetch('/api/faith/voice-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [{ slug, voiceId }] }),
      });
      if (res.ok) {
        await fetchVoiceConfig();
        setEditingVoice(null);
      }
    } catch (e) {
      console.error('Failed to save voice mapping:', e);
    }
    setVoiceSaving(false);
  };

  // Save voice mapping for entire tradition family
  const saveFamilyVoiceMapping = async (family: string, voiceId: string) => {
    if (!voiceConfig?.grouped?.[family]) return;
    
    setVoiceSaving(true);
    try {
      // Get all tradition slugs in this family
      const traditions = voiceConfig.grouped[family];
      const updates = traditions.map((t: any) => ({ slug: t.slug, voiceId }));
      
      const res = await fetch('/api/faith/voice-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        await fetchVoiceConfig();
        setEditingFamily(null);
      }
    } catch (e) {
      console.error('Failed to save family voice mapping:', e);
    }
    setVoiceSaving(false);
  };

  // Add custom voice
  const addCustomVoice = async () => {
    if (!newVoiceId || !newVoiceName) return;
    try {
      const res = await fetch('/api/faith/voice-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: newVoiceId, voiceName: newVoiceName, category: 'custom' }),
      });
      if (res.ok) {
        await fetchVoiceConfig();
        setNewVoiceId('');
        setNewVoiceName('');
        setAddingCustomVoice(false);
      }
    } catch (e) {
      console.error('Failed to add custom voice:', e);
    }
  };

  // Fetch ambient tracks from API
  const fetchAmbientTracks = async () => {
    try {
      const res = await fetch('/api/faith/ambient-tracks');
      if (res.ok) {
        const data = await res.json();
        setAmbientTracks(data.tracks || []);
      }
    } catch (e) {
      console.error('Failed to fetch ambient tracks:', e);
    }
  };

  // Fetch users data from API
  const fetchUsersData = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/faith/users');
      if (res.ok) {
        const data = await res.json();
        setUsersData(data.users || []);
        setTotalAuthUsers(data.totalAuthUsers || 0);
        setTraditionBreakdown(data.traditionBreakdown || {});
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
    setUsersLoading(false);
  };

  // Delete a user
  const deleteUser = async (userId: string) => {
    setDeletingUser(userId);
    try {
      const res = await fetch(`/api/faith/users?userId=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Refresh users list
        await fetchUsersData();
        // Refresh dashboard data to update overview stats
        await loadData();
        setShowDeleteConfirm(null);
      } else {
        console.error('Failed to delete user');
      }
    } catch (e) {
      console.error('Failed to delete user:', e);
    }
    setDeletingUser(null);
  };

  // Tradition families configuration for badge filters
  const traditionFamilies = [
    { id: "all", name: "All", emoji: "🌟", color: "#6366F1" },
    { id: "Judaism", name: "Judaism", emoji: "✡️", color: "#EAB308" },
    { id: "Christianity", name: "Christianity", emoji: "✝️", color: "#3B82F6" },
    { id: "Islam", name: "Islam", emoji: "☪️", color: "#10B981" },
    { id: "Hinduism", name: "Hinduism", emoji: "🕉️", color: "#F97316" },
    { id: "Buddhism", name: "Buddhism", emoji: "☸️", color: "#8B5CF6" },
    { id: "Other", name: "Other", emoji: "🔯", color: "#6B7280" },
  ];

  // Toggle tradition selection
  const toggleTradition = (traditionId: string) => {
    setSelectedTraditions(prev => {
      const newSet = new Set(prev);
      
      if (traditionId === "all") {
        // If "all" is selected, clear everything and select only "all"
        return new Set(["all"]);
      } else {
        // Remove "all" if it's selected
        newSet.delete("all");
        
        if (newSet.has(traditionId)) {
          newSet.delete(traditionId);
          // If no traditions are selected, default back to "all"
          if (newSet.size === 0) {
            newSet.add("all");
          }
        } else {
          newSet.add(traditionId);
        }
      }
      
      return newSet;
    });
  };

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

  // Fetch religious holidays from API
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await fetch(`/api/faith/holidays?year=${selectedYear}`);
        if (res.ok) {
          const data = await res.json();
          
          // Map traditions to colors
          const traditionColors: Record<string, string> = {
            'Judaism': '#3B82F6',
            'Christianity': '#8B5CF6', 
            'Islam': '#10B981',
            'Hinduism': '#F59E0B',
            'Buddhism': '#06B6D4',
            'Bahá\'í': '#EC4899',
            'Sikhism': '#1E40AF'
          };
          
          // Transform API response to HolidayEvent format
          const transformedHolidays: HolidayEvent[] = (data.holidays || []).map((holiday: any) => ({
            name: holiday.name,
            date: holiday.startDate,
            tradition: holiday.tradition,
            description: holiday.description,
            color: traditionColors[holiday.tradition] || '#6B7280'
          }));
          
          setReligiousHolidays(transformedHolidays);
        }
      } catch (error) {
        console.error('Failed to fetch holidays:', error);
        // Keep empty array on error
        setReligiousHolidays([]);
      }
    };
    
    fetchHolidays();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard data, daily prayers, and sleep prayers in parallel
      const [dashboardRes, dailyPrayersRes, sleepPrayersRes] = await Promise.all([
        fetch("/api/faith/dashboard"),
        fetch("/api/faith/daily-prayers"),
        fetch("/api/faith/sleep-prayers")
      ]);
      
      if (!dashboardRes.ok) {
        const errorData = await dashboardRes.json();
        throw new Error(errorData.error || `HTTP ${dashboardRes.status}`);
      }
      
      const dashboardData: DashboardData = await dashboardRes.json();
      setData(dashboardData);
      
      // Handle daily prayers (non-fatal if it fails)
      try {
        if (dailyPrayersRes.ok) {
          const dailyPrayersData = await dailyPrayersRes.json();
          setDailyPrayers(Array.isArray(dailyPrayersData) ? dailyPrayersData : (dailyPrayersData.prayers || []));
        }
      } catch (e) {
        console.warn('Failed to load daily prayers:', e);
        setDailyPrayers([]);
      }
      
      // Handle sleep prayers (non-fatal if it fails)  
      try {
        if (sleepPrayersRes.ok) {
          const sleepPrayersData = await sleepPrayersRes.json();
          setSleepPrayers(Array.isArray(sleepPrayersData) ? sleepPrayersData : (sleepPrayersData.prayers || []));
        }
      } catch (e) {
        console.warn('Failed to load sleep prayers:', e);
        setSleepPrayers([]);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch users when users tab is active
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsersData();
    }
  }, [activeTab]);

  // Fetch pipeline status when overview tab is active
  useEffect(() => {
    if (activeTab === "overview") {
      fetchPipelineStatus();
    }
  }, [activeTab]);

  const tabs: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users },
    { key: "guides", label: "Guides", icon: MessageSquare },
    { key: "calendar", label: "Calendar", icon: Calendar },
    { key: "audio", label: "Audio", icon: Volume2 },
    { key: "texts", label: "Texts", icon: Scroll },
    { key: "images", label: "Images", icon: ImageIcon },
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

  const toggleSectionCollapse = (sectionKey: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionKey)) {
      newCollapsed.delete(sectionKey);
    } else {
      newCollapsed.add(sectionKey);
    }
    setCollapsedSections(newCollapsed);
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

  // Helper functions for compact calendar features
  const toggleContextTradition = (traditionKey: string) => {
    const newExpanded = new Set(expandedContextTraditions);
    if (newExpanded.has(traditionKey)) {
      newExpanded.delete(traditionKey);
    } else {
      newExpanded.add(traditionKey);
    }
    setExpandedContextTraditions(newExpanded);
  };

  const toggleLessonTraditionFilter = (tradition: string) => {
    const newFilters = new Set(lessonTraditionFilters);
    if (newFilters.has(tradition)) {
      newFilters.delete(tradition);
    } else {
      newFilters.add(tradition);
    }
    setLessonTraditionFilters(newFilters);
  };

  const groupCalendarContextByTradition = (panels: any[]) => {
    const groups = {
      "Judaism": { emoji: "✡️", panels: [] as any[] },
      "Christianity": { emoji: "✝️", panels: [] as any[] },
      "Islam": { emoji: "☪️", panels: [] as any[] },
      "Hinduism": { emoji: "🕉️", panels: [] as any[] },
      "Buddhism": { emoji: "☸️", panels: [] as any[] },
      "Bahá'í": { emoji: "✴️", panels: [] as any[] },
      "Other": { emoji: "🌟", panels: [] as any[] }
    } as Record<string, { emoji: string; panels: any[] }>;

    panels.forEach(panel => {
      if (panel.key.includes('judaism') || panel.key === 'jewish' || panel.key.includes('messianic')) {
        groups.Judaism.panels.push(panel);
      } else if (panel.key.includes('christian') || panel.key.includes('catholic') || panel.key.includes('protestant') || panel.key.includes('evangelical') || panel.key.includes('mainline') || panel.key === 'eastern_orthodox') {
        groups.Christianity.panels.push(panel);
      } else if (panel.key.includes('islam') || panel.key.includes('sunni') || panel.key.includes('shia') || panel.key.includes('sufi') || panel.key === 'islamic') {
        groups.Islam.panels.push(panel);
      } else if (panel.key.includes('vaishnav') || panel.key.includes('shaiv') || panel.key.includes('shakti') || panel.key.includes('hindu') || panel.key.includes('advaita') || panel.key.includes('vedanta')) {
        groups.Hinduism.panels.push(panel);
      } else if (panel.key.includes('buddhism') || panel.key.includes('theravada') || panel.key.includes('mahayana') || panel.key.includes('vajrayana')) {
        groups.Buddhism.panels.push(panel);
      } else if (panel.key.includes('bahai') || panel.key.includes("bahá'í")) {
        groups["Bahá'í"].panels.push(panel);
      } else {
        groups.Other.panels.push(panel);
      }
    });

    return groups;
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
    setSelectedDay(today);
    setSelectedReligion(null); setSelectedDenomination(null);
  };

  // Calendar helper functions
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Cross-calendar date conversion using Intl.DateTimeFormat
  const getCrossCalendarDates = (date: Date) => {
    const formatCalendar = (calendar: string) => {
      try {
        return new Intl.DateTimeFormat('en-u-ca-' + calendar, {
          day: 'numeric', month: 'long', year: 'numeric'
        }).format(date);
      } catch { return ''; }
    };
    
    return {
      hebrew: formatCalendar('hebrew'),
      islamic: formatCalendar('islamic'),
      indian: formatCalendar('indian'), // Saka/Indian National Calendar
    };
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const holidays = getFilteredHolidays().filter(holiday => holiday.date === dateStr);
    const lessons = data?.lessons?.filter(lesson => lesson.date === dateStr) || [];
    const prayers = dailyPrayers.filter(prayer => prayer.date === dateStr);
    const sleepPrayersForDate = sleepPrayers.filter(prayer => prayer.date === dateStr);
    return { holidays, lessons, prayers: [...prayers, ...sleepPrayersForDate] };
  };

  const getTraditionColors = () => ({
    "Judaism": "#3B82F6",
    "Christianity": "#8B5CF6", 
    "Islam": "#10B981",
    "Hinduism": "#F59E0B",
    "Buddhism": "#06B6D4",
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

  // Fetch images function
  const fetchImages = async () => {
    if (imagesLoading) return;
    
    setImagesLoading(true);
    try {
      const response = await fetch(
        "https://atldnpjaxaeqzgtqbrpy.supabase.co/rest/v1/faith_daily_images?select=*&order=date.desc,tradition_family.asc",
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bGRucGpheGFlcXpndHFicnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0Nzc0MDYsImV4cCI6MjA4NTA1MzQwNn0.40LmcgShkiG18aa6aF7vk6wT_Ft5ohWeUtRAG_reizs',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bGRucGpheGFlcXpndHFicnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0Nzc0MDYsImV4cCI6MjA4NTA1MzQwNn0.40LmcgShkiG18aa6aF7vk6wT_Ft5ohWeUtRAG_reizs'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      } else {
        console.error('Failed to fetch images');
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setImagesLoading(false);
    }
  };

  // Fetch audio files function
  const fetchAudioFiles = async () => {
    if (audioLoading) return;
    
    setAudioLoading(true);
    try {
      const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bGRucGpheGFlcXpndHFicnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0Nzc0MDYsImV4cCI6MjA4NTA1MzQwNn0.40LmcgShkiG18aa6aF7vk6wT_Ft5ohWeUtRAG_reizs';
      const sbHeaders = { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` };
      
      // Fetch lesson/prayer audio files
      const audioResponse = await fetch(
        "https://atldnpjaxaeqzgtqbrpy.supabase.co/rest/v1/faith_lesson_audio?select=*&order=date.desc,created_at.desc",
        { headers: sbHeaders }
      );

      // Fetch podcast episodes
      const podcastResponse = await fetch(
        "https://atldnpjaxaeqzgtqbrpy.supabase.co/rest/v1/faith_podcast_episodes?select=*&order=date.desc,created_at.desc",
        { headers: sbHeaders }
      );

      const audioData = audioResponse.ok ? await audioResponse.json() : [];
      const podcastData = podcastResponse.ok ? await podcastResponse.json() : [];
      
      // Fetch related data for lessons and traditions
      const lessonIds = Array.from(new Set(audioData.map((audio: any) => audio.lesson_id).filter(Boolean)));
      const allTraditionIds = Array.from(new Set([
        ...audioData.map((a: any) => a.tradition_id),
        ...podcastData.map((p: any) => p.tradition_id)
      ].filter(Boolean)));
      
      // Fetch lessons
      const lessonsResponse = lessonIds.length > 0 ? await fetch(
        `https://atldnpjaxaeqzgtqbrpy.supabase.co/rest/v1/faith_lessons?select=id,topic,date&id=in.(${lessonIds.join(',')})`,
        { headers: sbHeaders }
      ) : null;
      
      // Fetch traditions
      const traditionsResponse = allTraditionIds.length > 0 ? await fetch(
        `https://atldnpjaxaeqzgtqbrpy.supabase.co/rest/v1/faith_traditions?select=id,slug,name,icon,color&id=in.(${allTraditionIds.join(',')})`,
        { headers: sbHeaders }
      ) : null;
      
      const lessons = lessonsResponse?.ok ? await lessonsResponse.json() : [];
      const traditions = traditionsResponse?.ok ? await traditionsResponse.json() : [];
      
      // Create lookup maps
      const lessonMap = new Map(lessons.map((lesson: any) => [lesson.id, lesson]));
      const traditionMap = new Map(traditions.map((tradition: any) => [tradition.id, tradition]));
      
      // Enrich lesson/prayer audio
      const enrichedAudio = audioData.map((audio: any) => ({
        ...audio,
        audio_type: audio.audio_type || (audio.storage_path?.startsWith('prayers/') ? 'prayer' : 'lesson'),
        lesson: lessonMap.get(audio.lesson_id),
        tradition: traditionMap.get(audio.tradition_id),
        audioUrl: `https://atldnpjaxaeqzgtqbrpy.supabase.co/storage/v1/object/public/faith-audio/${audio.storage_path}`
      }));
      
      // Enrich podcast episodes and normalize into same shape
      const enrichedPodcast = podcastData.map((ep: any) => ({
        ...ep,
        audio_type: 'podcast',
        lesson: { topic: ep.title, date: ep.date },
        tradition: traditionMap.get(ep.tradition_id),
        audioUrl: ep.storage_path ? `https://atldnpjaxaeqzgtqbrpy.supabase.co/storage/v1/object/public/faith-audio/${ep.storage_path}` : null
      }));
      
      setAudioFiles([...enrichedAudio, ...enrichedPodcast]);
    } catch (error) {
      console.error('Error fetching audio files:', error);
    } finally {
      setAudioLoading(false);
    }
  };

  // Fetch ElevenLabs usage
  const fetchElevenlabsUsage = async () => {
    if (usageLoading) return;
    
    setUsageLoading(true);
    try {
      const response = await fetch('/api/faith/audio/usage');
      if (response.ok) {
        const data = await response.json();
        setElevenlabsUsage(data);
      } else {
        console.error('Failed to fetch ElevenLabs usage');
      }
    } catch (error) {
      console.error('Error fetching ElevenLabs usage:', error);
    } finally {
      setUsageLoading(false);
    }
  };

  // Fetch pipeline status function
  const fetchPipelineStatus = async () => {
    if (pipelineLoading) return;
    
    setPipelineLoading(true);
    try {
      const response = await fetch('/api/faith/pipeline');
      if (response.ok) {
        const data = await response.json();
        setPipelineStatus(data);
      } else {
        // Fallback to mock data if endpoint doesn't exist yet
        setPipelineStatus({
          schedule: {
            lessons: "Daily at 02:00 UTC",
            prayers: "Daily at 02:30 UTC", 
            audio: "Daily at 03:00 UTC"
          },
          lastRun: {
            date: "2026-03-13",
            time: "02:15 UTC",
            status: "success",
            generated: ["lessons", "prayers", "audio"],
            duration: "47 minutes"
          },
          nextRun: {
            date: "2026-03-14",
            time: "02:00 UTC",
            willGenerate: ["lessons", "prayers", "audio"]
          },
          history: [
            { date: "2026-03-13", status: "success", duration: "47m" },
            { date: "2026-03-12", status: "success", duration: "52m" },
            { date: "2026-03-11", status: "success", duration: "45m" },
            { date: "2026-03-10", status: "partial", duration: "38m" },
            { date: "2026-03-09", status: "success", duration: "51m" },
            { date: "2026-03-08", status: "success", duration: "49m" },
            { date: "2026-03-07", status: "failed", duration: "12m" }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching pipeline status:', error);
      setPipelineStatus(null);
    } finally {
      setPipelineLoading(false);
    }
  };

  // Audio playback controls
  const toggleAudio = (audioId: string, audioUrl: string) => {
    // Pause all other audio
    Object.values(audioElements).forEach(audio => {
      if (!audio.paused) {
        audio.pause();
      }
    });

    if (currentlyPlaying === audioId) {
      // Stop current audio
      const audio = audioElements[audioId];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setCurrentlyPlaying(null);
    } else {
      // Start new audio
      let audio = audioElements[audioId];
      if (!audio) {
        audio = new Audio(audioUrl);
        audio.onended = () => setCurrentlyPlaying(null);
        setAudioElements(prev => ({ ...prev, [audioId]: audio }));
      }
      audio.play();
      setCurrentlyPlaying(audioId);
    }
  };

  // Lazy load audio when tab is selected
  useEffect(() => {
    if (activeTab === "audio" && audioFiles.length === 0) {
      fetchAudioFiles();
      fetchElevenlabsUsage();
      fetchAmbientTracks();
      fetchVoiceConfig();
    }
  }, [activeTab]);

  // Lazy load images when tab is selected
  useEffect(() => {
    if (activeTab === "images" && images.length === 0) {
      fetchImages();
    }
  }, [activeTab]);

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
                    value={totalAuthUsers || data?.overview.totalUsers || 0}
                    subValue={`${data?.overview.totalUsers || 0} with profiles`}
                    trend={totalAuthUsers > 0 ? "up" : "neutral"}
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

                {/* Content Generation Pipeline Status */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Content Generation Pipeline
                  </h3>
                  {pipelineLoading ? (
                    <div className="text-center py-8">
                      <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400">Loading pipeline status...</p>
                    </div>
                  ) : pipelineStatus?.pipeline ? (
                    <div className="space-y-6">
                      {/* A. Automated Schedule */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Automated Schedule
                        </h4>
                        <div className="text-xs text-slate-400 mb-3">{pipelineStatus.pipeline.schedule}</div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {pipelineStatus.pipeline.stages.map((stage: any) => (
                            <div key={stage.id} className="p-3 rounded-lg" style={{ backgroundColor: "#0B0B11" }}>
                              <div className="text-sm font-medium text-slate-200">{stage.name}</div>
                              <div className="text-xs text-slate-400 mt-1">Target: {stage.target}</div>
                              <div className="text-xs text-slate-500 mt-1">{stage.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* B. Daily Content Calendar */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Daily Content Calendar (Last 14 Days)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-slate-400 text-xs">
                                <th className="text-left p-2">Date</th>
                                <th className="text-center p-2">Lessons</th>
                                <th className="text-center p-2">Prayers</th>
                                <th className="text-center p-2">Images</th>
                                <th className="text-center p-2">Audio</th>
                                <th className="text-center p-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pipelineStatus.pipeline.dailyContent.map((day: any, index: number) => {
                                const isToday = day.date === new Date().toISOString().split('T')[0];
                                const isNextDate = day.date === pipelineStatus.pipeline.nextDate;
                                const statusColor = 
                                  day.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                                  day.status === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                                  day.status === 'missing' ? 'bg-red-500/20 text-red-400' :
                                  'bg-slate-500/20 text-slate-400';
                                
                                return (
                                  <tr key={index} className={`border-t border-slate-700/30 ${isToday ? 'bg-blue-500/10' : ''}`}>
                                    <td className="p-2">
                                      <div className="text-slate-200">
                                        {new Date(day.date).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: '2-digit'
                                        })}
                                      </div>
                                      {isToday && <div className="text-xs text-blue-400">Today</div>}
                                      {isNextDate && <div className="text-xs" style={{ color: "#D4A020" }}>Next Run</div>}
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className="text-slate-200">{day.lessons}</span>
                                      <span className="text-slate-500">/25</span>
                                      {day.lessons > 0 && day.lessons < 25 && (
                                        <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                                          <div 
                                            className="bg-yellow-400 h-1 rounded-full" 
                                            style={{ width: `${(day.lessons / 25) * 100}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className="text-slate-200">{day.prayers}</span>
                                      <span className="text-slate-500">/25</span>
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className="text-slate-200">{day.images}</span>
                                      <span className="text-slate-500">/6</span>
                                    </td>
                                    <td className="p-2 text-center text-slate-200">{day.audio}</td>
                                    <td className="p-2 text-center">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                        {day.status === 'complete' ? '✓' : 
                                         day.status === 'partial' ? '⚠' : 
                                         day.status === 'missing' ? '✗' : '-'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 text-xs text-slate-400">
                          Coverage: {pipelineStatus.pipeline.coverage.completeDays} complete, {pipelineStatus.pipeline.coverage.partialDays} partial, {pipelineStatus.pipeline.coverage.totalDays - pipelineStatus.pipeline.coverage.completeDays - pipelineStatus.pipeline.coverage.partialDays} missing
                        </div>
                      </div>

                      {/* C. Tradition Coverage */}
                      {(pipelineStatus.pipeline.latestTraditions.lessons.length > 0 || pipelineStatus.pipeline.latestTraditions.audio.length > 0) && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Tradition Coverage (Latest Complete Date)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pipelineStatus.pipeline.latestTraditions.lessons.length > 0 && (
                              <div className="p-3 rounded-lg" style={{ backgroundColor: "#0B0B11" }}>
                                <div className="text-sm font-medium text-slate-200 mb-2">Lessons ({pipelineStatus.pipeline.latestTraditions.lessons.length} traditions)</div>
                                <div className="text-xs text-slate-400 space-y-1">
                                  {pipelineStatus.pipeline.latestTraditions.lessons.slice(0, 8).map((tradition: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <Check className="w-3 h-3 text-green-400" />
                                      <span>{tradition.tradition}</span>
                                      <span className="text-slate-500">({tradition.count})</span>
                                    </div>
                                  ))}
                                  {pipelineStatus.pipeline.latestTraditions.lessons.length > 8 && (
                                    <div className="text-slate-500">+{pipelineStatus.pipeline.latestTraditions.lessons.length - 8} more...</div>
                                  )}
                                </div>
                              </div>
                            )}
                            {pipelineStatus.pipeline.latestTraditions.audio.length > 0 && (
                              <div className="p-3 rounded-lg" style={{ backgroundColor: "#0B0B11" }}>
                                <div className="text-sm font-medium text-slate-200 mb-2">Audio ({pipelineStatus.pipeline.latestTraditions.audio.length} traditions)</div>
                                <div className="text-xs text-slate-400 space-y-1">
                                  {pipelineStatus.pipeline.latestTraditions.audio.slice(0, 8).map((tradition: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <Volume2 className="w-3 h-3 text-blue-400" />
                                      <span>{tradition.tradition}</span>
                                      <span className="text-slate-500">({tradition.count})</span>
                                    </div>
                                  ))}
                                  {pipelineStatus.pipeline.latestTraditions.audio.length > 8 && (
                                    <div className="text-slate-500">+{pipelineStatus.pipeline.latestTraditions.audio.length - 8} more...</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* D. Run History (Enhanced) */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Recent History (Last 7 Days)
                        </h4>
                        <div className="grid grid-cols-7 gap-2">
                          {pipelineStatus.pipeline.dailyContent.slice(-7).map((day: any, index: number) => (
                            <div key={index} className="text-center">
                              <div 
                                className={`w-full h-8 rounded flex items-center justify-center text-xs font-medium ${
                                  day.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                                  day.status === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                                  day.status === 'missing' ? 'bg-red-500/20 text-red-400' :
                                  'bg-slate-500/20 text-slate-400'
                                }`}
                                title={`${day.date}: L:${day.lessons} P:${day.prayers} I:${day.images} A:${day.audio}`}
                              >
                                {day.status === 'complete' ? '✓' : 
                                 day.status === 'partial' ? '⚠' : 
                                 day.status === 'missing' ? '✗' : '-'}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400">Pipeline status unavailable</p>
                      <button
                        onClick={fetchPipelineStatus}
                        className="mt-2 px-4 py-2 rounded-lg text-sm transition-colors"
                        style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>

                {/* Podcast Episode Pipeline */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Mic className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Daily Dvar with AI Rabbi Moshe — Podcast Pipeline
                  </h3>
                  <div className="space-y-4">
                    {/* Pipeline Stages */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Stage 1: Upstream Content */}
                      <div className="flex items-center gap-4 p-4 rounded-lg border-l-4" style={{ backgroundColor: "#0B0B11", borderLeftColor: "#10B981" }}>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-6 h-6 text-green-400" />
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200">Stage 1: Upstream Content</h4>
                            <p className="text-xs text-slate-400">✅ Reused from nightly generation</p>
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">Active</div>
                        </div>
                      </div>
                      <div className="ml-8 text-xs text-slate-400 space-y-1">
                        <div>• Lesson text from faith_lessons table (25 traditions, generated nightly)</div>
                        <div>• Prayer text from faith_daily_prayers table (25 traditions, generated nightly)</div>
                      </div>

                      {/* Stage 2: Lesson & Prayer TTS */}
                      <div className="flex items-center gap-4 p-4 rounded-lg border-l-4" style={{ backgroundColor: "#0B0B11", borderLeftColor: "#10B981" }}>
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-6 h-6 text-green-400" />
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200">Stage 2: Lesson &amp; Prayer TTS</h4>
                            <p className="text-xs text-slate-400">🎙️ ElevenLabs</p>
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">Active</div>
                        </div>
                      </div>
                      <div className="ml-8 text-xs text-slate-400 space-y-1">
                        <div>• Lesson audio via /api/faith/audio endpoint</div>
                        <div>• Prayer audio via /api/faith/prayer-audio endpoint</div>
                        <div>• Voice: Rabbi Shafier (Orthodox Judaism)</div>
                        <div>• Reuses cached audio from app (stored in faith_lesson_audio table)</div>
                      </div>

                      {/* Stage 3: Podcast Wrapper Generation */}
                      <div className="flex items-center gap-4 p-4 rounded-lg border-l-4" style={{ backgroundColor: "#0B0B11", borderLeftColor: "#10B981" }}>
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-6 h-6 text-green-400" />
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200">Stage 3: Podcast Wrapper Generation</h4>
                            <p className="text-xs text-slate-400">✅ generate_episode.py</p>
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">Active</div>
                        </div>
                      </div>
                      <div className="ml-8 text-xs text-slate-400 space-y-1">
                        <div>• Intro script (welcome, topic preview, in-character as Rabbi Moshe)</div>
                        <div>• Transition script (bridge between lesson and prayer)</div>
                        <div>• Outro script (blessing, app promo, farewell)</div>
                        <div>• Generated by AI using Rabbi Moshe&apos;s persona</div>
                      </div>

                      {/* Stage 4: Wrapper TTS */}
                      <div className="flex items-center gap-4 p-4 rounded-lg border-l-4" style={{ backgroundColor: "#0B0B11", borderLeftColor: "#10B981" }}>
                        <div className="flex items-center gap-2">
                          <Mic className="w-6 h-6 text-green-400" />
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200">Stage 4: Wrapper TTS</h4>
                            <p className="text-xs text-slate-400">✅ ElevenLabs (Rabbi Shafier voice)</p>
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">Active</div>
                        </div>
                      </div>
                      <div className="ml-8 text-xs text-slate-400 space-y-1">
                        <div>• Same voice ID (W1EJxHy9vl73xgPIKgpn) and settings</div>
                        <div>• Generates audio for intro, transitions, outro segments</div>
                      </div>

                      {/* Stage 5: Episode Assembly */}
                      <div className="flex items-center gap-4 p-4 rounded-lg border-l-4" style={{ backgroundColor: "#0B0B11", borderLeftColor: "#10B981" }}>
                        <div className="flex items-center gap-2">
                          <Music className="w-6 h-6 text-green-400" />
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200">Stage 5: Episode Assembly</h4>
                            <p className="text-xs text-slate-400">✅ pydub + ffmpeg (music bed at -12dB)</p>
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">Active</div>
                        </div>
                      </div>
                      <div className="ml-8 text-xs text-slate-400 space-y-1">
                        <div>• Ambient music bed mixed at -12dB under entire episode</div>
                        <div>• Segments: intro → lesson → transition → prayer → outro</div>
                        <div>• Fade in/out on music</div>
                        <div>• ~10 minute total episode</div>
                      </div>

                      {/* Stage 6: Marketing Hub Post */}
                      <div className="flex items-center gap-4 p-4 rounded-lg border-l-4" style={{ backgroundColor: "#0B0B11", borderLeftColor: "#6B7280" }}>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-6 h-6 text-slate-400" />
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200">Stage 6: Marketing Hub Post</h4>
                            <p className="text-xs text-slate-400">📊 Auto-publish</p>
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div className="px-2 py-1 rounded text-xs font-medium bg-slate-500/20 text-slate-400">Planned</div>
                        </div>
                      </div>
                      <div className="ml-8 text-xs text-slate-400 space-y-1">
                        <div>• Episode details posted to Hub marketing page</div>
                        <div>• Title, description, duration, date, tradition</div>
                      </div>

                      {/* Stage 7: Distribution */}
                      <div className="flex items-center gap-4 p-4 rounded-lg border-l-4" style={{ backgroundColor: "#0B0B11", borderLeftColor: "#6B7280" }}>
                        <div className="flex items-center gap-2">
                          <Radio className="w-6 h-6 text-slate-400" />
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200">Stage 7: Distribution</h4>
                            <p className="text-xs text-slate-400">📡 Podcast Platforms</p>
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div className="px-2 py-1 rounded text-xs font-medium bg-slate-500/20 text-slate-400">Planned</div>
                        </div>
                      </div>
                      <div className="ml-8 text-xs text-slate-400 space-y-1">
                        <div>• RSS feed generation</div>
                        <div>• Auto-upload to Spotify for Podcasters</div>
                        <div>• Distributes to Apple Podcasts, Spotify, etc.</div>
                      </div>
                    </div>

                    {/* Pipeline Summary */}
                    <div className="mt-6 p-3 rounded-lg" style={{ backgroundColor: "#0B0B11" }}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-slate-300">Pipeline Status Summary</div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                            5 Active
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                            2 Planned
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-6">
                {/* Users Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    icon={Users}
                    label="Total Auth Users"
                    value={totalAuthUsers}
                    subValue="Registered accounts"
                    trend="neutral"
                  />
                  <StatCard
                    icon={Database}
                    label="With Profiles"
                    value={usersData.filter(u => u.hasProfile).length}
                    subValue={`${Math.round((usersData.filter(u => u.hasProfile).length / Math.max(totalAuthUsers, 1)) * 100)}% coverage`}
                    trend="neutral"
                  />
                  <StatCard
                    icon={AlertTriangle}
                    label="Profile Missing"
                    value={usersData.filter(u => !u.hasProfile).length}
                    subValue="Need onboarding"
                    trend="neutral"
                  />
                </div>

                {/* Tradition Breakdown */}
                {Object.keys(traditionBreakdown).length > 0 && (
                  <div className="rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <div className="p-6 border-b" style={{ borderColor: "#2A2A38" }}>
                      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <Globe className="w-5 h-5" style={{ color: "#D4A020" }} />
                        Tradition Breakdown
                      </h2>
                      <p className="text-slate-400 text-sm mt-1">
                        Anonymized breakdown of user faith traditions — helps prioritize content generation pipeline.
                      </p>
                    </div>
                    <div className="p-6">
                      {(() => {
                        // Separate primary traditions from exploring and meta keys
                        const primary: Record<string, number> = {};
                        const exploring: Record<string, number> = {};
                        let onboardingIncomplete = 0;
                        for (const [key, count] of Object.entries(traditionBreakdown)) {
                          if (key === '_onboarding_incomplete') {
                            onboardingIncomplete = count;
                          } else if (key.startsWith('exploring:')) {
                            exploring[key.replace('exploring:', '')] = count;
                          } else {
                            primary[key] = count;
                          }
                        }
                        const totalPrimary = Object.values(primary).reduce((a, b) => a + b, 0);

                        // Tradition display names and colors
                        const TRADITION_DISPLAY: Record<string, { name: string; emoji: string; color: string }> = {
                          'judaism': { name: 'Judaism', emoji: '✡️', color: '#3B82F6' },
                          'orthodox-judaism': { name: 'Orthodox Judaism', emoji: '✡️', color: '#0047AB' },
                          'conservative-judaism': { name: 'Conservative Judaism', emoji: '✡️', color: '#2E5CB8' },
                          'reform-judaism': { name: 'Reform Judaism', emoji: '✡️', color: '#4A90D9' },
                          'reconstructionist-judaism': { name: 'Reconstructionist Judaism', emoji: '✡️', color: '#6BA3E8' },
                          'messianic-judaism': { name: 'Messianic Judaism', emoji: '✡️✝️', color: '#3D6098' },
                          'christianity': { name: 'Christianity', emoji: '✝️', color: '#8B5CF6' },
                          'catholicism': { name: 'Catholicism', emoji: '✝️', color: '#8B0000' },
                          'eastern-orthodox': { name: 'Eastern Orthodox', emoji: '☦️', color: '#8B4513' },
                          'evangelical-protestant': { name: 'Evangelical Protestant', emoji: '📖', color: '#4169E1' },
                          'mainline-protestant': { name: 'Mainline Protestant', emoji: '🕊️', color: '#6366F1' },
                          'non-denominational-christian': { name: 'Non-Denominational', emoji: '✝️', color: '#EF4444' },
                          'islam': { name: 'Islam', emoji: '☪️', color: '#10B981' },
                          'sunni-islam': { name: 'Sunni Islam', emoji: '☪️', color: '#006400' },
                          'shia-islam': { name: 'Shia Islam', emoji: '☪️', color: '#228B22' },
                          'sufi-islam': { name: 'Sufi Islam', emoji: '🌀', color: '#047857' },
                          'hinduism': { name: 'Hinduism', emoji: '🕉️', color: '#F59E0B' },
                          'vaishnavism': { name: 'Vaishnavism', emoji: '🕉️', color: '#FF6B00' },
                          'shaivism': { name: 'Shaivism', emoji: '🕉️', color: '#E85D04' },
                          'shaktism': { name: 'Shaktism', emoji: '🕉️', color: '#DC2F02' },
                          'advaita-vedanta': { name: 'Advaita Vedanta', emoji: '🕉️', color: '#CA8A04' },
                          'buddhism': { name: 'Buddhism', emoji: '☸️', color: '#06B6D4' },
                          'theravada-buddhism': { name: 'Theravada Buddhism', emoji: '☸️', color: '#06B6D4' },
                          'mahayana-buddhism': { name: 'Mahayana Buddhism', emoji: '☸️', color: '#0891B2' },
                          'vajrayana-buddhism': { name: 'Vajrayana Buddhism', emoji: '☸️', color: '#0E7490' },
                          'sikhism': { name: 'Sikhism', emoji: '🪯', color: '#1E40AF' },
                          'bahai-faith': { name: "Bahá'í Faith", emoji: '✯', color: '#7C3AED' },
                          'jainism': { name: 'Jainism', emoji: '🙏', color: '#059669' },
                          'zoroastrianism': { name: 'Zoroastrianism', emoji: '🔥', color: '#DC2626' },
                          'secular-humanism': { name: 'Secular Humanism', emoji: '🌍', color: '#6B7280' },
                          'interfaith-mysticism': { name: 'Interfaith Mysticism', emoji: '✨', color: '#A855F7' },
                        };

                        const sortedPrimary = Object.entries(primary).sort((a, b) => b[1] - a[1]);
                        const sortedExploring = Object.entries(exploring).sort((a, b) => b[1] - a[1]);

                        return (
                          <div className="space-y-6">
                            {/* Primary Traditions */}
                            <div>
                              <h3 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wide">Primary Tradition ({totalPrimary} users)</h3>
                              <div className="space-y-2">
                                {sortedPrimary.map(([key, count]) => {
                                  const display = TRADITION_DISPLAY[key] || { name: key, emoji: '📖', color: '#94A3B8' };
                                  const pct = Math.round((count / Math.max(totalPrimary, 1)) * 100);
                                  return (
                                    <div key={key} className="flex items-center gap-3">
                                      <span className="text-lg w-8 text-center">{display.emoji}</span>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-sm text-slate-200">{display.name}</span>
                                          <span className="text-sm text-slate-400">{count} user{count !== 1 ? 's' : ''} ({pct}%)</span>
                                        </div>
                                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#2A2A38" }}>
                                          <div 
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%`, backgroundColor: display.color }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {sortedPrimary.length === 0 && onboardingIncomplete === 0 && (
                                <p className="text-slate-500 text-sm italic">No primary tradition data yet — users need to complete onboarding.</p>
                              )}
                              {onboardingIncomplete > 0 && (
                                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#1E1E2E" }}>
                                  <span className="text-amber-400 text-sm">⚠️</span>
                                  <span className="text-sm text-slate-400">
                                    {onboardingIncomplete} user{onboardingIncomplete !== 1 ? 's' : ''} haven&apos;t completed onboarding yet
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Exploring Traditions */}
                            {sortedExploring.length > 0 && (
                              <div>
                                <h3 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wide">Also Exploring</h3>
                                <div className="flex flex-wrap gap-2">
                                  {sortedExploring.map(([key, count]) => {
                                    const display = TRADITION_DISPLAY[key] || { name: key, emoji: '📖', color: '#94A3B8' };
                                    return (
                                      <span 
                                        key={key}
                                        className="px-3 py-1.5 rounded-full text-sm border"
                                        style={{ 
                                          borderColor: `${display.color}50`,
                                          backgroundColor: `${display.color}15`,
                                          color: display.color
                                        }}
                                      >
                                        {display.emoji} {display.name} ({count})
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Users Table */}
                <div className="rounded-xl border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="p-6 border-b" style={{ borderColor: "#2A2A38" }}>
                    <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                      <Users className="w-5 h-5" style={{ color: "#D4A020" }} />
                      All Registered Users ({totalAuthUsers})
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Manage all users with authentication accounts, including those without profiles.
                    </p>
                  </div>

                  <div className="p-6">
                    {usersLoading ? (
                      <div className="text-center py-8">
                        <Loader className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                        <p className="text-slate-400 mt-2">Loading users...</p>
                      </div>
                    ) : usersData.length === 0 ? (
                      <EmptyState 
                        icon={Users} 
                        title="No Users Found" 
                        description="No registered users in the system yet." 
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b" style={{ borderColor: "#2A2A38" }}>
                              <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                              <th className="text-left py-3 px-4 text-slate-400 font-medium">Created</th>
                              <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                              <th className="text-left py-3 px-4 text-slate-400 font-medium">Profile</th>
                              <th className="text-left py-3 px-4 text-slate-400 font-medium">Faith Guide</th>
                              <th className="text-left py-3 px-4 text-slate-400 font-medium">Last Sign In</th>
                              <th className="text-left py-3 px-4 text-slate-400 font-medium">App</th>
                              <th className="text-right py-3 px-4 text-slate-400 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usersData.map((user) => (
                              <tr key={user.id} className="border-b" style={{ borderColor: "#2A2A38" }}>
                                <td className="py-3 px-4">
                                  <div className="text-slate-300">{user.email}</div>
                                  <div className="text-xs text-slate-500">{user.id}</div>
                                </td>
                                <td className="py-3 px-4 text-slate-400 text-sm">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    user.email_confirmed_at 
                                      ? 'bg-green-900/30 text-green-400' 
                                      : 'bg-yellow-900/30 text-yellow-400'
                                  }`}>
                                    {user.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    user.hasProfile 
                                      ? 'bg-blue-900/30 text-blue-400' 
                                      : 'bg-red-900/30 text-red-400'
                                  }`}>
                                    {user.hasProfile ? 'Yes' : 'No'}
                                  </span>
                                  {user.hasProfile && user.profileData?.primary_tradition && (
                                    <div className="text-xs text-slate-500 mt-1">
                                      {user.profileData.primary_tradition}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {user.hasProfile && user.profileData?.guide_name ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}>
                                        {user.profileData.guide_name.charAt(0)}
                                      </div>
                                      <span className="text-sm text-slate-200">{user.profileData.guide_name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-600">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-slate-400 text-sm">
                                  {user.last_sign_in_at 
                                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                                    : 'Never'
                                  }
                                </td>
                                <td className="py-3 px-4 text-slate-400 text-sm">
                                  {user.raw_app_meta_data?.provider || 'Unknown'}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => setShowDeleteConfirm(user.id)}
                                    disabled={deletingUser === user.id}
                                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-700/50 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                  >
                                    {deletingUser === user.id ? (
                                      <Loader className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="rounded-xl border p-6 max-w-md w-full" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <h3 className="text-lg font-semibold text-slate-100">Delete User</h3>
                  </div>
                  <p className="text-slate-300 mb-6">
                    Are you sure you want to delete this user? This will remove their auth account and all associated data including:
                  </p>
                  <ul className="text-slate-400 text-sm mb-6 space-y-1 ml-4">
                    <li>• User profile</li>
                    <li>• All conversations and messages</li>
                    <li>• Lesson progress</li>
                    <li>• API usage records</li>
                  </ul>
                  <p className="text-red-400 text-sm mb-6 font-medium">This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteUser(showDeleteConfirm)}
                      disabled={deletingUser === showDeleteConfirm}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-700/50 text-white px-4 py-2 rounded font-medium transition-colors"
                    >
                      {deletingUser === showDeleteConfirm ? 'Deleting...' : 'Delete User'}
                    </button>
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
                          setSelectedReligion(null); setSelectedDenomination(null);
                        }}
                        className="p-2 rounded text-slate-400 hover:text-slate-200"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={goToToday}
                        className="px-3 py-1 rounded text-xs font-medium text-slate-300 hover:text-slate-100 border border-slate-600 hover:border-slate-400 transition-colors"
                        title="Go to today"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => {
                          if (selectedMonth === 11) {
                            setSelectedMonth(0);
                            setSelectedYear(selectedYear + 1);
                          } else {
                            setSelectedMonth(selectedMonth + 1);
                          }
                          setSelectedReligion(null); setSelectedDenomination(null);
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
                  
                  {/* Calendar Legend */}
                  <div className="flex items-center gap-3 text-[10px] sm:text-xs text-slate-400 mt-1 mb-2 px-1">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#3B82F6' }} />
                      <span>Holiday</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="px-1 rounded text-[9px] font-bold" style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.3)' }}>L</div>
                      <span>Lessons</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="px-1 rounded text-[9px] font-bold" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }}>P</div>
                      <span>Prayers</span>
                    </div>
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
                          onClick={() => { setSelectedDay(date); setSelectedReligion(null); setSelectedDenomination(null); }}
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
                          
                          {/* Calendar Day Indicators */}
                          {(events.holidays.length > 0 || events.lessons.length > 0 || events.prayers.length > 0) && (
                            <div className="flex gap-0.5 items-center mt-0.5 flex-wrap justify-center sm:justify-start">
                              {/* Holiday indicators - colored squares */}
                              {events.holidays.slice(0, 3).map((holiday, idx) => (
                                <div
                                  key={`h-${idx}`}
                                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-sm"
                                  style={{ backgroundColor: holiday.color }}
                                  title={`${holiday.name} (${holiday.tradition})`}
                                />
                              ))}
                              {events.holidays.length > 3 && (
                                <span className="text-[8px] sm:text-[9px] text-slate-500" title={`${events.holidays.length} holidays`}>
                                  +{events.holidays.length - 3}
                                </span>
                              )}
                              
                              {/* Lesson indicator - cyan pill */}
                              {events.lessons.length > 0 && (
                                <div
                                  className="px-0.5 sm:px-1 rounded text-[7px] sm:text-[9px] font-bold leading-tight"
                                  style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.3)' }}
                                  title={`${events.lessons.length} lessons`}
                                >
                                  L
                                </div>
                              )}
                              
                              {/* Prayer indicator - amber pill */}
                              {events.prayers.length > 0 && (
                                <div
                                  className="px-0.5 sm:px-1 rounded text-[7px] sm:text-[9px] font-bold leading-tight"
                                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                                  title={`${events.prayers.length} prayers`}
                                >
                                  P
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Day Detail + Lesson Side Panel Container */}
                <div className={selectedLesson ? "lg:grid lg:grid-cols-2 lg:gap-4" : ""}>
                {/* Compact Day Detail Panel */}
                {selectedDay && (
                  <div className="lg:flex lg:gap-6">
                    {/* Desktop: Side-by-side layout */}
                    <div className="lg:hidden">
                      {/* Mobile: Below calendar */}
                      <div className="rounded-xl p-2 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-slate-100">
                            {selectedDay.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric'
                            })}
                          </h3>
                          <button
                            onClick={() => { setSelectedDay(null); setSelectedReligion(null); setSelectedDenomination(null); }}
                            className="text-slate-400 hover:text-slate-200 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {(() => {
                          const events = getEventsForDate(selectedDay);
                          const calPanels = collectAllCalendarContexts(events.lessons);
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
                          if ((hebrewDate || parsha) && !enrichedPanels.some(p => p.key === 'jewish' || p.key === 'orthodox_judaism')) {
                            const cfg = CALENDAR_TRADITION_CONFIG['jewish'];
                            enrichedPanels.unshift({
                              key: 'jewish', emoji: cfg.emoji, label: cfg.label, color: cfg.color,
                              text: [hebrewDate, parsha ? `Torah portion: ${parsha}` : ''].filter(Boolean).join('\n')
                            });
                          }

                          const contextGroups = groupCalendarContextByTradition(enrichedPanels);
                          const filteredLessons = events.lessons.filter((lesson: any) => lessonTraditionFilters.has(lesson.tradition || "Other"));

                          return (
                            <div className="space-y-3">
                              {/* Religious Events */}
                              {events.holidays.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-medium text-slate-200 mb-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" style={{ color: "#D4A020" }} />
                                    Events ({events.holidays.length})
                                  </h4>
                                  <div className="space-y-1">
                                    {events.holidays.map((holiday, idx) => (
                                      <div
                                        key={idx}
                                        className="p-2 rounded border cursor-pointer hover:border-slate-500 transition-colors"
                                        style={{ 
                                          backgroundColor: "#0B0B11", 
                                          borderColor: holiday.color + "30"
                                        }}
                                        onClick={() => setSelectedHoliday(holiday)}
                                      >
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <span style={{ color: holiday.color, fontSize: "10px" }}>●</span>
                                          <h5 className="font-medium text-slate-200 text-xs">{holiday.name}</h5>
                                        </div>
                                        <p className="text-xs text-slate-400 line-clamp-2">{holiday.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Religion Accordion → Denomination Names → Lessons */}
                              {(() => {
                                // Helper: get lessons for a specific denomination key
                                const getMobileDenomLessons = (denomKey: string) => {
                                  return events.lessons.filter((lesson: any) => {
                                    if (!lesson.baselineTraditionId) return false;
                                    const trad = TRADITION_MAP[lesson.baselineTraditionId];
                                    if (!trad) return false;
                                    const normalizedName = trad.name.toLowerCase()
                                      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                      .replace(/['']/g, '')
                                      .replace(/[^a-z0-9]+/g, '_')
                                      .replace(/(^_|_$)/g, '');
                                    return normalizedName === denomKey;
                                  });
                                };

                                const religionsWithContent = Object.entries(contextGroups).filter(([, group]) => group.panels.length > 0);
                                
                                // Also find religions that have lessons but no context panels
                                const religionsFromLessons = ["Judaism", "Christianity", "Islam", "Hinduism", "Buddhism", "Bahá'í", "Other"].filter(tradition => {
                                  const hasLessons = events.lessons.some((l: any) => (l.tradition || "Other") === tradition);
                                  const hasContext = contextGroups[tradition]?.panels?.length > 0;
                                  return hasLessons && !hasContext;
                                });

                                const allReligions = [
                                  ...religionsWithContent.map(([name, group]) => ({ name, emoji: group.emoji, panels: group.panels })),
                                  ...religionsFromLessons.map(name => {
                                    const emojiMap: Record<string, string> = { Judaism: "✡️", Christianity: "✝️", Islam: "☪️", Hinduism: "🕉️", Buddhism: "☸️", "Bahá'í": "✴️", Other: "🌍" };
                                    return { name, emoji: emojiMap[name] || "🌍", panels: [] as any[] };
                                  })
                                ];

                                if (allReligions.length === 0 && events.lessons.length === 0) return null;

                                return (
                                  <div>
                                    <h4 className="text-xs font-medium text-slate-200 mb-1 flex items-center gap-1">
                                      <Globe className="w-3 h-3" style={{ color: "#D4A020" }} />
                                      Religion ({allReligions.length})
                                    </h4>
                                    <div className="space-y-1">
                                      {allReligions.map(({ name: tradition, emoji, panels: traditionPanels }) => {
                                        const isExpanded = expandedContextTraditions.has(tradition);
                                        const traditionLessonCount = events.lessons.filter((l: any) => (l.tradition || "Other") === tradition).length;
                                        
                                        return (
                                          <div key={tradition}>
                                            {/* Religion row */}
                                            <button
                                              onClick={() => toggleContextTradition(tradition)}
                                              className="w-full flex items-center justify-between p-1.5 rounded border text-xs font-medium text-slate-300 hover:text-slate-100 transition-colors"
                                              style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                                            >
                                              <div className="flex items-center gap-1.5">
                                                <span>{emoji}</span>
                                                <span>{tradition}</span>
                                                {traditionLessonCount > 0 && (
                                                  <span className="text-slate-500">({traditionLessonCount})</span>
                                                )}
                                              </div>
                                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </button>
                                            
                                            {/* Expanded: show denomination NAMES only (clickable) */}
                                            {isExpanded && (
                                              <div className="ml-2 mt-1 space-y-1">
                                                {traditionPanels.map((panel: any, idx: number) => {
                                                  const denomLessons = getMobileDenomLessons(panel.key);
                                                  const isSelected = selectedDenomination === panel.key;
                                                  
                                                  return (
                                                    <div key={idx}>
                                                      {/* Denomination name button */}
                                                      <button
                                                        onClick={() => setSelectedDenomination(isSelected ? null : panel.key)}
                                                        className="w-full flex items-center justify-between p-1.5 rounded border text-xs transition-colors"
                                                        style={{
                                                          backgroundColor: isSelected ? `${panel.color}10` : "#0B0B11",
                                                          borderColor: isSelected ? panel.color : "#2A2A38"
                                                        }}
                                                      >
                                                        <div className="flex items-center gap-1.5">
                                                          <span className="text-xs">{panel.emoji}</span>
                                                          <span className="font-medium text-slate-200">{panel.label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          {denomLessons.length > 0 && (
                                                            <span className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: `${panel.color}20`, color: panel.color }}>
                                                              {denomLessons.length}
                                                            </span>
                                                          )}
                                                          <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                                                        </div>
                                                      </button>
                                                      
                                                      {/* Selected denomination: show lessons */}
                                                      {isSelected && (
                                                        <div className="ml-2 mt-1 space-y-1">
                                                          {denomLessons.length > 0 ? denomLessons.map((lesson: any, lIdx: number) => (
                                                            <div
                                                              key={lIdx}
                                                              onClick={() => setSelectedLesson(lesson)}
                                                              className="p-1.5 rounded border cursor-pointer hover:border-yellow-500 transition-colors"
                                                              style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                                                            >
                                                              <h5 className="font-medium text-slate-200 text-xs truncate">{lesson.title}</h5>
                                                              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                                                {lesson.content ? lesson.content.substring(0, 80) + '...' : 'Click to view'}
                                                              </p>
                                                            </div>
                                                          )) : (
                                                            <p className="text-xs text-slate-500 p-1.5">No lessons for this denomination</p>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                                
                                                {/* If no denomination panels but has lessons, show them directly */}
                                                {traditionPanels.length === 0 && (
                                                  <div className="space-y-1">
                                                    {events.lessons
                                                      .filter((l: any) => (l.tradition || "Other") === tradition)
                                                      .map((lesson: any, lIdx: number) => (
                                                        <div
                                                          key={lIdx}
                                                          onClick={() => setSelectedLesson(lesson)}
                                                          className="p-1.5 rounded border cursor-pointer hover:border-yellow-500 transition-colors"
                                                          style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                                                        >
                                                          <h5 className="font-medium text-slate-200 text-xs truncate">{lesson.title}</h5>
                                                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                                            {lesson.content ? lesson.content.substring(0, 80) + '...' : 'Click to view'}
                                                          </p>
                                                        </div>
                                                      ))}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                              
                              {events.holidays.length === 0 && events.lessons.length === 0 && (
                                <div className="text-center py-4">
                                  <Calendar className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                  <p className="text-slate-400 text-xs">No events or lessons</p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Desktop slide-in panel */}
                    <div className="hidden lg:block lg:w-96 lg:flex-shrink-0">
                      <div className="rounded-xl p-3 border max-h-[600px] overflow-y-auto" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-semibold text-slate-100">
                            {selectedDay.toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </h3>
                          <button
                            onClick={() => { setSelectedDay(null); setSelectedReligion(null); setSelectedDenomination(null); }}
                            className="text-slate-400 hover:text-slate-200 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {!selectedReligion ? (
                          // === LAYER 2: Day Overview ===
                          <>
                            {/* Cross-Calendar Dates */}
                            {(() => {
                              const crossDates = getCrossCalendarDates(selectedDay);
                              return (
                                <div className="mb-4 p-2.5 rounded-lg border space-y-1.5" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">This Day Across Calendars</h4>
                                  {crossDates.hebrew && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span>✡️</span>
                                      <span className="text-slate-300">{crossDates.hebrew}</span>
                                    </div>
                                  )}
                                  {crossDates.islamic && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span>☪️</span>
                                      <span className="text-slate-300">{crossDates.islamic}</span>
                                    </div>
                                  )}
                                  {crossDates.indian && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span>🕉️</span>
                                      <span className="text-slate-300">{crossDates.indian}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            
                            {/* Religious Events */}
                            {(() => {
                              const events = getEventsForDate(selectedDay);
                              return (
                                <>
                                  {events.holidays.length > 0 && (
                                    <div className="mb-4">
                                      <h4 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" style={{ color: "#D4A020" }} />
                                        Religious Events ({events.holidays.length})
                                      </h4>
                                      <div className="space-y-1.5">
                                        {events.holidays.map((holiday, idx) => (
                                          <div key={idx} className="p-2 rounded-lg border cursor-pointer hover:border-slate-500 transition-colors"
                                            style={{ backgroundColor: "#0B0B11", borderColor: holiday.color + "50" }}
                                            onClick={() => { setSelectedHoliday(holiday); setSelectedReligion(holiday.tradition); setSelectedDenomination(null); }}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span style={{ color: holiday.color }}>●</span>
                                              <span className="text-sm font-medium text-slate-200">{holiday.name}</span>
                                              <span className="text-xs px-1.5 py-0.5 rounded ml-auto" style={{ backgroundColor: `${holiday.color}20`, color: holiday.color }}>
                                                {holiday.tradition}
                                              </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 ml-4">{holiday.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Three Content Containers: Lessons, Daily Prayers, Sleep Prayers */}
                                  {(() => {
                                    const selectedDateStr = selectedDay.toISOString().split('T')[0];
                                    const dayLessons = events.lessons;
                                    const dayDailyPrayers = dailyPrayers.filter(prayer => prayer.date === selectedDateStr);
                                    const daySleepPrayers = sleepPrayers.filter(prayer => prayer.date === selectedDateStr);

                                    return (
                                      <div className="space-y-3">
                                        {/* 📖 Lessons */}
                                        <div className="rounded-lg border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                                          <button
                                            onClick={() => toggleSectionCollapse('lessons')}
                                            className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-800/30 transition-colors"
                                          >
                                            <div className="flex items-center gap-2">
                                              <BookOpen className="w-4 h-4 text-blue-400" />
                                              <span className="text-sm font-medium text-slate-200">Lessons</span>
                                              <span className="px-1.5 py-0.5 text-xs rounded bg-slate-700 text-slate-300">
                                                {dayLessons.length}
                                              </span>
                                            </div>
                                            {collapsedSections.has('lessons') ? 
                                              <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                                              <ChevronUp className="w-4 h-4 text-slate-400" />
                                            }
                                          </button>
                                          {!collapsedSections.has('lessons') && (
                                            <div className="px-3 pb-3 space-y-2">
                                              {dayLessons.length > 0 ? dayLessons.map((lesson: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  onClick={() => setSelectedLesson(lesson)}
                                                  className="p-2 rounded border cursor-pointer hover:border-yellow-500 transition-colors"
                                                  style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                                                >
                                                  <h5 className="font-medium text-slate-200 text-sm leading-tight">{lesson.title}</h5>
                                                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                    {lesson.content ? lesson.content.substring(0, 120) + '...' : 'Click to view lesson content'}
                                                  </p>
                                                </div>
                                              )) : (
                                                <p className="text-xs text-slate-500 text-center py-4">No lessons for this day</p>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* 🙏 Daily Prayers */}
                                        <div className="rounded-lg border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                                          <button
                                            onClick={() => toggleSectionCollapse('daily-prayers')}
                                            className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-800/30 transition-colors"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm">🙏</span>
                                              <span className="text-sm font-medium text-slate-200">Daily Prayers</span>
                                              <span className="px-1.5 py-0.5 text-xs rounded bg-slate-700 text-slate-300">
                                                {dayDailyPrayers.length}
                                              </span>
                                            </div>
                                            {collapsedSections.has('daily-prayers') ? 
                                              <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                                              <ChevronUp className="w-4 h-4 text-slate-400" />
                                            }
                                          </button>
                                          {!collapsedSections.has('daily-prayers') && (
                                            <div className="px-3 pb-3 space-y-2">
                                              {dayDailyPrayers.length > 0 ? dayDailyPrayers.map((prayer: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="p-2 rounded border"
                                                  style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                                                >
                                                  <div className="flex items-center gap-2 mb-1">
                                                    {prayer.tradition_icon && <span className="text-sm">{prayer.tradition_icon}</span>}
                                                    <span className="text-sm font-medium text-slate-200">{prayer.tradition_name}</span>
                                                  </div>
                                                  {prayer.opening && (
                                                    <p className="text-xs text-slate-400 mb-1 line-clamp-2">{prayer.opening.substring(0, 120)}...</p>
                                                  )}
                                                  {prayer.scripture_ref && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                                      📖 {prayer.scripture_ref}
                                                    </span>
                                                  )}
                                                </div>
                                              )) : (
                                                <p className="text-xs text-slate-500 text-center py-4">No daily prayers for this day</p>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* 🌙 Sleep Prayers */}
                                        <div className="rounded-lg border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                                          <button
                                            onClick={() => toggleSectionCollapse('sleep-prayers')}
                                            className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-800/30 transition-colors"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Moon className="w-4 h-4 text-purple-400" />
                                              <span className="text-sm font-medium text-slate-200">Sleep Prayers</span>
                                              <span className="px-1.5 py-0.5 text-xs rounded bg-slate-700 text-slate-300">
                                                {daySleepPrayers.length}
                                              </span>
                                            </div>
                                            {collapsedSections.has('sleep-prayers') ? 
                                              <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                                              <ChevronUp className="w-4 h-4 text-slate-400" />
                                            }
                                          </button>
                                          {!collapsedSections.has('sleep-prayers') && (
                                            <div className="px-3 pb-3 space-y-2">
                                              {daySleepPrayers.length > 0 ? daySleepPrayers.map((prayer: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="p-2 rounded border"
                                                  style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                                                >
                                                  {prayer.tradition_alignment && (
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <span className="text-sm font-medium text-slate-200">{prayer.tradition_alignment}</span>
                                                    </div>
                                                  )}
                                                  {prayer.opening && (
                                                    <p className="text-xs text-slate-400 mb-1 line-clamp-2">{prayer.opening.substring(0, 120)}...</p>
                                                  )}
                                                  {prayer.scripture_ref && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                                      📖 {prayer.scripture_ref}
                                                    </span>
                                                  )}
                                                </div>
                                              )) : (
                                                <p className="text-xs text-slate-500 text-center py-4">No sleep prayers for this day</p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  
                                  {/* Explore by Tradition */}
                                  <div>
                                    <h4 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
                                      <Globe className="w-4 h-4" style={{ color: "#D4A020" }} />
                                      Explore by Tradition
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                      {(["Judaism", "Christianity", "Islam", "Hinduism", "Buddhism", "Bahá'í", "Other"] as const).map((tradition) => {
                                        const colors = getTraditionColors();
                                        const color = (colors as any)[tradition] || "#94A3B8";
                                        const traditionHolidays = events.holidays.filter(h => h.tradition === tradition);
                                        const traditionLessons = events.lessons.filter((l: any) => (l.tradition || "Other") === tradition);
                                        const totalContent = traditionHolidays.length + traditionLessons.length;
                                        
                                        // Get the calendar context panels for this tradition
                                        const calPanels = collectAllCalendarContexts(events.lessons);
                                        const contextGroups = groupCalendarContextByTradition(calPanels);
                                        const hasContext = contextGroups[tradition]?.panels?.length > 0;
                                        
                                        if (totalContent === 0 && !hasContext) return null;
                                        
                                        const emojis: Record<string, string> = { "Judaism": "✡️", "Christianity": "✝️", "Islam": "☪️", "Hinduism": "🕉️", "Buddhism": "☸️", "Bahá'í": "✴️", "Other": "🌍" };
                                        
                                        return (
                                          <button
                                            key={tradition}
                                            onClick={() => { setSelectedReligion(tradition); setSelectedDenomination(null); }}
                                            className="p-3 rounded-lg border text-left hover:border-slate-500 transition-all group"
                                            style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", borderLeftColor: color, borderLeftWidth: "3px" }}
                                          >
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-base">{emojis[tradition]}</span>
                                              <span className="text-sm font-medium text-slate-200 group-hover:text-white">{tradition}</span>
                                            </div>
                                            <div className="flex gap-2 text-xs text-slate-400">
                                              {traditionHolidays.length > 0 && <span>{traditionHolidays.length} event{traditionHolidays.length !== 1 ? 's' : ''}</span>}
                                              {traditionLessons.length > 0 && <span>{traditionLessons.length} lesson{traditionLessons.length !== 1 ? 's' : ''}</span>}
                                              {hasContext && traditionHolidays.length === 0 && traditionLessons.length === 0 && <span>Calendar context</span>}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* Show message if no content at all */}
                                    {events.holidays.length === 0 && events.lessons.length === 0 && (
                                      <div className="text-center py-4 mt-2">
                                        <Calendar className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm">No religious events or lessons for this day</p>
                                      </div>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          // === LAYER 3: Religion Detail ===
                          (() => {
                            const events = getEventsForDate(selectedDay);
                            const colors = getTraditionColors();
                            const color = colors[selectedReligion as keyof typeof colors] || "#D4A020";
                            const emojis: Record<string, string> = { "Judaism": "✡️", "Christianity": "✝️", "Islam": "☪️", "Hinduism": "🕉️", "Buddhism": "☸️", "Bahá'í": "✴️" };
                            const emoji = emojis[selectedReligion] || "🌍";
                            
                            const traditionHolidays = events.holidays.filter(h => h.tradition === selectedReligion);
                            const traditionLessons = events.lessons.filter((l: any) => (l.tradition || "Other") === selectedReligion);
                            
                            // Get cross-calendar date specific to this religion
                            const crossDates = getCrossCalendarDates(selectedDay);
                            const religionDate = selectedReligion === "Judaism" ? crossDates.hebrew :
                                              selectedReligion === "Islam" ? crossDates.islamic :
                                              selectedReligion === "Hinduism" ? crossDates.indian : null;
                            
                            // Get calendar context panels from ALL lessons for this day
                            const calPanels = collectAllCalendarContexts(events.lessons);
                            const hebrewDate = events.lessons.find((l: any) => l.hebrewDate)?.hebrewDate as string | undefined;
                            const parsha = events.lessons.find((l: any) => l.parsha)?.parsha as string | undefined;
                            
                            // Enrich panels
                            const enrichedPanels = calPanels.map(p => {
                              if ((p.key === 'jewish' || p.key === 'orthodox_judaism') && (hebrewDate || parsha)) {
                                const prefix = [hebrewDate, parsha ? `Torah portion: ${parsha}` : ''].filter(Boolean).join('\n');
                                return { ...p, text: prefix + (p.text ? '\n' + p.text : '') };
                              }
                              return p;
                            });
                            if ((hebrewDate || parsha) && !enrichedPanels.some(p => p.key === 'jewish' || p.key === 'orthodox_judaism')) {
                              const cfg = CALENDAR_TRADITION_CONFIG['jewish'];
                              if (cfg) {
                                enrichedPanels.unshift({
                                  key: 'jewish', emoji: cfg.emoji, label: cfg.label, color: cfg.color,
                                  text: [hebrewDate, parsha ? `Torah portion: ${parsha}` : ''].filter(Boolean).join('\n')
                                });
                              }
                            }
                            
                            const contextGroups = groupCalendarContextByTradition(enrichedPanels);
                            const religionContextPanels = contextGroups[selectedReligion]?.panels || [];
                            
                            // Find lessons matching selected denomination by baselineTraditionId
                            const getDenominationLessons = (denomKey: string) => {
                              // Match lessons whose baselineTraditionId maps exactly to this denomination
                              return traditionLessons.filter((lesson: any) => {
                                if (!lesson.baselineTraditionId) return false;
                                const trad = TRADITION_MAP[lesson.baselineTraditionId];
                                if (!trad) return false;
                                // Normalize tradition name to match calendar config key format
                                // e.g., "Orthodox Judaism" → "orthodox_judaism", "Bahá'í Faith" → "bahai_faith"
                                const normalizedName = trad.name.toLowerCase()
                                  .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
                                  .replace(/['']/g, '') // strip apostrophes
                                  .replace(/[^a-z0-9]+/g, '_') // non-alphanumeric → underscore
                                  .replace(/(^_|_$)/g, ''); // trim leading/trailing underscores
                                return normalizedName === denomKey;
                              });
                            };
                            
                            return (
                              <>
                                {/* Header with back button */}
                                <div className="flex items-center gap-3 mb-3">
                                  <button onClick={() => {
                                    if (selectedDenomination) {
                                      setSelectedDenomination(null);
                                    } else {
                                      setSelectedReligion(null); setSelectedDenomination(null);
                                    }
                                  }} className="text-slate-400 hover:text-slate-200 p-1">
                                    <ArrowLeft className="w-4 h-4" />
                                  </button>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-xl">{emoji}</span>
                                    <h3 className="text-base font-semibold truncate" style={{ color }}>
                                      {selectedReligion}
                                      {selectedDenomination && (
                                        <span className="text-slate-400 font-normal text-sm"> › {CALENDAR_TRADITION_CONFIG[selectedDenomination]?.label || selectedDenomination}</span>
                                      )}
                                    </h3>
                                  </div>
                                  <button onClick={() => { setSelectedDay(null); setSelectedReligion(null); setSelectedDenomination(null); }} className="text-slate-400 hover:text-slate-200 p-1">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                {/* Religion-specific calendar date */}
                                {religionDate && (
                                  <div className="mb-3 p-2 rounded-lg border flex items-center gap-2" style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}>
                                    <span>{emoji}</span>
                                    <span className="text-sm font-medium" style={{ color }}>{religionDate}</span>
                                  </div>
                                )}
                                
                                {!selectedDenomination ? (
                                  // === LAYER 3a: Denomination list (no lessons yet) ===
                                  <>
                                    {/* Religious Events */}
                                    {traditionHolidays.length > 0 && (
                                      <div className="mb-3">
                                        <h4 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
                                          <Calendar className="w-4 h-4" style={{ color }} />
                                          Events ({traditionHolidays.length})
                                        </h4>
                                        <div className="space-y-1.5">
                                          {traditionHolidays.map((holiday, idx) => (
                                            <div key={idx} className="p-2 rounded-lg border" style={{ backgroundColor: "#0B0B11", borderColor: `${color}50` }}>
                                              <h5 className="font-medium text-slate-200 text-sm">{holiday.name}</h5>
                                              <p className="text-xs text-slate-400 mt-1">{holiday.description}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Denomination Cards (clickable → shows lessons) */}
                                    {religionContextPanels.length > 0 && (
                                      <div className="mb-3">
                                        <h4 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
                                          <Globe className="w-4 h-4" style={{ color }} />
                                          Denominations ({religionContextPanels.length})
                                        </h4>
                                        <div className="space-y-2">
                                          {religionContextPanels.map((panel: any, idx: number) => {
                                            const denomLessons = getDenominationLessons(panel.key);
                                            return (
                                              <button
                                                key={idx}
                                                onClick={() => setSelectedDenomination(panel.key)}
                                                className="w-full p-2 rounded border text-left hover:border-slate-500 transition-colors group"
                                                style={{ backgroundColor: "#0B0B11", borderColor: panel.color || `${color}50` }}
                                              >
                                                <div className="flex items-center justify-between mb-0.5">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-sm">{panel.emoji}</span>
                                                    <h6 className="text-xs font-medium text-slate-200 group-hover:text-white">{panel.label}</h6>
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    {denomLessons.length > 0 && (
                                                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>
                                                        {denomLessons.length} lesson{denomLessons.length !== 1 ? 's' : ''}
                                                      </span>
                                                    )}
                                                    <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
                                                  </div>
                                                </div>
                                                <p className="text-xs text-slate-400 line-clamp-1 ml-5">
                                                  {panel.text.split('\n')[0]}
                                                </p>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* If no denominations but has lessons, show "All Lessons" button */}
                                    {religionContextPanels.length === 0 && traditionLessons.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
                                          <GraduationCap className="w-4 h-4" style={{ color }} />
                                          Lessons ({traditionLessons.length})
                                        </h4>
                                        <div className="space-y-1.5">
                                          {traditionLessons.map((lesson: any, idx: number) => (
                                            <div
                                              key={idx}
                                              onClick={() => setSelectedLesson(lesson)}
                                              className="p-2 rounded border cursor-pointer hover:border-yellow-500 transition-colors"
                                              style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                                            >
                                              <h5 className="font-medium text-slate-200 text-sm leading-tight">{lesson.title}</h5>
                                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                {lesson.content ? lesson.content.substring(0, 120) + '...' : 'Click to view lesson content'}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Empty state */}
                                    {traditionHolidays.length === 0 && traditionLessons.length === 0 && religionContextPanels.length === 0 && (
                                      <div className="text-center py-6">
                                        <span className="text-3xl mb-2 block">{emoji}</span>
                                        <p className="text-slate-400 text-sm">No content for {selectedReligion} on this day</p>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  // === LAYER 3b: Denomination detail + lessons ===
                                  (() => {
                                    const denomPanel = religionContextPanels.find((p: any) => p.key === selectedDenomination);
                                    const denomLessons = getDenominationLessons(selectedDenomination);
                                    // Fallback: if no lessons match denomination, show all tradition lessons
                                    const displayLessons = denomLessons.length > 0 ? denomLessons : traditionLessons;
                                    
                                    return (
                                      <>
                                        {/* Denomination Calendar Context (expanded) */}
                                        {denomPanel && (
                                          <div className="mb-3 p-3 rounded-lg border" style={{ backgroundColor: "#0B0B11", borderColor: denomPanel.color || `${color}50` }}>
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="text-base">{denomPanel.emoji}</span>
                                              <h5 className="text-sm font-medium text-slate-200">{denomPanel.label}</h5>
                                            </div>
                                            {denomPanel.text.split('\n').map((line: string, i: number) => (
                                              <p key={i} className="text-xs text-slate-400 leading-relaxed">{line}</p>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {/* Lessons for this denomination */}
                                        {displayLessons.length > 0 && (
                                          <div>
                                            <h4 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
                                              <GraduationCap className="w-4 h-4" style={{ color }} />
                                              Lessons ({displayLessons.length})
                                            </h4>
                                            <div className="space-y-1.5">
                                              {displayLessons.map((lesson: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  onClick={() => setSelectedLesson(lesson)}
                                                  className="p-2 rounded border cursor-pointer hover:border-yellow-500 transition-colors"
                                                  style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                                                >
                                                  <h5 className="font-medium text-slate-200 text-sm leading-tight">{lesson.title}</h5>
                                                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                    {lesson.content ? lesson.content.substring(0, 120) + '...' : 'Click to view lesson content'}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {displayLessons.length === 0 && !denomPanel && (
                                          <div className="text-center py-4">
                                            <p className="text-slate-500 text-sm">No lessons for this denomination yet</p>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()
                                )}
                              </>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Lesson Detail View — Side panel on desktop, below on mobile */}
                {selectedLesson && (
                  <div className="rounded-xl p-3 sm:p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-100 line-clamp-2">{selectedLesson.title}</h3>
                      <button
                        onClick={() => setSelectedLesson(null)}
                        className="text-slate-400 hover:text-slate-200 flex-shrink-0 p-1"
                      >
                        <X className="w-5 h-5" />
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
                </div>{/* End Day Detail + Lesson Side Panel Container */}
              </div>
            )}

            {/* Audio Tab */}
            {activeTab === "audio" && (
              <div className="space-y-6">
                {/* Background Music Management */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Music className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Ambient Background Tracks
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(ambientTracks.length > 0 ? ambientTracks : [
                      { id: 'an-evening-of-elegance', name: 'An Evening of Elegance', url: '' },
                      { id: 'cathedralis', name: 'Cathedralis', url: '' },
                      { id: 'guide-us-through-the-night', name: 'Guide Us Through the Night', url: '' },
                      { id: 'stream-and-sing', name: 'Stream and Sing', url: '' },
                      { id: 'the-divine-accord', name: 'The Divine Accord', url: '' },
                    ]).map((track: any) => (
                      <div 
                        key={track.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-sm text-slate-300 truncate">{track.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAudio(`ambient-${track.id}`, track.url || `https://atldnpjaxaeqzgtqbrpy.supabase.co/storage/v1/object/public/faith-audio/ambient/${track.id}.mp3`)}
                            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                            style={{ 
                              backgroundColor: currentlyPlaying === `ambient-${track.id}` ? "#D4A020" : "#2A2A38",
                              color: currentlyPlaying === `ambient-${track.id}` ? "#0B0B11" : "#64748B"
                            }}
                          >
                            {currentlyPlaying === `ambient-${track.id}` ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete "${track.name}"?`)) {
                                await fetch('/api/faith/ambient-tracks', {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: track.id }),
                                });
                                fetchAmbientTracks();
                              }
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                            style={{ backgroundColor: "#2A2A38", color: "#ef4444" }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Upload new track */}
                  <div className="mt-4 p-3 rounded-lg border border-dashed flex items-center gap-3"
                       style={{ borderColor: "#D4A020", backgroundColor: "rgba(212,160,32,0.05)" }}>
                    <input
                      type="file"
                      accept="audio/*"
                      id="ambient-upload"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const name = prompt('Track name:', file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
                        if (!name) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('name', name);
                        const res = await fetch('/api/faith/ambient-tracks', { method: 'POST', body: formData });
                        if (res.ok) {
                          fetchAmbientTracks();
                        } else {
                          alert('Upload failed');
                        }
                      }}
                    />
                    <label htmlFor="ambient-upload" className="cursor-pointer flex items-center gap-2 text-sm" style={{ color: "#D4A020" }}>
                      <Upload className="w-4 h-4" />
                      Upload New Track
                    </label>
                  </div>
                </div>

                {/* Voice Configuration Management */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                      <Mic className="w-5 h-5" style={{ color: "#D4A020" }} />
                      Tradition Voice Mappings
                    </h2>
                    <button
                      onClick={() => setAddingCustomVoice(!addingCustomVoice)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={{ backgroundColor: addingCustomVoice ? "#2A2A38" : "rgba(212,160,32,0.15)", color: "#D4A020" }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Voice
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">
                    Configure which ElevenLabs voice narrates each religious tradition. Changes take effect on next audio generation.
                  </p>

                  {/* Add Custom Voice Form */}
                  {addingCustomVoice && (
                    <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: "#0B0B11", borderColor: "#D4A020" }}>
                      <h3 className="text-sm font-medium text-slate-300 mb-3">Add Custom ElevenLabs Voice</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-slate-400">Voice ID</label>
                          <input
                            type="text"
                            placeholder="e.g. W1EJxHy9vl73xgPIKgpn"
                            value={newVoiceId}
                            onChange={(e) => setNewVoiceId(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm font-mono"
                            style={{ backgroundColor: "#13131B", borderColor: "#2A2A38", color: "#E2E8F0" }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Voice Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Rabbi David"
                            value={newVoiceName}
                            onChange={(e) => setNewVoiceName(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                            style={{ backgroundColor: "#13131B", borderColor: "#2A2A38", color: "#E2E8F0" }}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <button
                            onClick={addCustomVoice}
                            disabled={!newVoiceId || !newVoiceName}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                            style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
                          >
                            Add Voice
                          </button>
                          <button
                            onClick={() => { setAddingCustomVoice(false); setNewVoiceId(''); setNewVoiceName(''); }}
                            className="px-4 py-2 rounded-lg text-sm transition-colors"
                            style={{ backgroundColor: "#2A2A38", color: "#94A3B8" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {voiceConfigLoading ? (
                    <div className="text-center py-8">
                      <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400">Loading voice configuration...</p>
                    </div>
                  ) : voiceConfig ? (
                    <div className="space-y-4">
                      {/* Available Voices Reference */}
                      <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: "#0B0B11" }}>
                        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Available Voices</h3>
                        <div className="flex flex-wrap gap-1">
                          {(voiceConfig.availableVoices || []).map((v: any) => (
                            <span key={v.id} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: "#1A1A28", color: v.category === 'tradition' ? '#D4A020' : v.category === 'clone' ? '#8B5CF6' : '#64748B' }}>
                              {v.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Tradition Family Voice Mappings Table */}
                      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                        <table className="w-full table-fixed">
                          <thead>
                            <tr className="border-b border-slate-700/50">
                              <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[200px]">Tradition</th>
                              <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Voice</th>
                              <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[150px]">Voice ID</th>
                              <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[80px]">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // Tradition display names and default voice mapping
                              const TRADITION_DISPLAY: Record<string, { name: string; emoji: string; color: string }> = {
                                'orthodox-judaism': { name: 'Orthodox Judaism', emoji: '✡️', color: '#0047AB' },
                                'conservative-judaism': { name: 'Conservative Judaism', emoji: '✡️', color: '#2E5CB8' },
                                'reform-judaism': { name: 'Reform Judaism', emoji: '✡️', color: '#4A90D9' },
                                'reconstructionist-judaism': { name: 'Reconstructionist Judaism', emoji: '✡️', color: '#6BA3E8' },
                                'messianic-judaism': { name: 'Messianic Judaism', emoji: '✡️✝️', color: '#3D6098' },
                                'catholicism': { name: 'Catholicism', emoji: '✝️', color: '#8B0000' },
                                'eastern-orthodox': { name: 'Eastern Orthodox', emoji: '☦️', color: '#8B4513' },
                                'evangelical-protestant': { name: 'Evangelical Protestant', emoji: '📖', color: '#4169E1' },
                                'mainline-protestant': { name: 'Mainline Protestant', emoji: '🕊️', color: '#6366F1' },
                                'non-denominational-christian': { name: 'Non-Denominational', emoji: '✝️', color: '#EF4444' },
                                'sunni-islam': { name: 'Sunni Islam', emoji: '☪️', color: '#006400' },
                                'shia-islam': { name: 'Shia Islam', emoji: '☪️', color: '#228B22' },
                                'sufi-islam': { name: 'Sufi Islam', emoji: '🌀', color: '#047857' },
                                'vaishnavism': { name: 'Vaishnavism', emoji: '🕉️', color: '#FF6B00' },
                                'shaivism': { name: 'Shaivism', emoji: '🕉️', color: '#E85D04' },
                                'shaktism': { name: 'Shaktism', emoji: '🕉️', color: '#DC2F02' },
                                'advaita-vedanta': { name: 'Advaita Vedanta', emoji: '🕉️', color: '#CA8A04' },
                                'theravada-buddhism': { name: 'Theravada Buddhism', emoji: '☸️', color: '#06B6D4' },
                                'mahayana-buddhism': { name: 'Mahayana Buddhism', emoji: '☸️', color: '#0891B2' },
                                'vajrayana-buddhism': { name: 'Vajrayana Buddhism', emoji: '☸️', color: '#0E7490' },
                                'sikhism': { name: 'Sikhism', emoji: '🪯', color: '#1E40AF' },
                                'jainism': { name: 'Jainism', emoji: '🙏', color: '#059669' },
                                'bahai-faith': { name: "Bahá'í Faith", emoji: '✯', color: '#7C3AED' },
                                'zoroastrianism': { name: 'Zoroastrianism', emoji: '🔥', color: '#DC2626' },
                                'secular-humanism': { name: 'Secular Humanism', emoji: '🌍', color: '#6B7280' },
                                'interfaith-mysticism': { name: 'Interfaith Mysticism', emoji: '✨', color: '#A855F7' },
                              };

                              // Default voices by tradition family - traditions inherit unless overridden
                              const familyDefaults = {
                                'Rabbi Shafier': ['orthodox-judaism', 'conservative-judaism', 'reform-judaism', 'reconstructionist-judaism', 'messianic-judaism'],
                                'Reverend': ['catholicism', 'eastern-orthodox', 'evangelical-protestant', 'mainline-protestant', 'non-denominational-christian'],
                                'Rehan Imam': ['sunni-islam', 'shia-islam', 'sufi-islam', 'vaishnavism', 'shaivism', 'shaktism', 'advaita-vedanta'],
                                'Moses Sam Paul': ['theravada-buddhism', 'mahayana-buddhism', 'vajrayana-buddhism'],
                                'Serena': ['sikhism', 'jainism', 'bahai-faith', 'zoroastrianism', 'secular-humanism', 'interfaith-mysticism']
                              };

                              return Object.entries(TRADITION_DISPLAY).map(([traditionSlug, display]) => {
                                // Find voice mapping for this tradition - check API data first, then fallback to family default
                                const traditionVoice = voiceConfig.traditions?.[traditionSlug];
                                let defaultVoice = 'Serena';
                                Object.entries(familyDefaults).forEach(([voice, traditions]) => {
                                  if (traditions.includes(traditionSlug)) {
                                    defaultVoice = voice;
                                  }
                                });
                                
                                const voiceName = traditionVoice?.voiceName || defaultVoice;
                                const voiceId = traditionVoice?.voiceId || '';
                                
                                return (
                                  <tr key={traditionSlug} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{display.emoji}</span>
                                        <span className="text-sm font-medium text-slate-200">{display.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      {editingVoice === traditionSlug ? (
                                        <div className="flex items-center gap-2">
                                          <select
                                            value={editVoiceId}
                                            onChange={(e) => setEditVoiceId(e.target.value)}
                                            className="px-2 py-1 rounded border text-sm flex-1"
                                            style={{ backgroundColor: "#13131B", borderColor: "#D4A020", color: "#D4A020" }}
                                          >
                                            <option value="">Select voice...</option>
                                            {(voiceConfig.availableVoices || []).map((v: any) => (
                                              <option key={v.id} value={v.id}>{v.name}</option>
                                            ))}
                                          </select>
                                          <input
                                            type="text"
                                            placeholder="Custom voice ID..."
                                            value={editVoiceId}
                                            onChange={(e) => setEditVoiceId(e.target.value)}
                                            className="px-2 py-1 rounded border text-sm font-mono flex-1"
                                            style={{ backgroundColor: "#13131B", borderColor: "#2A2A38", color: "#E2E8F0" }}
                                          />
                                        </div>
                                      ) : (
                                        <span className="text-sm text-slate-200">{voiceName}</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="text-xs font-mono text-slate-400">
                                        {voiceId ? `${voiceId.slice(0, 12)}...` : 'Default'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      {editingVoice === traditionSlug ? (
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => saveVoiceMapping(traditionSlug, editVoiceId)}
                                            disabled={voiceSaving || !editVoiceId}
                                            className="p-1.5 rounded transition-colors disabled:opacity-40"
                                            style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
                                          >
                                            {voiceSaving ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                          </button>
                                          <button
                                            onClick={() => setEditingVoice(null)}
                                            className="p-1.5 rounded transition-colors"
                                            style={{ backgroundColor: "#2A2A38", color: "#94A3B8" }}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => { setEditingVoice(traditionSlug); setEditVoiceId(voiceId); }}
                                          className="p-1.5 rounded transition-colors hover:bg-slate-700"
                                          style={{ color: "#94A3B8" }}
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400">Failed to load voice configuration</p>
                      <button
                        onClick={fetchVoiceConfig}
                        className="mt-2 px-4 py-2 rounded-lg text-sm transition-colors"
                        style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>

                {/* Audio Statistics */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Audio Generation Statistics
                  </h2>
                  <div className="space-y-6">
                    {/* Overall Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-100">{audioFiles.length}</div>
                        <div className="text-sm text-slate-400">Total Generations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-100">
                          {audioFiles.reduce((sum, audio) => sum + (audio.char_count || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-400">Total Characters</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-100">
                          {audioFiles.length > 0 ? 
                            Object.entries(audioFiles.reduce((acc, audio) => {
                              const voice = audio.voice_id || 'Unknown';
                              acc[voice] = (acc[voice] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'Unknown'
                            : 'None'
                          }
                        </div>
                        <div className="text-sm text-slate-400">Most Popular Voice</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-100">
                          {Math.round(audioFiles.reduce((sum, audio) => sum + (audio.file_size_bytes || 0), 0) / 1024 / 1024)}MB
                        </div>
                        <div className="text-sm text-slate-400">Total Size</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: "#D4A020" }}>
                          ${(audioFiles.reduce((sum, audio) => sum + (audio.char_count || 0), 0) * 0.00022).toFixed(2)}
                        </div>
                        <div className="text-sm text-slate-400">Est. Cost</div>
                      </div>
                    </div>

                    {/* Generations by Tradition - Pie Chart */}
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-3">Generations by Tradition</h3>
                      {(() => {
                        const traditionStats = audioFiles.reduce((acc, audio) => {
                          const tradition = audio.tradition?.name || 'Unknown';
                          if (!acc[tradition]) {
                            acc[tradition] = {
                              count: 0,
                              characters: 0,
                              color: audio.tradition?.color || "#6B7280",
                              icon: audio.tradition?.icon || "🔯"
                            };
                          }
                          acc[tradition].count += 1;
                          acc[tradition].characters += audio.char_count || 0;
                          return acc;
                        }, {} as Record<string, { count: number; characters: number; color: string; icon: string }>);

                        const sortedTraditions = Object.entries(traditionStats) as [string, { count: number; characters: number; color: string; icon: string }][];
                        sortedTraditions.sort(([,a], [,b]) => b.count - a.count);

                        const totalFiles = audioFiles.length;

                        if (totalFiles === 0) {
                          return (
                            <div className="text-center py-8">
                              <div className="text-slate-400">No audio files available</div>
                            </div>
                          );
                        }

                        // Generate pie chart segments
                        let cumulativeAngle = 0;
                        const radius = 80;
                        const centerX = 120;
                        const centerY = 120;

                        return (
                          <div className="flex flex-col lg:flex-row gap-6 items-center">
                            {/* Pie Chart */}
                            <div className="flex-shrink-0">
                              <svg width="240" height="240" className="overflow-visible">
                                {sortedTraditions.map(([tradition, stats], index) => {
                                  const percentage = (stats.count / totalFiles) * 100;
                                  const angle = (stats.count / totalFiles) * 360;
                                  const startAngle = cumulativeAngle;
                                  const endAngle = cumulativeAngle + angle;
                                  cumulativeAngle += angle;

                                  // Convert to radians
                                  const startRad = (startAngle * Math.PI) / 180;
                                  const endRad = (endAngle * Math.PI) / 180;

                                  // Calculate path coordinates
                                  const x1 = centerX + radius * Math.cos(startRad);
                                  const y1 = centerY + radius * Math.sin(startRad);
                                  const x2 = centerX + radius * Math.cos(endRad);
                                  const y2 = centerY + radius * Math.sin(endRad);

                                  const largeArc = angle > 180 ? 1 : 0;

                                  const pathData = [
                                    `M ${centerX} ${centerY}`,
                                    `L ${x1} ${y1}`,
                                    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                                    'Z'
                                  ].join(' ');

                                  return (
                                    <path
                                      key={tradition}
                                      d={pathData}
                                      fill={stats.color}
                                      stroke="#0B0B11"
                                      strokeWidth="2"
                                      className="hover:opacity-80 transition-opacity"
                                    />
                                  );
                                })}
                                
                                {/* Center circle for donut effect */}
                                <circle
                                  cx={centerX}
                                  cy={centerY}
                                  r="30"
                                  fill="#13131B"
                                  stroke="#2A2A38"
                                  strokeWidth="2"
                                />
                                
                                {/* Center text */}
                                <text
                                  x={centerX}
                                  y={centerY - 5}
                                  textAnchor="middle"
                                  className="text-sm font-bold fill-slate-100"
                                >
                                  {totalFiles}
                                </text>
                                <text
                                  x={centerX}
                                  y={centerY + 10}
                                  textAnchor="middle"
                                  className="text-xs fill-slate-400"
                                >
                                  files
                                </text>
                              </svg>
                            </div>

                            {/* Legend */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                              {sortedTraditions.map(([tradition, stats]) => {
                                const percentage = Math.round((stats.count / totalFiles) * 100);
                                return (
                                  <div key={tradition} className="flex items-center gap-2 min-w-0">
                                    <div 
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: stats.color }}
                                    />
                                    <span className="text-lg flex-shrink-0">{stats.icon}</span>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm text-slate-300 truncate">{tradition}</div>
                                      <div className="text-xs text-slate-400">
                                        {stats.count} files ({percentage}%) • {stats.characters.toLocaleString()} chars
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* ElevenLabs Quota Usage */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" style={{ color: "#D4A020" }} />
                    ElevenLabs Quota Usage
                  </h2>
                  {usageLoading ? (
                    <div className="text-center py-8">
                      <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400">Loading usage data...</p>
                    </div>
                  ) : elevenlabsUsage ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-slate-100">{elevenlabsUsage.tier}</div>
                          <div className="text-sm text-slate-400">Plan Tier</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-slate-100">
                            {elevenlabsUsage.character_count?.toLocaleString()} / {elevenlabsUsage.character_limit?.toLocaleString()}
                          </div>
                          <div className="text-sm text-slate-400">Characters Used</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold" style={{ color: "#D4A020" }}>
                            {elevenlabsUsage.character_limit && elevenlabsUsage.character_count 
                              ? Math.floor((elevenlabsUsage.character_limit - elevenlabsUsage.character_count) / 6000)
                              : 0}
                          </div>
                          <div className="text-sm text-slate-400">Lessons Remaining</div>
                        </div>
                      </div>
                      
                      {/* Usage Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-400">Monthly Usage</span>
                          <span className="text-slate-300">
                            {Math.round(((elevenlabsUsage.character_count || 0) / (elevenlabsUsage.character_limit || 1)) * 100)}% used
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              backgroundColor: "#D4A020", 
                              width: `${Math.min(((elevenlabsUsage.character_count || 0) / (elevenlabsUsage.character_limit || 1)) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                          <span>
                            Resets {elevenlabsUsage.next_reset_unix ? new Date(elevenlabsUsage.next_reset_unix * 1000).toLocaleDateString() : 'Unknown'}
                          </span>
                          <span>{elevenlabsUsage.character_count?.toLocaleString()} chars</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400">Failed to load usage data</p>
                      <button 
                        onClick={fetchElevenlabsUsage}
                        className="mt-2 px-4 py-2 rounded-lg text-sm transition-colors"
                        style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>

                {/* Audio Library */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                      <Volume2 className="w-5 h-5" style={{ color: "#D4A020" }} />
                      Audio Library
                    </h2>
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "#0B0B11", border: "1px solid #2A2A38" }}>
                      <button
                        onClick={() => setAudioViewMode("tradition")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          audioViewMode === "tradition" 
                            ? "text-slate-900" 
                            : "text-slate-400 hover:text-slate-300"
                        }`}
                        style={{ 
                          backgroundColor: audioViewMode === "tradition" ? "#D4A020" : "transparent"
                        }}
                      >
                        <Globe className="w-4 h-4 inline mr-1" />
                        By Tradition
                      </button>
                      <button
                        onClick={() => setAudioViewMode("date")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          audioViewMode === "date" 
                            ? "text-slate-900" 
                            : "text-slate-400 hover:text-slate-300"
                        }`}
                        style={{ 
                          backgroundColor: audioViewMode === "date" ? "#D4A020" : "transparent"
                        }}
                      >
                        <Calendar className="w-4 h-4 inline mr-1" />
                        By Date
                      </button>
                    </div>
                  </div>
                  {audioLoading ? (
                    <div className="text-center py-8">
                      <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400">Loading audio files...</p>
                    </div>
                  ) : (
                    <>
                      {/* Filters */}
                      <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Audio Type Filter */}
                          <div>
                            <label className="text-xs font-medium text-slate-400">Audio Type</label>
                            <select 
                              value={audioTypeFilter}
                              onChange={(e) => setAudioTypeFilter(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                              style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}
                            >
                              <option value="all">All Types</option>
                              <option value="lesson">📖 Lessons</option>
                              <option value="prayer">🙏 Daily Prayers</option>
                              <option value="podcast">🎙️ Podcast Episodes</option>
                            </select>
                          </div>

                          {/* Tradition Filter */}
                          <div>
                            <label className="text-xs font-medium text-slate-400">Filter by Tradition</label>
                            <select 
                              value={audioFilter}
                              onChange={(e) => setAudioFilter(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                              style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}
                            >
                              <option value="all">All Traditions</option>
                              <option value="Judaism">Judaism</option>
                              <option value="Christianity">Christianity</option>
                              <option value="Islam">Islam</option>
                              <option value="Hinduism">Hinduism</option>
                              <option value="Buddhism">Buddhism</option>
                              <option value="Bahá&apos;í">Bahá&apos;í</option>
                            </select>
                          </div>
                          
                          {/* Search */}
                          <div>
                            <label className="text-xs font-medium text-slate-400">Search Topics</label>
                            <div className="relative mt-1">
                              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                              <input
                                type="text"
                                placeholder="Search by topic..."
                                value={audioSearch}
                                onChange={(e) => setAudioSearch(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 rounded-lg border text-sm"
                                style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#E2E8F0" }}
                              />
                            </div>
                          </div>
                          
                          {/* Date Filter */}
                          <div>
                            <label className="text-xs font-medium text-slate-400">Filter by Date</label>
                            <select 
                              value={audioDate}
                              onChange={(e) => setAudioDate(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                              style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}
                            >
                              <option value="all">All Dates</option>
                              <option value="today">Today</option>
                              <option value="week">This Week</option>
                              <option value="month">This Month</option>
                            </select>
                          </div>
                        </div>

                        {/* Type counts summary */}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            📖 {audioFiles.filter(a => a.audio_type === 'lesson').length} lessons
                          </span>
                          <span className="flex items-center gap-1">
                            🙏 {audioFiles.filter(a => a.audio_type === 'prayer').length} prayers
                          </span>
                          <span className="flex items-center gap-1">
                            🎙️ {audioFiles.filter(a => a.audio_type === 'podcast').length} podcast episodes
                          </span>
                        </div>
                      </div>

                      {/* Audio Library - Jira-Style Table */}
                      <div className="space-y-6">
                        {/* Summary Table */}
                        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-700/50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tradition</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Files</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Size</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Latest Date</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const traditionStats = audioFiles.reduce((acc, audio) => {
                                  const tradition = audio.tradition?.name || 'Unknown';
                                  if (!acc[tradition]) {
                                    acc[tradition] = {
                                      count: 0,
                                      totalSize: 0,
                                      latestDate: audio.date,
                                      icon: audio.tradition?.icon || '📖',
                                      color: audio.tradition?.color || '#6B7280'
                                    };
                                  }
                                  acc[tradition].count += 1;
                                  acc[tradition].totalSize += audio.file_size_bytes || 0;
                                  if (audio.date > acc[tradition].latestDate) {
                                    acc[tradition].latestDate = audio.date;
                                  }
                                  return acc;
                                }, {} as Record<string, { count: number; totalSize: number; latestDate: string; icon: string; color: string }>);

                                return (Object.entries(traditionStats) as [string, { count: number; totalSize: number; latestDate: string; icon: string; color: string }][])
                                  .sort(([,a], [,b]) => b.count - a.count)
                                  .map(([tradition, stats]) => (
                                    <tr key={tradition} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">{stats.icon}</span>
                                          <span className="text-sm font-medium text-slate-200">{tradition}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-sm text-slate-300">{stats.count} files</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-sm text-slate-300">
                                          {Math.round(stats.totalSize / 1024 / 1024)}MB
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-sm text-slate-400">
                                          {new Date(stats.latestDate).toLocaleDateString()}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <button
                                          onClick={() => setSelectedTraditionModal(tradition)}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                          style={{ backgroundColor: "rgba(212,160,32,0.15)", color: "#D4A020" }}
                                        >
                                          <Eye className="w-3 h-3" />
                                          View
                                        </button>
                                      </td>
                                    </tr>
                                  ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Tradition Audio Modal */}
                      {selectedTraditionModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                          <div 
                            className="w-full max-w-6xl max-h-[90vh] rounded-xl border overflow-hidden flex flex-col"
                            style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                          >
                            {/* Modal Header */}
                            <div className="p-6 border-b" style={{ borderColor: "#2A2A38" }}>
                              <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                  {(() => {
                                    const traditionAudio = audioFiles.find(a => a.tradition?.name === selectedTraditionModal);
                                    return traditionAudio?.tradition?.icon || '📖';
                                  })()}
                                  {selectedTraditionModal} Audio Files
                                </h2>
                                <button
                                  onClick={() => setSelectedTraditionModal(null)}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ backgroundColor: "#2A2A38", color: "#94A3B8" }}
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-4 mt-3">
                                <select
                                  value={modalAudioFilter}
                                  onChange={(e) => setModalAudioFilter(e.target.value)}
                                  className="px-3 py-2 rounded-lg border text-sm"
                                  style={{ backgroundColor: "#13131B", borderColor: "#2A2A38", color: "#D4A020" }}
                                >
                                  <option value="all">All Dates</option>
                                  <option value="week">This Week</option>
                                  <option value="month">This Month</option>
                                </select>
                              </div>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="flex-1 overflow-auto p-6">
                              <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-slate-700/50">
                                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Topic</th>
                                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
                                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Size</th>
                                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Characters</th>
                                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {audioFiles
                                      .filter(audio => {
                                        if (audio.tradition?.name !== selectedTraditionModal) return false;
                                        
                                        if (modalAudioFilter === 'all') return true;
                                        
                                        const audioDate = new Date(audio.date);
                                        const now = new Date();
                                        
                                        if (modalAudioFilter === 'week') {
                                          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                          return audioDate >= weekAgo;
                                        } else if (modalAudioFilter === 'month') {
                                          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                                          return audioDate >= monthAgo;
                                        }
                                        
                                        return true;
                                      })
                                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                      .map((audio) => (
                                        <tr key={audio.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                          <td className="px-4 py-3">
                                            <span className="text-sm text-slate-300">
                                              {new Date(audio.date).toLocaleDateString()}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-sm text-slate-200 font-medium">
                                              {audio.lesson?.topic || 'Unknown Topic'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-sm text-slate-400">
                                              {audio.duration_seconds 
                                                ? `${Math.floor(audio.duration_seconds / 60)}:${(audio.duration_seconds % 60).toString().padStart(2, '0')}`
                                                : 'Unknown'
                                              }
                                            </span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-sm text-slate-400">
                                              {Math.round((audio.file_size_bytes || 0) / 1024)}KB
                                            </span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-sm text-slate-400">
                                              {(audio.char_count || 0).toLocaleString()}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <button
                                              onClick={() => toggleAudio(audio.id, audio.audioUrl)}
                                              className="flex items-center gap-1 px-2 py-1 rounded transition-colors"
                                              style={{ backgroundColor: currentlyPlaying === audio.id ? "#2A2A38" : "rgba(212,160,32,0.15)", color: currentlyPlaying === audio.id ? "#94A3B8" : "#D4A020" }}
                                            >
                                              {currentlyPlaying === audio.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {audioViewMode === "tradition" ? (
                          // Group by Tradition
                          Object.entries(audioFiles
                            .filter(audio => {
                              const matchesType = audioTypeFilter === 'all' || audio.audio_type === audioTypeFilter;
                              const matchesTradition = audioFilter === 'all' || (audio.tradition?.name === audioFilter);
                              const matchesSearch = !audioSearch || 
                                (audio.lesson?.topic || '').toLowerCase().includes(audioSearch.toLowerCase());
                              
                              let matchesDate = true;
                              if (audioDate !== 'all') {
                                // Fix timezone issue by using UTC
                                const audioDateObj = new Date(audio.date + 'T00:00:00.000Z');
                                const now = new Date();
                                if (audioDate === 'today') {
                                  const today = new Date().toISOString().split('T')[0];
                                  matchesDate = audio.date === today;
                                } else if (audioDate === 'week') {
                                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                  matchesDate = audioDateObj >= weekAgo;
                                } else if (audioDate === 'month') {
                                  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                                  matchesDate = audioDateObj >= monthAgo;
                                }
                              }
                              
                              return matchesType && matchesTradition && matchesSearch && matchesDate;
                            })
                            .reduce((grouped, audio) => {
                              const traditionKey = audio.tradition?.name || 'Unknown';
                              if (!grouped[traditionKey]) grouped[traditionKey] = [];
                              grouped[traditionKey].push(audio);
                              return grouped;
                            }, {} as Record<string, any[]>) as Record<string, any[]>
                          )
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([tradition, audios]) => (
                            <div key={tradition} className="space-y-2">
                              <div className="flex items-center gap-2 border-b border-slate-600 pb-2">
                                <span className="text-lg">
                                  {audios[0]?.tradition?.icon || "🔯"}
                                </span>
                                <h3 className="text-sm font-medium text-slate-300">
                                  {tradition} ({audios.length})
                                </h3>
                              </div>
                              {audios
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((audio) => (
                                <div 
                                  key={audio.id}
                                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-slate-900/30 transition-colors ml-4"
                                  style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                                >
                                  {/* Date */}
                                  <div className="text-xs text-slate-400 w-20">
                                    {new Date(audio.date + 'T00:00:00.000Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                  
                                  {/* Type Badge */}
                                  <div className="w-16">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      audio.audio_type === 'podcast' ? 'bg-purple-500/20 text-purple-400' :
                                      audio.audio_type === 'prayer' ? 'bg-blue-500/20 text-blue-400' :
                                      'bg-green-500/20 text-green-400'
                                    }`}>
                                      {audio.audio_type === 'podcast' ? '🎙️ EP' : audio.audio_type === 'prayer' ? '🙏' : '📖'}
                                    </span>
                                  </div>

                                  {/* Topic */}
                                  <div className="min-w-0 flex-1">
                                    <span className="text-sm text-slate-200 truncate">
                                      {audio.lesson?.topic || "Unknown Topic"}
                                    </span>
                                  </div>
                                  
                                  {/* Duration & Size */}
                                  <div className="flex gap-4 text-xs text-slate-400">
                                    <span>{audio.duration_seconds ? `${Math.round(audio.duration_seconds)}s` : "—"}</span>
                                    <span>{audio.file_size_bytes ? `${Math.round(audio.file_size_bytes / 1024)}KB` : "—"}</span>
                                    <span>{audio.char_count ? `${audio.char_count}c` : "—"}</span>
                                  </div>
                                  
                                  {/* Play Button */}
                                  <button
                                    onClick={() => audio.audioUrl ? toggleAudio(audio.id, audio.audioUrl) : null}
                                    className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                                    style={{ 
                                      backgroundColor: currentlyPlaying === audio.id ? "#D4A020" : "#2A2A38",
                                      color: currentlyPlaying === audio.id ? "#0B0B11" : audio.audioUrl ? "#64748B" : "#333"
                                    }}
                                    disabled={!audio.audioUrl}
                                  >
                                    {currentlyPlaying === audio.id ? (
                                      <Pause className="w-4 h-4" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          // Group by Date (original implementation with timezone fix)
                          Object.entries(audioFiles
                            .filter(audio => {
                              const matchesType = audioTypeFilter === 'all' || audio.audio_type === audioTypeFilter;
                              const matchesTradition = audioFilter === 'all' || (audio.tradition?.name === audioFilter);
                              const matchesSearch = !audioSearch || 
                                (audio.lesson?.topic || '').toLowerCase().includes(audioSearch.toLowerCase());
                              
                              let matchesDate = true;
                              if (audioDate !== 'all') {
                                // Fix timezone issue by using UTC
                                const audioDateObj = new Date(audio.date + 'T00:00:00.000Z');
                                const now = new Date();
                                if (audioDate === 'today') {
                                  const today = new Date().toISOString().split('T')[0];
                                  matchesDate = audio.date === today;
                                } else if (audioDate === 'week') {
                                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                  matchesDate = audioDateObj >= weekAgo;
                                } else if (audioDate === 'month') {
                                  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                                  matchesDate = audioDateObj >= monthAgo;
                                }
                              }
                              
                              return matchesType && matchesTradition && matchesSearch && matchesDate;
                            })
                            .reduce((grouped, audio) => {
                              // Fix timezone issue by using UTC and proper date formatting
                              const dateKey = new Date(audio.date + 'T00:00:00.000Z').toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric',
                                year: 'numeric'
                              });
                              if (!grouped[dateKey]) grouped[dateKey] = [];
                              grouped[dateKey].push(audio);
                              return grouped;
                            }, {} as Record<string, any[]>) as Record<string, any[]>
                          )
                          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()) // Sort dates descending
                          .map(([date, audios]) => (
                            <div key={date} className="space-y-2">
                              <h3 className="text-sm font-medium text-slate-300 border-b border-slate-600 pb-1">
                                {date} ({audios.length})
                              </h3>
                              {audios.map((audio) => (
                                <div 
                                  key={audio.id}
                                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-slate-900/30 transition-colors"
                                  style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
                                >
                                  {/* Tradition */}
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-lg" style={{ color: audio.tradition?.color || "#6B7280" }}>
                                      {audio.tradition?.icon || "🔯"}
                                    </span>
                                    <span className="text-sm text-slate-300 truncate">
                                      {audio.tradition?.name || "Unknown"}
                                    </span>
                                  </div>
                                  
                                  {/* Topic */}
                                  <div className="min-w-0 flex-2">
                                    <span className="text-sm text-slate-200 truncate">
                                      {audio.lesson?.topic || "Unknown Topic"}
                                    </span>
                                  </div>
                                  
                                  {/* Duration & Size */}
                                  <div className="flex gap-4 text-xs text-slate-400">
                                    <span>{audio.duration_seconds ? `${Math.round(audio.duration_seconds)}s` : "—"}</span>
                                    <span>{audio.file_size_bytes ? `${Math.round(audio.file_size_bytes / 1024)}KB` : "—"}</span>
                                    <span>{audio.char_count ? `${audio.char_count}c` : "—"}</span>
                                  </div>
                                  
                                  {/* Play Button */}
                                  <button
                                    onClick={() => toggleAudio(audio.id, audio.audioUrl)}
                                    className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                                    style={{ 
                                      backgroundColor: currentlyPlaying === audio.id ? "#D4A020" : "#2A2A38",
                                      color: currentlyPlaying === audio.id ? "#0B0B11" : "#64748B"
                                    }}
                                  >
                                    {currentlyPlaying === audio.id ? (
                                      <Pause className="w-4 h-4" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ))
                        )}
                        
                        {audioFiles.length === 0 && (
                          <div className="text-center py-8">
                            <Music className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-slate-400">No audio files found</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Stats Summary */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Audio Statistics
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-100">{audioFiles.length}</div>
                      <div className="text-sm text-slate-400">Total Files</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-100">
                        {audioFiles.reduce((sum, audio) => sum + (audio.char_count || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-400">Characters</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-100">
                        {Math.round(audioFiles.reduce((sum, audio) => sum + (audio.file_size_bytes || 0), 0) / 1024 / 1024)}MB
                      </div>
                      <div className="text-sm text-slate-400">Total Size</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-100">
                        {audioFiles.length > 0 ? Math.round(audioFiles.reduce((sum, audio) => sum + (audio.duration_seconds || 0), 0) / audioFiles.length) : 0}s
                      </div>
                      <div className="text-sm text-slate-400">Avg Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: "#D4A020" }}>
                        ${(audioFiles.reduce((sum, audio) => sum + (audio.char_count || 0), 0) * 0.00022).toFixed(2)}
                      </div>
                      <div className="text-sm text-slate-400">Est. Cost</div>
                    </div>
                  </div>
                </div>

                {/* Generate Audio Section */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Mic className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Generate Audio
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Batch Generation */}
                    <div>
                      <h3 className="text-slate-300 font-medium mb-3">Generate Audio for Date</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-slate-400">Select Date</label>
                          <input
                            type="date"
                            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                            style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}
                            defaultValue={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <button 
                          disabled
                          className="w-full py-2 rounded-lg text-sm transition-colors opacity-50 cursor-not-allowed"
                          style={{ backgroundColor: "#2A2A38", color: "#64748B" }}
                          title="Coming soon"
                        >
                          Generate All 25 Lessons
                        </button>
                        <p className="text-xs text-slate-500">This will generate audio for all traditions on the selected date</p>
                      </div>
                    </div>
                    
                    {/* Single Generation */}
                    <div>
                      <h3 className="text-slate-300 font-medium mb-3">Generate Single Lesson</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-slate-400">Select Tradition</label>
                          <select className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                                  style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}>
                            <option>Judaism</option>
                            <option>Christianity</option>
                            <option>Islam</option>
                            <option>Hinduism</option>
                            <option>Buddhism</option>
                            <option>Bahá'í</option>
                          </select>
                        </div>
                        <button 
                          disabled
                          className="w-full py-2 rounded-lg text-sm transition-colors opacity-50 cursor-not-allowed"
                          style={{ backgroundColor: "#2A2A38", color: "#64748B" }}
                          title="Coming soon"
                        >
                          Generate Single
                        </button>
                        <p className="text-xs text-slate-500">Generate audio for a specific tradition and date</p>
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
                      "Buddhism": "#06B6D4",
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

            {/* Images Tab */}
            {activeTab === "images" && (
              <div className="space-y-6">
                {/* Stats Header */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Image Library
                  </h2>
                  {imagesLoading ? (
                    <div className="text-center py-8">
                      <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400">Loading images...</p>
                    </div>
                  ) : (
                    <>
                      {/* Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-slate-100">{images.length}</div>
                          <div className="text-sm text-slate-400">Total Images</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-slate-100">
                            {images.filter(img => img.reused_from !== null).length}
                          </div>
                          <div className="text-sm text-slate-400">Reused Images ♻️</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold" style={{ color: "#D4A020" }}>
                            ${((images.length - images.filter(img => img.reused_from !== null).length) * 0.07).toFixed(2)}
                          </div>
                          <div className="text-sm text-slate-400">Generation Cost</div>
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="space-y-4 mb-6">
                        {/* Tradition Badge Filters */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-400">Filter by Tradition</label>
                          <div className="flex flex-wrap gap-2">
                            {traditionFamilies.map(tradition => {
                              const isSelected = selectedTraditions.has(tradition.id);
                              return (
                                <button
                                  key={tradition.id}
                                  onClick={() => toggleTradition(tradition.id)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                                    isSelected 
                                      ? 'border-opacity-60 text-white shadow-lg transform scale-105' 
                                      : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-200'
                                  }`}
                                  style={{
                                    backgroundColor: isSelected ? tradition.color : "#1A1A2E",
                                    borderColor: isSelected ? tradition.color : "#2A2A38",
                                  }}
                                >
                                  <span>{tradition.emoji}</span>
                                  <span>{tradition.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Search and Date Filters Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Search */}
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Search by description or tags..."
                              value={imageSearch}
                              onChange={(e) => setImageSearch(e.target.value)}
                              className="w-full pl-10 pr-3 py-2 rounded-lg border text-sm"
                              style={{ 
                                backgroundColor: "#13131B", 
                                borderColor: "#2A2A38", 
                                color: "#F1F5F9" 
                              }}
                            />
                          </div>

                          {/* Date Filter */}
                          <select
                            value={imageDate}
                            onChange={(e) => setImageDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                            style={{ 
                              backgroundColor: "#13131B", 
                              borderColor: "#2A2A38", 
                              color: "#F1F5F9" 
                            }}
                          >
                            <option value="all">All Dates</option>
                            {Array.from(new Set(images.map(img => img.date))).sort().reverse().map(date => (
                              <option key={date} value={date}>{date}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Images Grid */}
                      {(() => {
                        const filteredImages = images.filter(image => {
                          const matchesSearch = imageSearch === "" || 
                            image.description.toLowerCase().includes(imageSearch.toLowerCase()) ||
                            image.tags.some(tag => tag.toLowerCase().includes(imageSearch.toLowerCase()));
                          const matchesFamily = selectedTraditions.has("all") || selectedTraditions.has(image.tradition_family);
                          const matchesDate = imageDate === "all" || image.date === imageDate;
                          return matchesSearch && matchesFamily && matchesDate;
                        });

                        if (filteredImages.length === 0) {
                          return (
                            <EmptyState 
                              icon={ImageIcon}
                              title="No images found"
                              description="Try adjusting your search or filters to find images."
                            />
                          );
                        }

                        const traditionEmojisMap: Record<string, string> = {
                          "judaism": "✡️", "Judaism": "✡️",
                          "christianity": "✝️", "Christianity": "✝️",
                          "islam": "☪️", "Islam": "☪️",
                          "hinduism": "🕉️", "Hinduism": "🕉️",
                          "buddhism": "☸️", "Buddhism": "☸️",
                          "other": "🌍", "Other": "🌍",
                        };

                        // Tradition display order
                        const traditionOrder = ["Judaism", "Christianity", "Islam", "Hinduism", "Buddhism", "Other"];

                        // Group by tradition family
                        const imagesByTradition = filteredImages.reduce((acc, image) => {
                          const family = image.tradition_family.charAt(0).toUpperCase() + image.tradition_family.slice(1).toLowerCase();
                          if (!acc[family]) acc[family] = [];
                          acc[family].push(image);
                          return acc;
                        }, {} as Record<string, FaithImage[]>);

                        // Sort images within each tradition by date (latest first)
                        Object.values(imagesByTradition).forEach(imgs => 
                          imgs.sort((a, b) => b.date.localeCompare(a.date))
                        );

                        return (
                          <div className="space-y-8">
                            {traditionOrder
                              .filter(tradition => imagesByTradition[tradition]?.length > 0)
                              .map(tradition => {
                                const traditionImages = imagesByTradition[tradition];
                                const isExpanded = expandedTraditions.has(tradition);
                                const traditionColor = traditionFamilies.find(t => t.name === tradition)?.color || "#6366F1";
                                const latestDate = traditionImages[0]?.date;
                                const latestDateFormatted = latestDate 
                                  ? new Date(latestDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                  : '';

                                return (
                                <div key={tradition} className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#13131B", borderColor: isExpanded ? traditionColor : "#2A2A38" }}>
                                  {/* Accordion Header */}
                                  <button
                                    onClick={() => setExpandedTraditions(prev => {
                                      const next = new Set(prev);
                                      if (next.has(tradition)) next.delete(tradition);
                                      else next.add(tradition);
                                      return next;
                                    })}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white hover:bg-opacity-5 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl">{traditionEmojisMap[tradition] || "🌍"}</span>
                                      <div className="text-left">
                                        <div className="text-base font-semibold text-slate-100">{tradition}</div>
                                        <div className="text-xs text-slate-400">
                                          {traditionImages.length} image{traditionImages.length !== 1 ? 's' : ''} · Latest: {latestDateFormatted}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {/* Thumbnail previews when collapsed */}
                                      {!isExpanded && (
                                        <div className="hidden sm:flex items-center gap-1">
                                          {traditionImages.slice(0, 4).map((img, idx) => (
                                            <img
                                              key={idx}
                                              src={img.image_url}
                                              alt=""
                                              className="w-8 h-8 rounded object-cover opacity-70"
                                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                          ))}
                                          {traditionImages.length > 4 && (
                                            <span className="text-xs text-slate-500 ml-1">+{traditionImages.length - 4}</span>
                                          )}
                                        </div>
                                      )}
                                      <ChevronDown 
                                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                      />
                                    </div>
                                  </button>

                                  {/* Expanded Content */}
                                  {isExpanded && (
                                    <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "#2A2A38" }}>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {traditionImages.map((image) => (
                                          <div 
                                            key={image.id}
                                            className="rounded-lg p-3 border transition-all hover:border-opacity-50"
                                            style={{ backgroundColor: "#0B0B13", borderColor: "#2A2A38" }}
                                          >
                                            {/* Image */}
                                            <div className="relative mb-3 rounded-lg overflow-hidden">
                                              <img 
                                                src={image.image_url}
                                                alt={image.description}
                                                className="w-full h-44 object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                              />
                                              {image.reused_from && (
                                                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-lg">
                                                  ♻️ Reused
                                                </div>
                                              )}
                                            </div>

                                            {/* Content */}
                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(212, 160, 32, 0.15)", color: "#D4A020" }}>
                                                  {new Date(image.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                              </div>
                                              <div>
                                                <div className="text-sm font-medium text-slate-200">{image.guide_name}</div>
                                                <div className="text-xs text-slate-400 line-clamp-2">{image.guide_reflection}</div>
                                              </div>
                                              <div className="text-xs text-slate-300 line-clamp-2">{image.description}</div>
                                              {image.tags && image.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                  {image.tags.slice(0, 3).map((tag, idx) => (
                                                    <span key={idx} className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(212, 160, 32, 0.1)", color: "#D4A020" }}>{tag}</span>
                                                  ))}
                                                  {image.tags.length > 3 && <span className="text-xs text-slate-500">+{image.tags.length - 3}</span>}
                                                </div>
                                              )}
                                              <div className="text-xs text-slate-500 pt-1 border-t border-slate-700">
                                                {image.model} • {image.style}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                );
                              })}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
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

      {selectedHoliday && (
        <HolidayDetailModal
          holiday={selectedHoliday}
          onClose={() => setSelectedHoliday(null)}
        />
      )}
    </div>
  );
}