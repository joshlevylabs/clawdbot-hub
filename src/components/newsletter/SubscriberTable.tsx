"use client";

import { useState } from "react";
import { Trash2, UserPlus, Loader2 } from "lucide-react";
import { NewsletterSubscriber } from "@/lib/newsletter-types";
import { StatusBadge } from "./StatusBadge";

interface SubscriberTableProps {
  subscribers: NewsletterSubscriber[];
  newsletterId: string;
  onRefresh: () => void;
}

export function SubscriberTable({ subscribers, newsletterId, onRefresh }: SubscriberTableProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      await fetch(`/api/newsletters/${newsletterId}/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      setEmail("");
      setName("");
      setShowAdd(false);
      onRefresh();
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (subscriberId: string) => {
    setRemoving(subscriberId);
    try {
      await fetch(
        `/api/newsletters/${newsletterId}/subscribers?subscriber_id=${subscriberId}`,
        { method: "DELETE" }
      );
      onRefresh();
    } finally {
      setRemoving(null);
    }
  };

  const activeCount = subscribers.filter((s) => s.status === "active").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{activeCount} active subscribers</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn btn-primary flex items-center gap-2 text-sm"
        >
          <UserPlus className="w-4 h-4" strokeWidth={1.5} />
          Add Subscriber
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none text-sm text-slate-200"
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none text-sm text-slate-200"
              placeholder="Optional"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="btn btn-primary flex items-center gap-2 text-sm whitespace-nowrap"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="btn btn-ghost text-sm"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Table */}
      {subscribers.length === 0 ? (
        <div className="text-center py-12 text-slate-600 text-sm">
          No subscribers yet. Add your first subscriber above.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Email</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Name</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Status</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Subscribed</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => (
                <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-slate-200">{sub.subscriber?.email}</td>
                  <td className="py-2.5 px-3 text-slate-400">{sub.subscriber?.name || "—"}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {new Date(sub.subscribed_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {sub.status === "active" && (
                      <button
                        onClick={() => handleRemove(sub.subscriber_id)}
                        disabled={removing === sub.subscriber_id}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-700"
                      >
                        {removing === sub.subscriber_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
