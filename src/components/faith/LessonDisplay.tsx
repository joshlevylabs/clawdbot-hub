"use client";

import { BookOpen, Calendar, BookText, Quote, HelpCircle, Heart } from 'lucide-react';
import type { FaithLesson } from '@/lib/faith-supabase';

interface LessonDisplayProps {
  lesson: FaithLesson;
}

interface LessonSection {
  title: string;
  content: string;
  icon: typeof BookOpen;
  color: string;
}

function parseSections(text: string): LessonSection[] | null {
  const sectionPatterns = [
    { marker: '## The Teaching', title: 'The Teaching', icon: BookOpen, color: 'amber' },
    { marker: '## From the Sources', title: 'From the Sources', icon: Quote, color: 'blue' },
    { marker: '## The Tension', title: 'The Tension', icon: HelpCircle, color: 'orange' },
    { marker: '## For Reflection', title: 'For Reflection', icon: Heart, color: 'purple' },
  ];

  // Check if text has section markers
  const hasMarkers = sectionPatterns.some(p => text.includes(p.marker));
  if (!hasMarkers) return null;

  const sections: LessonSection[] = [];
  
  for (let i = 0; i < sectionPatterns.length; i++) {
    const pattern = sectionPatterns[i];
    const startIdx = text.indexOf(pattern.marker);
    if (startIdx === -1) continue;
    
    const contentStart = startIdx + pattern.marker.length;
    
    // Find where this section ends (next section or end of text)
    let endIdx = text.length;
    for (let j = i + 1; j < sectionPatterns.length; j++) {
      const nextIdx = text.indexOf(sectionPatterns[j].marker, contentStart);
      if (nextIdx !== -1) {
        endIdx = nextIdx;
        break;
      }
    }
    
    const content = text.slice(contentStart, endIdx).trim();
    if (content) {
      sections.push({
        title: pattern.title,
        content,
        icon: pattern.icon,
        color: pattern.color,
      });
    }
  }

  return sections.length > 0 ? sections : null;
}

function renderContent(content: string, color: string) {
  // Parse bold markers **text** into styled spans
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-amber-400 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const colorMap: Record<string, { bg: string; border: string; icon: string; accent: string }> = {
  amber: { bg: 'bg-amber-900/15', border: 'border-amber-700/30', icon: 'text-amber-400', accent: 'text-amber-400' },
  blue: { bg: 'bg-blue-900/15', border: 'border-blue-700/30', icon: 'text-blue-400', accent: 'text-blue-400' },
  orange: { bg: 'bg-orange-900/15', border: 'border-orange-700/30', icon: 'text-orange-400', accent: 'text-orange-400' },
  purple: { bg: 'bg-purple-900/15', border: 'border-purple-700/30', icon: 'text-purple-400', accent: 'text-purple-400' },
};

export default function LessonDisplay({ lesson }: LessonDisplayProps) {
  const sections = parseSections(lesson.baseline_text);

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
        <div className="bg-slate-800/50 rounded-lg p-3 mb-5 flex items-start gap-2">
          <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-slate-400 italic">{lesson.calendar_context}</p>
        </div>
      )}

      {/* Structured sections */}
      {sections ? (
        <div className="space-y-4">
          {sections.map((section) => {
            const colors = colorMap[section.color] || colorMap.amber;
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className={`${colors.bg} rounded-lg border ${colors.border} p-4`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${colors.icon}`} strokeWidth={1.5} />
                  <h3 className={`text-sm font-semibold uppercase tracking-wide ${colors.accent}`}>
                    {section.title}
                  </h3>
                </div>
                <div className="text-slate-300 leading-relaxed text-[15px]">
                  {section.title === 'For Reflection' ? (
                    <p className="italic text-slate-200 text-base">{renderContent(section.content, section.color)}</p>
                  ) : (
                    section.content.split('\n').filter(Boolean).map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-2' : ''}>
                        {renderContent(line, section.color)}
                      </p>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Fallback: plain text for old lessons */
        <div className="prose prose-sm prose-invert max-w-none">
          <p className="text-slate-300 leading-relaxed whitespace-pre-line">{lesson.baseline_text}</p>
        </div>
      )}

      {/* Dimensions touched */}
      {lesson.dimensions && lesson.dimensions.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-700/50">
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
