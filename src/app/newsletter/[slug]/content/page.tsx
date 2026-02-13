"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2, Settings2, Eye } from "lucide-react";
import { Newsletter, ContentConfig } from "@/lib/newsletter-types";
import { ContentBlockCard } from "@/components/newsletter/ContentBlockCard";
import { ContentSourcePicker } from "@/components/newsletter/ContentSourcePicker";

// Source definitions (client-side copy for the picker UI)
// Source registry is fetched from the API to stay in sync with newsletter-sources.ts

export default function ContentConfigPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [blocks, setBlocks] = useState<ContentConfig[]>([]);
  const [contentSources, setContentSources] = useState<Array<{key:string;label:string;description:string;category:string;availableParams:Array<{key:string;label:string;type:string;options?:Array<{value:string;label:string}>;default?:string|number}>}>>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

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

  const loadBlocks = useCallback(async (newsletterId: string) => {
    const res = await fetch(`/api/newsletters/${newsletterId}/content-config`);
    const data = await res.json();
    setBlocks(data.blocks || []);
  }, []);

  useEffect(() => {
    async function load() {
      const [nl, sourcesRes] = await Promise.all([
        loadNewsletter(),
        fetch('/api/newsletters/sources').then(r => r.json()).catch(() => ({ sources: [] })),
      ]);
      setContentSources(sourcesRes.sources || []);
      if (nl) await loadBlocks(nl.id);
      setLoading(false);
    }
    load();
  }, [loadNewsletter, loadBlocks]);

  const handleAdd = async (sourceKey: string, label: string, blockParams: Record<string, unknown>) => {
    if (!newsletter) return;
    const res = await fetch(`/api/newsletters/${newsletter.id}/content-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_key: sourceKey, label, params: blockParams }),
    });
    if (res.ok) {
      await loadBlocks(newsletter.id);
    }
  };

  const handleToggle = async (blockId: string, enabled: boolean) => {
    if (!newsletter) return;
    await fetch(`/api/newsletters/${newsletter.id}/content-config/${blockId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, enabled } : b))
    );
  };

  const handleDelete = async (blockId: string) => {
    if (!newsletter) return;
    await fetch(`/api/newsletters/${newsletter.id}/content-config/${blockId}`, {
      method: "DELETE",
    });
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleMove = async (blockId: string, direction: "up" | "down") => {
    if (!newsletter) return;
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    const newOrder = [...blocks];
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    setBlocks(newOrder);

    await fetch(`/api/newsletters/${newsletter.id}/content-config/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: newOrder.map((b) => b.id) }),
    });
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
            <Settings2 className="w-6 h-6 text-primary-400" />
            Content Sources
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure what data appears in {newsletter.name} issues.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/newsletter/${slug}/preview`}
            className="btn btn-ghost flex items-center gap-2 text-sm"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Link>
          <button
            onClick={() => setShowPicker(true)}
            className="btn btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      </div>

      {/* Blocks */}
      {blocks.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-slate-700/50">
          <Settings2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h2 className="text-lg text-slate-400 mb-1">No content sources configured</h2>
          <p className="text-sm text-slate-600 mb-4">
            Add data sources to auto-populate your newsletter issues.
          </p>
          <button
            onClick={() => setShowPicker(true)}
            className="btn btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add First Source
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, idx) => (
            <ContentBlockCard
              key={block.id}
              block={block}
              isFirst={idx === 0}
              isLast={idx === blocks.length - 1}
              onToggle={handleToggle}
              onMoveUp={(id) => handleMove(id, "up")}
              onMoveDown={(id) => handleMove(id, "down")}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Picker Modal */}
      {showPicker && (
        <ContentSourcePicker
          sources={contentSources}
          existingKeys={blocks.map((b) => b.source_key)}
          onAdd={handleAdd}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
