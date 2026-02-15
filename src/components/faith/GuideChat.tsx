"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, MessageCircle, Loader2, CheckCircle2 } from "lucide-react";
import type {
  FaithLesson,
  FaithPerspective,
  FaithCompassState,
  FaithTradition,
} from "@/lib/faith-supabase";

interface GuideChatProps {
  open: boolean;
  onClose: () => void;
  lesson: FaithLesson;
  perspectives: FaithPerspective[];
  traditions: FaithTradition[];
  resonatingTraditions: Set<string>;
  compass: FaithCompassState | null;
  onCommit: (traditionId: string) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

function getGuideTitle(primaryAlignment: string | null): string {
  if (!primaryAlignment) return "Your Guide";
  const name = primaryAlignment.toLowerCase();
  if (
    ["orthodox", "conservative", "reform", "reconstructionist"].some((t) =>
      name.includes(t)
    )
  )
    return "Your Rabbi";
  if (name.includes("messianic")) return "Your Teacher";
  if (name.includes("catholic") && !name.includes("orthodox"))
    return "Your Spiritual Director";
  if (name.includes("eastern orthodox")) return "Your Elder";
  if (name.includes("evangelical") || name.includes("protestant"))
    return "Your Pastor";
  if (name.includes("sunni") || name.includes("islam")) return "Your Sheikh";
  return "Your Guide";
}

export default function GuideChat({
  open,
  onClose,
  lesson,
  perspectives,
  traditions,
  resonatingTraditions,
  compass,
  onCommit,
}: GuideChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(true);
  const [commitInfo, setCommitInfo] = useState<{
    tradition_id: string;
    tradition_name: string;
  } | null>(null);
  const [committed, setCommitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const guideTitle = getGuideTitle(compass?.primary_alignment || null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // Load existing conversation on open
  useEffect(() => {
    if (!open) return;

    const loadConversation = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/faith/guide?lesson_id=${lesson.id}`
        );
        const data = await res.json();
        if (data.conversation?.messages) {
          setMessages(
            data.conversation.messages.filter(
              (m: { role: string }) => m.role !== "system"
            ) as ChatMessage[]
          );
          if (data.conversation.status === "committed") {
            setCommitted(true);
          }
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [open, lesson.id]);

  // Focus input when chat opens
  useEffect(() => {
    if (open && !loading) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamingText("");

    try {
      const selectedIds = Array.from(resonatingTraditions);
      const res = await fetch("/api/faith/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lesson.id,
          message: text,
          selected_tradition_ids: selectedIds,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "text") {
                fullText += event.text;
                setStreamingText(fullText);
              }

              if (event.type === "action" && event.action === "commit") {
                setCommitInfo({
                  tradition_id: event.tradition_id,
                  tradition_name: event.tradition_name,
                });
              }

              if (event.type === "done") {
                // Clean any commit marker from the displayed text
                const cleanText = fullText
                  .replace(/\[COMMIT:.+?\]/, "")
                  .trim();
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: cleanText },
                ]);
                setStreamingText("");
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }
    } catch (err) {
      console.error("Guide chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I apologize — I had trouble connecting. Please try again.",
        },
      ]);
      setStreamingText("");
    } finally {
      setStreaming(false);
    }
  };

  const handleCommit = () => {
    if (!commitInfo) return;
    setCommitted(true);
    onCommit(commitInfo.tradition_id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Build initial prompt hint from resonating perspectives
  const resonatingNames = perspectives
    .filter((p) => resonatingTraditions.has(p.tradition_id))
    .map((p) => {
      const trad = p.tradition || traditions.find((t) => t.id === p.tradition_id);
      return trad?.name || "Unknown";
    });

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-full md:max-w-md flex flex-col bg-slate-900 border-l border-slate-700 shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-600/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                {guideTitle}
              </h3>
              <p className="text-[11px] text-slate-500">
                Faith Guide • {lesson.topic}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Welcome message if no messages */}
              {messages.length === 0 && !streaming && (
                <div className="flex flex-col items-center justify-center py-8 gap-6">
                  <div className="w-16 h-16 rounded-full bg-amber-600/20 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 max-w-sm">
                    <p className="text-slate-300 text-sm leading-relaxed text-center">
                      I see {resonatingNames.length} perspectives resonated with
                      you today
                      {resonatingNames.length > 0 && (
                        <>
                          {" "}— from{" "}
                          <span className="text-amber-400 font-medium">
                            {resonatingNames.join(" and ")}
                          </span>
                        </>
                      )}
                      . Tell me what drew you to them, and
                      let&apos;s explore together.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                    {[
                      "What makes these perspectives different?",
                      "I liked the emphasis on...",
                      "Help me understand the tension between them",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs hover:border-amber-500/50 hover:text-slate-300 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat messages */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-amber-600 text-white rounded-br-md"
                        : "bg-slate-800 text-slate-200 rounded-bl-md border border-slate-700/50"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Streaming text */}
              {streaming && streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed bg-slate-800 text-slate-200 border border-slate-700/50">
                    {streamingText.replace(/\[COMMIT:.+?\]/, "")}
                    <span className="inline-block w-1.5 h-4 bg-amber-400 ml-0.5 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Streaming indicator without text yet */}
              {streaming && !streamingText && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-slate-800 border border-slate-700/50">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Commit confirmation card */}
              {commitInfo && !committed && (
                <div className="bg-amber-900/30 border border-amber-500/40 rounded-xl p-4 mx-2">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    <p className="text-amber-300 font-medium text-sm">
                      Ready to Commit
                    </p>
                  </div>
                  <p className="text-slate-300 text-sm mb-3">
                    Submit{" "}
                    <span className="text-amber-400 font-medium">
                      {commitInfo.tradition_name}
                    </span>{" "}
                    as your response for today&apos;s lesson?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCommit}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      Commit to Compass
                    </button>
                    <button
                      onClick={() => setCommitInfo(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition-colors"
                    >
                      Not yet
                    </button>
                  </div>
                </div>
              )}

              {/* Committed success */}
              {committed && (
                <div className="bg-emerald-900/30 border border-emerald-500/40 rounded-xl p-4 mx-2 text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-300 font-medium text-sm">
                    Compass Updated
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    Your response has been recorded
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input bar */}
        {!committed && (
          <div className="border-t border-slate-800 px-4 py-3 bg-slate-900/95">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  messages.length === 0
                    ? "What drew you to these perspectives?"
                    : "Continue the conversation..."
                }
                disabled={streaming}
                className="flex-1 bg-slate-800 text-slate-200 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm border border-slate-700 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="p-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:hover:bg-amber-600 rounded-xl text-white transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
