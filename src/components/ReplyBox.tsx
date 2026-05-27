"use client";

import { useState, useTransition } from "react";
import { Sparkles, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { generateAiReplyAction, sendReplyAction } from "@/lib/actions";

export function ReplyBox({ threadId, initialDraft = "" }: { threadId: string; initialDraft?: string }) {
  const [body, setBody] = useState(initialDraft);
  const [genPending, startGen] = useTransition();
  const [sendPending, startSend] = useTransition();
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const generate = () => {
    setResult(null);
    startGen(async () => {
      const res = await generateAiReplyAction(threadId);
      if (res.success && res.reply) setBody(res.reply);
      else setResult({ success: false, error: res.error });
    });
  };

  const send = () => {
    setResult(null);
    const fd = new FormData();
    fd.set("body", body);
    startSend(async () => {
      const res = await sendReplyAction(threadId, fd);
      setResult(res);
      if (res.success) {
        setBody("");
        setTimeout(() => setResult(null), 4000);
      }
    });
  };

  const pending = genPending || sendPending;

  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={12} className="text-red" />
        <span className="text-[11px] mono uppercase tracking-wider font-bold text-ink-3">AI suggest reply</span>
        <span className="text-[11px] text-ink-4">— готов draft на база intent</span>
      </div>
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={pending}
        placeholder={`Кликни „Регенерирай" за AI draft, или напиши директно...`}
        className="w-full text-[13px] bg-transparent resize-none focus:outline-none placeholder:text-ink-4 disabled:opacity-50"
      />

      {result && (
        <div className={`flex items-start gap-2 p-2 my-1.5 rounded text-[11.5px] ${result.success ? "bg-green-soft text-green" : "bg-red-soft text-red"}`}>
          {result.success ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> : <AlertCircle size={12} className="shrink-0 mt-0.5" />}
          <span>{result.success ? "Изпратено успешно" : result.error}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <button
          onClick={generate}
          disabled={pending}
          className="text-[11.5px] mono font-bold text-ink-3 hover:text-red flex items-center gap-1 disabled:opacity-50"
        >
          {genPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {genPending ? "Генерирам..." : "Регенерирай"}
        </button>
        <button
          onClick={send}
          disabled={pending || !body.trim()}
          className="h-8 px-3 flex items-center gap-1.5 rounded-md bg-red text-bg text-[12px] font-bold hover:bg-red-hover transition disabled:opacity-50"
        >
          {sendPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          {sendPending ? "Изпращам..." : "Изпрати"}
        </button>
      </div>
    </div>
  );
}
