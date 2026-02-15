"use client";

import { BookOpen, Calendar } from 'lucide-react';
import type { FaithLesson } from '@/lib/faith-supabase';

interface LessonDisplayProps {
  lesson: FaithLesson;
}

export default function LessonDisplay({ lesson }: LessonDisplayProps) {
  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-amber-900/30 p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 bg-amber-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-100">{lesson.topic}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {lesson.hebrew_date && (
              <span className="text-sm text-amber-400/80">{lesson.hebrew_date}</span>
            )}
            {lesson.parsha && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-sm text-amber-400/80">Parashat {lesson.parsha}</span>
              </>
            )}
            {lesson.scripture_ref && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-sm text-slate-400">{lesson.scripture_ref}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Calendar context */}
      {lesson.calendar_context && (
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-slate-400 italic">{lesson.calendar_context}</p>
        </div>
      )}

      {/* Baseline text */}
      <div className="prose prose-sm prose-invert max-w-none">
        <p className="text-slate-300 leading-relaxed whitespace-pre-line">{lesson.baseline_text}</p>
      </div>

      {/* Dimensions touched */}
      {lesson.dimensions && lesson.dimensions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Dimensions explored</p>
          <div className="flex flex-wrap gap-2">
            {lesson.dimensions.map((dim) => (
              <span
                key={dim}
                className="px-2 py-1 bg-slate-700/50 rounded-md text-xs text-slate-400 capitalize"
              >
                {dim.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
