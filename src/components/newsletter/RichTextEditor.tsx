"use client";

import { useState, useCallback } from "react";
import { Bold, Italic, Link2, Heading2, List, ImageIcon, Eye, Code } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function insertTag(textarea: HTMLTextAreaElement, before: string, after: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);
  const replacement = `${before}${selected || "text"}${after}`;
  textarea.value = text.substring(0, start) + replacement + text.substring(end);
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + (selected || "text").length;
  textarea.focus();
  // Trigger onChange
  return textarea.value;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  const handleToolbar = useCallback(
    (action: string) => {
      const textarea = document.getElementById("newsletter-editor") as HTMLTextAreaElement;
      if (!textarea) return;

      let newValue = value;
      switch (action) {
        case "bold":
          newValue = insertTag(textarea, "<strong>", "</strong>");
          break;
        case "italic":
          newValue = insertTag(textarea, "<em>", "</em>");
          break;
        case "link":
          newValue = insertTag(textarea, '<a href="https://">', "</a>");
          break;
        case "heading":
          newValue = insertTag(textarea, "<h2>", "</h2>");
          break;
        case "list":
          newValue = insertTag(textarea, "<ul>\n  <li>", "</li>\n</ul>");
          break;
        case "image":
          newValue = insertTag(textarea, '<img src="', '" alt="image" />');
          break;
      }
      onChange(newValue);
    },
    [value, onChange]
  );

  const toolbarButtons = [
    { action: "bold", icon: Bold, title: "Bold" },
    { action: "italic", icon: Italic, title: "Italic" },
    { action: "link", icon: Link2, title: "Link" },
    { action: "heading", icon: Heading2, title: "Heading" },
    { action: "list", icon: List, title: "List" },
    { action: "image", icon: ImageIcon, title: "Image" },
  ];

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-800 border-b border-slate-700">
        {toolbarButtons.map((btn) => (
          <button
            key={btn.action}
            type="button"
            onClick={() => handleToolbar(btn.action)}
            className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title={btn.title}
          >
            <btn.icon className="w-4 h-4" strokeWidth={1.5} />
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
            showPreview
              ? "bg-primary-600/20 text-primary-400"
              : "hover:bg-slate-700 text-slate-400"
          }`}
        >
          {showPreview ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          className="p-4 min-h-[300px] prose prose-invert prose-sm max-w-none bg-slate-900 text-slate-200"
          dangerouslySetInnerHTML={{ __html: value || "<p class='text-slate-600'>Nothing to preview</p>" }}
        />
      ) : (
        <textarea
          id="newsletter-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-900 text-slate-200 text-sm font-mono resize-none focus:outline-none min-h-[300px]"
          placeholder="Write your newsletter content in HTML..."
        />
      )}
    </div>
  );
}
