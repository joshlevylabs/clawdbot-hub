"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Upload,
  Loader2,
  FileText,
  Users,
  Pause,
  Play,
  Trash2,
  Settings2,
  Eye,
} from "lucide-react";
import { Newsletter, NewsletterIssue, NewsletterSubscriber } from "@/lib/newsletter-types";
import { StatusBadge } from "@/components/newsletter/StatusBadge";
import { CadenceBadge } from "@/components/newsletter/CadenceBadge";
import { IssueRow } from "@/components/newsletter/IssueRow";
import { SubscriberTable } from "@/components/newsletter/SubscriberTable";
import { ImportModal } from "@/components/newsletter/ImportModal";

type Tab = "issues" | "subscribers";

export default function NewsletterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [issues, setIssues] = useState<NewsletterIssue[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [tab, setTab] = useState<Tab>("issues");
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadNewsletter = useCallback(async () => {
    try {
      const res = await fetch(`/api/newsletters/${slug}`);
      if (!res.ok) {
        router.push("/newsletter");
        return;
      }
      const data = await res.json();
      setNewsletter(data.newsletter);
      return data.newsletter;
    } catch {
      router.push("/newsletter");
    }
  }, [slug, router]);

  const loadIssues = useCallback(async (id: string) => {
    const res = await fetch(`/api/newsletters/${id}/issues`);
    const data = await res.json();
    setIssues(data.issues || []);
  }, []);

  const loadSubscribers = useCallback(async (id: string) => {
    const res = await fetch(`/api/newsletters/${id}/subscribers`);
    const data = await res.json();
    setSubscribers(data.subscribers || []);
  }, []);

  useEffect(() => {
    async function load() {
      const nl = await loadNewsletter();
      if (nl) {
        await Promise.all([loadIssues(nl.id), loadSubscribers(nl.id)]);
      }
      setLoading(false);
    }
    load();
  }, [loadNewsletter, loadIssues, loadSubscribers]);

  const handleToggleStatus = async () => {
    if (!newsletter) return;
    setToggling(true);
    const newStatus = newsletter.status === "active" ? "paused" : "active";
    await fetch(`/api/newsletters/${newsletter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setNewsletter({ ...newsletter, status: newStatus });
    setToggling(false);
  };

  const handleDelete = async () => {
    if (!newsletter) return;
    if (!confirm(`Delete "${newsletter.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/newsletters/${newsletter.id}`, { method: "DELETE" });
    router.push("/newsletter");
  };

  const handleRefreshSubscribers = () => {
    if (newsletter) loadSubscribers(newsletter.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!newsletter) return null;

  return (
    <div className="max-w-5xl">
      {/* Back Link */}
      <Link
        href="/newsletter"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Newsletters
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-slate-100">{newsletter.name}</h1>
            <StatusBadge status={newsletter.status} />
          </div>
          {newsletter.description && (
            <p className="text-slate-500 text-sm">{newsletter.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <CadenceBadge cadence={newsletter.cadence} />
            {newsletter.category && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600">
                {newsletter.category}
              </span>
            )}
            <span className="text-xs text-slate-600">
              {newsletter.subscriber_count || 0} subscribers
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/newsletter/${slug}/content`}>
            <button className="btn btn-ghost flex items-center gap-2 text-sm">
              <Settings2 className="w-4 h-4" />
              Content
            </button>
          </Link>
          <Link href={`/newsletter/${slug}/preview`}>
            <button className="btn btn-ghost flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </Link>
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            className="btn btn-ghost flex items-center gap-2 text-sm"
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : newsletter.status === "active" ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {newsletter.status === "active" ? "Pause" : "Activate"}
          </button>
          <Link href={`/newsletter/${slug}/edit`}>
            <button className="btn btn-ghost flex items-center gap-2 text-sm">
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-ghost text-red-400 hover:text-red-300 flex items-center gap-2 text-sm"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 mb-6">
        <button
          onClick={() => setTab("issues")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "issues"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <FileText className="w-4 h-4" />
          Issues ({issues.length})
        </button>
        <button
          onClick={() => setTab("subscribers")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "subscribers"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <Users className="w-4 h-4" />
          Subscribers ({subscribers.filter((s) => s.status === "active").length})
        </button>
      </div>

      {/* Tab Content */}
      {tab === "issues" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-slate-200">Issues</h2>
            <Link href={`/newsletter/${slug}/compose`}>
              <button className="btn btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Compose Issue
              </button>
            </Link>
          </div>

          {issues.length === 0 ? (
            <div className="bg-slate-850 rounded-xl border border-slate-800 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-slate-300 font-medium mb-2">No issues yet</h3>
              <p className="text-slate-500 text-sm mb-4">
                Compose your first newsletter issue
              </p>
              <Link href={`/newsletter/${slug}/compose`}>
                <button className="btn btn-primary text-sm">Compose Issue</button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} slug={slug} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "subscribers" && (
        <div>
          <div className="flex items-center justify-end mb-4 gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="btn btn-ghost flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" strokeWidth={1.5} />
              Import
            </button>
          </div>

          <SubscriberTable
            subscribers={subscribers}
            newsletterId={newsletter.id}
            onRefresh={handleRefreshSubscribers}
          />
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          newsletterId={newsletter.id}
          onClose={() => setShowImport(false)}
          onComplete={handleRefreshSubscribers}
        />
      )}
    </div>
  );
}
