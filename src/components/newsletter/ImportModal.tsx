"use client";

import { useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";

interface ImportModalProps {
  newsletterId: string;
  onClose: () => void;
  onComplete: () => void;
}

export function ImportModal({ newsletterId, onClose, onComplete }: ImportModalProps) {
  const [emails, setEmails] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; invalid: number } | null>(null);

  const handleImport = async () => {
    if (!emails.trim()) return;
    setImporting(true);
    setResult(null);

    try {
      const res = await fetch(`/api/newsletters/${newsletterId}/subscribers/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setTimeout(() => {
          onComplete();
          onClose();
        }, 2000);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Upload className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">Import Subscribers</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-3">
          Paste email addresses below. One per line, or separated by commas or semicolons.
        </p>

        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none text-sm text-slate-200 font-mono"
          rows={8}
          placeholder={"user1@example.com\nuser2@example.com\nuser3@example.com"}
        />

        {result && (
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">
            <p className="text-emerald-400">
              ✅ Imported {result.imported} subscribers
              {result.skipped > 0 && `, ${result.skipped} already subscribed`}
              {result.invalid > 0 && `, ${result.invalid} invalid`}
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-4">
          <button onClick={onClose} className="btn btn-ghost text-sm">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !emails.trim()}
            className="btn btn-primary flex items-center gap-2 text-sm"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
