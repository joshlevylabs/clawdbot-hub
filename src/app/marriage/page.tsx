"use client";

import { useState, useEffect } from "react";
import { Heart, TrendingUp, TrendingDown, Target, RefreshCw, AlertTriangle, CheckCircle, ClipboardCheck, ChevronRight, Calendar, BarChart3, Plus, X, Lightbulb, Pencil } from "lucide-react";

interface QuestionOption {
  label: string;
  power: number;
  safety: number;
}

interface DailyQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
}

interface CompassPosition {
  power: number;
  safety: number;
  quadrant: string;
  quadrantName: string;
  inIdealZone: boolean;
  count: number;
  calculatedAt: string;
}

interface CompassState {
  current: CompassPosition;
  trend: { power: number; safety: number };
  recentCount: number;
  totalCount: number;
  quadrants: Record<string, { name: string; subtitle: string; description: string; color: string }>;
  idealZone: { power: number[]; safety: number[] };
}

interface Interaction {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  type: "positive" | "negative";
  description: string;
  compass: { power: number; safety: number };
  tags: string[];
  advice?: string;
}

interface DailyCheckin {
  id: string;
  date: string;
  power: number;
  safety: number;
  timestamp: string;
}

const dailyQuestions: DailyQuestion[] = [
  {
    id: "presence",
    question: "How present were you with Jillian today?",
    options: [
      { label: "Fully engaged, phone away, real conversations", power: 1, safety: 4 },
      { label: "Mostly present with some distractions", power: 1, safety: 2 },
      { label: "Distracted, half-listening", power: 0, safety: 0 },
      { label: "Barely connected, like roommates", power: -1, safety: -2 }
    ]
  },
  {
    id: "service",
    question: "Did you do something to lighten her load today?",
    options: [
      { label: "Yes, took initiative without being asked", power: 2, safety: 3 },
      { label: "Yes, after she asked", power: 0, safety: 1 },
      { label: "No, but nothing came up", power: 0, safety: 0 },
      { label: "No, missed an opportunity", power: -1, safety: -1 }
    ]
  },
  {
    id: "conflict",
    question: "Any tension or conflict today?",
    options: [
      { label: "No conflict, smooth day", power: 1, safety: 3 },
      { label: "Minor tension, handled it well", power: 1, safety: 1 },
      { label: "Conflict, but we repaired it", power: 1, safety: 0 },
      { label: "Conflict, unresolved", power: 0, safety: -3 },
      { label: "I got defensive or escalated", power: 2, safety: -2 }
    ]
  },
  {
    id: "leadership",
    question: "How did you show up as a leader today?",
    options: [
      { label: "Made decisions, took initiative, created safety", power: 2, safety: 3 },
      { label: "Steady and reliable, nothing special", power: 1, safety: 2 },
      { label: "Passive, waited for her to lead", power: -2, safety: 0 },
      { label: "Controlling or dismissive", power: 4, safety: -2 }
    ]
  },
  {
    id: "connection",
    question: "Rate your emotional connection today:",
    options: [
      { label: "Strong — felt close, warm, safe", power: 1, safety: 5 },
      { label: "Good — normal, comfortable", power: 1, safety: 3 },
      { label: "Distant — polite but disconnected", power: 0, safety: 0 },
      { label: "Cold — tension, avoidance", power: 0, safety: -3 }
    ]
  }
];

export default function MarriagePage() {
  const [compassState, setCompassState] = useState<CompassState | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckin, setShowCheckin] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionOption>>({});
  const [checkinComplete, setCheckinComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logView, setLogView] = useState<"day" | "week" | "month">("day");
  const [showLogModal, setShowLogModal] = useState(false);
  const [logInput, setLogInput] = useState("");
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logResult, setLogResult] = useState<{
    type: 'positive' | 'negative';
    description: string;
    power: number;
    safety: number;
    advice: string;
  } | null>(null);

  // Edit state
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);
  const [editInput, setEditInput] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editResult, setEditResult] = useState<{
    type: 'positive' | 'negative';
    description: string;
    power: number;
    safety: number;
    advice: string;
  } | null>(null);

  // Check if today's check-in is done
  const todayDate = new Date().toISOString().split('T')[0];
  const hasCheckedInToday = checkins.some(c => c.date === todayDate);

  const fetchCompass = async () => {
    setLoading(true);
    try {
      // Try API first (Supabase), fall back to static file
      const response = await fetch("/api/compass/checkin");
      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          setCompassState(data);
        } else {
          // Fall back to static file
          const staticResponse = await fetch("/data/compass-state.json");
          if (staticResponse.ok) {
            const staticData = await staticResponse.json();
            setCompassState(staticData);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load compass state:", err);
      // Try static file as fallback
      try {
        const staticResponse = await fetch("/data/compass-state.json");
        if (staticResponse.ok) {
          const staticData = await staticResponse.json();
          setCompassState(staticData);
        }
      } catch {
        // Ignore
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInteractions = async () => {
    try {
      // Fetch from both API (Supabase) and static file, merge them
      const [apiResponse, staticResponse] = await Promise.all([
        fetch("/api/compass/interactions").catch(() => null),
        fetch("/data/interactions.json").catch(() => null)
      ]);

      let allInteractions: Interaction[] = [];

      // Get API interactions (Supabase)
      if (apiResponse?.ok) {
        const apiData = await apiResponse.json();
        if (apiData.interactions) {
          allInteractions = [...apiData.interactions];
        }
      }

      // Get static file interactions and merge (avoiding duplicates by id)
      if (staticResponse?.ok) {
        const staticData = await staticResponse.json();
        if (staticData.interactions) {
          const existingIds = new Set(allInteractions.map(i => i.id));
          const newFromStatic = staticData.interactions.filter(
            (i: Interaction) => !existingIds.has(i.id)
          );
          allInteractions = [...allInteractions, ...newFromStatic];
        }
      }

      // Sort by timestamp descending (newest first)
      const sorted = allInteractions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setInteractions(sorted);
    } catch (err) {
      console.error("Failed to load interactions:", err);
    }
  };

  const fetchCheckins = async () => {
    try {
      const response = await fetch("/api/compass/checkins");
      if (response.ok) {
        const data = await response.json();
        if (data.checkins) {
          setCheckins(data.checkins);
        }
      }
    } catch (err) {
      console.error("Failed to load check-ins:", err);
    }
  };

  // Get check-in for a specific date
  const getCheckinForDate = (date: string): DailyCheckin | undefined => {
    return checkins.find(c => c.date === date);
  };

  // Submit a new log via AI processing
  const submitLog = async () => {
    if (!logInput.trim()) return;
    
    setLogSubmitting(true);
    try {
      const response = await fetch('/api/compass/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: logInput })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Show the result
          setLogResult({
            type: result.interaction?.type || 'positive',
            description: result.interaction?.description || logInput,
            power: result.interaction?.power || 0,
            safety: result.interaction?.safety || 0,
            advice: result.advice || ''
          });
          // Refresh interactions
          fetchInteractions();
          setLogInput("");
        } else {
          alert('Failed to save log: ' + (result.error || 'Unknown error'));
        }
      } else {
        alert('Failed to save log. Please try again.');
      }
    } catch (error) {
      console.error('Log submission error:', error);
      alert('Failed to save log. Please try again.');
    } finally {
      setLogSubmitting(false);
    }
  };

  const closeLogModal = () => {
    setShowLogModal(false);
    setLogInput("");
    setLogResult(null);
  };

  // Open edit modal for an interaction
  const openEditModal = (interaction: Interaction) => {
    // Get the original text from the answers field if available
    const originalText = (interaction as unknown as { answers?: { original_text?: string } }).answers?.original_text || interaction.description;
    setEditingInteraction(interaction);
    setEditInput(originalText);
    setEditResult(null);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditingInteraction(null);
    setEditInput("");
    setEditResult(null);
  };

  // Submit edited log
  const submitEdit = async () => {
    if (!editInput.trim() || !editingInteraction) return;
    
    setEditSubmitting(true);
    try {
      const response = await fetch(`/api/compass/log/${editingInteraction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editInput })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Show the result
          setEditResult({
            type: result.interaction?.type || 'positive',
            description: result.interaction?.description || editInput,
            power: result.interaction?.power || 0,
            safety: result.interaction?.safety || 0,
            advice: result.advice || ''
          });
          // Refresh interactions and compass
          fetchInteractions();
          fetchCompass();
        } else {
          alert('Failed to update log: ' + (result.error || 'Unknown error'));
        }
      } else {
        alert('Failed to update log. Please try again.');
      }
    } catch (error) {
      console.error('Edit submission error:', error);
      alert('Failed to update log. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Group interactions by day
  const getDailyHistory = () => {
    const byDay: Record<string, Interaction[]> = {};
    interactions.forEach(i => {
      const date = i.date;
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(i);
    });
    
    // Also include days that only have check-ins
    checkins.forEach(c => {
      if (!byDay[c.date]) byDay[c.date] = [];
    });
    
    const dates = Object.keys(byDay).sort();
    
    return dates.map((date, idx) => {
      const dayInteractions = byDay[date];
      const checkin = getCheckinForDate(date);
      
      // Calculate interaction stats
      const interactionPower = dayInteractions.reduce((sum, i) => sum + i.compass.power, 0);
      const interactionSafety = dayInteractions.reduce((sum, i) => sum + i.compass.safety, 0);
      const interactionCount = dayInteractions.length;
      const positive = dayInteractions.filter(i => i.type === "positive").length;
      const negative = dayInteractions.filter(i => i.type === "negative").length;
      
      // Calculate combined day score (interactions + check-in weighted equally)
      // If check-in exists, it counts as one "entry" alongside all interactions
      const totalEntries = interactionCount + (checkin ? 1 : 0);
      const totalPower = interactionPower + (checkin ? checkin.power : 0);
      const totalSafety = interactionSafety + (checkin ? checkin.safety : 0);
      
      const avgPower = totalEntries > 0 ? totalPower / totalEntries : 0;
      const avgSafety = totalEntries > 0 ? totalSafety / totalEntries : 0;
      
      // Previous day stats for change calculation
      let prevPower = 0;
      let prevSafety = 0;
      if (idx > 0) {
        const prevDate = dates[idx - 1];
        const prevInteractions = byDay[prevDate];
        const prevCheckin = getCheckinForDate(prevDate);
        const prevInteractionCount = prevInteractions.length;
        const prevTotalEntries = prevInteractionCount + (prevCheckin ? 1 : 0);
        if (prevTotalEntries > 0) {
          const prevTotalPower = prevInteractions.reduce((sum, i) => sum + i.compass.power, 0) + (prevCheckin ? prevCheckin.power : 0);
          const prevTotalSafety = prevInteractions.reduce((sum, i) => sum + i.compass.safety, 0) + (prevCheckin ? prevCheckin.safety : 0);
          prevPower = prevTotalPower / prevTotalEntries;
          prevSafety = prevTotalSafety / prevTotalEntries;
        }
      }
      
      return {
        date,
        interactions: dayInteractions,
        checkin,
        stats: {
          interactionCount,
          totalEntries,
          positive,
          negative,
          ratio: negative > 0 ? positive / negative : positive > 0 ? Infinity : 0,
          avgPower,
          avgSafety,
          // Separate averages for breakdown
          interactionAvgPower: interactionCount > 0 ? interactionPower / interactionCount : null,
          interactionAvgSafety: interactionCount > 0 ? interactionSafety / interactionCount : null,
        },
        change: {
          power: avgPower - prevPower,
          safety: avgSafety - prevSafety,
        }
      };
    }).reverse();
  };

  // Group interactions by week
  const getWeeklyHistory = () => {
    const byWeek: Record<string, Interaction[]> = {};
    interactions.forEach(i => {
      const date = new Date(i.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      if (!byWeek[weekKey]) byWeek[weekKey] = [];
      byWeek[weekKey].push(i);
    });
    
    const weeks = Object.keys(byWeek).sort();
    
    return weeks.map((weekStart, idx) => {
      const weekInteractions = byWeek[weekStart];
      const weekPower = weekInteractions.reduce((sum, i) => sum + i.compass.power, 0);
      const weekSafety = weekInteractions.reduce((sum, i) => sum + i.compass.safety, 0);
      const weekCount = weekInteractions.length;
      const positive = weekInteractions.filter(i => i.type === "positive").length;
      const negative = weekInteractions.filter(i => i.type === "negative").length;
      
      // Previous week stats
      let prevPower = 0;
      let prevSafety = 0;
      if (idx > 0) {
        const prevWeekKey = weeks[idx - 1];
        const prevInteractions = byWeek[prevWeekKey];
        const prevCount = prevInteractions.length;
        if (prevCount > 0) {
          prevPower = prevInteractions.reduce((sum, i) => sum + i.compass.power, 0) / prevCount;
          prevSafety = prevInteractions.reduce((sum, i) => sum + i.compass.safety, 0) / prevCount;
        }
      }
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const avgPower = weekCount > 0 ? weekPower / weekCount : 0;
      const avgSafety = weekCount > 0 ? weekSafety / weekCount : 0;
      
      return {
        weekStart,
        weekEnd: weekEnd.toISOString().split('T')[0],
        interactions: weekInteractions,
        stats: {
          count: weekCount,
          positive,
          negative,
          ratio: negative > 0 ? positive / negative : positive > 0 ? Infinity : 0,
          avgPower,
          avgSafety,
        },
        change: {
          power: avgPower - prevPower,
          safety: avgSafety - prevSafety,
        }
      };
    }).reverse();
  };

  // Group interactions by month
  const getMonthlyHistory = () => {
    const byMonth: Record<string, Interaction[]> = {};
    interactions.forEach(i => {
      const date = new Date(i.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(i);
    });
    
    const months = Object.keys(byMonth).sort();
    
    return months.map((monthKey, idx) => {
      const monthInteractions = byMonth[monthKey];
      const monthPower = monthInteractions.reduce((sum, i) => sum + i.compass.power, 0);
      const monthSafety = monthInteractions.reduce((sum, i) => sum + i.compass.safety, 0);
      const monthCount = monthInteractions.length;
      const positive = monthInteractions.filter(i => i.type === "positive").length;
      const negative = monthInteractions.filter(i => i.type === "negative").length;
      
      // Previous month stats
      let prevPower = 0;
      let prevSafety = 0;
      if (idx > 0) {
        const prevMonthKey = months[idx - 1];
        const prevInteractions = byMonth[prevMonthKey];
        const prevCount = prevInteractions.length;
        if (prevCount > 0) {
          prevPower = prevInteractions.reduce((sum, i) => sum + i.compass.power, 0) / prevCount;
          prevSafety = prevInteractions.reduce((sum, i) => sum + i.compass.safety, 0) / prevCount;
        }
      }
      
      const avgPower = monthCount > 0 ? monthPower / monthCount : 0;
      const avgSafety = monthCount > 0 ? monthSafety / monthCount : 0;
      
      return {
        monthKey,
        interactions: monthInteractions,
        stats: {
          count: monthCount,
          positive,
          negative,
          ratio: negative > 0 ? positive / negative : positive > 0 ? Infinity : 0,
          avgPower,
          avgSafety,
        },
        change: {
          power: avgPower - prevPower,
          safety: avgSafety - prevSafety,
        }
      };
    }).reverse();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start + 'T12:00:00');
    const endDate = new Date(end + 'T12:00:00');
    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  useEffect(() => {
    fetchCompass();
    fetchInteractions();
    fetchCheckins();
  }, []);

  const handleAnswer = (option: QuestionOption) => {
    const question = dailyQuestions[currentQuestion];
    setAnswers(prev => ({ ...prev, [question.id]: option }));
    
    if (currentQuestion < dailyQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setCheckinComplete(true);
    }
  };

  const submitCheckin = async () => {
    setSubmitting(true);
    
    // Calculate average scores from all answers
    const answerValues = Object.values(answers);
    const avgPower = answerValues.reduce((sum, a) => sum + a.power, 0) / answerValues.length;
    const avgSafety = answerValues.reduce((sum, a) => sum + a.safety, 0) / answerValues.length;
    
    const power = Math.round(avgPower * 10) / 10;
    const safety = Math.round(avgSafety * 10) / 10;
    
    const checkinData = {
      power,
      safety,
      answers: answers
    };
    
    try {
      const response = await fetch('/api/compass/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkinData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Refresh compass state and check-ins from API
          fetchCompass();
          fetchCheckins();
          // Reset check-in
          setShowCheckin(false);
          setCurrentQuestion(0);
          setAnswers({});
          setCheckinComplete(false);
        } else {
          alert('Failed to save check-in: ' + (result.error || 'Unknown error'));
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert('Failed to save check-in: ' + (errorData.error || 'Please try again.'));
      }
    } catch (error) {
      console.error('Check-in error:', error);
      alert('Failed to save check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCheckin = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setCheckinComplete(false);
  };

  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case "topRight": return "text-green-400";
      case "topLeft": return "text-yellow-400";
      case "bottomRight": return "text-red-400";
      case "bottomLeft": return "text-gray-400";
      default: return "text-slate-400";
    }
  };

  const getQuadrantBg = (quadrant: string) => {
    switch (quadrant) {
      case "topRight": return "bg-green-500";
      case "topLeft": return "bg-yellow-500";
      case "bottomRight": return "bg-red-500";
      case "bottomLeft": return "bg-gray-500";
      default: return "bg-slate-500";
    }
  };

  // Convert compass position to percentage for visualization
  const posToPercent = (value: number) => ((value + 5) / 10) * 100;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Daily Check-in Banner (only if not checked in today) */}
      {!hasCheckedInToday && !showCheckin && (
        <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-slate-200 font-medium">Daily Check-in Available</p>
              <p className="text-slate-400 text-sm">Take 30 seconds to reflect on your day</p>
            </div>
          </div>
          <button
            onClick={() => setShowCheckin(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            Start Check-in
          </button>
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-lg w-full p-6">
            {!checkinComplete ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-200">Daily Check-in</h2>
                  <button
                    onClick={() => setShowCheckin(false)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex justify-between items-center text-sm text-slate-500 mb-4">
                  <span>Question {currentQuestion + 1} of {dailyQuestions.length}</span>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                  <p className="text-slate-200 font-medium mb-4">{dailyQuestions[currentQuestion].question}</p>
                  <div className="space-y-2">
                    {dailyQuestions[currentQuestion].options.map((option, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(option)}
                        className="w-full text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center justify-between group"
                      >
                        <span>{option.label}</span>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Progress dots */}
                <div className="flex justify-center gap-2">
                  {dailyQuestions.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i < currentQuestion ? 'bg-purple-500' : i === currentQuestion ? 'bg-purple-400' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-200">Check-in Complete!</h2>
                  <button
                    onClick={() => { setShowCheckin(false); resetCheckin(); }}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">Nice work!</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Power: {(Object.values(answers).reduce((sum, a) => sum + a.power, 0) / Object.values(answers).length).toFixed(1)} | 
                    Safety: {(Object.values(answers).reduce((sum, a) => sum + a.safety, 0) / Object.values(answers).length).toFixed(1)}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={resetCheckin}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={submitCheckin}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save to Compass"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <Heart className="w-6 h-6 text-rose-500" strokeWidth={1.5} />
            Marriage Compass
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Track your relationship health over time</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogModal(true)}
            className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Log
          </button>
          <button
            onClick={() => { fetchCompass(); fetchInteractions(); fetchCheckins(); }}
            disabled={loading}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-lg w-full p-6">
            {!logResult ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-200">Log an Interaction</h2>
                  <button
                    onClick={closeLogModal}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  Describe what happened. AI will analyze it and extract the type, scores, and give you advice.
                </p>
                <textarea
                  value={logInput}
                  onChange={(e) => setLogInput(e.target.value)}
                  placeholder="e.g., Got defensive when Jillian mentioned the coffee stain on the table..."
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={closeLogModal}
                    className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitLog}
                    disabled={logSubmitting || !logInput.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {logSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Analyze & Save
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-200">Log Saved ✓</h2>
                  <button
                    onClick={closeLogModal}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Type Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    logResult.type === 'positive' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {logResult.type === 'positive' ? '✓ Positive' : '✗ Negative'}
                  </span>
                </div>

                {/* Summary */}
                <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                  <p className="text-slate-300 text-sm">{logResult.description}</p>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                    <p className="text-slate-500 text-xs mb-1">Power</p>
                    <p className={`text-2xl font-bold ${logResult.power >= 0 ? 'text-blue-400' : 'text-yellow-400'}`}>
                      {logResult.power > 0 ? '+' : ''}{logResult.power}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                    <p className="text-slate-500 text-xs mb-1">Safety</p>
                    <p className={`text-2xl font-bold ${logResult.safety >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                      {logResult.safety > 0 ? '+' : ''}{logResult.safety}
                    </p>
                  </div>
                </div>

                {/* Advice */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-200 text-sm font-medium mb-1">Advice</p>
                      <p className="text-amber-100/80 text-sm">{logResult.advice}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setLogResult(null)}
                    className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Log Another
                  </button>
                  <button
                    onClick={closeLogModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingInteraction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-lg w-full p-6">
            {!editResult ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-200">Edit Interaction</h2>
                  <button
                    onClick={closeEditModal}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  Edit your log. AI will re-analyze and update the type, scores, and advice.
                </p>
                <textarea
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  placeholder="Describe what happened..."
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={closeEditModal}
                    className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitEdit}
                    disabled={editSubmitting || !editInput.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {editSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Re-analyzing...
                      </>
                    ) : (
                      <>
                        <Pencil className="w-4 h-4" />
                        Update & Re-analyze
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-200">Updated ✓</h2>
                  <button
                    onClick={closeEditModal}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Type Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    editResult.type === 'positive' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {editResult.type === 'positive' ? '✓ Positive' : '✗ Negative'}
                  </span>
                </div>

                {/* Summary */}
                <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                  <p className="text-slate-300 text-sm">{editResult.description}</p>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                    <p className="text-slate-500 text-xs mb-1">Power</p>
                    <p className={`text-2xl font-bold ${editResult.power >= 0 ? 'text-blue-400' : 'text-yellow-400'}`}>
                      {editResult.power > 0 ? '+' : ''}{editResult.power}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                    <p className="text-slate-500 text-xs mb-1">Safety</p>
                    <p className={`text-2xl font-bold ${editResult.safety >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                      {editResult.safety > 0 ? '+' : ''}{editResult.safety}
                    </p>
                  </div>
                </div>

                {/* Advice */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-200 text-sm font-medium mb-1">Updated Advice</p>
                      <p className="text-amber-100/80 text-sm">{editResult.advice}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <button
                    onClick={closeEditModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Compass Visualization */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-6">
        <div className="relative w-full aspect-square max-w-md mx-auto">
          {/* Grid background */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {/* Top Right - Ideal */}
            <div className="col-start-2 row-start-1 bg-green-500/10 border-l border-b border-slate-700 flex items-center justify-center">
              <div className="text-center p-2">
                <p className="text-green-400 font-medium text-sm">Secure Leadership</p>
                <p className="text-green-400/60 text-xs">IDEAL</p>
              </div>
            </div>
            {/* Top Left - Codependent */}
            <div className="col-start-1 row-start-1 bg-yellow-500/10 border-r border-b border-slate-700 flex items-center justify-center">
              <div className="text-center p-2">
                <p className="text-yellow-400 font-medium text-sm">Codependent</p>
                <p className="text-yellow-400/60 text-xs">Enmeshed</p>
              </div>
            </div>
            {/* Bottom Right - Authoritarian */}
            <div className="col-start-2 row-start-2 bg-red-500/10 border-l border-t border-slate-700 flex items-center justify-center">
              <div className="text-center p-2">
                <p className="text-red-400 font-medium text-sm">Authoritarian</p>
                <p className="text-red-400/60 text-xs">Abusive</p>
              </div>
            </div>
            {/* Bottom Left - Detached */}
            <div className="col-start-1 row-start-2 bg-gray-500/10 border-r border-t border-slate-700 flex items-center justify-center">
              <div className="text-center p-2">
                <p className="text-gray-400 font-medium text-sm">Detached</p>
                <p className="text-gray-400/60 text-xs">Avoidant</p>
              </div>
            </div>
          </div>

          {/* Ideal Zone Highlight */}
          {compassState?.idealZone && (
            <div 
              className="absolute border-2 border-green-400/50 border-dashed rounded-lg bg-green-400/5"
              style={{
                left: `${posToPercent(compassState.idealZone.power[0])}%`,
                right: `${100 - posToPercent(compassState.idealZone.power[1])}%`,
                top: `${100 - posToPercent(compassState.idealZone.safety[1])}%`,
                bottom: `${posToPercent(compassState.idealZone.safety[0])}%`,
              }}
            />
          )}

          {/* Axis labels */}
          <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-xs text-slate-500">
            <span>Self-Sacrificing</span>
            <span>Power & Agency</span>
            <span>Dominating</span>
          </div>
          <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-500 writing-mode-vertical">
            <span className="transform -rotate-90 origin-center">Secure</span>
            <span className="transform -rotate-90 origin-center">Safety</span>
            <span className="transform -rotate-90 origin-center">Unsafe</span>
          </div>

          {/* Position Marker */}
          {compassState?.current && compassState.current.count > 0 && (
            <div
              className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full ${getQuadrantBg(compassState.current.quadrant)} shadow-lg flex items-center justify-center transition-all duration-500`}
              style={{
                left: `${posToPercent(compassState.current.power)}%`,
                top: `${100 - posToPercent(compassState.current.safety)}%`,
              }}
            >
              <Heart className="w-3 h-3 text-white" fill="white" />
            </div>
          )}

          {/* Center crosshair */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-600" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Position */}
        <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-rose-600/20 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-rose-400" strokeWidth={1.5} />
            </div>
            <h2 className="font-semibold text-slate-200">Current Position</h2>
          </div>
          {compassState?.current && compassState.current.count > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Power</span>
                <span className={`font-medium ${compassState.current.power >= 0 ? "text-green-400" : "text-yellow-400"}`}>
                  {compassState.current.power > 0 ? "+" : ""}{compassState.current.power.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Safety</span>
                <span className={`font-medium ${compassState.current.safety >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {compassState.current.safety > 0 ? "+" : ""}{compassState.current.safety.toFixed(1)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-700">
                <p className={`font-medium ${getQuadrantColor(compassState.current.quadrant)}`}>
                  {compassState.current.quadrantName}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No data yet. Log interactions to see your position.</p>
          )}
        </div>

        {/* Status */}
        <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              compassState?.current?.inIdealZone ? "bg-green-600/20" : "bg-yellow-600/20"
            }`}>
              {compassState?.current?.inIdealZone ? (
                <CheckCircle className="w-5 h-5 text-green-400" strokeWidth={1.5} />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-400" strokeWidth={1.5} />
              )}
            </div>
            <h2 className="font-semibold text-slate-200">Status</h2>
          </div>
          {compassState?.current?.inIdealZone ? (
            <div>
              <p className="text-green-400 font-medium">In Ideal Zone ✓</p>
              <p className="text-slate-500 text-sm mt-1">
                Secure leadership with emotional safety. Keep it up!
              </p>
            </div>
          ) : compassState?.current && compassState.current.count > 0 ? (
            <div>
              <p className="text-yellow-400 font-medium">Outside Ideal Zone</p>
              <p className="text-slate-500 text-sm mt-1">
                Focus on moving toward secure leadership with high safety.
              </p>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Log interactions to track status.</p>
          )}
        </div>
      </div>

      {/* How It's Calculated */}
      <details className="bg-slate-850 rounded-xl border border-slate-800">
        <summary className="p-5 cursor-pointer hover:bg-slate-800/50 transition-colors rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-600/20 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-200 inline">How the Compass Score is Calculated</h2>
              <p className="text-slate-500 text-sm mt-0.5">Click to expand</p>
            </div>
          </div>
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-slate-700/50 pt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-slate-200 font-medium mb-2">📊 Daily Score</h3>
              <p className="text-slate-400 text-sm">
                Each day&apos;s score is the <span className="text-slate-200">average</span> of all entries that day:
              </p>
              <ul className="text-slate-400 text-sm mt-2 space-y-1 list-disc list-inside">
                <li><span className="text-green-400">Interaction logs</span> — each +/- log you record</li>
                <li><span className="text-purple-400">Daily check-in</span> — the 5-question quiz (counts as 1 entry)</li>
              </ul>
              <p className="text-slate-500 text-xs mt-2">
                Example: 3 logs averaging (+2, +3) plus check-in (+1, +2) = 4 entries → Day score: +1.75, +2.75
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-slate-200 font-medium mb-2">🧭 Compass Position</h3>
              <p className="text-slate-400 text-sm">
                The compass uses a <span className="text-slate-200">weighted average with 30-day decay</span>:
              </p>
              <ul className="text-slate-400 text-sm mt-2 space-y-1 list-disc list-inside">
                <li>Recent entries weighted more heavily</li>
                <li>30-day half-life (entries from 30 days ago count ~50%)</li>
                <li>Older entries still matter, just less</li>
              </ul>
              <p className="text-slate-500 text-xs mt-2">
                This means consistent behavior matters more than one-off events.
              </p>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h3 className="text-slate-200 font-medium mb-2">🎯 Ideal Zone</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">
                  <span className="text-blue-400">Power (0 to +2)</span> — Confident leadership without domination
                </p>
                <p className="text-slate-400 mt-1">
                  <span className="text-purple-400">Safety (+3 to +5)</span> — High emotional safety and trust
                </p>
              </div>
              <div className="text-slate-500 text-xs space-y-1">
                <p>Power &lt; 0 = Too passive/self-sacrificing</p>
                <p>Power &gt; 2 = Too controlling/dominating</p>
                <p>Safety &lt; 3 = Not enough emotional safety</p>
              </div>
            </div>
          </div>
        </div>
      </details>

      {/* Interaction Log - Unified View */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-400" strokeWidth={1.5} />
            </div>
            <h2 className="font-semibold text-slate-200">Interaction Log</h2>
          </div>
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setLogView("day")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                logView === "day" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setLogView("week")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                logView === "week" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setLogView("month")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                logView === "month" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Month
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {/* Day View */}
          {logView === "day" && (
            getDailyHistory().length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No data yet.</p>
            ) : (
              getDailyHistory().map((day, idx) => (
                <div key={day.date} className="bg-slate-800/50 rounded-lg p-4">
                  {/* Header with date and counts */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-200">{formatDate(day.date)}</span>
                      {day.checkin && (
                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                          ✓ Check-in
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">+{day.stats.positive}</span>
                      <span className="text-red-400">−{day.stats.negative}</span>
                    </div>
                  </div>
                  
                  {/* Day Score Summary */}
                  <div className="grid grid-cols-4 gap-3 mb-3 p-3 bg-slate-900/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-slate-200 font-medium">{day.stats.interactionCount}</p>
                      <p className="text-slate-500 text-xs">Logs</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-medium ${day.stats.ratio >= 5 ? "text-green-400" : day.stats.ratio >= 3 ? "text-yellow-400" : "text-red-400"}`}>
                        {day.stats.ratio === Infinity ? "∞" : day.stats.ratio.toFixed(1)}:1
                      </p>
                      <p className="text-slate-500 text-xs">Ratio</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${day.stats.avgPower >= 0 ? "text-blue-400" : "text-yellow-400"}`}>
                          {day.stats.avgPower > 0 ? "+" : ""}{day.stats.avgPower.toFixed(1)}
                        </span>
                        {idx < getDailyHistory().length - 1 && day.change.power !== 0 && (
                          <span className={`text-xs ${day.change.power > 0 ? "text-green-400" : "text-red-400"}`}>
                            {day.change.power > 0 ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs">Day Power</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${day.stats.avgSafety >= 0 ? "text-purple-400" : "text-red-400"}`}>
                          {day.stats.avgSafety > 0 ? "+" : ""}{day.stats.avgSafety.toFixed(1)}
                        </span>
                        {idx < getDailyHistory().length - 1 && day.change.safety !== 0 && (
                          <span className={`text-xs ${day.change.safety > 0 ? "text-green-400" : "text-red-400"}`}>
                            {day.change.safety > 0 ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs">Day Safety</p>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="mb-3 p-3 bg-slate-900/30 rounded-lg border border-slate-700/50">
                    <p className="text-slate-400 text-xs mb-2 font-medium">Score Breakdown:</p>
                    <div className="space-y-1 text-xs">
                      {day.stats.interactionCount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            {day.stats.interactionCount} log{day.stats.interactionCount !== 1 ? "s" : ""} avg:
                          </span>
                          <span className="text-slate-300">
                            P: {day.stats.interactionAvgPower !== null ? (day.stats.interactionAvgPower > 0 ? "+" : "") + day.stats.interactionAvgPower.toFixed(1) : "—"}, 
                            S: {day.stats.interactionAvgSafety !== null ? (day.stats.interactionAvgSafety > 0 ? "+" : "") + day.stats.interactionAvgSafety.toFixed(1) : "—"}
                          </span>
                        </div>
                      )}
                      {day.checkin ? (
                        <div className="flex justify-between">
                          <span className="text-purple-400">Daily check-in:</span>
                          <span className="text-purple-300">
                            P: {day.checkin.power > 0 ? "+" : ""}{day.checkin.power.toFixed(1)}, 
                            S: {day.checkin.safety > 0 ? "+" : ""}{day.checkin.safety.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Daily check-in:</span>
                          <span className="text-slate-600 italic">Not completed</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-slate-700/50 mt-1">
                        <span className="text-slate-400 font-medium">Day total ({day.stats.totalEntries} entries):</span>
                        <span className="text-slate-200 font-medium">
                          P: {day.stats.avgPower > 0 ? "+" : ""}{day.stats.avgPower.toFixed(1)}, 
                          S: {day.stats.avgSafety > 0 ? "+" : ""}{day.stats.avgSafety.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Change from previous day */}
                  {idx < getDailyHistory().length - 1 && (day.change.power !== 0 || day.change.safety !== 0) && (
                    <div className="text-xs text-slate-500 mb-2">
                      vs previous day: 
                      {day.change.power !== 0 && (
                        <span className={`ml-2 ${day.change.power > 0 ? "text-green-400" : "text-red-400"}`}>
                          Power {day.change.power > 0 ? "+" : ""}{day.change.power.toFixed(1)}
                        </span>
                      )}
                      {day.change.safety !== 0 && (
                        <span className={`ml-2 ${day.change.safety > 0 ? "text-green-400" : "text-red-400"}`}>
                          Safety {day.change.safety > 0 ? "+" : ""}{day.change.safety.toFixed(1)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expandable interaction list */}
                  <details className="group">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      View {day.interactions.length} log{day.interactions.length !== 1 ? "s" : ""}
                    </summary>
                    <div className="mt-3 space-y-2">
                      {day.interactions.map(interaction => (
                        <div 
                          key={interaction.id} 
                          className={`p-3 rounded-lg border ${
                            interaction.type === "positive"
                              ? "bg-green-500/5 border-green-500/20"
                              : "bg-red-500/5 border-red-500/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium ${interaction.type === "positive" ? "text-green-400" : "text-red-400"}`}>
                                  {interaction.type === "positive" ? "+" : "−"}
                                </span>
                                <span className="text-slate-500 text-xs">{interaction.time}</span>
                                <button
                                  onClick={() => openEditModal(interaction)}
                                  className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                                  title="Edit this log"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-slate-300 text-sm">{interaction.description}</p>
                              {interaction.tags && interaction.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {interaction.tags.map((tag, i) => (
                                    <span key={i} className="text-xs px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* Advice */}
                              {interaction.advice && (
                                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-amber-200/80 text-xs">{interaction.advice}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-right text-xs space-y-1">
                              <div className="text-slate-500">
                                P: <span className={interaction.compass.power >= 0 ? "text-blue-400" : "text-yellow-400"}>
                                  {interaction.compass.power > 0 ? "+" : ""}{interaction.compass.power}
                                </span>
                              </div>
                              <div className="text-slate-500">
                                S: <span className={interaction.compass.safety >= 0 ? "text-purple-400" : "text-red-400"}>
                                  {interaction.compass.safety > 0 ? "+" : ""}{interaction.compass.safety}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))
            )
          )}

          {/* Week View */}
          {logView === "week" && (
            getWeeklyHistory().length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No data yet.</p>
            ) : (
              getWeeklyHistory().map((week, idx) => (
                <div key={week.weekStart} className="bg-slate-800/50 rounded-lg p-4">
                  {/* Header with date range and counts */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-200">{formatWeekRange(week.weekStart, week.weekEnd)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">+{week.stats.positive}</span>
                      <span className="text-red-400">−{week.stats.negative}</span>
                    </div>
                  </div>
                  
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-3 mb-3 p-3 bg-slate-900/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-slate-200 font-medium">{week.stats.count}</p>
                      <p className="text-slate-500 text-xs">Logs</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-medium ${week.stats.ratio >= 5 ? "text-green-400" : week.stats.ratio >= 3 ? "text-yellow-400" : "text-red-400"}`}>
                        {week.stats.ratio === Infinity ? "∞" : week.stats.ratio.toFixed(1)}:1
                      </p>
                      <p className="text-slate-500 text-xs">Ratio</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${week.stats.avgPower >= 0 ? "text-blue-400" : "text-yellow-400"}`}>
                          {week.stats.avgPower > 0 ? "+" : ""}{week.stats.avgPower.toFixed(1)}
                        </span>
                        {idx < getWeeklyHistory().length - 1 && week.change.power !== 0 && (
                          <span className={`text-xs ${week.change.power > 0 ? "text-green-400" : "text-red-400"}`}>
                            {week.change.power > 0 ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs">Power</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${week.stats.avgSafety >= 0 ? "text-purple-400" : "text-red-400"}`}>
                          {week.stats.avgSafety > 0 ? "+" : ""}{week.stats.avgSafety.toFixed(1)}
                        </span>
                        {idx < getWeeklyHistory().length - 1 && week.change.safety !== 0 && (
                          <span className={`text-xs ${week.change.safety > 0 ? "text-green-400" : "text-red-400"}`}>
                            {week.change.safety > 0 ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs">Safety</p>
                    </div>
                  </div>

                  {/* Change from previous week */}
                  {idx < getWeeklyHistory().length - 1 && (week.change.power !== 0 || week.change.safety !== 0) && (
                    <div className="text-xs text-slate-500 mb-2">
                      vs previous week: 
                      {week.change.power !== 0 && (
                        <span className={`ml-2 ${week.change.power > 0 ? "text-green-400" : "text-red-400"}`}>
                          Power {week.change.power > 0 ? "+" : ""}{week.change.power.toFixed(1)}
                        </span>
                      )}
                      {week.change.safety !== 0 && (
                        <span className={`ml-2 ${week.change.safety > 0 ? "text-green-400" : "text-red-400"}`}>
                          Safety {week.change.safety > 0 ? "+" : ""}{week.change.safety.toFixed(1)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expandable interaction list */}
                  <details className="group">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      View {week.interactions.length} log{week.interactions.length !== 1 ? "s" : ""}
                    </summary>
                    <div className="mt-3 space-y-2">
                      {week.interactions.map(interaction => (
                        <div 
                          key={interaction.id} 
                          className={`p-3 rounded-lg border ${
                            interaction.type === "positive"
                              ? "bg-green-500/5 border-green-500/20"
                              : "bg-red-500/5 border-red-500/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium ${interaction.type === "positive" ? "text-green-400" : "text-red-400"}`}>
                                  {interaction.type === "positive" ? "+" : "−"}
                                </span>
                                <span className="text-slate-500 text-xs">{formatDate(interaction.date)} {interaction.time}</span>
                                <button
                                  onClick={() => openEditModal(interaction)}
                                  className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                                  title="Edit this log"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-slate-300 text-sm">{interaction.description}</p>
                            </div>
                            <div className="text-right text-xs space-y-1">
                              <div className="text-slate-500">
                                P: <span className={interaction.compass.power >= 0 ? "text-blue-400" : "text-yellow-400"}>
                                  {interaction.compass.power > 0 ? "+" : ""}{interaction.compass.power}
                                </span>
                              </div>
                              <div className="text-slate-500">
                                S: <span className={interaction.compass.safety >= 0 ? "text-purple-400" : "text-red-400"}>
                                  {interaction.compass.safety > 0 ? "+" : ""}{interaction.compass.safety}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))
            )
          )}

          {/* Month View */}
          {logView === "month" && (
            getMonthlyHistory().length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No data yet.</p>
            ) : (
              getMonthlyHistory().map((month, idx) => (
                <div key={month.monthKey} className="bg-slate-800/50 rounded-lg p-4">
                  {/* Header with month and counts */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-200">{formatMonth(month.monthKey)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">+{month.stats.positive}</span>
                      <span className="text-red-400">−{month.stats.negative}</span>
                    </div>
                  </div>
                  
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-3 mb-3 p-3 bg-slate-900/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-slate-200 font-medium">{month.stats.count}</p>
                      <p className="text-slate-500 text-xs">Logs</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-medium ${month.stats.ratio >= 5 ? "text-green-400" : month.stats.ratio >= 3 ? "text-yellow-400" : "text-red-400"}`}>
                        {month.stats.ratio === Infinity ? "∞" : month.stats.ratio.toFixed(1)}:1
                      </p>
                      <p className="text-slate-500 text-xs">Ratio</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${month.stats.avgPower >= 0 ? "text-blue-400" : "text-yellow-400"}`}>
                          {month.stats.avgPower > 0 ? "+" : ""}{month.stats.avgPower.toFixed(1)}
                        </span>
                        {idx < getMonthlyHistory().length - 1 && month.change.power !== 0 && (
                          <span className={`text-xs ${month.change.power > 0 ? "text-green-400" : "text-red-400"}`}>
                            {month.change.power > 0 ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs">Power</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${month.stats.avgSafety >= 0 ? "text-purple-400" : "text-red-400"}`}>
                          {month.stats.avgSafety > 0 ? "+" : ""}{month.stats.avgSafety.toFixed(1)}
                        </span>
                        {idx < getMonthlyHistory().length - 1 && month.change.safety !== 0 && (
                          <span className={`text-xs ${month.change.safety > 0 ? "text-green-400" : "text-red-400"}`}>
                            {month.change.safety > 0 ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs">Safety</p>
                    </div>
                  </div>

                  {/* Change from previous month */}
                  {idx < getMonthlyHistory().length - 1 && (month.change.power !== 0 || month.change.safety !== 0) && (
                    <div className="text-xs text-slate-500 mb-2">
                      vs previous month: 
                      {month.change.power !== 0 && (
                        <span className={`ml-2 ${month.change.power > 0 ? "text-green-400" : "text-red-400"}`}>
                          Power {month.change.power > 0 ? "+" : ""}{month.change.power.toFixed(1)}
                        </span>
                      )}
                      {month.change.safety !== 0 && (
                        <span className={`ml-2 ${month.change.safety > 0 ? "text-green-400" : "text-red-400"}`}>
                          Safety {month.change.safety > 0 ? "+" : ""}{month.change.safety.toFixed(1)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expandable interaction list */}
                  <details className="group">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      View {month.interactions.length} log{month.interactions.length !== 1 ? "s" : ""}
                    </summary>
                    <div className="mt-3 space-y-2">
                      {month.interactions.map(interaction => (
                        <div 
                          key={interaction.id} 
                          className={`p-3 rounded-lg border ${
                            interaction.type === "positive"
                              ? "bg-green-500/5 border-green-500/20"
                              : "bg-red-500/5 border-red-500/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium ${interaction.type === "positive" ? "text-green-400" : "text-red-400"}`}>
                                  {interaction.type === "positive" ? "+" : "−"}
                                </span>
                                <span className="text-slate-500 text-xs">{formatDate(interaction.date)} {interaction.time}</span>
                                <button
                                  onClick={() => openEditModal(interaction)}
                                  className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                                  title="Edit this log"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-slate-300 text-sm">{interaction.description}</p>
                            </div>
                            <div className="text-right text-xs space-y-1">
                              <div className="text-slate-500">
                                P: <span className={interaction.compass.power >= 0 ? "text-blue-400" : "text-yellow-400"}>
                                  {interaction.compass.power > 0 ? "+" : ""}{interaction.compass.power}
                                </span>
                              </div>
                              <div className="text-slate-500">
                                S: <span className={interaction.compass.safety >= 0 ? "text-purple-400" : "text-red-400"}>
                                  {interaction.compass.safety > 0 ? "+" : ""}{interaction.compass.safety}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Quadrant Guide */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-6">
        <h2 className="font-semibold text-slate-200 mb-4">Quadrant Guide</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <h3 className="font-medium text-green-400">↗ Secure Leadership Partnership</h3>
            <p className="text-slate-400 text-sm mt-1">
              Strong husband, strong wife. Clear roles, deep affection, spiritual unity. 
              Mutual submission under God, different roles, same worth.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <h3 className="font-medium text-yellow-400">↖ Codependent / Enmeshed</h3>
            <p className="text-slate-400 text-sm mt-1">
              "I need you to need me." High closeness but low differentiation. 
              Fear of conflict, loss of polarity, often low attraction.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <h3 className="font-medium text-red-400">↘ Authoritarian / Abusive</h3>
            <p className="text-slate-400 text-sm mt-1">
              Control, fear, compliance without intimacy. 
              Spiritual or emotional coercion. Dangerous territory.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/30">
            <h3 className="font-medium text-gray-400">↙ Detached / Avoidant</h3>
            <p className="text-slate-400 text-sm mt-1">
              Roommates. No pursuit, no polarity, no emotional risk. 
              Dead bedroom energy. Marriage is dying.
            </p>
          </div>
        </div>
      </div>

      {/* How to Log */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-6">
        <h2 className="font-semibold text-slate-200 mb-4">How to Log Interactions</h2>
        <p className="text-slate-400 text-sm mb-4">
          Tell Theo about your interactions and include the compass scores:
        </p>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
          <p className="text-slate-300">Log positive: made Jillian coffee, power 1, safety 4</p>
          <p className="text-slate-300 mt-2">Log negative: got defensive about dishes, power 2, safety -2</p>
        </div>
        <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 font-medium mb-2">Power Scale (-5 to +5)</p>
            <p className="text-slate-400">-5: Self-erasing, no boundaries</p>
            <p className="text-slate-400">0: Balanced mutual agency</p>
            <p className="text-slate-400">+1-2: Confident leadership (ideal)</p>
            <p className="text-slate-400">+5: Dominating, controlling</p>
          </div>
          <div>
            <p className="text-slate-500 font-medium mb-2">Safety Scale (-5 to +5)</p>
            <p className="text-slate-400">-5: Completely unsafe, fear</p>
            <p className="text-slate-400">0: Neutral</p>
            <p className="text-slate-400">+3-5: Secure, warm (ideal)</p>
            <p className="text-slate-400">+5: Deeply attuned, trusting</p>
          </div>
        </div>
      </div>
    </div>
  );
}
