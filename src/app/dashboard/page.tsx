"use client";

import { useState, useEffect } from "react";
import { 
  Cloud, 
  Calendar, 
  Mail, 
  Globe, 
  Cpu, 
  RefreshCw, 
  Clock,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Code,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from "lucide-react";

// Flexible interfaces to handle multiple data formats
interface WeatherSection {
  title: string;
  items?: string[];
  temperature?: string;
  condition?: string;
  wind?: string;
  summary?: string;
}

interface CalendarEvent {
  time?: string;
  title: string;
  location?: string;
  date?: string;
}

interface CalendarSection {
  title: string;
  items?: string[];
  today?: CalendarEvent[];
  week?: CalendarEvent[];
  month?: CalendarEvent[];
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

interface MarketsSection {
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
}

interface AISection {
  title: string;
  items?: (NewsItem | string)[];
}

interface BriefData {
  date: string;
  time: string;
  sections: {
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

export default function DashboardPage() {
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/data/morning-brief.json");
      if (response.ok) {
        const data = await response.json();
        setBriefData(data);
      } else {
        setError("No data available");
      }
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Get today's events
  const getTodayEvents = (calendar?: CalendarSection): CalendarEvent[] => {
    if (!calendar) return [];
    if (calendar.today) return calendar.today;
    if (calendar.items) return calendar.items.map(item => ({ title: item }));
    return [];
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {briefData ? formatDate(briefData.date) : "Your daily overview"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {briefData && (
            <span className="text-xs text-slate-600">
              Updated {briefData.time}
            </span>
          )}
          <button
            onClick={fetchBrief}
            disabled={loading}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-slate-850 rounded-xl border border-slate-800 p-5 animate-pulse">
              <div className="h-5 bg-slate-800 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-800 rounded w-full" />
                <div className="h-4 bg-slate-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-slate-850 border border-slate-800 rounded-xl p-12 text-center">
          <Cloud className="w-12 h-12 text-slate-700 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-slate-400 text-lg">{error}</p>
          <p className="text-slate-600 text-sm mt-2">Data will appear after the morning brief runs</p>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && briefData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Weather Card */}
          {briefData.sections.weather && (
            <div className="bg-gradient-to-br from-slate-850 to-blue-950/20 rounded-xl border border-slate-800 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-semibold text-slate-200">Weather</h2>
              </div>
              
              {briefData.sections.weather.temperature ? (
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-blue-400">{briefData.sections.weather.temperature}</p>
                  {briefData.sections.weather.condition && (
                    <p className="text-slate-300 mt-2">{briefData.sections.weather.condition}</p>
                  )}
                  {briefData.sections.weather.wind && (
                    <p className="text-slate-500 text-sm mt-1">{briefData.sections.weather.wind}</p>
                  )}
                </div>
              ) : briefData.sections.weather.items ? (
                <ul className="space-y-2">
                  {briefData.sections.weather.items.map((item, i) => (
                    <li key={i} className="text-slate-300 text-sm">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm">No weather data</p>
              )}
            </div>
          )}

          {/* Calendar Card */}
          {briefData.sections.calendar && (
            <div className="bg-gradient-to-br from-slate-850 to-purple-950/20 rounded-xl border border-slate-800 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-semibold text-slate-200">Today</h2>
              </div>
              
              {getTodayEvents(briefData.sections.calendar).length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-500">No events today</p>
                  <p className="text-slate-600 text-sm mt-1">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {getTodayEvents(briefData.sections.calendar).map((event, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-slate-800/30 rounded-lg">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0 mt-2" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-sm font-medium truncate">{event.title}</p>
                        {event.time && (
                          <p className="text-purple-400 text-xs">{event.time}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email Card */}
          {briefData.sections.email && (
            <div className="bg-gradient-to-br from-slate-850 to-cyan-950/20 rounded-xl border border-slate-800 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-600/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-semibold text-slate-200">Email</h2>
              </div>
              
              <div className="space-y-3 max-h-48 overflow-auto">
                {/* Needs Attention */}
                {briefData.sections.email.needs_attention && briefData.sections.email.needs_attention.length > 0 && (
                  <div>
                    <p className="text-xs text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Needs Attention
                    </p>
                    {briefData.sections.email.needs_attention.slice(0, 2).map((item, i) => (
                      <div key={i} className="p-2 bg-amber-500/10 rounded-lg mb-1.5">
                        <p className="text-slate-200 text-sm font-medium truncate">{item.subject}</p>
                        <p className="text-slate-500 text-xs truncate">{item.from}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Dev Work */}
                {briefData.sections.email.dev_work && briefData.sections.email.dev_work.length > 0 && (
                  <div>
                    <p className="text-xs text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Code className="w-3 h-3" /> Dev Work
                    </p>
                    {briefData.sections.email.dev_work.slice(0, 2).map((item, i) => (
                      <div key={i} className="p-2 bg-red-500/10 rounded-lg mb-1.5">
                        <p className="text-slate-200 text-sm font-medium truncate">{item.subject}</p>
                        <p className="text-slate-500 text-xs truncate">{item.from}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Good News */}
                {briefData.sections.email.good_news && briefData.sections.email.good_news.length > 0 && (
                  <div>
                    <p className="text-xs text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Good News
                    </p>
                    {briefData.sections.email.good_news.slice(0, 2).map((item, i) => (
                      <div key={i} className="p-2 bg-green-500/10 rounded-lg mb-1.5">
                        <p className="text-slate-200 text-sm font-medium truncate">{item.subject}</p>
                        <p className="text-slate-500 text-xs truncate">{item.from}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fallback for items array */}
                {briefData.sections.email.items && !briefData.sections.email.needs_attention && (
                  <>
                    {briefData.sections.email.items.slice(0, 4).map((item, i) => (
                      <div key={i} className="p-2 bg-slate-800/30 rounded-lg">
                        <p className="text-slate-200 text-sm font-medium truncate">{item.subject}</p>
                        {item.from && <p className="text-slate-500 text-xs truncate">{item.from}</p>}
                      </div>
                    ))}
                  </>
                )}

                {/* Empty state */}
                {!briefData.sections.email.items && 
                 !briefData.sections.email.needs_attention && 
                 !briefData.sections.email.dev_work && 
                 !briefData.sections.email.good_news && (
                  <p className="text-slate-500 text-sm text-center py-4">No email highlights</p>
                )}
              </div>
            </div>
          )}

          {/* Markets Card */}
          {briefData.sections.markets && (
            <div className="bg-gradient-to-br from-slate-850 to-emerald-950/20 rounded-xl border border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-semibold text-slate-200">Markets</h2>
                </div>
                {briefData.sections.markets.summary?.sentiment && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    briefData.sections.markets.summary.sentiment === "BULLISH" ? "bg-emerald-500/20 text-emerald-400" :
                    briefData.sections.markets.summary.sentiment === "BEARISH" ? "bg-red-500/20 text-red-400" :
                    "bg-slate-700 text-slate-400"
                  }`}>
                    {briefData.sections.markets.summary.sentiment}
                  </span>
                )}
              </div>

              {briefData.sections.markets.overview && briefData.sections.markets.overview.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {briefData.sections.markets.overview.slice(0, 4).map((item) => (
                    <div key={item.symbol} className="bg-slate-800/30 rounded-lg p-3 text-center">
                      <p className="text-slate-500 text-xs font-medium">{item.symbol}</p>
                      <p className="text-slate-200 font-semibold">${item.price.toFixed(0)}</p>
                      <p className={`text-xs font-medium flex items-center justify-center gap-0.5 ${
                        item.change_pct >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {item.change_pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">No market data</p>
              )}
            </div>
          )}

          {/* World News Card */}
          {briefData.sections.news && briefData.sections.news.subsections && (
            <div className="bg-gradient-to-br from-slate-850 to-indigo-950/20 rounded-xl border border-slate-800 p-5 md:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-indigo-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-semibold text-slate-200">World News</h2>
              </div>
              
              <div className="space-y-3 max-h-52 overflow-auto">
                {Object.entries(briefData.sections.news.subsections).map(([key, subsection]) => (
                  <div key={key}>
                    <p className="text-xs text-indigo-400 uppercase tracking-wide mb-1.5">{subsection.title}</p>
                    <div className="space-y-1.5">
                      {subsection.items.slice(0, 2).map((item, i) => {
                        const newsItem = normalizeNewsItem(item);
                        return (
                          <div key={i} className="flex items-start gap-2 p-2 bg-slate-800/30 rounded-lg">
                            <ChevronRight className="w-3 h-3 mt-1 text-slate-600 flex-shrink-0" strokeWidth={1.5} />
                            <p className="text-slate-300 text-sm line-clamp-2">{newsItem.headline}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Intel Card */}
          {briefData.sections.ai && (
            <div className="bg-gradient-to-br from-slate-850 to-pink-950/20 rounded-xl border border-slate-800 p-5 md:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-600/20 rounded-lg flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-pink-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-semibold text-slate-200">AI Intel</h2>
              </div>
              
              {briefData.sections.ai.items && briefData.sections.ai.items.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-2">
                  {briefData.sections.ai.items.slice(0, 4).map((item, i) => {
                    const aiItem = normalizeNewsItem(item);
                    return (
                      <div key={i} className="flex items-start gap-2 p-3 bg-slate-800/30 rounded-lg">
                        <Cpu className="w-4 h-4 mt-0.5 text-pink-500/50 flex-shrink-0" strokeWidth={1.5} />
                        <p className="text-slate-300 text-sm line-clamp-2">{aiItem.headline}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">No AI news</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      {!loading && !error && briefData && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <a 
            href="/morning-brief" 
            className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
          >
            View Full Morning Brief <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
