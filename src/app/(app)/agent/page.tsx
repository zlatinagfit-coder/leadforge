import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";
import { timeAgoBg } from "@/lib/utils";
import { Bot, Power, Settings2, AlertTriangle, Search, Sparkles, FileEdit, Send, MessageSquare, CalendarCheck, RotateCw } from "lucide-react";

export const dynamic = "force-dynamic";

const KIND_META: Record<string, { Icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bg: string }> = {
  scrape:   { Icon: Search,        color: "var(--blue)",   bg: "var(--blue-soft)" },
  analyze:  { Icon: Sparkles,      color: "var(--purple)", bg: "var(--purple-soft)" },
  compose:  { Icon: FileEdit,      color: "var(--amber)",  bg: "var(--amber-soft)" },
  send:     { Icon: Send,          color: "var(--red)",    bg: "var(--red-soft)" },
  reply:    { Icon: MessageSquare, color: "var(--green)",  bg: "var(--green-soft)" },
  meeting:  { Icon: CalendarCheck, color: "var(--green)",  bg: "var(--green-soft)" },
  followup: { Icon: RotateCw,      color: "var(--ink-3)",  bg: "var(--surface)" },
  error:    { Icon: AlertTriangle, color: "var(--red)",    bg: "var(--red-soft)" },
};

export default async function AgentPage() {
  const workspace = await getCurrentWorkspace();
  const activity = await prisma.aiActivity.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Автономен sales агент</div>
          <h1 className="text-[32px] font-bold tracking-tight leading-none mb-2 flex items-center gap-3">
            AI Агент
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-soft border border-green/20">
              <span className="live-dot" style={{ background: "var(--green)" }} />
              <span className="text-[11px] mono font-bold text-green uppercase tracking-widest">Активен</span>
            </span>
          </h1>
          <p className="text-[13px] text-ink-3">Работи 14 часа · скрейпна 47 lead-а · изпрати 38 имейла · насрочи 2 срещи без human input.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold text-ink-2 hover:bg-surface">
            <Settings2 size={13} /> Настрой агент
          </button>
          <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-red-soft border border-red-tint text-[12.5px] font-semibold text-red hover:bg-red-tint transition">
            <Power size={13} /> Спри агента
          </button>
        </div>
      </div>

      {/* Agent stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <AgentStat label="Време активен" value="14ч 22м" sub="от вчера 09:30" />
        <AgentStat label="Lead-ове открити" value="47" sub="последен час" />
        <AgentStat label="Email-и съчинени" value="38" sub="чрез GPT-4o" />
        <AgentStat label="Срещи насрочени" value="2" sub="чрез Cal.com" />
      </div>

      {/* Capabilities & current run */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="col-span-2 card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bot size={16} className="text-red" />
            <span className="text-[10px] mono uppercase tracking-wider text-ink-4">Текуща мисия</span>
          </div>
          <h3 className="text-[16px] font-bold mb-3">Намери 50 нови lead-а в ниша „Зъболекари UK" и пусни Sequence-EU-Q2</h3>
          <div className="space-y-2 text-[12.5px]">
            <Step done text="Скрейпнах 47 нови бизнеси от Google Maps · Manchester, Leeds, Bristol" />
            <Step done text="Обогатих с emails — 41 имейла валидирани (87%)" />
            <Step done text="Анализирах сайтовете — pain points + score за всеки" />
            <Step active text="Пиша персонализирани outreach-и · 23/47 готови" />
            <Step text="Изпращам през inbox bg-01 · след 14:00 GMT (timezone aware)" />
            <Step text="Чакам отговори · auto-follow-up след 3 дни" />
          </div>
        </div>

        <div className="card p-5">
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-3">Възможности на агента</div>
          <ul className="space-y-2.5 text-[12.5px]">
            <Cap on label="Google Maps scrape" />
            <Cap on label="Email finder (Hunter + pattern)" />
            <Cap on label="Уебсайт анализатор (Lighthouse + AI)" />
            <Cap on label="GPT-4o copywriter" />
            <Cap on label="Resend / Gmail SMTP" />
            <Cap on label="IMAP inbox monitoring" />
            <Cap on label="Reply classifier (sentiment + intent)" />
            <Cap label="Auto-meeting via Cal.com" />
            <Cap label="LinkedIn outreach (Q3 roadmap)" />
          </ul>
        </div>
      </div>

      {/* Full activity log */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Activity log</div>
            <h2 className="text-[18px] font-bold">Цялата история на агента</h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] mono">
            <button className="px-2 py-1 rounded bg-ink text-bg font-bold">Всички</button>
            <button className="px-2 py-1 rounded hover:bg-surface text-ink-3">Грешки</button>
            <button className="px-2 py-1 rounded hover:bg-surface text-ink-3">Изпратени</button>
            <button className="px-2 py-1 rounded hover:bg-surface text-ink-3">Отговори</button>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {activity.map((a) => {
            const meta = KIND_META[a.kind] ?? KIND_META.followup;
            return (
              <li key={a.id} className="py-3 flex items-start gap-3 hover:bg-surface -mx-3 px-3 rounded transition">
                <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: meta.bg, color: meta.color }}>
                  <meta.Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-ink leading-snug">{a.text}</div>
                  <div className="flex items-center gap-2 text-[10.5px] mono text-ink-4 mt-1">
                    <span className="px-1.5 py-px rounded bg-surface-2 text-ink-3">{a.tag}</span>
                    <span>·</span>
                    <span>{timeAgoBg(a.createdAt)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function AgentStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-2">{label}</div>
      <div className="text-[28px] mono font-bold leading-none mb-1">{value}</div>
      <div className="text-[11px] text-ink-4">{sub}</div>
    </div>
  );
}

function Step({ done, active, text }: { done?: boolean; active?: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-4 h-4 rounded-full grid place-items-center shrink-0 mt-0.5 ${done ? "bg-green text-bg" : active ? "bg-red text-bg" : "bg-surface-2 text-ink-4"}`}>
        {done ? (
          <svg viewBox="0 0 20 20" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4 4 8-8" /></svg>
        ) : active ? (
          <span className="live-dot" style={{ background: "currentColor" }} />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
        )}
      </div>
      <span className={done ? "text-ink-3 line-through decoration-1" : active ? "text-ink font-semibold" : "text-ink-3"}>
        {text}
      </span>
    </div>
  );
}

function Cap({ label, on }: { label: string; on?: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-ink-2">{label}</span>
      <span className={`text-[10px] mono px-1.5 py-0.5 rounded font-bold ${on ? "bg-green-soft text-green" : "bg-surface-2 text-ink-4"}`}>
        {on ? "ON" : "Soon"}
      </span>
    </li>
  );
}
