"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "How many leads do we have?",
  "Which category has the highest lead count?",
  "How much revenue have we generated?",
  "What's our email reply rate?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post<{ answer: string }>("/assistant/ask", { question: q });
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.answer }]);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Something went wrong reaching the assistant.";
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h1 className="font-display text-xl font-semibold tracking-tight">AI Business Assistant</h1>
        <p className="text-sm text-text-muted">Ask questions about your live data - answers come only from real records.</p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="max-w-sm text-sm text-text-muted">
              Ask about leads, revenue, deals, or team performance - grounded in your actual database.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-2 text-text"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text-muted">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about leads, revenue, deals..."
          className="h-11 flex-1 rounded-lg border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
        />
        <Button type="submit" disabled={loading || !input.trim()} size="icon" className="h-11 w-11">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}