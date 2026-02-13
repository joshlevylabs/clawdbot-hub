"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";

export default function CreateNewsletterPage() {
  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/newsletter"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Newsletters
        </Link>
        <h1 className="text-2xl font-semibold text-slate-100">Create Newsletter</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Set up a new newsletter with its topic and sending schedule
        </p>
      </div>

      {/* Form */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-6">
        <NewsletterForm mode="create" />
      </div>
    </div>
  );
}
