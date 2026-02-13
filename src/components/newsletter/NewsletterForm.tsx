"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Newsletter } from "@/lib/newsletter-types";

interface NewsletterFormProps {
  newsletter?: Newsletter;
  mode: "create" | "edit";
}

export function NewsletterForm({ newsletter, mode }: NewsletterFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(newsletter?.name || "");
  const [description, setDescription] = useState(newsletter?.description || "");
  const [category, setCategory] = useState(newsletter?.category || "");
  const [cadence, setCadence] = useState<"daily" | "weekly" | "biweekly" | "monthly">(newsletter?.cadence || "weekly");
  const [senderName, setSenderName] = useState(newsletter?.sender_name || "Joshua Levy");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = { name, description, category, cadence, sender_name: senderName };

      if (mode === "create") {
        const res = await fetch("/api/newsletters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create newsletter");
          return;
        }
        router.push(`/newsletter/${data.newsletter.slug}`);
      } else if (newsletter) {
        const res = await fetch(`/api/newsletters/${newsletter.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to update newsletter");
          return;
        }
        router.push(`/newsletter/${newsletter.slug}`);
      }
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm text-slate-400 mb-1.5 font-medium">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm text-slate-200"
          placeholder="e.g. Today's Plays"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1.5 font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none text-sm text-slate-200"
          rows={3}
          placeholder="What this newsletter covers"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1.5 font-medium">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm text-slate-200"
          placeholder="e.g. trading, faith, business"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1.5 font-medium">Cadence</label>
        <select
          value={cadence}
          onChange={(e) => setCadence(e.target.value as "daily" | "weekly" | "biweekly" | "monthly")}
          className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm text-slate-200"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1.5 font-medium">Sender Name</label>
        <input
          type="text"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm text-slate-200"
          placeholder="Joshua Levy"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "create" ? "Create Newsletter" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
