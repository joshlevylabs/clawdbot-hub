"use client";

interface IssuePreviewProps {
  subject: string;
  bodyHtml: string;
  senderName?: string;
}

export function IssuePreview({ subject, bodyHtml, senderName = "Joshua Levy" }: IssuePreviewProps) {
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-white">
      {/* Email Header */}
      <div className="p-4 bg-slate-100 border-b border-slate-200">
        <p className="text-xs text-slate-500">From: {senderName}</p>
        <p className="text-sm font-medium text-slate-800 mt-1">{subject || "Untitled"}</p>
      </div>

      {/* Email Body */}
      <div
        className="p-6 prose prose-sm max-w-none text-slate-800"
        style={{ minHeight: "200px" }}
        dangerouslySetInnerHTML={{
          __html: bodyHtml || '<p style="color: #94a3b8;">Start writing to see a preview...</p>',
        }}
      />
    </div>
  );
}
