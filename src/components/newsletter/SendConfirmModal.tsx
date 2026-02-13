"use client";

import { X, Send, Loader2, AlertTriangle } from "lucide-react";

interface SendConfirmModalProps {
  subject: string;
  recipientCount: number;
  sending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SendConfirmModal({
  subject,
  recipientCount,
  sending,
  onConfirm,
  onCancel,
}: SendConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">Confirm Send</h2>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 p-1">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-2">
          You&apos;re about to send:
        </p>
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-4">
          <p className="text-sm font-medium text-slate-200">&quot;{subject}&quot;</p>
          <p className="text-xs text-slate-500 mt-1">
            to {recipientCount} active subscriber{recipientCount !== 1 ? "s" : ""}
          </p>
        </div>

        {recipientCount === 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
            <p className="text-sm text-amber-400">
              ⚠️ This newsletter has no active subscribers. The issue will be marked as sent but no emails will go out.
            </p>
          </div>
        )}

        <p className="text-xs text-slate-600 mb-4">
          Note: Actual email delivery is not yet connected. This marks the issue as &quot;sent&quot; in the system.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} disabled={sending} className="btn btn-ghost text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={sending}
            className="btn btn-primary flex items-center gap-2 text-sm"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending..." : "Send Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
