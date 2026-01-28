"use client";

import { useState, useEffect } from "react";
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
  AlertCircle
} from "lucide-react";

interface EmailItem {
  subject: string;
  preview?: string;
  messageId?: string;
  url?: string;
}

interface NewsItem {
  headline: string;
  source?: string;
  url?: string;
}

interface NewsSubsection {
  title: string;
  items: NewsItem[];
}

interface BriefData {
  date: string;
  time: string;
  sections: {
    weather?: {
      title: string;
      items: string[];
    };
    calendar?: {
      title: string;
      items: string[];
    };
    email?: {
      title: string;
      items: EmailItem[];
    };
    news?: {
      title: string;
      subsections?: {
        [key: string]: NewsSubsection;
      };
    };
    ai?: {
      title: string;
      items: NewsItem[];
    };
  };
}

export default function MorningBriefPage() {
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
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const openEmail = (email: EmailItem) => {
    if (email.url) {
      window.open(email.url, "_blank");
    } else if (email.messageId) {
      window.open(`https://mail.google.com/mail/u/0/#inbox/${email.messageId}`, "_blank");
    }
  };

  const openArticle = (item: NewsItem) => {
    if (item.url) {
      window.open(item.url, "_blank");
    }
  };

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

      {/* Brief Content */}
      {!loading && !error && briefData && (
        <div className="space-y-6">
          {/* Top Row */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Weather */}
            {briefData.sections.weather && (
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-primary-600/20 rounded-lg flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-semibold text-slate-200">{briefData.sections.weather.title}</h2>
                </div>
                <ul className="space-y-2">
                  {briefData.sections.weather.items.map((item, i) => (
                    <li key={i} className="text-slate-400 text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Calendar */}
            {briefData.sections.calendar && (
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-accent-600/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-accent-400" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-semibold text-slate-200">{briefData.sections.calendar.title}</h2>
                </div>
                <ul className="space-y-2">
                  {briefData.sections.calendar.items.map((item, i) => (
                    <li key={i} className="text-slate-400 text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Email */}
            {briefData.sections.email && (
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-primary-600/20 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-semibold text-slate-200">{briefData.sections.email.title}</h2>
                </div>
                <ul className="space-y-1">
                  {briefData.sections.email.items.map((item, i) => {
                    const emailItem = typeof item === "string" ? { subject: item } : item;
                    const hasLink = emailItem.url || emailItem.messageId;
                    return (
                      <li 
                        key={i} 
                        onClick={() => hasLink && openEmail(emailItem)}
                        className={`text-slate-400 text-sm py-2 px-2 -mx-2 rounded-lg flex items-center justify-between group ${
                          hasLink ? "cursor-pointer hover:bg-slate-800 hover:text-slate-200" : ""
                        }`}
                      >
                        <span>{emailItem.subject}</span>
                        {hasLink && (
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-accent-500" strokeWidth={1.5} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* World News */}
          {briefData.sections.news && (
            <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-accent-600/20 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-accent-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-semibold text-slate-200">{briefData.sections.news.title}</h2>
              </div>
              
              {briefData.sections.news.subsections && (
                <div className="grid gap-6 md:grid-cols-3">
                  {Object.entries(briefData.sections.news.subsections).map(([key, subsection]) => (
                    <div key={key}>
                      <h3 className="font-medium text-primary-400 mb-3 text-sm uppercase tracking-wide">
                        {subsection.title}
                      </h3>
                      <ul className="space-y-2">
                        {subsection.items.map((item, i) => {
                          const newsItem = typeof item === "string" ? { headline: item } : item;
                          const hasLink = newsItem.url;
                          return (
                            <li 
                              key={i}
                              onClick={() => hasLink && openArticle(newsItem)}
                              className={`text-slate-400 text-sm py-2 px-2 -mx-2 rounded-lg flex items-start gap-2 group ${
                                hasLink ? "cursor-pointer hover:bg-slate-800 hover:text-slate-200" : ""
                              }`}
                            >
                              <ChevronRight className="w-4 h-4 mt-0.5 text-slate-600 flex-shrink-0" strokeWidth={1.5} />
                              <span className="flex-1">{newsItem.headline || (typeof item === "string" ? item : "")}</span>
                              {hasLink && (
                                <ExternalLink className="w-3.5 h-3.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-accent-500 flex-shrink-0" strokeWidth={1.5} />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Intel */}
          {briefData.sections.ai && (
            <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-primary-600/20 rounded-lg flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-semibold text-slate-200">{briefData.sections.ai.title}</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {briefData.sections.ai.items.map((item, i) => {
                  const aiItem = typeof item === "string" ? { headline: item } : item;
                  const hasLink = aiItem.url;
                  return (
                    <div 
                      key={i}
                      onClick={() => hasLink && openArticle(aiItem)}
                      className={`text-slate-400 text-sm bg-slate-800/50 rounded-lg p-3 flex items-center justify-between group ${
                        hasLink ? "cursor-pointer hover:bg-slate-800 hover:text-slate-200" : ""
                      }`}
                    >
                      <span>{aiItem.headline || (typeof item === "string" ? item : "")}</span>
                      {hasLink && (
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-accent-500 flex-shrink-0 ml-2" strokeWidth={1.5} />
                      )}
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
