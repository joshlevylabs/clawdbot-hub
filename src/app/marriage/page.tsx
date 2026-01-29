"use client";

import { useState, useEffect } from "react";
import { Heart, TrendingUp, TrendingDown, Target, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";

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

export default function MarriagePage() {
  const [compassState, setCompassState] = useState<CompassState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompass = async () => {
    setLoading(true);
    try {
      const response = await fetch("/data/compass-state.json");
      if (response.ok) {
        const data = await response.json();
        setCompassState(data);
      }
    } catch (err) {
      console.error("Failed to load compass state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompass();
  }, []);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <Heart className="w-6 h-6 text-rose-500" strokeWidth={1.5} />
            Marriage Compass
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Track your relationship health over time</p>
        </div>
        <button
          onClick={fetchCompass}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          Refresh
        </button>
      </div>

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
      <div className="grid gap-4 md:grid-cols-3">
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

        {/* Trend */}
        <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
            </div>
            <h2 className="font-semibold text-slate-200">7-Day Trend</h2>
          </div>
          {compassState?.trend && (compassState.trend.power !== 0 || compassState.trend.safety !== 0) ? (
            <div className="space-y-2">
              {compassState.trend.power !== 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Power:</span>
                  <span className={compassState.trend.power > 0 ? "text-green-400" : "text-yellow-400"}>
                    {compassState.trend.power > 0 ? "+" : ""}{compassState.trend.power.toFixed(1)}
                  </span>
                  {compassState.trend.power > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
              )}
              {compassState.trend.safety !== 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Safety:</span>
                  <span className={compassState.trend.safety > 0 ? "text-green-400" : "text-red-400"}>
                    {compassState.trend.safety > 0 ? "+" : ""}{compassState.trend.safety.toFixed(1)}
                  </span>
                  {compassState.trend.safety > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Need more data to show trends.</p>
          )}
          <p className="text-slate-600 text-xs mt-3">
            Based on {compassState?.totalCount || 0} total interactions
          </p>
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
