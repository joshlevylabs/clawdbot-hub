"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";

interface BriefSummary {
  date: string;
  time: string;
  hasAudio: boolean;
}

export default function BriefHistoryPage() {
  const [briefs, setBriefs] = useState<BriefSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch list of available briefs
    const fetchBriefs = async () => {
      try {
        const response = await fetch("/api/briefs/list");
        if (response.ok) {
          const data = await response.json();
          setBriefs(data.briefs || []);
        }
      } catch (err) {
        console.error("Failed to fetch briefs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBriefs();
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/morning-brief" className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Brief History</h1>
          <p className="text-slate-500 text-sm">Past morning briefs</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-slate-850 rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-slate-800 rounded w-1/3 mb-2" />
              <div className="h-4 bg-slate-800 rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Brief List */}
      {!loading && briefs.length > 0 && (
        <div className="space-y-3">
          {briefs.map((brief) => (
            <Link
              key={brief.date}
              href={`/morning-brief?date=${brief.date}`}
              className="block bg-slate-850 rounded-xl border border-slate-800 p-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-accent-600/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-accent-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">{formatDate(brief.date)}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {brief.time}
                      {brief.hasAudio && <span className="ml-2 text-accent-400">🎙️ Audio</span>}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && briefs.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-slate-500">No past briefs found</p>
          <p className="text-slate-600 text-sm mt-1">Briefs will appear here after they run</p>
        </div>
      )}
    </div>
  );
}
