"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Mic,
  Play,
  Pause,
  Edit3,
  ExternalLink,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Save,
  X,
  Monitor,
  FlipHorizontal,
  FlipVertical,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Settings2,
  Volume2,
  SkipBack,
  SkipForward,
  Headphones,
  Send,
  Loader2,
  Sparkles,
  Download,
  Copy,
  Check,
  MessageSquare,
  Wand2,
  Mail,
  Users,
  FileText,
  TrendingUp,
  Globe,
  Edit,
} from "lucide-react";
// Show types (embedded — no API dependency)
interface ShowEpisode {
  number: number;
  title: string;
  pillar: string;
  status: string;
  finalized?: string;
  description?: string;
  scriptId?: string;
  links?: { youtube?: string; spotify?: string; apple?: string; medium?: string; beehiiv?: string };
}
interface Show {
  id: string;
  name: string;
  description: string;
  frequency: string;
  coverArt: string | null;
  platforms: string[];
  createdAt: string;
  episodes: ShowEpisode[];
}
import { Newsletter, NewsletterActivity, NewsletterStats } from "@/lib/newsletter-types";
import { StatCard } from "@/components/newsletter/StatCard";
import { NewsletterCard } from "@/components/newsletter/NewsletterCard";
import { ActivityFeed } from "@/components/newsletter/ActivityFeed";

// Types (keeping all the existing types from both pages)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventMap {
  result: SpeechRecognitionEvent;
  error: SpeechRecognitionErrorEvent;
  end: Event;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface EpisodeLinks {
  youtube?: string;
  spotify?: string;
  apple?: string;
  linkedin?: string;
  tiktok?: string;
  medium?: string;
  beehiiv?: string;
}

interface Episode {
  number: number;
  title: string;
  pillar: string;
  filename: string;
  created: string;
  finalized?: string;
  status: string;
  links?: EpisodeLinks;
}

interface PodcastIndex {
  episodes: Episode[];
  lastEpisodeNumber: number;
  pillarCounts: Record<string, number>;
  lastUpdated: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface PlatformMetrics {
  platform: string;
  followers?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  subscribers?: number;
  openRate?: number;
  clickRate?: number;
  posts?: number;
  lastUpdated: string;
  error?: string;
}

interface VideoMetric {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  thumbnail?: string;
}

interface AnalyticsData {
  youtube?: { channel: PlatformMetrics; videos: VideoMetric[] };
  beehiiv?: PlatformMetrics;
  manual?: PlatformMetrics[];
}

interface SocialPlatform {
  name: string;
  platform: string;
  url: string;
  followers: number;
  views: number;
  engagement: number;
  lastUpdated: string;
}

const TABS = [
  { id: 'podcast', label: 'Podcast', icon: Mic },
  { id: 'newsletter', label: 'Newsletter', icon: Mail },
  { id: 'social', label: 'Social Media', icon: TrendingUp },
] as const;

type TabId = typeof TABS[number]['id'];

const PLATFORM_LINKS = [
  { name: "YouTube", url: "https://www.youtube.com/@joshualevy6759", icon: "▶️" },
  { name: "LinkedIn", url: "https://www.linkedin.com/in/joshuasethlevy/", icon: "💼" },
  { name: "TikTok", url: "https://www.tiktok.com/@joshlevylabs", icon: "🎵" },
  { name: "Medium", url: "https://medium.com/@joshualevy_38678", icon: "✍️" },
  { name: "Beehiiv Newsletter", url: "https://the-builders-frequency.beehiiv.com/", icon: "📧" },
  { name: "Spotify Podcasters", url: "https://podcasters.spotify.com/", icon: "🎧" },
  { name: "Opus Pro", url: "https://app.opus.pro/", icon: "✂️" },
  { name: "Riverside.fm", url: "https://riverside.fm/", icon: "🎬" },
];

// WPS speed utilities
const MIN_WPS = 0.5;
const MAX_WPS = 12;
const sliderToWps = (slider: number): number => {
  const normalized = slider / 100;
  return MIN_WPS * Math.pow(MAX_WPS / MIN_WPS, normalized);
};
const wpsToSlider = (wps: number): number => {
  return 100 * Math.log(wps / MIN_WPS) / Math.log(MAX_WPS / MIN_WPS);
};

// Default social platforms with real data
const DEFAULT_SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    name: "YouTube",
    platform: "youtube",
    url: "https://www.youtube.com/@joshualevy6759",
    followers: 28,
    views: 9530,
    engagement: 3.2,
    lastUpdated: "2026-03-03",
  },
  {
    name: "Spotify",
    platform: "spotify",
    url: "https://open.spotify.com/show/5z2QfKh7MUhf8d6NDxFKTn",
    followers: 0,
    views: 0,
    engagement: 0,
    lastUpdated: "2026-03-03",
  },
  {
    name: "Apple Podcasts",
    platform: "apple",
    url: "https://podcasts.apple.com/us/podcast/the-builders-frequency/id1874100721",
    followers: 0,
    views: 0,
    engagement: 0,
    lastUpdated: "2026-03-03",
  },
  {
    name: "LinkedIn",
    platform: "linkedin",
    url: "https://www.linkedin.com/in/joshuasethlevy/",
    followers: 0,
    views: 0,
    engagement: 0,
    lastUpdated: "2026-03-03",
  },
  {
    name: "TikTok",
    platform: "tiktok",
    url: "https://www.tiktok.com/@joshlevylabs",
    followers: 0,
    views: 0,
    engagement: 0,
    lastUpdated: "2026-03-03",
  },
  {
    name: "Medium",
    platform: "medium",
    url: "https://medium.com/@joshualevy_38678",
    followers: 0,
    views: 0,
    engagement: 0,
    lastUpdated: "2026-03-03",
  },
  {
    name: "Beehiiv",
    platform: "beehiiv",
    url: "https://the-builders-frequency.beehiiv.com/",
    followers: 0,
    views: 0,
    engagement: 0,
    lastUpdated: "2026-03-03",
  },
  {
    name: "Twitter/X",
    platform: "twitter",
    url: "https://twitter.com/joshualevy",
    followers: 0,
    views: 0,
    engagement: 0,
    lastUpdated: "2026-03-03",
  },
];

// Social Media Platform Component
function SocialMediaDashboard() {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(() => {
    // Try localStorage first, fall back to defaults
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('social-metrics');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return DEFAULT_SOCIAL_PLATFORMS;
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<SocialPlatform>>({});

  const handleEdit = (platform: SocialPlatform) => {
    setEditing(platform.platform);
    setEditValues({
      followers: platform.followers,
      views: platform.views,
      engagement: platform.engagement,
    });
  };

  const handleSave = (platformId: string) => {
    const updated = platforms.map(p => 
      p.platform === platformId 
        ? { ...p, ...editValues, lastUpdated: new Date().toISOString().split('T')[0] }
        : p
    );
    setPlatforms(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('social-metrics', JSON.stringify(updated));
    }
    setEditing(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditing(null);
    setEditValues({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary-500" />
            Social Media Dashboard
          </h2>
          <p className="text-slate-500 mt-1">Track your social media presence and growth</p>
        </div>
      </div>

      {/* Platform Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map((platform) => (
          <div
            key={platform.platform}
            className="bg-slate-850 rounded-xl border border-slate-800 p-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-200">{platform.name}</h3>
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-primary-400 transition-colors"
                  >
                    View Profile
                  </a>
                </div>
              </div>
              {editing === platform.platform ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSave(platform.platform)}
                    className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleEdit(platform)}
                  className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Followers</span>
                {editing === platform.platform ? (
                  <input
                    type="number"
                    value={editValues.followers || 0}
                    onChange={(e) => setEditValues(prev => ({ ...prev, followers: parseInt(e.target.value) || 0 }))}
                    className="w-20 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-slate-200"
                  />
                ) : (
                  <span className="font-medium text-slate-200">
                    {platform.followers.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total Views</span>
                {editing === platform.platform ? (
                  <input
                    type="number"
                    value={editValues.views || 0}
                    onChange={(e) => setEditValues(prev => ({ ...prev, views: parseInt(e.target.value) || 0 }))}
                    className="w-20 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-slate-200"
                  />
                ) : (
                  <span className="font-medium text-slate-200">
                    {platform.views.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Engagement %</span>
                {editing === platform.platform ? (
                  <input
                    type="number"
                    step="0.1"
                    value={editValues.engagement || 0}
                    onChange={(e) => setEditValues(prev => ({ ...prev, engagement: parseFloat(e.target.value) || 0 }))}
                    className="w-20 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-slate-200"
                  />
                ) : (
                  <span className="font-medium text-slate-200">
                    {platform.engagement.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-500">
                Last updated: {new Date(platform.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Growth Chart Placeholder */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-6">
        <h3 className="font-medium text-slate-200 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          Growth Overview
        </h3>
        <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-lg">
          <div className="text-center">
            <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">Growth chart coming soon</p>
            <p className="text-xs text-slate-600 mt-1">Auto-fetch and visualization in development</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Newsletter Dashboard Component
function NewsletterDashboard() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [activity, setActivity] = useState<NewsletterActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [nlRes, statsRes, actRes] = await Promise.all([
          fetch("/api/newsletters"),
          fetch("/api/newsletters/stats"),
          fetch("/api/newsletters/activity?limit=10"),
        ]);
        const nlData = await nlRes.json();
        const statsData = await statsRes.json();
        const actData = await actRes.json();

        setNewsletters(nlData.newsletters || []);
        setStats(statsData);
        setActivity(actData.activity || []);
      } catch (err) {
        console.error("Failed to load newsletter data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-3">
            <Mail className="w-6 h-6 text-primary-500" />
            Newsletter Dashboard
          </h2>
          <p className="text-slate-500 mt-1">
            Manage your newsletters, subscribers, and issues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/newsletter/contacts">
            <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
              <Users className="w-4 h-4" strokeWidth={1.5} />
              Contacts
            </button>
          </Link>
          <Link href="/newsletter/create">
            <button className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Create Newsletter
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Subscribers"
          value={stats?.total_subscribers || 0}
          icon={Users}
          color="text-emerald-400"
        />
        <StatCard
          label="Newsletters"
          value={stats?.total_newsletters || 0}
          icon={Mail}
          color="text-primary-400"
        />
        <StatCard
          label="Issues Sent"
          value={stats?.total_issues_sent || 0}
          icon={Send}
          color="text-blue-400"
        />
        <StatCard
          label="Open Rate"
          value="—"
          icon={FileText}
          color="text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Newsletter Grid */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-medium text-slate-200 mb-4">Your Newsletters</h3>
          {newsletters.length === 0 ? (
            <div className="bg-slate-850 rounded-xl border border-slate-800 p-12 text-center">
              <Mail className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h4 className="text-slate-300 font-medium mb-2">No newsletters yet</h4>
              <p className="text-slate-500 text-sm mb-4">
                Create your first newsletter to get started
              </p>
              <Link href="/newsletter/create">
                <button className="btn btn-primary text-sm">
                  Create Newsletter
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsletters.map((nl) => (
                <NewsletterCard key={nl.id} newsletter={nl} />
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div>
          <h3 className="text-lg font-medium text-slate-200 mb-4">Recent Activity</h3>
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-4">
            <ActivityFeed activity={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Default show data (embedded — no filesystem dependency)
const DEFAULT_SHOWS: Show[] = [
  {
    id: "builders-frequency",
    name: "The Builder's Frequency",
    description: "Insights for builders creating while employed",
    frequency: "weekly",
    coverArt: null,
    platforms: ["youtube", "spotify", "apple"],
    createdAt: "2026-02-15",
    episodes: [
      {
        number: 1,
        title: "Why I Started The Builder's Frequency",
        pillar: "all",
        status: "published",
        finalized: "2026-01-30",
        description: "The origin story — why I'm building a podcast about creating while employed.",
        links: { youtube: "https://www.youtube.com/watch?v=6m9cHX1riqE" },
      },
      {
        number: 2,
        title: "The Invisible Entrepreneur",
        pillar: "side-business",
        status: "published",
        finalized: "2026-02-06",
        description: "Building in the margins — the stealth entrepreneur's playbook.",
        links: {
          youtube: "https://youtu.be/drK1_xyZ7Yk",
          spotify: "https://open.spotify.com/episode/4u6SCrXUmvc3WNYi1jpBTq",
          apple: "https://podcasts.apple.com/us/podcast/invisible-entrepreneurs-and-building-in-the-margins/id1874100721?i=1000748578221",
        },
      },
      {
        number: 3,
        title: "I Built an AI Trading Desk (And You Can Too)",
        pillar: "ai",
        status: "published",
        finalized: "2026-02-15",
        description: "How I built an automated AI trading desk with agents, and you can too.",
        links: { youtube: "https://youtube.com/watch?v=ayxpkLdnztc" },
      },
      {
        number: 4,
        title: "Eight Employees, Zero Paychecks — Inside the AI Operation That Runs Itself",
        pillar: "ai",
        status: "published",
        finalized: "2026-02-22",
        description: "I have eight AI employees who never sleep, never complain, and cost me about forty dollars a month.",
        links: {
          youtube: "https://youtube.com/watch?v=WBnVSjGa4kM",
          spotify: "https://open.spotify.com/episode/4pad7gR7OIzJqtq7f6xMXg",
        },
      },
      {
        number: 5,
        title: "Three Signal Flows, Six Agents, One Trading Desk — How the MRE Actually Makes Decisions",
        pillar: "ai",
        status: "script-ready",
        description: "Deep dive into the MRE's signal flow architecture: three independent signal flows (Buy Scanner, Sell Signal Generator, Agent Decision Layer) feeding a dynamic daily signal map, with six AI agents modeled after legendary traders.",
        scriptId: "005",
        links: {},
      },
    ],
  },
];

// Simplified Podcast Dashboard (main functionality moved to separate components)
function PodcastDashboard() {
  const [shows, setShows] = useState<Show[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('podcast-shows');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return DEFAULT_SHOWS;
  });
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedScript, setExpandedScript] = useState<number | null>(null);
  const [scriptContent, setScriptContent] = useState<string | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);

  useEffect(() => {
    if (shows.length > 0 && !selectedShow) {
      setSelectedShow(shows[0]);
    }
  }, [shows, selectedShow]);

  const createShow = (showData: Partial<Show>) => {
    const newShow: Show = {
      id: showData.name?.toLowerCase().replace(/\s+/g, '-') || `show-${Date.now()}`,
      name: showData.name || 'Untitled Show',
      description: showData.description || '',
      frequency: showData.frequency || 'weekly',
      coverArt: null,
      platforms: showData.platforms || [],
      createdAt: new Date().toISOString().split('T')[0],
      episodes: [],
    };
    const updated = [...shows, newShow];
    setShows(updated);
    setSelectedShow(newShow);
    setShowCreateModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('podcast-shows', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Show Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-3">
            <Mic className="w-6 h-6 text-primary-500" />
            Podcast Dashboard
          </h2>
          <p className="text-slate-500 mt-1">Manage your podcast shows and episodes</p>
        </div>
      </div>

      {/* Show Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-300">Show:</label>
          <select
            value={selectedShow?.id || ''}
            onChange={(e) => {
              const show = shows.find(s => s.id === e.target.value);
              setSelectedShow(show || null);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {shows.map((show) => (
              <option key={show.id} value={show.id}>
                {show.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Show
        </button>
      </div>

      {/* Selected Show Info */}
      {selectedShow && (
        <div className="bg-slate-850 rounded-xl border border-slate-800 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">{selectedShow.name}</h3>
              <p className="text-slate-400 mt-1">{selectedShow.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                <span>Frequency: {selectedShow.frequency}</span>
                <span>Platforms: {selectedShow.platforms.join(', ')}</span>
                <span>Created: {selectedShow.createdAt}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episodes List */}
      {selectedShow && selectedShow.episodes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">
              Episodes ({selectedShow.episodes.length})
            </h3>
          </div>
          {[...selectedShow.episodes].reverse().map((ep) => (
            <div
              key={ep.number}
              className="bg-slate-850 rounded-xl border border-slate-800 p-5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded">
                      EP {ep.number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      ep.status === 'published'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : ep.status === 'finalized'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {ep.status}
                    </span>
                    <span className="text-xs text-slate-600 capitalize">{ep.pillar}</span>
                  </div>
                  <h4 className="text-slate-100 font-medium">{ep.title}</h4>
                  {ep.description && (
                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">{ep.description}</p>
                  )}
                  {ep.finalized && (
                    <p className="text-slate-600 text-xs mt-2">{ep.finalized}</p>
                  )}
                </div>
                {/* Platform links + Script button */}
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {ep.scriptId && (
                    <button
                      onClick={async () => {
                        if (expandedScript === ep.number) {
                          setExpandedScript(null);
                          setScriptContent(null);
                          return;
                        }
                        setExpandedScript(ep.number);
                        setScriptLoading(true);
                        try {
                          const res = await fetch(`/api/marketing/scripts/${ep.scriptId}`);
                          const data = await res.json();
                          setScriptContent(data.script || 'Script not found');
                        } catch {
                          setScriptContent('Failed to load script');
                        }
                        setScriptLoading(false);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        expandedScript === ep.number
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      }`}
                      title={expandedScript === ep.number ? 'Hide Script' : 'View Script'}
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  {ep.links?.youtube && (
                    <a href={ep.links.youtube} target="_blank" rel="noopener noreferrer"
                      className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="YouTube">
                      <Play className="w-4 h-4" />
                    </a>
                  )}
                  {ep.links?.spotify && (
                    <a href={ep.links.spotify} target="_blank" rel="noopener noreferrer"
                      className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                      title="Spotify">
                      <Headphones className="w-4 h-4" />
                    </a>
                  )}
                  {ep.links?.apple && (
                    <a href={ep.links.apple} target="_blank" rel="noopener noreferrer"
                      className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                      title="Apple Podcasts">
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              {/* Expanded Script Viewer */}
              {expandedScript === ep.number && (
                <div className="mt-4 border-t border-slate-800 pt-4">
                  {scriptLoading ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading script...
                    </div>
                  ) : scriptContent ? (
                    <div className="bg-slate-900/50 rounded-lg p-5 max-h-[70vh] overflow-y-auto">
                      <div className="prose prose-invert prose-sm max-w-none
                        prose-headings:text-slate-200 prose-headings:font-semibold
                        prose-h1:text-xl prose-h1:border-b prose-h1:border-slate-800 prose-h1:pb-3 prose-h1:mb-4
                        prose-h2:text-lg prose-h2:text-primary-400 prose-h2:mt-6
                        prose-h3:text-base prose-h3:text-amber-400
                        prose-p:text-slate-400 prose-p:leading-relaxed
                        prose-blockquote:border-l-primary-500 prose-blockquote:text-slate-300 prose-blockquote:bg-slate-800/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                        prose-strong:text-slate-200
                        prose-em:text-slate-400
                        prose-hr:border-slate-800
                        prose-li:text-slate-400
                      ">
                        {scriptContent.split('\n').map((line, i) => {
                          if (line.startsWith('# ')) return <h1 key={i}>{line.slice(2)}</h1>;
                          if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
                          if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
                          if (line.startsWith('> ')) return <blockquote key={i}><p>{line.slice(2)}</p></blockquote>;
                          if (line.startsWith('---')) return <hr key={i} />;
                          if (line.startsWith('**') && line.endsWith('**')) return <p key={i}><strong>{line.slice(2, -2)}</strong></p>;
                          if (line.trim() === '') return <br key={i} />;
                          // Handle inline formatting
                          const formatted = line
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.+?)\*/g, '<em>$1</em>');
                          return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Podcast Tools Notice */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center gap-4">
          <Mic className="w-8 h-8 text-slate-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-slate-300 font-medium text-sm">Podcast Tools</h3>
            <p className="text-slate-500 text-xs">
              Teleprompter, speech recognition, episode management, and analytics.
            </p>
          </div>
          <Link href="/podcast">
            <button className="btn btn-primary text-xs px-3 py-1.5 whitespace-nowrap">
              Full Dashboard →
            </button>
          </Link>
        </div>
      </div>

      {/* Create Show Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Create New Show</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                createShow({
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  frequency: formData.get('frequency') as string,
                  platforms: (formData.get('platforms') as string).split(',').map(p => p.trim()),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Show Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Weekly MRE Updates"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Brief description of the show..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Frequency</label>
                <select
                  name="frequency"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Platforms (comma-separated)</label>
                <input
                  name="platforms"
                  type="text"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="youtube, spotify, apple"
                  defaultValue="youtube, spotify, apple"
                />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                >
                  Create Show
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Marketing Page Component
export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('podcast');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Marketing Hub</h1>
          <p className="text-slate-500 mt-1">Unified dashboard for podcast, newsletter, and social media</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-800">
        <nav className="flex space-x-8">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'podcast' && <PodcastDashboard />}
        {activeTab === 'newsletter' && <NewsletterDashboard />}
        {activeTab === 'social' && <SocialMediaDashboard />}
      </div>
    </div>
  );
}