"use client";

import { useState, useEffect } from "react";
import { Sun, Cloud, Calendar, Mail, Newspaper, Cpu, RefreshCw, Clock, Globe, Flag } from "lucide-react";

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
      items: string[];
    };
    news?: {
      title: string;
      subsections?: {
        [key: string]: {
          title: string;
          items: string[];
        };
      };
    };
    ai?: {
      title: string;
      items: string[];
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sun className="w-8 h-8 text-yellow-400" />
            Morning Brief
          </h1>
          <p className="text-gray-400 mt-1">Your daily briefing from Theo</p>
        </div>
        <div className="flex items-center gap-3">
          {briefData && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              {formatDate(briefData.date)} at {briefData.time}
            </div>
          )}
          <button
            onClick={fetchBrief}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Schedule Info */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-green/20 rounded-lg">
            <Clock className="w-5 h-5 text-accent-green" />
          </div>
          <div>
            <p className="font-medium">Scheduled: Daily at 6:00 AM PT</p>
            <p className="text-sm text-gray-400">Delivered via Telegram</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">Active</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
          <p className="text-gray-500 text-sm mt-2">The morning brief will appear here after it runs at 6 AM</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-dark-800 rounded-xl border border-dark-600 p-6 animate-pulse">
              <div className="h-6 bg-dark-700 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-dark-700 rounded w-full" />
                <div className="h-4 bg-dark-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brief Content */}
      {!loading && !error && briefData && (
        <div className="space-y-4">
          {/* Top Row - Weather, Calendar, Email */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Weather */}
            {briefData.sections.weather && (
              <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Cloud className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="font-semibold text-lg">{briefData.sections.weather.title}</h2>
                </div>
                <ul className="space-y-2">
                  {briefData.sections.weather.items.map((item, i) => (
                    <li key={i} className="text-gray-300 text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Calendar */}
            {briefData.sections.calendar && (
              <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="font-semibold text-lg">{briefData.sections.calendar.title}</h2>
                </div>
                <ul className="space-y-2">
                  {briefData.sections.calendar.items.map((item, i) => (
                    <li key={i} className="text-gray-300 text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Email */}
            {briefData.sections.email && (
              <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Mail className="w-5 h-5 text-yellow-400" />
                  </div>
                  <h2 className="font-semibold text-lg">{briefData.sections.email.title}</h2>
                </div>
                <ul className="space-y-2">
                  {briefData.sections.email.items.map((item, i) => (
                    <li key={i} className="text-gray-300 text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* World News - Full Width with Subsections */}
          {briefData.sections.news && (
            <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Globe className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="font-semibold text-lg">{briefData.sections.news.title}</h2>
              </div>
              
              {briefData.sections.news.subsections && (
                <div className="grid gap-6 md:grid-cols-3">
                  {Object.entries(briefData.sections.news.subsections).map(([key, subsection]) => (
                    <div key={key}>
                      <h3 className="font-medium text-accent-purple mb-2 flex items-center gap-2">
                        <Flag className="w-4 h-4" />
                        {subsection.title}
                      </h3>
                      <ul className="space-y-2">
                        {subsection.items.map((item, i) => (
                          <li key={i} className="text-gray-300 text-sm">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Intel - Full Width */}
          {briefData.sections.ai && (
            <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Cpu className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="font-semibold text-lg">{briefData.sections.ai.title}</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {briefData.sections.ai.items.map((item, i) => (
                  <div key={i} className="text-gray-300 text-sm bg-dark-700 rounded-lg p-3">
                    🤖 {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brief Configuration */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
        <h2 className="font-semibold text-lg mb-4">Brief Configuration</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Sections Included</label>
            <div className="space-y-2">
              {["Weather", "Calendar", "Email", "World News", "AI Intelligence"].map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded bg-dark-700 border-dark-600" />
                  {item}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email Accounts</label>
            <div className="space-y-2 text-sm text-gray-300">
              <div>• joshua.seth.levy@gmail.com</div>
              <div>• josh@joshlevylabs.com</div>
              <div>• josh@thelyceum.io</div>
              <div>• farbisimo@gmail.com</div>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">News Perspective</label>
            <div className="text-sm text-gray-300">
              <p>Conservative, faith-based</p>
              <p className="text-gray-500 mt-1">Judeo-Christian worldview</p>
              <p className="text-gray-500">Focus: Policy, Israel, Tech</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
