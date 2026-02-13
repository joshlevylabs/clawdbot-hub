"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Mail, Users, Send, FileText, Loader2 } from "lucide-react";
import { Newsletter, NewsletterActivity, NewsletterStats } from "@/lib/newsletter-types";
import { StatCard } from "@/components/newsletter/StatCard";
import { NewsletterCard } from "@/components/newsletter/NewsletterCard";
import { ActivityFeed } from "@/components/newsletter/ActivityFeed";

export default function NewsletterDashboardPage() {
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
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Newsletters</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage your newsletters, subscribers, and issues
          </p>
        </div>
        <Link href="/newsletter/create">
          <button className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Create Newsletter
          </button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          <h2 className="text-lg font-medium text-slate-200 mb-4">Your Newsletters</h2>
          {newsletters.length === 0 ? (
            <div className="bg-slate-850 rounded-xl border border-slate-800 p-12 text-center">
              <Mail className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-slate-300 font-medium mb-2">No newsletters yet</h3>
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
          <h2 className="text-lg font-medium text-slate-200 mb-4">Recent Activity</h2>
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-4">
            <ActivityFeed activity={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
