"use client";

import Link from "next/link";
import { Users, Send } from "lucide-react";
import { Newsletter } from "@/lib/newsletter-types";
import { StatusBadge } from "./StatusBadge";
import { CadenceBadge } from "./CadenceBadge";

interface NewsletterCardProps {
  newsletter: Newsletter;
}

export function NewsletterCard({ newsletter }: NewsletterCardProps) {
  const lastSent = newsletter.last_sent_at
    ? new Date(newsletter.last_sent_at).toLocaleDateString()
    : "Never";

  return (
    <Link href={`/newsletter/${newsletter.slug}`}>
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-5 hover:border-slate-600 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-medium text-slate-100 group-hover:text-primary-400 transition-colors">
            {newsletter.name}
          </h3>
          <StatusBadge status={newsletter.status} />
        </div>

        {newsletter.description && (
          <p className="text-sm text-slate-500 mb-4 line-clamp-2">
            {newsletter.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{newsletter.subscriber_count || 0} subscribers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" />
            <span>Last sent: {lastSent}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <CadenceBadge cadence={newsletter.cadence} />
          {newsletter.category && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600">
              {newsletter.category}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
