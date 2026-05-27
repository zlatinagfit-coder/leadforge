"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { sendOutreachToLeadAction } from "@/lib/actions";

export function SendOutreachButton({ leadId, leadEmail, leadCompany }: { leadId: string; leadEmail?: string | null; leadCompany: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof sendOutreachToLeadAction>> | null>(null);
  const [showResult, setShowResult] = useState(false);

  const send = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!leadEmail) return;
    setResult(null);
    setShowResult(true);
    startTransition(async () => {
      const res = await sendOutreachToLeadAction(leadId);
      setResult(res);
    });
  };

  return (
    <>
      <button
        onClick={send}
        disabled={pending || !leadEmail}
        title={leadEmail ? "Изпрати AI outreach" : "Няма имейл"}
        className="w-7 h-7 grid place-items-center rounded-md hover:bg-red-soft text-ink-3 hover:text-red disabled:opacity-30 disabled:hover:bg-transparent transition"
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
      </button>

      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm" onClick={() => !pending && setShowResult(false)}>
          <div className="bg-bg border border-line rounded-2xl shadow-2xl w-[480px] max-w-[90vw] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-line flex items-center justify-between">
              <h2 className="text-[16px] font-bold flex items-center gap-2">
                {pending ? <Loader2 size={16} className="text-red animate-spin" /> : result?.success ? <CheckCircle2 size={16} className="text-green" /> : result ? <AlertCircle size={16} className="text-red" /> : <Mail size={16} />}
                {pending ? "AI пише outreach..." : result?.success ? "Outreach изпратен!" : result ? "Грешка" : "Изпращане..."}
              </h2>
              <button onClick={() => !pending && setShowResult(false)} className="text-ink-4 hover:text-ink"><X size={16} /></button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="text-[13px]">
                <span className="text-ink-4">Lead:</span> <strong>{leadCompany}</strong>
                {leadEmail && <span className="ml-2 text-ink-4 mono text-[12px]">&lt;{leadEmail}&gt;</span>}
              </div>

              {pending && (
                <div className="space-y-2 text-[12.5px]">
                  <Step done text="Зареждам данни за lead-а" />
                  <Step active text="Генерирам персонализиран outreach с OpenAI..." />
                  <Step text="Избирам sending inbox" />
                  <Step text="Изпращам през Resend" />
                  <Step text="Маркирам lead като 'contacted'" />
                </div>
              )}

              {result?.success && (
                <>
                  <div className="bg-green-soft border border-green/20 rounded-lg p-3 text-[12.5px]">
                    {result.isSandbox ? (
                      <>
                        <div className="font-bold text-green flex items-center gap-1 mb-1.5">
                          <CheckCircle2 size={13} /> Sandbox preview изпратен!
                        </div>
                        <div className="text-ink-2">Имейлът се изпрати до <strong>{result.previewSentTo}</strong> (твоя Gmail) за preview.</div>
                        <div className="text-ink-3 mt-2">Реалният адресат щеше да е <strong>{result.intendedRecipient}</strong>. За реално изпращане купи домейн + verify-ни в Resend.</div>
                      </>
                    ) : (
                      <>
                        <div className="font-bold text-green flex items-center gap-1 mb-1.5">
                          <CheckCircle2 size={13} /> Изпратен реален outreach!
                        </div>
                        <div className="text-ink-2">До: <strong className="mono">{result.intendedRecipient}</strong></div>
                      </>
                    )}
                  </div>
                  <div className="text-[12px] bg-surface p-3 rounded-lg">
                    <div className="text-ink-4 mb-1 mono text-[10.5px] uppercase tracking-wider">Subject</div>
                    <div className="font-semibold text-ink">{result.subject}</div>
                  </div>
                </>
              )}

              {result && !result.success && (
                <div className="bg-red-soft border border-red/20 rounded-lg p-3 text-[12.5px]">
                  <div className="font-bold text-red mb-1">Грешка при изпращане</div>
                  <div className="text-ink-3 break-words">{result.error}</div>
                </div>
              )}
            </div>

            {!pending && (
              <div className="px-5 py-3 border-t border-line flex items-center justify-end bg-surface">
                <button onClick={() => setShowResult(false)} className="h-8 px-4 rounded-md bg-ink text-bg text-[12px] font-bold hover:bg-ink-2">
                  Затвори
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Step({ done, active, text }: { done?: boolean; active?: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className={`w-4 h-4 rounded-full grid place-items-center shrink-0 mt-0.5 ${done ? "bg-green text-bg" : active ? "bg-red text-bg" : "bg-surface-2 text-ink-4"}`}>
        {done ? (
          <svg viewBox="0 0 20 20" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4 4 8-8" /></svg>
        ) : active ? (
          <Loader2 size={9} className="animate-spin" />
        ) : (
          <span className="w-1 h-1 rounded-full bg-current opacity-50" />
        )}
      </div>
      <span className={active ? "text-ink font-semibold" : "text-ink-3"}>{text}</span>
    </div>
  );
}
