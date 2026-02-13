"use client";

import { Mail, Send, Users, FileText, UserPlus, Upload } from "lucide-react";
import { NewsletterActivity } from "@/lib/newsletter-types";

const typeIcons: Record<string, typeof Mail> = {
  newsletter_created: Mail,
  newsletter_updated: Mail,
  newsletter_deleted: Mail,
  subscriber_added: UserPlus,
  subscribers_imported: Upload,
  subscriber_removed: Users,
  issue_created: FileText,
  issue_sent: Send,
  issue_scheduled: FileText,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface ActivityFeedProps {
  activity: NewsletterActivity[];
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <div className="text-center py-8 text-slate-600 text-sm">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activity.map((item) => {
        const Icon = typeIcons[item.type] || Mail;
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg"
          >
            <div className="p-1.5 bg-slate-700/50 rounded-lg mt-0.5">
              <Icon className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-300">{item.description}</p>
              <p className="text-xs text-slate-600 mt-1">{timeAgo(item.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
