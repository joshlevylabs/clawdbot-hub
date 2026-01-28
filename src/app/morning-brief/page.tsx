"use client";

import { useState, useEffect } from "react";
import { Sun, Cloud, Calendar, Mail, Newspaper, Cpu, RefreshCw, Clock } from "lucide-react";

interface BriefSection {
  title: string;
  icon: React.ReactNode;
  content: string[];
}

export default function MorningBriefPage() {
  const [lastBrief, setLastBrief] = useState<string | null>(null);
  const [sections, setSections] = useState<BriefSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefTime, setBriefTime] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading the last morning brief
    // In production, this would fetch from a storage/API
    setLoading(true);
    
    // Demo data - would be replaced with actual brief content
    setTimeout(() => {
      setBriefTime("Today at 6:00 AM");
      setSections([
        {
          title: "Weather",
          icon: <Cloud className="w-5 h-5" />,
          content: [
            "☀️ Sunny, 72°F high / 58°F low",
            "🌤️ Clear skies all day",
            "💨 Light breeze 5-10 mph",
          ],
        },
        {
          title: "Calendar",
          icon: <Calendar className="w-5 h-5" />,
          content: [
            "9:00 AM - Team standup",
            "2:00 PM - Client call with Klippel",
            "5:30 PM - Pick up Jones from soccer",
          ],
        },
        {
          title: "Email Highlights",
          icon: <Mail className="w-5 h-5" />,
          content: [
            "📥 3 emails need attention",
            "• Invoice #347 approved by client",
            "• Sonance: Firmware review scheduled",
            "• The Lyceum: Beta tester feedback",
          ],
        },
        {
          title: "World News",
          icon: <Newspaper className="w-5 h-5" />,
          content: [
            "🇺🇸 Congress passes infrastructure bill",
            "🇮🇱 Israel-UAE trade agreement expands",
            "📈 Markets open higher on tech earnings",
          ],
        },
        {
          title: "AI Intelligence",
          icon: <Cpu className="w-5 h-5" />,
          content: [
            "🤖 OpenAI releases Prism - new multimodal model",
            "💡 Karpathy shares Claude coding tips",
            "🚀 Google's AI Plus now $7.99/month",
            "⚡ New: AI2 Open Coding Agents framework",
          ],
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const triggerNewBrief = async () => {
    setLoading(true);
    // In production, this would trigger the actual morning brief cron job
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setBriefTime(`Today at ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
    setLoading(false);
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
          {briefTime && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              {briefTime}
            </div>
          )}
          <button
            onClick={triggerNewBrief}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            Generate New Brief
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

      {/* Brief Content */}
      {loading ? (
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section, index) => (
            <div
              key={index}
              className={`bg-dark-800 rounded-xl border border-dark-600 p-6 ${
                index === 4 ? "md:col-span-2" : ""
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent-purple/20 rounded-lg text-accent-purple">
                  {section.icon}
                </div>
                <h2 className="font-semibold text-lg">{section.title}</h2>
              </div>
              <ul className="space-y-2">
                {section.content.map((item, i) => (
                  <li key={i} className="text-gray-300 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
