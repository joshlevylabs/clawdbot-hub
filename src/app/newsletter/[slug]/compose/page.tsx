"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Send, Loader2, Users, Eye, EyeOff } from "lucide-react";
import { Newsletter } from "@/lib/newsletter-types";
import { RichTextEditor } from "@/components/newsletter/RichTextEditor";
import { IssuePreview } from "@/components/newsletter/IssuePreview";
import { SendConfirmModal } from "@/components/newsletter/SendConfirmModal";

export default function ComposeIssuePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [issueId, setIssueId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const loadNewsletter = useCallback(async () => {
    try {
      const res = await fetch(`/api/newsletters/${slug}`);
      if (!res.ok) {
        router.push("/newsletter");
        return null;
      }
      const data = await res.json();
      setNewsletter(data.newsletter);
      setSubscriberCount(data.newsletter.subscriber_count || 0);
      return data.newsletter;
    } catch {
      router.push("/newsletter");
      return null;
    }
  }, [slug, router]);

  useEffect(() => {
    async function load() {
      const nl = await loadNewsletter();
      if (!nl) return;
      setLoading(false);
    }
    load();
  }, [loadNewsletter]);

  const handleSave = async () => {
    if (!newsletter || !subject.trim()) return;
    setSaving(true);

    try {
      if (issueId) {
        // Update existing
        const res = await fetch(`/api/newsletters/${newsletter.id}/issues/${issueId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body_html: bodyHtml }),
        });
        if (res.ok) {
          setLastSaved(new Date().toLocaleTimeString());
        }
      } else {
        // Create new
        const res = await fetch(`/api/newsletters/${newsletter.id}/issues`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body_html: bodyHtml }),
        });
        const data = await res.json();
        if (res.ok) {
          setIssueId(data.issue.id);
          setLastSaved(new Date().toLocaleTimeString());
          // Update URL without navigation
          window.history.replaceState(null, "", `/newsletter/${slug}/compose/${data.issue.id}`);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!newsletter || !issueId) return;
    setSending(true);

    try {
      // Save first
      await fetch(`/api/newsletters/${newsletter.id}/issues/${issueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body_html: bodyHtml }),
      });

      // Then send
      const res = await fetch(`/api/newsletters/${newsletter.id}/issues/${issueId}/send`, {
        method: "POST",
      });

      if (res.ok) {
        setIsSent(true);
        setShowSendModal(false);
        setTimeout(() => {
          router.push(`/newsletter/${slug}`);
        }, 1500);
      }
    } finally {
      setSending(false);
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            href={`/newsletter/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {newsletter.name}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-100">
            {issueId ? "Edit Issue" : "Compose Issue"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-slate-600">Saved {lastSaved}</span>
          )}
          {isSent && (
            <span className="text-sm text-emerald-400 font-medium">✅ Sent!</span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-lg">
            <Users className="w-3.5 h-3.5" />
            {subscriberCount} recipient{subscriberCount !== 1 ? "s" : ""}
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-ghost flex items-center gap-2 text-sm"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !subject.trim() || isSent}
            className="btn btn-ghost flex items-center gap-2 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            onClick={() => {
              if (!issueId) {
                // Save first, then show modal
                handleSave().then(() => setShowSendModal(true));
              } else {
                setShowSendModal(true);
              }
            }}
            disabled={!subject.trim() || isSent}
            className="btn btn-primary flex items-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>

      {/* Subject Line */}
      <div className="mb-4">
        <label className="block text-sm text-slate-400 mb-1.5 font-medium">Subject Line</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-lg text-slate-200"
          placeholder="Your newsletter subject line"
          disabled={isSent}
        />
      </div>

      {/* Editor / Preview */}
      <div className={showPreview ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5 font-medium">Content</label>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
        </div>

        {showPreview && (
          <div>
            <label className="block text-sm text-slate-400 mb-1.5 font-medium">Preview</label>
            <IssuePreview
              subject={subject}
              bodyHtml={bodyHtml}
              senderName={newsletter.sender_name}
            />
          </div>
        )}
      </div>

      {/* Send Confirm Modal */}
      {showSendModal && issueId && (
        <SendConfirmModal
          subject={subject}
          recipientCount={subscriberCount}
          sending={sending}
          onConfirm={handleSend}
          onCancel={() => setShowSendModal(false)}
        />
      )}
    </div>
  );
}
