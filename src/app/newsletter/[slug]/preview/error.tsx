"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function PreviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Preview page error:", error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-red-500/30">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg text-slate-200 mb-2">Preview Error</h2>
        <p className="text-sm text-slate-400 mb-1">
          Something went wrong rendering the preview.
        </p>
        <p className="text-xs text-red-400/70 font-mono mb-6 px-8 break-all">
          {error.message}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="btn btn-primary inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/newsletter"
            className="btn btn-ghost inline-flex items-center gap-2 text-sm"
          >
            Back to Newsletters
          </Link>
        </div>
      </div>
    </div>
  );
}
