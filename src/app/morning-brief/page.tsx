"use client";

import { useState, useEffect, useRef, TouchEvent } from "react";
import { 
  Sunrise, 
  Cloud, 
  Calendar, 
  Mail, 
  Globe, 
  Cpu, 
  RefreshCw, 
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  BookOpen,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Code,
} from "lucide-react";

// Flexible interfaces to handle multiple data formats
interface PrayerSection {
  title: string;
  date?: string;
  hebrew_date?: string;
  parsha?: string;
  parsha_theme?: string;
  modeh_ani?: string;
  blessing?: string;
  psalm?: string;
  proverb?: string;
  intention?: string;
  closing?: string;
  audio?: string;
}

interface WeatherSection {
  title: string;
  items?: string[];
  temperature?: string;
  condition?: string;
  wind?: string;
  summary?: string;
  audio?: string;
}

interface CalendarSection {
  audio?: string;
  title: string;
  items?: string[];
}

interface EmailEntry {
  subject?: string;
  from?: string;
  note?: string;
  preview?: string;
  messageId?: string;
  url?: string;
}

interface EmailSection {
  audio?: string;
  title: string;
  items?: EmailEntry[];
  needs_attention?: EmailEntry[];
  dev_work?: EmailEntry[];
  good_news?: EmailEntry[];
}

interface NewsItem {
  headline: string;
  source?: string;
  url?: string;
}

interface NewsSubsection {
  title: string;
  items: (NewsItem | string)[];
}

interface MarketOverview {
  symbol: string;
  price: number;
  change_pct: number;
  trend?: string;
}

interface TradingSignal {
  type: "BUY" | "SELL";
  symbol: string;
  price: number;
  entry: number;
  stop: number;
  target: number;
  confidence?: string;
  rationale?: string;
}

interface MarketsSection {
  audio?: string;
  title: string;
  summary?: {
    date?: string;
    time?: string;
    market_status?: string;
    spy?: { price: number; change_pct: number };
    sentiment?: string;
    vix?: number;
    volatility?: string;
  };
  overview?: MarketOverview[];
  signals?: TradingSignal[];
}

interface AISection {
  audio?: string;
  title: string;
  items?: (NewsItem | string)[];
}

interface BriefData {
  date: string;
  time: string;
  sections: {
    prayer?: PrayerSection;
    weather?: WeatherSection;
    calendar?: CalendarSection;
    email?: EmailSection;
    markets?: MarketsSection;
    news?: { title: string; subsections?: { [key: string]: NewsSubsection } };
    ai?: AISection;
  };
}

// Helper to normalize items
function normalizeNewsItem(item: NewsItem | string): NewsItem {
  return typeof item === "string" ? { headline: item } : item;
}

// Mobile Card Components
function PrayerCard({ data }: { data: PrayerSection }) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/30 p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-amber-600/20 rounded-xl flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="font-semibold text-xl text-slate-100">{data.title}</h2>
          {data.hebrew_date && data.parsha && (
            <p className="text-sm text-amber-400/80">{data.hebrew_date} • {data.parsha}</p>
          )}
        </div>
      </div>
      
      <div className="flex-1 space-y-4">
        {data.modeh_ani && (
          <div className="bg-slate-800/50 rounded-xl p-4 border-l-4 border-amber-500/50">
            <p className="text-amber-200 text-2xl font-hebrew mb-2">מודה אני</p>
            <p className="text-slate-300 text-sm leading-relaxed">{data.modeh_ani}</p>
          </div>
        )}
        
        {data.blessing && <p className="text-slate-300 text-base leading-relaxed">{data.blessing}</p>}
        
        {data.parsha_theme && (
          <div className="bg-slate-800/30 rounded-xl p-4">
            <p className="text-xs text-amber-400 uppercase tracking-wide mb-2">Torah Theme: {data.parsha}</p>
            <p className="text-slate-300 italic">{data.parsha_theme}</p>
          </div>
        )}
        
        <div className="space-y-3">
          {data.psalm && (
            <div className="bg-slate-800/30 rounded-xl p-4">
              <p className="text-slate-200 text-sm leading-relaxed">{data.psalm}</p>
            </div>
          )}
          {data.proverb && (
            <div className="bg-slate-800/30 rounded-xl p-4">
              <p className="text-slate-200 text-sm leading-relaxed">{data.proverb}</p>
            </div>
          )}
        </div>
        
        {data.intention && (
          <div className="border-t border-slate-700/50 pt-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Today&apos;s Intention</p>
            <p className="text-slate-200 leading-relaxed">{data.intention}</p>
          </div>
        )}
      </div>
      
      {data.closing && (
        <div className="mt-4 pt-4 border-t border-amber-900/30 text-center">
          <p className="text-amber-300/80 italic">{data.closing}</p>
        </div>
      )}
    </div>
  );
}

function WeatherCard({ data }: { data: WeatherSection }) {
  // Handle both formats: items array or structured object
  const weatherItems: string[] = [];
  if (data.items) {
    weatherItems.push(...data.items);
  } else {
    if (data.temperature) weatherItems.push(`Temperature: ${data.temperature}`);
    if (data.condition) weatherItems.push(`Condition: ${data.condition}`);
    if (data.wind) weatherItems.push(`Wind: ${data.wind}`);
    if (data.summary) weatherItems.push(data.summary);
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 to-blue-950/30 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
          <Cloud className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
        </div>
        <h2 className="font-semibold text-xl text-slate-100">{data.title}</h2>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        {data.temperature && !data.items && (
          <div className="text-center mb-6">
            <p className="text-5xl font-bold text-blue-400">{data.temperature}</p>
            {data.condition && <p className="text-slate-300 text-lg mt-2">{data.condition}</p>}
          </div>
        )}
        <div className="space-y-4">
          {weatherItems.map((item, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-200 text-lg">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarCard({ data }: { data: CalendarSection }) {
  const items = data.items || [];
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 to-purple-950/30 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
          <Calendar className="w-6 h-6 text-purple-400" strokeWidth={1.5} />
        </div>
        <h2 className="font-semibold text-xl text-slate-100">{data.title}</h2>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        {items.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-lg">No events today</p>
            <p className="text-slate-500 text-sm mt-1">Enjoy your open schedule!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0" />
                <p className="text-slate-200 text-lg">{item}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailCard({ data }: { data: EmailSection }) {
  // Handle both formats
  const sections: { title: string; items: EmailEntry[]; icon: React.ReactNode; color: string }[] = [];
  
  if (data.items) {
    sections.push({ title: "Inbox", items: data.items, icon: <Mail className="w-4 h-4" />, color: "cyan" });
  } else {
    if (data.needs_attention?.length) {
      sections.push({ title: "Needs Attention", items: data.needs_attention, icon: <AlertTriangle className="w-4 h-4" />, color: "amber" });
    }
    if (data.dev_work?.length) {
      sections.push({ title: "Dev Work", items: data.dev_work, icon: <Code className="w-4 h-4" />, color: "red" });
    }
    if (data.good_news?.length) {
      sections.push({ title: "Good News", items: data.good_news, icon: <CheckCircle className="w-4 h-4" />, color: "green" });
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 to-cyan-950/30 p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-cyan-600/20 rounded-xl flex items-center justify-center">
          <Mail className="w-6 h-6 text-cyan-400" strokeWidth={1.5} />
        </div>
        <h2 className="font-semibold text-xl text-slate-100">{data.title}</h2>
      </div>
      
      <div className="flex-1 space-y-4 overflow-auto">
        {sections.map((section, si) => (
          <div key={si}>
            <p className={`text-xs uppercase tracking-wide mb-2 text-${section.color}-400 flex items-center gap-2`}>
              {section.icon} {section.title}
            </p>
            <div className="space-y-2">
              {section.items.map((item, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-3">
                  <p className="text-slate-200 font-medium">{item.subject || item.from}</p>
                  {item.from && item.subject && (
                    <p className="text-slate-500 text-sm">From: {item.from}</p>
                  )}
                  {item.note && (
                    <p className="text-slate-400 text-sm mt-1">{item.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <p className="text-slate-400">No email highlights</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketsCard({ data }: { data: MarketsSection }) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 to-emerald-950/30 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-semibold text-xl text-slate-100">Markets</h2>
            {data.summary && (
              <p className="text-xs text-slate-500">VIX: {data.summary.vix} • {data.summary.volatility}</p>
            )}
          </div>
        </div>
        {data.summary?.sentiment && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            data.summary.sentiment === "BULLISH" ? "bg-emerald-500/20 text-emerald-400" :
            data.summary.sentiment === "BEARISH" ? "bg-red-500/20 text-red-400" :
            "bg-slate-700 text-slate-400"
          }`}>
            {data.summary.sentiment}
          </div>
        )}
      </div>

      {data.overview && data.overview.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {data.overview.map((item) => (
            <div key={item.symbol} className="bg-slate-800/50 rounded-xl p-3 text-center">
              <p className="text-slate-500 text-xs font-medium">{item.symbol}</p>
              <p className="text-slate-200 font-bold text-lg">${item.price.toFixed(0)}</p>
              <p className={`text-sm font-medium flex items-center justify-center gap-1 ${
                item.change_pct >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
              </p>
            </div>
          ))}
        </div>
      )}

      {data.signals && data.signals.length > 0 && (
        <div className="flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">CGS Signals</p>
          <div className="space-y-2">
            {data.signals.map((signal, i) => (
              <div key={i} className={`rounded-xl p-3 ${
                signal.type === "BUY" ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      signal.type === "BUY" ? "bg-emerald-500/30 text-emerald-300" : "bg-red-500/30 text-red-300"
                    }`}>{signal.type}</span>
                    <span className="font-semibold text-slate-200">{signal.symbol}</span>
                  </div>
                  <span className="text-slate-400 text-sm">${signal.price}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Stop: <span className="text-red-400">${signal.stop}</span></span>
                  <span>Target: <span className="text-emerald-400">${signal.target}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewsCard({ data }: { data: { title: string; subsections?: { [key: string]: NewsSubsection } } }) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 to-indigo-950/30 p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center">
          <Globe className="w-6 h-6 text-indigo-400" strokeWidth={1.5} />
        </div>
        <h2 className="font-semibold text-xl text-slate-100">{data.title}</h2>
      </div>
      
      {data.subsections && (
        <div className="flex-1 space-y-4 overflow-auto">
          {Object.entries(data.subsections).map(([key, subsection]) => (
            <div key={key}>
              <h3 className="font-medium text-indigo-400 mb-2 text-sm uppercase tracking-wide">
                {subsection.title}
              </h3>
              <div className="space-y-2">
                {subsection.items.slice(0, 3).map((item, i) => {
                  const newsItem = normalizeNewsItem(item);
                  return (
                    <div key={i} className="bg-slate-800/50 rounded-lg p-3 flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-slate-600 flex-shrink-0" strokeWidth={1.5} />
                      <p className="text-slate-300 text-sm">{newsItem.headline}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AICard({ data }: { data: AISection }) {
  const items = data.items || [];
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 to-pink-950/30 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-pink-600/20 rounded-xl flex items-center justify-center">
          <Cpu className="w-6 h-6 text-pink-400" strokeWidth={1.5} />
        </div>
        <h2 className="font-semibold text-xl text-slate-100">{data.title}</h2>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        <div className="space-y-3">
          {items.map((item, i) => {
            const aiItem = normalizeNewsItem(item);
            return (
              <div key={i} className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-slate-200">{aiItem.headline}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function MorningBriefPage() {
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/data/morning-brief.json");
      if (response.ok) {
        const data = await response.json();
        setBriefData(data);
      } else {
        setError("No morning brief found");
      }
    } catch (err) {
      setError("Failed to load morning brief");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrief();
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Build slides array with audio URLs
  const slides: { key: string; component: React.ReactNode; audio?: string }[] = [];
  if (briefData) {
    if (briefData.sections.prayer) {
      slides.push({ key: "prayer", component: <PrayerCard data={briefData.sections.prayer} />, audio: briefData.sections.prayer.audio });
    }
    if (briefData.sections.weather) {
      slides.push({ key: "weather", component: <WeatherCard data={briefData.sections.weather} />, audio: briefData.sections.weather.audio });
    }
    if (briefData.sections.calendar) {
      slides.push({ key: "calendar", component: <CalendarCard data={briefData.sections.calendar} />, audio: briefData.sections.calendar.audio });
    }
    if (briefData.sections.email) {
      slides.push({ key: "email", component: <EmailCard data={briefData.sections.email} />, audio: briefData.sections.email.audio });
    }
    if (briefData.sections.markets) {
      slides.push({ key: "markets", component: <MarketsCard data={briefData.sections.markets} />, audio: briefData.sections.markets.audio });
    }
    if (briefData.sections.news) {
      slides.push({ key: "news", component: <NewsCard data={briefData.sections.news} />, audio: (briefData.sections.news as any).audio });
    }
    if (briefData.sections.ai) {
      slides.push({ key: "ai", component: <AICard data={briefData.sections.ai} />, audio: briefData.sections.ai.audio });
    }
  }

  // Audio playback effect - play when slide changes
  useEffect(() => {
    if (!isMobile || !audioEnabled) return;
    
    const currentAudio = slides[currentSlide]?.audio;
    
    // Stop previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
    
    // Play new audio if available
    if (currentAudio) {
      const audio = new Audio(currentAudio);
      audioRef.current = audio;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      audio.onended = () => setIsPlaying(false);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentSlide, isMobile, audioEnabled, slides]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      const currentAudio = slides[currentSlide]?.audio;
      if (currentAudio) {
        const audio = new Audio(currentAudio);
        audioRef.current = audio;
        audio.play().then(() => setIsPlaying(true));
        audio.onended = () => setIsPlaying(false);
      }
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) prevSlide();
    else if (x > (rect.width * 2) / 3) nextSlide();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Mobile TikTok-style view
  if (isMobile && briefData && !loading && !error) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Sunrise className="w-5 h-5 text-accent-500" strokeWidth={1.5} />
            <span className="font-semibold text-slate-100">Morning Brief</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Audio toggle */}
            {slides[currentSlide]?.audio && (
              <button 
                onClick={(e) => { e.stopPropagation(); toggleAudio(); }}
                className={`p-2 rounded-lg transition-colors ${isPlaying ? 'bg-accent-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            )}
            {/* Audio on/off */}
            <button 
              onClick={(e) => { e.stopPropagation(); setAudioEnabled(!audioEnabled); }}
              className={`p-2 rounded-lg ${audioEnabled ? 'text-accent-400' : 'text-slate-600'}`}
            >
              {audioEnabled ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              )}
            </button>
            <button onClick={fetchBrief} className="p-2 hover:bg-slate-800 rounded-lg">
              <RefreshCw className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Swipeable Area */}
        <div 
          className="flex-1 relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleTap}
        >
          {/* Tap zones indicator (subtle) */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-10 flex items-center justify-start pl-2 pointer-events-none">
            {currentSlide > 0 && (
              <ChevronLeft className="w-8 h-8 text-white/20" strokeWidth={1.5} />
            )}
          </div>
          <div className="absolute inset-y-0 right-0 w-1/3 z-10 flex items-center justify-end pr-2 pointer-events-none">
            {currentSlide < slides.length - 1 && (
              <ChevronRight className="w-8 h-8 text-white/20" strokeWidth={1.5} />
            )}
          </div>

          {/* Current Slide */}
          <div className="h-full">
            {slides[currentSlide]?.component}
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 p-4 bg-slate-950">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentSlide ? "w-6 bg-accent-500" : "w-1.5 bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Swipe hint */}
        <p className="text-center text-xs text-slate-600 pb-4">
          Tap sides or swipe to navigate
        </p>
      </div>
    );
  }

  // Desktop View
  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <Sunrise className="w-6 h-6 text-accent-500" strokeWidth={1.5} />
            Morning Brief
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Your daily briefing from Theo</p>
        </div>
        <div className="flex items-center gap-4">
          {briefData && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" strokeWidth={1.5} />
              {formatDate(briefData.date)} at {briefData.time}
            </div>
          )}
          <button
            onClick={fetchBrief}
            disabled={loading}
            className="btn btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
            Refresh
          </button>
        </div>
      </div>

      {/* Schedule Status Bar */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent-600/20 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-accent-500" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-medium text-slate-200 text-sm">Daily at 6:00 AM PT</p>
            <p className="text-xs text-slate-500">Delivered via Telegram</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-accent-500 rounded-full" />
          <span className="text-xs text-slate-500 font-medium">Active</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-slate-850 border border-slate-800 rounded-xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-slate-400">{error}</p>
          <p className="text-slate-600 text-sm mt-1">The morning brief will appear here after it runs at 6 AM</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`bg-slate-850 rounded-xl border border-slate-800 p-6 animate-pulse ${i > 3 ? "md:col-span-3" : ""}`}>
              <div className="h-5 bg-slate-800 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-800 rounded w-full" />
                <div className="h-4 bg-slate-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brief Content - Desktop */}
      {!loading && !error && briefData && (
        <div className="space-y-6">
          
          {/* Prayer Section */}
          {briefData.sections.prayer && (
            <div className="bg-gradient-to-br from-slate-850 to-slate-900 rounded-xl border border-amber-900/30 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-100">{briefData.sections.prayer.title}</h2>
                  {briefData.sections.prayer.hebrew_date && briefData.sections.prayer.parsha && (
                    <p className="text-xs text-amber-400/80">{briefData.sections.prayer.hebrew_date} • Parashat {briefData.sections.prayer.parsha}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {briefData.sections.prayer.modeh_ani && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border-l-2 border-amber-500/50">
                    <p className="text-amber-200/90 text-lg font-hebrew mb-1">מודה אני לפניך</p>
                    <p className="text-slate-400 text-sm">{briefData.sections.prayer.modeh_ani}</p>
                  </div>
                )}
                
                {briefData.sections.prayer.blessing && (
                  <p className="text-slate-300 text-sm">{briefData.sections.prayer.blessing}</p>
                )}
                
                {briefData.sections.prayer.parsha_theme && (
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-xs text-amber-400 uppercase tracking-wide mb-1">Torah Theme</p>
                    <p className="text-slate-400 text-sm italic">{briefData.sections.prayer.parsha_theme}</p>
                  </div>
                )}
                
                <div className="grid md:grid-cols-2 gap-3">
                  {briefData.sections.prayer.psalm && (
                    <div className="bg-slate-800/30 rounded-lg p-3">
                      <p className="text-slate-300 text-sm">{briefData.sections.prayer.psalm}</p>
                    </div>
                  )}
                  {briefData.sections.prayer.proverb && (
                    <div className="bg-slate-800/30 rounded-lg p-3">
                      <p className="text-slate-300 text-sm">{briefData.sections.prayer.proverb}</p>
                    </div>
                  )}
                </div>
                
                {briefData.sections.prayer.intention && (
                  <div className="border-t border-slate-700/50 pt-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Personal Intention</p>
                    <p className="text-slate-300 text-sm">{briefData.sections.prayer.intention}</p>
                  </div>
                )}
                
                {briefData.sections.prayer.closing && (
                  <div className="text-center pt-2">
                    <p className="text-amber-300/80 text-sm italic">{briefData.sections.prayer.closing}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Row */}
          <div className="grid gap-4 md:grid-cols-3">
            {briefData.sections.weather && (
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-primary-600/20 rounded-lg flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-semibold text-slate-200">{briefData.sections.weather.title}</h2>
                </div>
                {briefData.sections.weather.temperature && !briefData.sections.weather.items && (
                  <div className="text-center mb-4">
                    <p className="text-4xl font-bold text-primary-400">{briefData.sections.weather.temperature}</p>
                    {briefData.sections.weather.condition && (
                      <p className="text-slate-300 mt-1">{briefData.sections.weather.condition}</p>
                    )}
                  </div>
                )}
                {briefData.sections.weather.items && (
                  <ul className="space-y-2">
                    {briefData.sections.weather.items.map((item, i) => (
                      <li key={i} className="text-slate-400 text-sm">{item}</li>
                    ))}
                  </ul>
                )}
                {briefData.sections.weather.summary && !briefData.sections.weather.items && (
                  <p className="text-slate-400 text-sm text-center">{briefData.sections.weather.summary}</p>
                )}
              </div>
            )}

            {briefData.sections.calendar && (
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-accent-600/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-accent-400" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-semibold text-slate-200">{briefData.sections.calendar.title}</h2>
                </div>
                {(!briefData.sections.calendar.items || briefData.sections.calendar.items.length === 0) ? (
                  <p className="text-slate-500 text-sm">No events today</p>
                ) : (
                  <ul className="space-y-2">
                    {briefData.sections.calendar.items.map((item, i) => (
                      <li key={i} className="text-slate-400 text-sm">{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {briefData.sections.email && (
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-primary-600/20 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-semibold text-slate-200">{briefData.sections.email.title}</h2>
                </div>
                <div className="space-y-3 max-h-48 overflow-auto">
                  {briefData.sections.email.needs_attention?.slice(0, 3).map((item, i) => (
                    <div key={`att-${i}`} className="text-sm">
                      <p className="text-slate-300 font-medium">{item.subject}</p>
                      <p className="text-slate-500 text-xs">{item.from} • {item.note}</p>
                    </div>
                  ))}
                  {briefData.sections.email.items?.slice(0, 3).map((item, i) => (
                    <div key={`item-${i}`} className="text-sm">
                      <p className="text-slate-300 font-medium">{item.subject}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Markets */}
          {briefData.sections.markets && (
            <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-200">{briefData.sections.markets.title}</h2>
                    {briefData.sections.markets.summary && (
                      <p className="text-xs text-slate-500">
                        {briefData.sections.markets.summary.market_status} • VIX: {briefData.sections.markets.summary.vix} ({briefData.sections.markets.summary.volatility})
                      </p>
                    )}
                  </div>
                </div>
                {briefData.sections.markets.summary?.sentiment && (
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    briefData.sections.markets.summary.sentiment === "BULLISH" ? "bg-emerald-500/20 text-emerald-400" :
                    briefData.sections.markets.summary.sentiment === "BEARISH" ? "bg-red-500/20 text-red-400" :
                    "bg-slate-700 text-slate-400"
                  }`}>
                    {briefData.sections.markets.summary.sentiment}
                  </div>
                )}
              </div>

              {briefData.sections.markets.overview && briefData.sections.markets.overview.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {briefData.sections.markets.overview.map((item) => (
                    <div key={item.symbol} className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <p className="text-slate-500 text-xs font-medium">{item.symbol}</p>
                      <p className="text-slate-200 font-semibold">${item.price.toFixed(2)}</p>
                      <p className={`text-xs font-medium flex items-center justify-center gap-1 ${
                        item.change_pct >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {item.change_pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {briefData.sections.markets.signals && briefData.sections.markets.signals.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">CGS Trading Signals</p>
                  <div className="space-y-2">
                    {briefData.sections.markets.signals.map((signal, i) => (
                      <div key={i} className={`rounded-lg p-3 flex items-center justify-between ${
                        signal.type === "BUY" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            signal.type === "BUY" ? "bg-emerald-500/30 text-emerald-300" : "bg-red-500/30 text-red-300"
                          }`}>{signal.type}</span>
                          <div>
                            <p className="font-semibold text-slate-200">{signal.symbol} <span className="text-slate-500 font-normal">@ ${signal.price}</span></p>
                            {signal.rationale && <p className="text-xs text-slate-500">{signal.rationale}</p>}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <p className="text-slate-400">Entry: <span className="text-slate-300">${signal.entry}</span></p>
                          <p className="text-slate-400">Stop: <span className="text-red-400">${signal.stop}</span></p>
                          <p className="text-slate-400">Target: <span className="text-emerald-400">${signal.target}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-3 text-center italic">
                    Signals based on CGS strategy. Not financial advice. Do your own research.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* News */}
          {briefData.sections.news && briefData.sections.news.subsections && (
            <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-accent-600/20 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-accent-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-semibold text-slate-200">{briefData.sections.news.title}</h2>
              </div>
              
              <div className="grid gap-6 md:grid-cols-3">
                {Object.entries(briefData.sections.news.subsections).map(([key, subsection]) => (
                  <div key={key}>
                    <h3 className="font-medium text-primary-400 mb-3 text-sm uppercase tracking-wide">
                      {subsection.title}
                    </h3>
                    <ul className="space-y-2">
                      {subsection.items.map((item, i) => {
                        const newsItem = normalizeNewsItem(item);
                        return (
                          <li key={i} className="text-slate-400 text-sm py-2 px-2 -mx-2 rounded-lg flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 mt-0.5 text-slate-600 flex-shrink-0" strokeWidth={1.5} />
                            <span className="flex-1">{newsItem.headline}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI */}
          {briefData.sections.ai && briefData.sections.ai.items && (
            <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-primary-600/20 rounded-lg flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-semibold text-slate-200">{briefData.sections.ai.title}</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {briefData.sections.ai.items.map((item, i) => {
                  const aiItem = normalizeNewsItem(item);
                  return (
                    <div key={i} className="text-slate-400 text-sm bg-slate-800/50 rounded-lg p-3">
                      <span>{aiItem.headline}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
