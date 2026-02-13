"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Eye,
  CheckCircle2,
  Settings2,
  Sparkles,
  Send,
} from "lucide-react";
import { Newsletter } from "@/lib/newsletter-types";
import { PreviewBlock } from "@/components/newsletter/PreviewBlock";

interface PreviewBlockData {
  id: string;
  source_key: string;
  label: string;
  params: Record<string, unknown>;
  data: Record<string, unknown>;
}

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [previewBlocks, setPreviewBlocks] = useState<PreviewBlockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [finalizedIssueId, setFinalizedIssueId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const loadNewsletter = useCallback(async () => {
    try {
      const res = await fetch(`/api/newsletters/${slug}`);
      if (!res.ok) {
        router.push("/newsletter");
        return null;
      }
      const data = await res.json();
      setNewsletter(data.newsletter);
      return data.newsletter;
    } catch {
      router.push("/newsletter");
      return null;
    }
  }, [slug, router]);

  const loadPreview = useCallback(async (newsletterId: string) => {
    const res = await fetch(`/api/newsletters/${newsletterId}/preview`);
    const data = await res.json();
    setPreviewBlocks(data.preview || []);
    setGeneratedAt(data.generated_at || null);
  }, []);

  useEffect(() => {
    async function load() {
      const nl = await loadNewsletter();
      if (nl) await loadPreview(nl.id);
      setLoading(false);
    }
    load();
  }, [loadNewsletter, loadPreview]);

  const handleRefresh = async () => {
    if (!newsletter) return;
    setRefreshing(true);
    await loadPreview(newsletter.id);
    setRefreshing(false);
  };

  const handleFinalize = async () => {
    if (!newsletter) return;
    setFinalizing(true);
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}/finalize`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setFinalized(true);
        setFinalizedIssueId(data.issue.id);
      }
    } finally {
      setFinalizing(false);
    }
  };

  const handleGenerate = async () => {
    if (!newsletter || !finalizedIssueId) return;
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/newsletters/${newsletter.id}/issues/${finalizedIssueId}/generate`,
        { method: "POST" }
      );
      if (res.ok) {
        setGenerated(true);
      }
    } finally {
      setGenerating(false);
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
    <div className="max-w-3xl">
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
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary-400" />
            Content Preview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Preview the next issue of {newsletter.name} with live data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/newsletter/${slug}/content`}
            className="btn btn-ghost flex items-center gap-2 text-sm"
          >
            <Settings2 className="w-4 h-4" />
            Configure
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-ghost flex items-center gap-2 text-sm"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Preview Blocks */}
      {previewBlocks.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-slate-700/50">
          <Eye className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h2 className="text-lg text-slate-400 mb-1">No content to preview</h2>
          <p className="text-sm text-slate-600 mb-4">
            Configure content sources first, then come back to preview.
          </p>
          <Link
            href={`/newsletter/${slug}/content`}
            className="btn btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Settings2 className="w-4 h-4" />
            Configure Sources
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {previewBlocks.map((block) => (
              <PreviewBlock
                key={block.id}
                label={block.label}
                sourceKey={block.source_key}
                data={block.data as Record<string, unknown>}
              />
            ))}
          </div>

          {generatedAt && (
            <div className="text-xs text-slate-600 mb-4">
              Data pulled at {new Date(generatedAt).toLocaleString()}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
            {!finalized ? (
              <>
                <p className="text-sm text-slate-400">
                  Happy with the content above? Finalize it to create a draft issue, then send to Theo for HTML generation.
                </p>
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="btn btn-primary flex items-center justify-center gap-2 text-sm py-2.5 w-full sm:w-auto"
                >
                  {finalizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Finalize Content
                </button>
              </>
            ) : !generated ? (
              <>
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Content finalized! Draft issue created.
                </div>
                <p className="text-sm text-slate-400">
                  Send to Theo to generate a beautiful HTML newsletter from this data.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="btn btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Send to Theo
                  </button>
                  <Link
                    href={`/newsletter/${slug}/compose/${finalizedIssueId}`}
                    className="btn btn-ghost flex items-center gap-2 text-sm"
                  >
                    <Send className="w-4 h-4" />
                    Go to Compose
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <Sparkles className="w-4 h-4" />
                  Sent to Theo! The HTML newsletter will be generated shortly.
                </div>
                <p className="text-sm text-slate-400">
                  Check the compose page to see and review the generated content.
                </p>
                <Link
                  href={`/newsletter/${slug}/compose/${finalizedIssueId}`}
                  className="btn btn-primary inline-flex items-center gap-2 text-sm py-2.5 w-full sm:w-auto justify-center"
                >
                  <Send className="w-4 h-4" />
                  Go to Compose
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
