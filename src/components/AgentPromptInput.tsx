"use client";

import { useState, useTransition } from "react";
import { Send, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { runAgentPromptAction } from "@/lib/actions";

const EXAMPLES = [
  "намери 25 зъболекари в София",
  "find 15 fitness studios in Berlin",
  "10 ресторанта в Пловдив",
  "20 law firms in Manchester",
];

export function AgentPromptInput() {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: boolean; error?: string; count?: number; parsed?: { query: string; niche: string; limit: number } } | null>(null);

  const submit = () => {
    if (!text.trim()) return;
    setResult(null);
    startTransition(async () => {
      const res = await runAgentPromptAction(text);
      setResult(res);
      if (res.success) {
        setText("");
        setTimeout(() => setResult(null), 8000);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-ink-4 flex items-center justify-between">
        <span>Бърз prompt към агента</span>
        {pending && <span className="flex items-center gap-1 text-red"><Loader2 size={10} className="animate-spin" /> работя...</span>}
      </div>

      {!text && !pending && !result && (
        <div className="flex flex-wrap gap-1">
          {EXAMPLES.slice(0, 2).map((ex) => (
            <button key={ex} onClick={() => setText(ex)} className="text-[10px] mono px-1.5 py-0.5 rounded bg-surface text-ink-3 hover:bg-surface-2 transition">
              {ex}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !pending && submit()}
          placeholder="напр. намери 25 фитнеси в София"
          disabled={pending}
          className="w-full h-9 pl-3 pr-9 rounded-lg bg-surface border border-line text-[12.5px] placeholder:text-ink-4 focus:outline-none focus:border-red transition disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={pending || !text.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded grid place-items-center bg-red hover:bg-red-hover text-bg disabled:opacity-50"
        >
          {pending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
        </button>
      </div>

      {result && (
        <div className={`p-2 rounded text-[11.5px] ${result.success ? "bg-green-soft text-green" : "bg-red-soft text-red"}`}>
          <div className="flex items-start gap-1.5">
            {result.success ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> : <AlertCircle size={12} className="shrink-0 mt-0.5" />}
            <div className="flex-1">
              {result.success ? (
                <>
                  <strong>Намерих {result.count} нови lead-а!</strong>
                  {result.parsed && (
                    <div className="text-ink-3 mt-1 mono text-[10.5px] break-words">
                      query: {result.parsed.query}<br />
                      niche: {result.parsed.niche} · limit: {result.parsed.limit}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <strong>Грешка</strong>
                  <div className="text-ink-3 mt-0.5 break-all">{result.error}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
