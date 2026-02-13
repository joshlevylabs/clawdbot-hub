"use client";

import Link from "next/link";
import { FileText, Users } from "lucide-react";
import { NewsletterIssue } from "@/lib/newsletter-types";
import { StatusBadge } from "./StatusBadge";

interface IssueRowProps {
  issue: NewsletterIssue;
  slug: string;
}

export function IssueRow({ issue, slug }: IssueRowProps) {
  const href =
    issue.status === "draft"
      ? `/newsletter/${slug}/compose/${issue.id}`
      : `/newsletter/${slug}/compose/${issue.id}`;

  const dateStr = issue.sent_at
    ? new Date(issue.sent_at).toLocaleDateString()
    : new Date(issue.created_at).toLocaleDateString();

  return (
    <Link href={href}>
      <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
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
          <StatusBadge status={issue.status} />
        </div>
      </div>
    </Link>
  );
}
