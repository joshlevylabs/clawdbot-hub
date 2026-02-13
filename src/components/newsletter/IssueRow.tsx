"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Users, Trash2, Loader2 } from "lucide-react";
import { NewsletterIssue } from "@/lib/newsletter-types";
import { StatusBadge } from "./StatusBadge";

interface IssueRowProps {
  issue: NewsletterIssue;
  slug: string;
  newsletterId?: string;
  onDelete?: (issueId: string) => void;
}

export function IssueRow({ issue, slug, newsletterId, onDelete }: IssueRowProps) {
  const [deleting, setDeleting] = useState(false);

  const href =
    issue.status === "draft"
      ? `/newsletter/${slug}/compose/${issue.id}`
      : `/newsletter/${slug}/compose/${issue.id}`;

  const dateStr = issue.sent_at
    ? new Date(issue.sent_at).toLocaleDateString()
    : new Date(issue.created_at).toLocaleDateString();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newsletterId || !onDelete) return;
    if (!confirm("Delete this draft issue?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/newsletters/${newsletterId}/issues/${issue.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete(issue.id);
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Link href={href}>
      <div className="group flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
        <div className="p-2 bg-slate-700/50 rounded-lg">
          <FileText className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{issue.subject}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {issue.status === "sent" ? `Sent ${dateStr}` : `Created ${dateStr}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {issue.status === "sent" && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span>{issue.recipient_count}</span>
            </div>
          )}
          {issue.status === "draft" && newsletterId && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/10 text-red-400 hover:text-red-300"
              title="Delete draft"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
          <StatusBadge status={issue.status} />
        </div>
      </div>
    </Link>
  );
}
