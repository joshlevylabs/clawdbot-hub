"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Newsletter } from "@/lib/newsletter-types";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";

export default function EditNewsletterPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/newsletters/${slug}`);
        if (!res.ok) {
          router.push("/newsletter");
          return;
        }
        const data = await res.json();
        setNewsletter(data.newsletter);
      } catch {
        router.push("/newsletter");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, router]);

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
      <div className="mb-6">
        <Link
          href={`/newsletter/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {newsletter.name}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-100">Edit Newsletter</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Update the settings for {newsletter.name}
        </p>
      </div>

      {/* Form */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-6">
        <NewsletterForm mode="edit" newsletter={newsletter} />
      </div>
    </div>
  );
}
