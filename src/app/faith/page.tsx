"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Compass, Map, RefreshCw, AlertCircle, Feather, X, Eye, EyeOff } from "lucide-react";
import LessonDisplay from "@/components/faith/LessonDisplay";
import TraditionCard from "@/components/faith/TraditionCard";
import CompassDashboard from "@/components/faith/CompassDashboard";
import JourneyTimeline from "@/components/faith/JourneyTimeline";
import DailyPrayer from "@/components/faith/DailyPrayer";
import type {
  FaithDimension,
  FaithTradition,
  FaithLesson,
  FaithPerspective,
  FaithCompassState,
} from "@/lib/faith-supabase";

type Tab = "lesson" | "compass" | "journey" | "prayer";

// Symbols for anonymous tiles (neutral, non-religious)
const TILE_SYMBOLS = ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι"];

export default function FaithPage() {
  const [activeTab, setActiveTab] = useState<Tab>("lesson");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [traditions, setTraditions] = useState<FaithTradition[]>([]);
  const [dimensions, setDimensions] = useState<FaithDimension[]>([]);
  const [lesson, setLesson] = useState<FaithLesson | null>(null);
  const [perspectives, setPerspectives] = useState<FaithPerspective[]>([]);
  const [compass, setCompass] = useState<FaithCompassState | null>(null);

  // Selection state
  const [selectedTradition, setSelectedTradition] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Modal + reveal state
  const [modalPerspective, setModalPerspective] = useState<FaithPerspective | null>(null);
  const [modalTradition, setModalTradition] = useState<FaithTradition | null>(null);
  const [revealNames, setRevealNames] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tradRes, dimRes, lessonRes, compassRes] = await Promise.all([
        fetch("/api/faith/traditions"),
        fetch("/api/faith/dimensions"),
        fetch("/api/faith/lesson"),
        fetch("/api/faith/compass"),
      ]);

      if (!tradRes.ok || !dimRes.ok) throw new Error("Failed to load reference data");

      const tradData = await tradRes.json();
      const dimData = await dimRes.json();
      const lessonData = await lessonRes.json();
      const compassData = await compassRes.json();

      setTraditions(tradData);
      setDimensions(dimData);
      setLesson(lessonData.lesson);
      setPerspectives(lessonData.perspectives || []);
      setCompass(compassData);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelect = async (traditionId: string) => {
    if (!lesson || submitting) return;

    setSubmitting(true);
    setSelectedTradition(traditionId);

    try {
      const res = await fetch("/api/faith/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lesson.id,
          selected_tradition_id: traditionId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit response");
      }

      const result = await res.json();
      setSubmitSuccess(true);

      // Update compass with the returned state
      if (result.compass) {
        setCompass((prev) => ({
          ...prev,
          ...result.compass,
          id: prev?.id || '',
          user_id: prev?.user_id || '',
          updated_at: new Date().toISOString(),
          last_response_date: new Date().toISOString().split('T')[0],
        }));
      }
    } catch (err: any) {
      setError(err.message);
      setSelectedTradition(null);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { key: "lesson" as Tab, label: "Lesson", icon: BookOpen },
    { key: "compass" as Tab, label: "Compass", icon: Compass },
    { key: "journey" as Tab, label: "Journey", icon: Map },
    { key: "prayer" as Tab, label: "Prayer", icon: Feather },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 lg:px-6 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              Faith Journey
            </h1>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 text-sm text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="flex gap-0.5 bg-slate-800/60 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex-1 justify-center whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-center justify-center py-16">
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <p className="text-red-300">{error}</p>
                <button onClick={loadData} className="mt-4 px-4 py-2 bg-amber-600 rounded-lg text-sm text-white">
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* ===== DAILY LESSON TAB ===== */}
          {!loading && !error && activeTab === "lesson" && (
            <div className="space-y-6">
              {lesson ? (
                <>
                  <LessonDisplay lesson={lesson} />

                  {/* Perspectives — Anonymous Tiles */}
                  {perspectives.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-100">
                          {submitSuccess ? "Your selection" : "Which perspective resonates?"}
                        </h3>
                        <button
                          onClick={() => setRevealNames(!revealNames)}
                          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-md hover:bg-slate-800"
                        >
                          {revealNames ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {revealNames ? "Hide names" : "Reveal names"}
                        </button>
                      </div>
                      <p className="text-sm text-slate-500 mb-4">
                        Tap a tile to read the perspective. Names are hidden to remove bias.
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
                        {perspectives.map((persp, idx) => {
                          const tradition = persp.tradition || traditions.find(t => t.id === persp.tradition_id);
                          if (!tradition) return null;
                          const isSelected = selectedTradition === tradition.id;
                          const isDisabled = submitting || (submitSuccess && !isSelected);
                          return (
                            <button
                              key={persp.id}
                              onClick={() => {
                                setModalPerspective(persp);
                                setModalTradition(tradition);
                              }}
                              disabled={isDisabled}
                              className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 min-h-[80px] ${
                                isSelected
                                  ? "border-amber-500 bg-amber-900/30 ring-1 ring-amber-500/50"
                                  : isDisabled
                                  ? "border-slate-700/30 bg-slate-800/20 opacity-40 cursor-not-allowed"
                                  : "border-slate-700/50 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/70 cursor-pointer"
                              }`}
                            >
                              <span className="text-2xl font-light text-slate-300 mb-1">
                                {revealNames ? tradition.icon : TILE_SYMBOLS[idx] || `${idx + 1}`}
                              </span>
                              <span className="text-[10px] text-slate-500 text-center leading-tight">
                                {revealNames ? tradition.name : `View ${TILE_SYMBOLS[idx] || idx + 1}`}
                              </span>
                              {isSelected && (
                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Perspective Modal */}
                      {modalPerspective && modalTradition && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setModalPerspective(null)}>
                          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                            {/* Modal header */}
                            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between rounded-t-2xl">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{revealNames ? modalTradition.icon : TILE_SYMBOLS[perspectives.indexOf(modalPerspective)] || "?"}</span>
                                <div>
                                  <h3 className="font-semibold text-slate-100">
                                    {revealNames ? modalTradition.name : `Perspective ${TILE_SYMBOLS[perspectives.indexOf(modalPerspective)] || "?"}`}
                                  </h3>
                                  {revealNames && (
                                    <p className="text-xs text-slate-500">{modalTradition.description?.slice(0, 80)}...</p>
                                  )}
                                </div>
                              </div>
                              <button onClick={() => setModalPerspective(null)} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                              </button>
                            </div>

                            {/* Modal body */}
                            <div className="p-5">
                              <p className="text-slate-200 leading-relaxed text-[15px]">
                                {modalPerspective.perspective_text}
                              </p>

                              {/* Citations */}
                              {modalPerspective.source_citations && modalPerspective.source_citations.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sources</p>
                                  {modalPerspective.source_citations.map((cite: { ref?: string; text?: string } | string, i: number) => (
                                    <div key={i} className="pl-3 border-l-2 border-slate-700">
                                      {typeof cite === 'string' ? (
                                        <p className="text-xs text-slate-500 italic">{cite}</p>
                                      ) : (
                                        <>
                                          <p className="text-xs text-slate-400 font-medium">{cite.ref}</p>
                                          {cite.text && <p className="text-xs text-slate-500 italic">{cite.text}</p>}
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Modal footer — action */}
                            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 rounded-b-2xl">
                              {selectedTradition === modalTradition.id ? (
                                <div className="text-center text-amber-400 font-medium text-sm py-2">✓ Selected</div>
                              ) : submitSuccess ? (
                                <div className="text-center text-slate-500 text-sm py-2">Already responded today</div>
                              ) : (
                                <button
                                  onClick={() => {
                                    handleSelect(modalTradition.id);
                                    setModalPerspective(null);
                                  }}
                                  disabled={submitting}
                                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
                                >
                                  {submitting ? "Saving..." : "This Resonates"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Compass impact preview after selection */}
                      {submitSuccess && compass && (
                        <div className="mt-6 bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
                          <p className="text-amber-400 font-medium text-sm mb-2">✨ Compass Updated</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-300">
                              Primary: <strong>{compass.primary_alignment}</strong>
                              <span className="text-amber-400 ml-1">{compass.alignment_confidence}%</span>
                            </span>
                            {compass.secondary_alignment && (
                              <>
                                <span className="text-slate-600">|</span>
                                <span className="text-slate-400">
                                  Secondary: {compass.secondary_alignment}
                                </span>
                              </>
                            )}
                            <span className="text-slate-600">|</span>
                            <span className="text-slate-400">
                              {compass.total_responses} total • {compass.streak_days} day streak
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {perspectives.length === 0 && (
                    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-8 text-center">
                      <p className="text-slate-400">
                        Perspectives haven&apos;t been generated for today&apos;s lesson yet.
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Check back later — Theo generates perspectives as part of the daily pipeline.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* No lesson for today */
                <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-12 text-center">
                  <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-slate-200 mb-2">No Lesson Today</h2>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Today&apos;s faith lesson hasn&apos;t been generated yet.
                    Lessons are created daily as part of the morning brief pipeline,
                    tied to the Hebrew calendar and liturgical context.
                  </p>
                  <div className="mt-6 bg-slate-800/50 rounded-lg p-4 max-w-sm mx-auto">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">While you wait</p>
                    <p className="text-sm text-slate-400">
                      Explore the <button onClick={() => setActiveTab("compass")} className="text-amber-400 hover:underline">Compass</button> tab
                      to see your current theological alignment, or review your{" "}
                      <button onClick={() => setActiveTab("journey")} className="text-amber-400 hover:underline">Journey</button> history.
                    </p>
                  </div>

                  {/* Show traditions as reference */}
                  {traditions.length > 0 && (
                    <div className="mt-8 text-left max-w-2xl mx-auto">
                      <h3 className="text-sm font-medium text-slate-400 mb-3 text-center">
                        9 Traditions Being Explored
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {traditions.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-2 bg-slate-800/40 rounded-lg p-2 border border-slate-700/30"
                          >
                            <span className="text-lg">{t.icon}</span>
                            <span className="text-sm text-slate-300">{t.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== COMPASS TAB ===== */}
          {!loading && !error && activeTab === "compass" && (
            <CompassDashboard
              dimensions={dimensions}
              traditions={traditions}
              compass={compass}
            />
          )}

          {/* ===== JOURNEY TAB ===== */}
          {!loading && !error && activeTab === "journey" && (
            <JourneyTimeline
              traditions={traditions}
              dimensions={dimensions}
            />
          )}

          {/* ===== DAILY PRAYER TAB ===== */}
          {!loading && !error && activeTab === "prayer" && (
            <DailyPrayer />
          )}
        </div>
      </div>
    </div>
  );
}
