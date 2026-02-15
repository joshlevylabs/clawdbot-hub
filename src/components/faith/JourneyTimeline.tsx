"use client";

import { useState, useEffect } from 'react';
import { Clock, Filter, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import type { FaithTradition, FaithDimension, FaithResponse } from '@/lib/faith-supabase';

interface JourneyTimelineProps {
  traditions: FaithTradition[];
  dimensions: FaithDimension[];
}

export default function JourneyTimeline({ traditions, dimensions }: JourneyTimelineProps) {
  const [responses, setResponses] = useState<FaithResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterTradition, setFilterTradition] = useState('');
  const [filterDimension, setFilterDimension] = useState('');

  const fetchJourney = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (filterTradition) params.set('tradition', filterTradition);
      if (filterDimension) params.set('dimension', filterDimension);

      const res = await fetch(`/api/faith/journey?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load journey:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJourney();
  }, [page, filterTradition, filterDimension]);

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-500">Filter:</span>
        </div>
        <select
          value={filterTradition}
          onChange={(e) => { setFilterTradition(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">All Traditions</option>
          {traditions.map((t) => (
            <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
          ))}
        </select>
        <select
          value={filterDimension}
          onChange={(e) => { setFilterDimension(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">All Dimensions</option>
          {dimensions.map((d) => (
            <option key={d.slug} value={d.slug}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : responses.length === 0 ? (
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No responses yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Your faith journey timeline will appear here as you select perspectives from daily lessons
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((resp: any) => {
            const tradition = resp.tradition;
            const lesson = resp.lesson;
            return (
              <div
                key={resp.id}
                className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Date column */}
                  <div className="flex-shrink-0 text-center w-16">
                    <p className="text-sm font-medium text-slate-300">{formatDate(resp.date)}</p>
                  </div>

                  {/* Tradition indicator */}
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: tradition?.color || '#6366f1' }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{tradition?.icon}</span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: tradition?.color }}
                      >
                        {tradition?.name}
                      </span>
                    </div>
                    <p className="text-slate-200 font-medium text-sm">{lesson?.topic || 'Lesson'}</p>
                    {lesson?.hebrew_date && (
                      <p className="text-xs text-slate-500 mt-0.5">{lesson.hebrew_date}</p>
                    )}
                    {resp.notes && (
                      <p className="text-sm text-slate-400 mt-2 italic border-l-2 border-slate-700 pl-3">
                        {resp.notes}
                      </p>
                    )}
                    {/* Dimensions touched */}
                    {lesson?.dimensions && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lesson.dimensions.map((dim: string) => (
                          <span key={dim} className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-500 capitalize">
                            {dim.replace(/-/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
