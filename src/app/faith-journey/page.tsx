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

type ActiveTab = "overview" | "guides" | "lessons" | "calendar" | "audio" | "texts" | "conversations";

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

// ===== Main Page =====

export default function FaithJourneyPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [holidayFilters, setHolidayFilters] = useState<Set<string>>(new Set(["Judaism", "Christianity", "Islam", "Hinduism", "Buddhism", "Bahá'í"]));
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [expandedTextsTraditions, setExpandedTextsTraditions] = useState<Set<string>>(new Set(["Judaism"]));
  
  // Fetch sacred texts status from Supabase
  const [sacredTexts, setSacredTexts] = useState<any[]>([]);
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
    { key: "lessons", label: "Lessons", icon: GraduationCap },
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

  const toggleTextsTradition = (tradition: string) => {
    const newExpanded = new Set(expandedTextsTraditions);
    if (newExpanded.has(tradition)) {
      newExpanded.delete(tradition);
    } else {
      newExpanded.add(tradition);
    }
    setExpandedTextsTraditions(newExpanded);
  };

  // Helper function to look up text status from Supabase data
  const getTextStatus = (bookTitle: string, tradition: string) => {
    const match = sacredTexts.find(t => 
      t.title?.toLowerCase().includes(bookTitle.toLowerCase()) && 
      t.tradition?.toLowerCase() === tradition.toLowerCase()
    );
    if (!match) return { status: 'pending', verses: 0 };
    return { status: match.ingestion_status, verses: match.verse_count || 0 };
  };

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
    
    return {
      total,
      ingestedCount: ingested.length,
      pendingCount: pending.length,
      totalVerses
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0B0B11" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b px-4 lg:px-6 py-4" 
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
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? "rgba(212, 160, 32, 0.15)" : "transparent",
                  color: isActive ? "#D4A020" : "#8B8B80",
                  border: isActive ? "1px solid rgba(212, 160, 32, 0.3)" : "1px solid transparent",
                }}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6">
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

            {/* Guides Tab - Denomination-Specific Agents */}
            {activeTab === "guides" && (
              <div className="space-y-6">
                {Object.entries(groupAgentsByTradition()).map(([tradition, agents]) => (
                  <div key={tradition} className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <span style={{ color: agents[0].color }}>●</span>
                      {tradition} ({agents.length} guides)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {agents.map((agent) => (
                        <div key={`${agent.tradition}-${agent.name}`} 
                             className="rounded-lg p-4 border transition-all hover:border-opacity-50"
                             style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                          <div className="flex items-center gap-3 mb-3">
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
                                <span className="text-xs px-1.5 py-0.5 rounded border inline-flex items-center gap-1"
                                      style={{ 
                                        backgroundColor: "rgba(234, 179, 8, 0.1)", 
                                        borderColor: "rgba(234, 179, 8, 0.3)",
                                        color: "#EAB308" 
                                      }}
                                      title="Texts identified but not yet embedded">
                                  🟡 Pending
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm font-medium mb-2" style={{ color: "#D4A020" }}>
                            {agent.focus}
                          </p>
                          <p className="text-xs text-slate-400 leading-relaxed mb-3">
                            {agent.description}
                          </p>
                          
                          {/* Core Texts */}
                          <div>
                            <h4 className="text-xs font-medium text-slate-300 mb-2">Core Texts:</h4>
                            <div className="flex flex-wrap gap-1">
                              {agent.coreTexts.map((text, index) => (
                                <span key={index} 
                                      className="text-xs px-2 py-1 rounded border hover:border-opacity-70 cursor-help"
                                      style={{ 
                                        backgroundColor: "rgba(100, 116, 139, 0.1)", 
                                        borderColor: "rgba(100, 116, 139, 0.3)",
                                        color: "#94A3B8" 
                                      }}
                                      title={`${text} - Core religious text for ${agent.tradition} ${agent.denomination}`}>
                                  {text}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lessons Tab - Expandable Content */}
            {activeTab === "lessons" && (
              <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" style={{ color: "#D4A020" }} />
                  Available Lessons ({(data?.lessons?.length || 0) + sampleLessons.length})
                </h2>
                
                {/* Show actual lessons if available, otherwise show samples */}
                {data?.lessons && data.lessons.length > 0 ? (
                  <div className="space-y-4">
                    {data.lessons.map((lesson) => {
                      const isExpanded = expandedLessons.has(lesson.id);
                      return (
                        <div key={lesson.id} 
                             className="rounded-lg border transition-all"
                             style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-slate-200">{lesson.title}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-1 rounded-lg border"
                                        style={{ 
                                          backgroundColor: "rgba(212, 160, 32, 0.1)", 
                                          borderColor: "rgba(212, 160, 32, 0.3)",
                                          color: "#D4A020" 
                                        }}>
                                    {lesson.tradition}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    lesson.difficulty === 'easy' 
                                      ? 'bg-emerald-900/30 text-emerald-400' 
                                      : lesson.difficulty === 'hard'
                                      ? 'bg-red-900/30 text-red-400'
                                      : 'bg-amber-900/30 text-amber-400'
                                  }`}>
                                    {getDifficultyLevel(lesson.difficulty)}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => toggleLessonExpansion(lesson.id)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                {isExpanded ? 'Collapse' : 'Expand'}
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {lesson.estimatedReadingTime || getReadingTime(lesson.content || '')} min read
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {lesson.completionCount} completions
                              </div>
                              <span>Created {formatDate(lesson.date)}</span>
                            </div>

                            {isExpanded && lesson.content && (
                              <div className="mt-4 pt-4 border-t" style={{ borderColor: "#2A2A38" }}>
                                <div className="prose prose-invert prose-sm max-w-none">
                                  <p className="text-slate-300 leading-relaxed">{lesson.content}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-slate-400 text-sm mb-4">No lessons found in database. Showing sample lessons:</p>
                    {sampleLessons.map((lesson) => {
                      const isExpanded = expandedLessons.has(lesson.id);
                      return (
                        <div key={lesson.id} 
                             className="rounded-lg border transition-all"
                             style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-slate-200">{lesson.title}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-1 rounded-lg border"
                                        style={{ 
                                          backgroundColor: "rgba(212, 160, 32, 0.1)", 
                                          borderColor: "rgba(212, 160, 32, 0.3)",
                                          color: "#D4A020" 
                                        }}>
                                    {lesson.tradition}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    lesson.difficulty === 'beginner' 
                                      ? 'bg-emerald-900/30 text-emerald-400' 
                                      : lesson.difficulty === 'advanced'
                                      ? 'bg-red-900/30 text-red-400'
                                      : 'bg-amber-900/30 text-amber-400'
                                  }`}>
                                    {getDifficultyLevel(lesson.difficulty)}
                                  </span>
                                  <span className="text-xs px-2 py-1 rounded-full bg-blue-900/30 text-blue-400">
                                    Sample
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => toggleLessonExpansion(lesson.id)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                {isExpanded ? 'Collapse' : 'Expand'}
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {lesson.estimatedReadingTime} min read
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {lesson.completionCount} completions
                              </div>
                              <span>Created {formatDate(lesson.date)}</span>
                            </div>

                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t" style={{ borderColor: "#2A2A38" }}>
                                <div className="prose prose-invert prose-sm max-w-none">
                                  <p className="text-slate-300 leading-relaxed">{lesson.content}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Calendar Tab - Religious Holidays */}
            {activeTab === "calendar" && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Filter className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Filter by Tradition
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {["Judaism", "Christianity", "Islam", "Hinduism", "Buddhism", "Bahá'í"].map((tradition) => {
                      const isActive = holidayFilters.has(tradition);
                      const color = religiousHolidays.find(h => h.tradition === tradition)?.color || "#6B7280";
                      return (
                        <button
                          key={tradition}
                          onClick={() => toggleHolidayFilter(tradition)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
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

                {/* Upcoming Holidays List */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Upcoming Religious Holidays 2026 ({getUpcomingHolidays().length})
                  </h2>
                  
                  {getFilteredHolidays().length === 0 ? (
                    <EmptyState 
                      icon={Calendar}
                      title="No holidays visible"
                      description="Adjust your tradition filters to see religious holidays."
                    />
                  ) : (
                    <div className="space-y-3">
                      {getUpcomingHolidays().map((holiday, index) => (
                        <div key={index} 
                             className="rounded-lg p-3 border transition-all hover:border-opacity-50"
                             style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg" style={{ color: holiday.color }}>●</span>
                              <div>
                                <h3 className="font-medium text-slate-200">{holiday.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs px-2 py-1 rounded-lg border"
                                        style={{ 
                                          backgroundColor: `${holiday.color}20`, 
                                          borderColor: `${holiday.color}50`,
                                          color: holiday.color 
                                        }}>
                                    {holiday.tradition}
                                  </span>
                                  {holiday.denomination && (
                                    <span className="text-xs text-slate-500">{holiday.denomination}</span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-400 mt-1">{holiday.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-300 font-medium">{formatDate(holiday.date)}</p>
                              <p className="text-xs text-slate-500">
                                {Math.ceil((new Date(holiday.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audio Tab - Management Interface */}
            {activeTab === "audio" && (
              <div className="space-y-6">
                
                {/* Voice Configuration */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Mic className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Voice Configuration
                  </h2>
                  <div className="text-xs text-slate-500 mb-3">
                    Browser preview — production uses ElevenLabs voices
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: "Joshua", description: "Primary voice for daily prayers", tradition: "General", preview: "▶ Sample" },
                      { name: "Rabbi Voice", description: "Warm, wise voice for Jewish content", tradition: "Judaism", preview: "▶ Sample" },
                      { name: "Pastor Voice", description: "Gentle, inspiring voice for Christian content", tradition: "Christianity", preview: "▶ Sample" },
                      { name: "Imam Voice", description: "Respectful, clear voice for Islamic content", tradition: "Islam", preview: "▶ Sample" },
                      { name: "Meditation Voice", description: "Calm, serene voice for Buddhist content", tradition: "Buddhism", preview: "▶ Sample" },
                      { name: "Narrator Voice", description: "Professional voice for stories", tradition: "General", preview: "▶ Sample" },
                    ].map((voice, index) => (
                      <div key={index} 
                           className="rounded-lg p-3 border"
                           style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                        <h3 className="font-medium text-slate-200 mb-1">{voice.name}</h3>
                        <p className="text-xs text-slate-400 mb-2">{voice.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs px-2 py-1 rounded border"
                                style={{ 
                                  backgroundColor: "rgba(212, 160, 32, 0.1)", 
                                  borderColor: "rgba(212, 160, 32, 0.3)",
                                  color: "#D4A020" 
                                }}>
                            {voice.tradition}
                          </span>
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
                      
                      {/* Quick tradition switcher */}
                      <div className="mt-4">
                        <h4 className="text-sm text-slate-400 mb-2">Quick Switch:</h4>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {["Christian • Catholic", "Muslim • Sunni", "Hindu • Vedanta", "Buddhist • Zen"].map((tradition, i) => (
                            <button key={i} className="text-left px-2 py-1 rounded text-slate-500 hover:text-slate-400 hover:bg-slate-800">
                              {tradition}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nightly Sacred Story — ALL Religions & Denominations */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Moon className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Nightly Sacred Story — ALL Religions & Denominations
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-slate-300 font-medium mb-2">Tradition & Story Type</h3>
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
                          <label className="text-sm text-slate-500">Story Source:</label>
                          <select className="w-full px-2 py-1 rounded text-sm" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}>
                            <option>Torah Stories</option>
                            <option>Talmudic Tales</option>
                            <option>Midrash</option>
                            <option>Hasidic Stories</option>
                          </select>
                        </div>
                      </div>
                      
                      <h3 className="text-slate-300 font-medium mb-2 mt-4">Current Story</h3>
                      <div className="rounded-lg p-3 border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                        <h4 className="text-slate-200 font-medium">Moses and the Burning Bush</h4>
                        <p className="text-slate-400 text-sm mt-1">
                          A shepherd becomes a prophet when the Divine calls to him from a bush that burns but is not consumed...
                        </p>
                        <p className="text-slate-500 text-xs mt-2">
                          Torah • Exodus 3:1-15 • Jewish Orthodox tradition
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <label className="text-sm text-slate-500">Voice:</label>
                          <select className="w-full px-2 py-1 rounded text-sm" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}>
                            <option>Rabbi Voice</option>
                            <option>Narrator Voice</option>
                            <option>Joshua</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-slate-500">Background Music:</label>
                          <select className="w-full px-2 py-1 rounded text-sm" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}>
                            <option>Serene</option>
                            <option>Ambient</option>
                            <option>Meditative</option>
                            <option>Classical</option>
                            <option>None</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-slate-300 font-medium mb-2">Configuration</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Estimated duration:</span>
                          <span className="text-slate-300">~30 minutes</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Next scheduled:</span>
                          <span className="text-slate-300">Tonight 9:00 PM</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Current tradition:</span>
                          <span className="text-slate-300">Judaism • Orthodox</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Auto-generate:</span>
                          <span className="text-emerald-400">Enabled</span>
                        </div>
                        <button className="w-full py-2 mt-3 rounded-lg text-sm transition-colors"
                                style={{ backgroundColor: "#D4A020", color: "#0B0B11" }}>
                          Generate Now
                        </button>
                      </div>
                      
                      {/* Story type examples by tradition */}
                      <div className="mt-4">
                        <h4 className="text-sm text-slate-400 mb-2">Story Types by Tradition:</h4>
                        <div className="space-y-1 text-xs text-slate-500">
                          <div>• <span className="text-blue-400">Jewish:</span> Torah, Talmud, Midrash, Hasidic tales</div>
                          <div>• <span className="text-purple-400">Christian:</span> Bible stories, Saints' lives</div>
                          <div>• <span className="text-green-400">Islamic:</span> Quran stories, Prophet tales</div>
                          <div>• <span className="text-yellow-400">Hindu:</span> Vedic, Puranic, Bhagavad Gita</div>
                          <div>• <span className="text-orange-400">Buddhist:</span> Jataka tales, Dharma stories</div>
                          <div>• <span className="text-teal-400">Bahá'í:</span> Sacred writings, historical accounts</div>
                          <div>• <span className="text-gray-400">Humanist:</span> Philosophical narratives</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio Library */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Music className="w-5 h-5" style={{ color: "#D4A020" }} />
                    Audio Library
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                          <th className="text-left py-2 px-2">Title</th>
                          <th className="text-left py-2 px-2">Type</th>
                          <th className="text-left py-2 px-2">Voice</th>
                          <th className="text-left py-2 px-2">Duration</th>
                          <th className="text-left py-2 px-2">Generated</th>
                          <th className="text-left py-2 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { title: "Morning Serenity Prayer", type: "Prayer", voice: "Joshua", duration: "2:30", date: "Yesterday" },
                          { title: "David and Goliath", type: "Bible Story", voice: "Narrator Voice", duration: "28:15", date: "2 days ago" },
                          { title: "Psalm 23", type: "Prayer", voice: "Pastor Voice", duration: "3:45", date: "3 days ago" },
                          { title: "Noah's Ark", type: "Bible Story", voice: "Narrator Voice", duration: "32:10", date: "1 week ago" },
                        ].map((audio, index) => (
                          <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-3 px-2 text-slate-300 font-medium">{audio.title}</td>
                            <td className="py-3 px-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                audio.type === 'Prayer' 
                                  ? 'bg-blue-900/30 text-blue-400' 
                                  : 'bg-purple-900/30 text-purple-400'
                              }`}>
                                {audio.type}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-slate-400 text-sm">{audio.voice}</td>
                            <td className="py-3 px-2 text-slate-400 text-sm">{audio.duration}</td>
                            <td className="py-3 px-2 text-slate-400 text-sm">{audio.date}</td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <button className="text-slate-400 hover:text-slate-300">
                                  <Play className="w-3 h-3" />
                                </button>
                                <button className="text-slate-400 hover:text-slate-300">
                                  <Download className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Texts Tab - Full Religious Texts Library */}
            {activeTab === "texts" && (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <Scroll className="w-5 h-5" style={{ color: "#D4A020" }} />
                        Religious Texts Library
                      </h2>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                        <span>Total: <span className="text-slate-300 font-medium">{getTextsStats().total}</span></span>
                        <span>Ingested: <span className="text-green-400 font-medium">{getTextsStats().ingestedCount}</span> ({getTextsStats().totalVerses.toLocaleString()} verses)</span>
                        <span>Pending: <span className="text-yellow-400 font-medium">{getTextsStats().pendingCount}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Search texts..." 
                        className="px-3 py-1 rounded text-sm"
                        style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38", color: "#D4A020" }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {["Judaism", "Christianity", "Islam", "Hinduism", "Buddhism", "Bahá'í", "Other"].map((tradition) => {
                      const isExpanded = expandedTextsTraditions.has(tradition);
                      const colors = {
                        "Judaism": "#3B82F6",
                        "Christianity": "#8B5CF6", 
                        "Islam": "#10B981",
                        "Hinduism": "#F59E0B",
                        "Buddhism": "#EAB308",
                        "Bahá'í": "#EC4899",
                        "Other": "#6B7280"
                      };
                      const color = colors[tradition as keyof typeof colors];
                      return (
                        <button
                          key={tradition}
                          onClick={() => toggleTextsTradition(tradition)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                          style={{
                            backgroundColor: isExpanded ? `${color}20` : "#0B0B11",
                            borderColor: isExpanded ? `${color}50` : "#2A2A38",
                            color: isExpanded ? color : "#8B8B80",
                            border: "1px solid"
                          }}
                        >
                          <span style={{ color: color }}>●</span>
                          {tradition}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Judaism */}
                {expandedTextsTraditions.has("Judaism") && (
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <span className="text-blue-400">●</span>
                      Judaism (67 texts)
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Torah */}
                      <div>
                        <h4 className="text-slate-200 font-medium mb-2">Torah (Pentateuch) - 5 books</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                          {[
                            { name: "Genesis (Bereshit)", chapters: 50, lang: "Hebrew", description: "Creation, patriarchs, Joseph" },
                            { name: "Exodus (Shemot)", chapters: 40, lang: "Hebrew", description: "Egypt, Exodus, Sinai" },
                            { name: "Leviticus (Vayikra)", chapters: 27, lang: "Hebrew", description: "Priestly laws, holiness" },
                            { name: "Numbers (Bamidbar)", chapters: 36, lang: "Hebrew", description: "Wilderness journey" },
                            { name: "Deuteronomy (Devarim)", chapters: 34, lang: "Hebrew", description: "Moses' final speeches" },
                          ].map((book, i) => (
                            <div key={i} className="rounded-lg p-3 border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="text-slate-200 text-sm font-medium">{book.name}</h5>
                                {renderStatusBadge(getTextStatus(book.name, 'Judaism').status)}
                              </div>
                              <p className="text-xs text-slate-400">{book.description}</p>
                              <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                                <span>{book.chapters} chapters</span>
                                <span>{book.lang}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Nevi'im (Prophets) */}
                      <div>
                        <h4 className="text-slate-200 font-medium mb-2">Nevi'im (Prophets) - 21 books</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                          {[
                            "Joshua (Yehoshua)", "Judges (Shoftim)", "Samuel I & II", "Kings I & II", 
                            "Isaiah (Yeshayahu)", "Jeremiah (Yirmiyahu)", "Ezekiel (Yechezkel)", 
                            "Hosea (Hoshea)", "Joel (Yoel)", "Amos", "Obadiah (Ovadiah)", 
                            "Jonah (Yonah)", "Micah (Michah)", "Nahum", "Habakkuk", "Zephaniah", 
                            "Haggai", "Zechariah", "Malachi"
                          ].map((book, i) => (
                            <div key={i} className="rounded-lg p-2 border text-center" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                              <div className="text-xs text-slate-200">{book}</div>
                              <div className="mt-1">
                                {(() => {
                                  const status = getTextStatus(book, 'Judaism').status;
                                  switch (status) {
                                    case 'ingested': return <span className="text-xs px-1 py-0.5 rounded inline-block" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22C55E" }}>✅</span>;
                                    case 'ingesting': return <span className="text-xs px-1 py-0.5 rounded inline-block" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3B82F6" }}>🔄</span>;
                                    case 'licensed_pending': return <span className="text-xs px-1 py-0.5 rounded inline-block" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#EF4444" }}>🔴</span>;
                                    default: return <span className="text-xs px-1 py-0.5 rounded inline-block" style={{ backgroundColor: "rgba(234, 179, 8, 0.1)", color: "#EAB308" }}>🟡</span>;
                                  }
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Ketuvim (Writings) */}
                      <div>
                        <h4 className="text-slate-200 font-medium mb-2">Ketuvim (Writings) - 13 books</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                          {[
                            "Psalms (Tehillim)", "Proverbs (Mishlei)", "Job (Iyov)", 
                            "Song of Songs", "Ruth", "Lamentations", "Ecclesiastes", 
                            "Esther", "Daniel", "Ezra", "Nehemiah", "Chronicles I & II"
                          ].map((book, i) => (
                            <div key={i} className="rounded-lg p-2 border text-center" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                              <div className="text-xs text-slate-200">{book}</div>
                              <div className="mt-1">
                                {(() => {
                                  const status = getTextStatus(book, 'Judaism').status;
                                  switch (status) {
                                    case 'ingested': return <span className="text-xs px-1 py-0.5 rounded inline-block" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22C55E" }}>✅</span>;
                                    case 'ingesting': return <span className="text-xs px-1 py-0.5 rounded inline-block" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3B82F6" }}>🔄</span>;
                                    case 'licensed_pending': return <span className="text-xs px-1 py-0.5 rounded inline-block" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#EF4444" }}>🔴</span>;
                                    default: return <span className="text-xs px-1 py-0.5 rounded inline-block" style={{ backgroundColor: "rgba(234, 179, 8, 0.1)", color: "#EAB308" }}>🟡</span>;
                                  }
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Talmud & Rabbinic Literature */}
                      <div>
                        <h4 className="text-slate-200 font-medium mb-2">Talmud & Rabbinic Literature</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-lg p-3 border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-slate-200 text-sm font-medium">Talmud Bavli (Babylonian)</h5>
                              {renderStatusBadge(getTextStatus('Talmud Bavli', 'Judaism').status)}
                            </div>
                            <p className="text-xs text-slate-400 mb-1">37 tractates, ~2,700 pages</p>
                            <p className="text-xs text-slate-500">Hebrew/Aramaic</p>
                          </div>
                          <div className="rounded-lg p-3 border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-slate-200 text-sm font-medium">Mishnah</h5>
                              {renderStatusBadge(getTextStatus('Mishnah', 'Judaism').status)}
                            </div>
                            <p className="text-xs text-slate-400 mb-1">6 orders, 63 tractates</p>
                            <p className="text-xs text-slate-500">Hebrew</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Christianity */}
                {expandedTextsTraditions.has("Christianity") && (
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <span className="text-purple-400">●</span>
                      Christianity (66+ texts)
                    </h3>
                    
                    <div className="space-y-4">
                      {/* New Testament */}
                      <div>
                        <h4 className="text-slate-200 font-medium mb-2">New Testament - 27 books</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                          <div>
                            <h5 className="text-sm font-medium text-slate-300 mb-2">Gospels (4)</h5>
                            {["Matthew", "Mark", "Luke", "John"].map((book, i) => (
                              <div key={i} className="text-xs text-slate-400 flex items-center justify-between mb-1">
                                <span>{book}</span>
                                <span>
                                  {(() => {
                                    const status = getTextStatus(book, 'Christianity').status;
                                    switch (status) {
                                      case 'ingested': return <span style={{ color: "#22C55E" }}>✅</span>;
                                      case 'ingesting': return <span style={{ color: "#3B82F6" }}>🔄</span>;
                                      case 'licensed_pending': return <span style={{ color: "#EF4444" }}>🔴</span>;
                                      default: return <span style={{ color: "#EAB308" }}>🟡</span>;
                                    }
                                  })()}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-slate-300 mb-2">Pauline Epistles (13)</h5>
                            {["Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians"].map((book, i) => (
                              <div key={i} className="text-xs text-slate-400 flex items-center justify-between mb-1">
                                <span>{book}</span>
                                <span>
                                  {(() => {
                                    const status = getTextStatus(book, 'Christianity').status;
                                    switch (status) {
                                      case 'ingested': return <span style={{ color: "#22C55E" }}>✅</span>;
                                      case 'ingesting': return <span style={{ color: "#3B82F6" }}>🔄</span>;
                                      case 'licensed_pending': return <span style={{ color: "#EF4444" }}>🔴</span>;
                                      default: return <span style={{ color: "#EAB308" }}>🟡</span>;
                                    }
                                  })()}
                                </span>
                              </div>
                            ))}
                            <div className="text-xs text-slate-500">...and 7 more</div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-slate-300 mb-2">Other (10)</h5>
                            {["Acts", "Hebrews", "James", "1 Peter", "2 Peter", "Revelation"].map((book, i) => (
                              <div key={i} className="text-xs text-slate-400 flex items-center justify-between mb-1">
                                <span>{book}</span>
                                <span>
                                  {(() => {
                                    const status = getTextStatus(book, 'Christianity').status;
                                    switch (status) {
                                      case 'ingested': return <span style={{ color: "#22C55E" }}>✅</span>;
                                      case 'ingesting': return <span style={{ color: "#3B82F6" }}>🔄</span>;
                                      case 'licensed_pending': return <span style={{ color: "#EF4444" }}>🔴</span>;
                                      default: return <span style={{ color: "#EAB308" }}>🟡</span>;
                                    }
                                  })()}
                                </span>
                              </div>
                            ))}
                            <div className="text-xs text-slate-500">...and 4 more</div>
                          </div>
                        </div>
                      </div>

                      {/* Denominational Texts */}
                      <div>
                        <h4 className="text-slate-200 font-medium mb-2">Denominational Texts</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            { name: "Catechism of the Catholic Church", denom: "Catholic", description: "Official Catholic doctrine", status: "🟡" },
                            { name: "Book of Common Prayer", denom: "Anglican", description: "Anglican liturgy and prayers", status: "🟡" },
                            { name: "Philokalia", denom: "Orthodox", description: "Eastern Orthodox mystical texts", status: "🟡" },
                            { name: "Westminster Confession", denom: "Reformed", description: "Reformed/Presbyterian doctrine", status: "🟡" },
                            { name: "Augsburg Confession", denom: "Lutheran", description: "Lutheran confessional document", status: "🟡" },
                            { name: "Church Fathers", denom: "All", description: "Early Christian writings", status: "🟡" },
                          ].map((text, i) => (
                            <div key={i} className="rounded-lg p-3 border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="text-slate-200 text-sm font-medium">{text.name}</h5>
                                {renderStatusBadge(getTextStatus(text.name, 'Christianity').status)}
                              </div>
                              <div className="text-xs text-purple-400 mb-1">{text.denom}</div>
                              <p className="text-xs text-slate-400">{text.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Islam */}
                {expandedTextsTraditions.has("Islam") && (
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <span className="text-green-400">●</span>
                      Islam (34+ texts)
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Quran */}
                      <div>
                        <h4 className="text-slate-200 font-medium mb-2">Quran - 114 Surahs</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                          {[
                            { name: "Al-Fatiha (The Opening)", num: 1, verses: 7, type: "Meccan" },
                            { name: "Al-Baqarah (The Cow)", num: 2, verses: 286, type: "Medinan" },
                            { name: "Al-Imran (Family of Imran)", num: 3, verses: 200, type: "Medinan" },
                            { name: "An-Nisa (Women)", num: 4, verses: 176, type: "Medinan" },
                            { name: "Al-Ma'idah (The Table)", num: 5, verses: 120, type: "Medinan" },
                            { name: "Al-An'am (Cattle)", num: 6, verses: 165, type: "Meccan" },
                          ].map((surah, i) => (
                            <div key={i} className="rounded-lg p-3 border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="text-slate-200 text-sm font-medium">{surah.name}</h5>
                                <span>
                                  {(() => {
                                    const status = getTextStatus(surah.name, 'Islam').status;
                                    switch (status) {
                                      case 'ingested': return <span className="text-xs px-1.5 py-0.5 rounded border" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", borderColor: "rgba(34, 197, 94, 0.3)", color: "#22C55E" }}>✅</span>;
                                      case 'ingesting': return <span className="text-xs px-1.5 py-0.5 rounded border" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", borderColor: "rgba(59, 130, 246, 0.3)", color: "#3B82F6" }}>🔄</span>;
                                      case 'licensed_pending': return <span className="text-xs px-1.5 py-0.5 rounded border" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)", color: "#EF4444" }}>🔴</span>;
                                      default: return <span className="text-xs px-1.5 py-0.5 rounded border" style={{ backgroundColor: "rgba(234, 179, 8, 0.1)", borderColor: "rgba(234, 179, 8, 0.3)", color: "#EAB308" }}>🟡</span>;
                                    }
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Surah {surah.num}</span>
                                <span>{surah.verses} verses</span>
                                <span className={surah.type === "Meccan" ? "text-amber-400" : "text-blue-400"}>{surah.type}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">...and 108 more surahs</p>
                      </div>

                      {/* Hadith Collections */}
                      <div>
                        <h4 className="text-slate-200 font-medium mb-2">Major Hadith Collections</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { name: "Sahih Bukhari", compiler: "Imam Bukhari", hadiths: "~7,563", description: "Most authentic Sunni collection" },
                            { name: "Sahih Muslim", compiler: "Imam Muslim", hadiths: "~7,563", description: "Second most authentic Sunni collection" },
                            { name: "Sunan Abu Dawud", compiler: "Abu Dawud", hadiths: "~4,800", description: "Focus on legal matters" },
                            { name: "Jami' at-Tirmidhi", compiler: "At-Tirmidhi", hadiths: "~3,956", description: "Includes weak and strong hadiths" },
                            { name: "Sunan an-Nasa'i", compiler: "An-Nasa'i", hadiths: "~5,761", description: "Stricter authentication" },
                            { name: "Sunan Ibn Majah", compiler: "Ibn Majah", hadiths: "~4,341", description: "Completes the six major books" },
                          ].map((collection, i) => (
                            <div key={i} className="rounded-lg p-3 border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="text-slate-200 text-sm font-medium">{collection.name}</h5>
                                {renderStatusBadge(getTextStatus(collection.name, 'Islam').status)}
                              </div>
                              <div className="text-xs text-green-400 mb-1">{collection.compiler}</div>
                              <p className="text-xs text-slate-400 mb-1">{collection.description}</p>
                              <div className="text-xs text-slate-500">{collection.hadiths} hadiths</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Other traditions would continue here with similar structure... */}
                {expandedTextsTraditions.has("Hinduism") && (
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <span className="text-yellow-400">●</span>
                      Hinduism (50+ texts) - Vedas, Upanishads, Epics, Puranas
                    </h3>
                    <div className="text-sm text-slate-400 p-4 rounded border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                      <p>Major categories: Vedas (4), Upanishads (108+), Epics (Mahabharata, Ramayana), 18 major Puranas, and hundreds of other sacred texts. All marked as 🟡 Pending for embedding.</p>
                    </div>
                  </div>
                )}

                {expandedTextsTraditions.has("Buddhism") && (
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <span className="text-amber-400">●</span>
                      Buddhism (100+ texts) - Pali Canon, Mahayana Sutras
                    </h3>
                    <div className="text-sm text-slate-400 p-4 rounded border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                      <p>Includes complete Pali Canon (Tipitaka), major Mahayana sutras (Heart, Diamond, Lotus), Zen texts, Tibetan Buddhist literature. All marked as 🟡 Pending for embedding.</p>
                    </div>
                  </div>
                )}

                {expandedTextsTraditions.has("Bahá'í") && (
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <span className="text-pink-400">●</span>
                      Bahá'í (20+ texts) - Central Writings
                    </h3>
                    <div className="text-sm text-slate-400 p-4 rounded border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                      <p>Kitáb-i-Aqdas, Kitáb-i-Íqán, Gleanings, Some Answered Questions, and other central Bahá'í writings. All marked as 🟡 Pending for embedding.</p>
                    </div>
                  </div>
                )}

                {expandedTextsTraditions.has("Other") && (
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "#13131B", borderColor: "#2A2A38" }}>
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <span className="text-gray-400">●</span>
                      Other Traditions (15+ texts) - Secular Humanism, Interfaith
                    </h3>
                    <div className="text-sm text-slate-400 p-4 rounded border" style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}>
                      <p>Humanist Manifestos, philosophical works, interfaith texts, and other spiritual/ethical literature. All marked as 🟡 Pending for embedding.</p>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Conversations Tab */}
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
    </div>
  );
}