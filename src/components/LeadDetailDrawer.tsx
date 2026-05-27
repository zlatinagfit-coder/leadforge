"use client";

import { useState, useTransition, useEffect } from "react";
import {
  X, Loader2, CheckCircle2, AlertCircle, Mail, Phone, Globe, MapPin, Building2,
  TrendingUp, TrendingDown, Eye, Sparkles, RefreshCw, FileText, Send, History, Hash, ExternalLink,
} from "lucide-react";
import { sendOutreachToLeadAction, reanalyzeLeadAction, updateLeadNotesAction } from "@/lib/actions";

type LeadAnalysis = {
  hasWebsite?: boolean;
  websiteReachable?: boolean;
  strengths?: string[];
  weaknesses?: string[];
  usagePatterns?: string[];
  funnelGaps?: string[];
  techStack?: string[];
  summary?: string;
};

export type LeadDetail = {
  id: string;
  company: string;
  niche: string;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  score: number;
  status: string;
  industry?: string | null;
  painPoints?: string | null;
  analysis?: string | null;
  notes?: string | null;
};

type Tab = "overview" | "analysis" | "outreach" | "history";

export function LeadDetailDrawer({ lead, onClose }: { lead: LeadDetail; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const analysis: LeadAnalysis = (lead.analysis ? safeJson<LeadAnalysis>(lead.analysis) : {}) ?? {};
  const painPoints: string[] = (lead.painPoints ? safeJson<string[]>(lead.painPoints) : []) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div
        className="relative w-[640px] max-w-[95vw] h-full bg-bg shadow-2xl border-l border-line flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-line">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg grid place-items-center text-[12px] font-bold text-bg shrink-0" style={{ background: scoreColor(lead.score) }}>
                {lead.company.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-[18px] font-bold leading-tight truncate">{lead.company}</h2>
                <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-3 flex-wrap">
                  <span className="font-semibold text-ink-2">{lead.niche}</span>
                  {lead.city && <><span>·</span><span className="flex items-center gap-1"><MapPin size={11} />{lead.city}, {lead.country}</span></>}
                  <span>·</span>
                  <ScorePill score={lead.score} />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md hover:bg-surface text-ink-3 shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 -mb-4 border-b border-line">
            <TabBtn label="Преглед" icon={Building2} active={tab === "overview"} onClick={() => setTab("overview")} />
            <TabBtn label="Анализ" icon={Eye} active={tab === "analysis"} onClick={() => setTab("analysis")} />
            <TabBtn label="Outreach" icon={Send} active={tab === "outreach"} onClick={() => setTab("outreach")} />
            <TabBtn label="История" icon={History} active={tab === "history"} onClick={() => setTab("history")} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "overview" && <OverviewTab lead={lead} analysis={analysis} />}
          {tab === "analysis" && <AnalysisTab lead={lead} analysis={analysis} painPoints={painPoints} />}
          {tab === "outreach" && <OutreachTab lead={lead} painPoints={painPoints} />}
          {tab === "history" && <HistoryTab lead={lead} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// OVERVIEW TAB
// ============================================================

function OverviewTab({ lead, analysis }: { lead: LeadDetail; analysis: LeadAnalysis }) {
  return (
    <div className="p-6 space-y-4">
      {/* Summary */}
      {analysis.summary && (
        <div className="card p-4 bg-surface">
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1.5">AI обобщение</div>
          <p className="text-[13px] leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Contact info */}
      <div className="card p-4">
        <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-3">Контакти</div>
        <div className="space-y-2.5 text-[13px]">
          <Row icon={Globe} label="Уебсайт" value={lead.website ? (
            <a href={`https://${lead.website}`} target="_blank" rel="noreferrer" className="text-blue hover:underline flex items-center gap-1 mono">
              {lead.website} <ExternalLink size={11} />
            </a>
          ) : <span className="text-ink-4">Няма уебсайт</span>} />
          <Row icon={Mail} label="Email" value={lead.email ? (
            <a href={`mailto:${lead.email}`} className="mono hover:text-red">{lead.email}</a>
          ) : <span className="text-ink-4">Не е намерен</span>} />
          <Row icon={Phone} label="Телефон" value={lead.phone ? <span className="mono">{lead.phone}</span> : <span className="text-ink-4">—</span>} />
          <Row icon={MapPin} label="Локация" value={lead.city ? <span>{lead.city}, {lead.country}</span> : <span className="text-ink-4">—</span>} />
          <Row icon={Building2} label="Индустрия" value={lead.industry ?? <span className="text-ink-4">—</span>} />
        </div>
      </div>

      {/* Website status */}
      <div className="card p-4">
        <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-3">Статус на уебсайт</div>
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div className={`p-2.5 rounded-lg border ${analysis.hasWebsite ? "bg-green-soft border-green/20 text-green" : "bg-red-soft border-red/20 text-red"}`}>
            <div className="font-bold mb-0.5">{analysis.hasWebsite ? "✓ Има уебсайт" : "✗ Няма уебсайт"}</div>
          </div>
          <div className={`p-2.5 rounded-lg border ${analysis.websiteReachable ? "bg-green-soft border-green/20 text-green" : "bg-amber-soft border-amber/20 text-amber"}`}>
            <div className="font-bold mb-0.5">{analysis.websiteReachable ? "✓ Зарежда се" : "⚠ Не отговаря"}</div>
          </div>
        </div>
        {analysis.techStack && analysis.techStack.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Tech stack</div>
            <div className="flex flex-wrap gap-1">
              {analysis.techStack.map((t) => (
                <span key={t} className="text-[10.5px] mono px-1.5 py-0.5 rounded bg-surface-2 text-ink-3">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ANALYSIS TAB
// ============================================================

function AnalysisTab({ lead, analysis, painPoints }: { lead: LeadDetail; analysis: LeadAnalysis; painPoints: string[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: boolean; error?: string; score?: number } | null>(null);

  const reanalyze = () => {
    setResult(null);
    startTransition(async () => {
      const res = await reanalyzeLeadAction(lead.id);
      setResult(res);
      if (res.success) setTimeout(() => setResult(null), 2500);
    });
  };

  const hasAnyData =
    (analysis.strengths?.length ?? 0) > 0 ||
    (analysis.weaknesses?.length ?? 0) > 0 ||
    (analysis.usagePatterns?.length ?? 0) > 0 ||
    (analysis.funnelGaps?.length ?? 0) > 0 ||
    painPoints.length > 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">AI website анализ</div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold">Score:</span>
            <ScorePill score={lead.score} />
          </div>
        </div>
        <button
          onClick={reanalyze}
          disabled={pending || !lead.website}
          className="h-8 px-3 flex items-center gap-1.5 rounded-md border border-line text-[12px] font-semibold hover:bg-surface disabled:opacity-50"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {pending ? "Анализирам..." : "Преанализирай"}
        </button>
      </div>

      {result?.success && (
        <div className="bg-green-soft text-green p-2.5 rounded-lg text-[12px] flex items-center gap-2">
          <CheckCircle2 size={13} /> Преанализиран успешно! Score: {result.score}
        </div>
      )}
      {result?.error && (
        <div className="bg-red-soft text-red p-2.5 rounded-lg text-[12px] flex items-center gap-2">
          <AlertCircle size={13} /> {result.error}
        </div>
      )}

      {!hasAnyData && !pending && (
        <div className="card p-6 text-center">
          <div className="text-[13px] text-ink-3 mb-3">Този lead още няма AI анализ.</div>
          <button
            onClick={reanalyze}
            disabled={!lead.website}
            className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-ink text-bg text-[12.5px] font-semibold hover:bg-ink-2 disabled:opacity-50 mx-auto"
          >
            <Sparkles size={13} /> Стартирай AI анализ
          </button>
        </div>
      )}

      {/* Strengths */}
      {(analysis.strengths?.length ?? 0) > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-md bg-green-soft grid place-items-center"><TrendingUp size={12} className="text-green" /></div>
            <strong className="text-[13px]">Силни страни ({analysis.strengths!.length})</strong>
          </div>
          <ul className="space-y-1.5">
            {analysis.strengths!.map((s, i) => (
              <li key={i} className="text-[12.5px] text-ink-2 flex items-start gap-2">
                <span className="text-green mt-0.5">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {(analysis.weaknesses?.length ?? 0) > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-md bg-red-soft grid place-items-center"><TrendingDown size={12} className="text-red" /></div>
            <strong className="text-[13px]">Слаби страни ({analysis.weaknesses!.length})</strong>
          </div>
          <ul className="space-y-1.5">
            {analysis.weaknesses!.map((s, i) => (
              <li key={i} className="text-[12.5px] text-ink-2 flex items-start gap-2">
                <span className="text-red mt-0.5">✗</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Usage patterns */}
      {(analysis.usagePatterns?.length ?? 0) > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-md bg-blue-soft grid place-items-center"><Eye size={12} className="text-blue" /></div>
            <strong className="text-[13px]">Как се ползва сайтът</strong>
          </div>
          <ul className="space-y-1.5">
            {analysis.usagePatterns!.map((s, i) => (
              <li key={i} className="text-[12.5px] text-ink-2 flex items-start gap-2">
                <span className="text-blue mt-0.5">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Funnel gaps */}
      {(analysis.funnelGaps?.length ?? 0) > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-md bg-amber-soft grid place-items-center"><AlertCircle size={12} className="text-amber" /></div>
            <strong className="text-[13px]">Funnel пропуски</strong>
          </div>
          <ul className="space-y-1.5">
            {analysis.funnelGaps!.map((s, i) => (
              <li key={i} className="text-[12.5px] text-ink-2 flex items-start gap-2">
                <span className="text-amber mt-0.5">!</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legacy pain points (only if analysis empty) */}
      {!hasAnyData && painPoints.length > 0 && (
        <div className="card p-4">
          <strong className="text-[13px] block mb-2">Pain points (legacy)</strong>
          <div className="flex flex-wrap gap-1.5">
            {painPoints.map((p, i) => (
              <span key={i} className="text-[11px] px-2 py-1 rounded bg-red-soft text-red font-medium">{p}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// OUTREACH TAB
// ============================================================

function OutreachTab({ lead, painPoints }: { lead: LeadDetail; painPoints: string[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof sendOutreachToLeadAction>> | null>(null);

  const send = () => {
    setResult(null);
    startTransition(async () => {
      const res = await sendOutreachToLeadAction(lead.id);
      setResult(res);
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="card p-4">
        <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-2">Какво ще се случи когато кликнеш „Изпрати"</div>
        <ol className="text-[12.5px] text-ink-2 space-y-1.5 list-decimal list-inside">
          <li>OpenAI ще напише персонализиран email с фокус върху pain points-те</li>
          <li>Resend ще изпрати имейла на <strong className="mono">{lead.email ?? "—"}</strong></li>
          <li>Без verified домейн → sandbox preview към твоя Gmail</li>
          <li>Lead-ът става статус „Контактиран" автоматично</li>
        </ol>
      </div>

      <div className="card p-4">
        <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-2">Pain points за outreach</div>
        {painPoints.length === 0 ? (
          <p className="text-[12px] text-ink-4">Няма открити pain points — AI ще използва generic outreach.</p>
        ) : (
          <ul className="space-y-1 text-[12.5px]">
            {painPoints.slice(0, 5).map((p, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-red shrink-0">●</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result && (
        <div className={`card p-4 ${result.success ? "bg-green-soft border-green/20" : "bg-red-soft border-red/20"}`}>
          {result.success ? (
            <>
              <div className="font-bold text-green flex items-center gap-1 mb-2">
                <CheckCircle2 size={14} /> {result.isSandbox ? "Sandbox preview изпратен" : "Изпратен реален outreach"}
              </div>
              <div className="text-[12.5px] text-ink-2 space-y-1">
                <div><strong>Subject:</strong> {result.subject}</div>
                <div><strong>До:</strong> <span className="mono">{result.previewSentTo}</span> {result.isSandbox && <span className="text-ink-4">(вместо {result.intendedRecipient})</span>}</div>
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-red flex items-center gap-1 mb-1">
                <AlertCircle size={14} /> Грешка
              </div>
              <div className="text-[12.5px] text-ink-3">{result.error}</div>
            </>
          )}
        </div>
      )}

      <button
        onClick={send}
        disabled={pending || !lead.email}
        className="w-full h-11 rounded-lg bg-red text-bg text-[14px] font-bold hover:bg-red-hover disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {pending ? "AI пише + изпраща..." : !lead.email ? "Няма имейл за изпращане" : "Изпрати персонализиран outreach"}
      </button>

    </div>
  );
}

// ============================================================
// HISTORY TAB
// ============================================================

function HistoryTab({ lead }: { lead: LeadDetail }) {
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = () => {
    startTransition(async () => {
      await updateLeadNotesAction(lead.id, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="card p-4">
        <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-2">Вътрешни бележки</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Напр. срещата е насрочена за петък, очаквам отговор за оферта..."
          className="w-full text-[12.5px] bg-surface rounded-md border border-line p-2.5 focus:outline-none focus:border-ink-5 resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          {saved && <span className="text-[11.5px] text-green flex items-center gap-1"><CheckCircle2 size={11} /> Запазено</span>}
          <div className="flex-1" />
          <button onClick={save} disabled={pending} className="h-8 px-3 rounded-md bg-ink text-bg text-[12px] font-semibold hover:bg-ink-2 disabled:opacity-50 inline-flex items-center gap-1.5">
            {pending && <Loader2 size={11} className="animate-spin" />}
            Запази
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-2">История на изпращания</div>
        <p className="text-[12px] text-ink-4">
          Скоро — list на всички изпратени имейли и получени отговори за този lead.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function TabBtn({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Mail; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-9 px-3 flex items-center gap-1.5 text-[12.5px] font-semibold transition ${active ? "text-ink" : "text-ink-3 hover:text-ink"}`}
    >
      <Icon size={12} />
      {label}
      {active && <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-red" />}
    </button>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-ink-4 mt-0.5 shrink-0" />
      <span className="text-ink-4 w-[70px] shrink-0">{label}</span>
      <span className="flex-1 min-w-0 break-words">{value}</span>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const c = scoreColor(score);
  const bg = score >= 90 ? "var(--green-soft)" : score >= 75 ? "var(--amber-soft)" : score >= 60 ? "var(--blue-soft)" : "var(--surface)";
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded mono text-[12px] font-bold" style={{ color: c, background: bg }}>
      <Hash size={9} />{score}
    </span>
  );
}

function scoreColor(score: number) {
  return score >= 90 ? "var(--green)" : score >= 75 ? "var(--amber)" : score >= 60 ? "var(--blue)" : "var(--ink-4)";
}

function safeJson<T = unknown>(s: string | null | undefined): T | undefined {
  if (!s) return undefined;
  try { return JSON.parse(s) as T; } catch { return undefined; }
}
