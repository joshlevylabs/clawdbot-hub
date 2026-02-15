"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, BookOpen, Heart, Sun, Star, Feather } from "lucide-react";

interface Prayer {
  id?: string;
  date: string;
  tradition_alignment: string;
  opening: string;
  scripture_text: string;
  scripture_ref: string | null;
  reflection: string;
  intention: string;
  closing: string;
  full_text: string;
}

const TRADITION_ICONS: Record<string, string> = {
  Judaism: "✡️",
  Catholicism: "⛪",
  "Orthodox Christianity": "☦️",
  "Evangelical Christianity": "✝️",
  Islam: "☪️",
};

export default function DailyPrayer() {
  const [prayer, setPrayer] = useState<Prayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrayer = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const url = refresh ? "/api/faith/prayer?refresh=true" : "/api/faith/prayer";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load prayer");
      const data = await res.json();
      setPrayer(data);
    } catch (err: any) {
      setError(err.message || "Failed to load prayer");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPrayer();
  }, [loadPrayer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🕊️</div>
          <p className="text-slate-400 text-sm">Preparing your prayer...</p>
        </div>
      </div>
    );
  }

  if (error || !prayer) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-300">{error || "No prayer available"}</p>
          <button
            onClick={() => loadPrayer()}
            className="mt-4 px-4 py-2 bg-amber-600 rounded-lg text-sm text-white hover:bg-amber-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const icon = TRADITION_ICONS[prayer.tradition_alignment] || "🕊️";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <div className="text-5xl mb-3">{icon}</div>
        <h2 className="text-xl font-semibold text-slate-100 mb-1">
          Daily Prayer
        </h2>
        <p className="text-sm text-amber-400/80">
          Aligned with {prayer.tradition_alignment}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {new Date(prayer.date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Opening */}
      <PrayerSection
        icon={<Sun className="w-4 h-4 text-amber-400" />}
        title="Opening"
        content={prayer.opening}
        variant="opening"
      />

      {/* Scripture */}
      <PrayerSection
        icon={<BookOpen className="w-4 h-4 text-blue-400" />}
        title="Scripture"
        content={prayer.scripture_text}
        attribution={prayer.scripture_ref || undefined}
        variant="scripture"
      />

      {/* Reflection */}
      <PrayerSection
        icon={<Star className="w-4 h-4 text-purple-400" />}
        title="Reflection"
        content={prayer.reflection}
        variant="reflection"
      />

      {/* Intention */}
      <PrayerSection
        icon={<Heart className="w-4 h-4 text-rose-400" />}
        title="Intention"
        content={prayer.intention}
        variant="intention"
      />

      {/* Closing */}
      <PrayerSection
        icon={<Feather className="w-4 h-4 text-emerald-400" />}
        title="Closing"
        content={prayer.closing}
        variant="closing"
      />

      {/* Refresh button */}
      <div className="text-center pt-4 pb-8">
        <button
          onClick={() => loadPrayer(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Generating..." : "Refresh prayer"}
        </button>
      </div>
    </div>
  );
}

function PrayerSection({
  icon,
  title,
  content,
  attribution,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  attribution?: string;
  variant: "opening" | "scripture" | "reflection" | "intention" | "closing";
}) {
  const borderColors: Record<string, string> = {
    opening: "border-amber-500/20",
    scripture: "border-blue-500/20",
    reflection: "border-purple-500/20",
    intention: "border-rose-500/20",
    closing: "border-emerald-500/20",
  };

  const bgColors: Record<string, string> = {
    opening: "bg-amber-500/5",
    scripture: "bg-blue-500/5",
    reflection: "bg-purple-500/5",
    intention: "bg-rose-500/5",
    closing: "bg-emerald-500/5",
  };

  return (
    <div
      className={`rounded-xl border ${borderColors[variant]} ${bgColors[variant]} p-5 transition-all`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="text-slate-200 leading-relaxed whitespace-pre-line text-[15px]">
        {content}
      </div>
      {attribution && (
        <p className="mt-3 text-sm text-slate-400 italic">— {attribution}</p>
      )}
    </div>
  );
}
