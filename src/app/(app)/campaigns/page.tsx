import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";
import { formatNumber } from "@/lib/utils";
import { Plus, Sparkles, Pause, Play, MoreHorizontal, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  active:    { label: "Активна",  bg: "var(--green-soft)", color: "var(--green)" },
  paused:    { label: "Спряна",   bg: "var(--amber-soft)", color: "var(--amber)" },
  draft:     { label: "Чернова",  bg: "var(--surface-2)",  color: "var(--ink-3)" },
  completed: { label: "Завършена", bg: "var(--surface-2)", color: "var(--ink-3)" },
};

export default async function CampaignsPage() {
  const workspace = await getCurrentWorkspace();
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sent,
      replied: acc.replied + c.replied,
      meetings: acc.meetings + c.meetings,
    }),
    { sent: 0, replied: 0, meetings: 0 }
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Outreach engine</div>
          <h1 className="text-[32px] font-bold tracking-tight leading-none mb-2">
            Кампании <span className="font-serif-italic text-red ml-2">{campaigns.length}</span>
          </h1>
          <p className="text-[13px] text-ink-3">
            Всяка кампания има AI-генерирана секвенция от 3-5 имейла, авто-follow-up и smart timing.
          </p>
        </div>
        <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-ink text-bg text-[12.5px] font-semibold hover:bg-ink-2 transition">
          <Plus size={13} /> Нова кампания
        </button>
      </div>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Активни кампании" value={campaigns.filter((c) => c.status === "active").length.toString()} sub={`от ${campaigns.length} общо`} />
        <SummaryCard label="Изпратени имейли" value={formatNumber(totals.sent)} sub="този месец" />
        <SummaryCard label="Отговори"          value={formatNumber(totals.replied)} sub={`${((totals.replied / totals.sent || 0) * 100).toFixed(1)}% reply rate`} accent />
        <SummaryCard label="Срещи насрочени"   value={formatNumber(totals.meetings)} sub={`${((totals.meetings / totals.replied || 0) * 100).toFixed(1)}% от отговори`} />
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.map((c) => {
          const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.draft;
          const replyRate = c.sent > 0 ? ((c.replied / c.sent) * 100).toFixed(1) : "0.0";
          const openRate = c.sent > 0 ? ((c.opened / c.sent) * 100).toFixed(1) : "0.0";

          return (
            <div key={c.id} className="card card-hover p-5 transition">
              <div className="flex items-start gap-5">
                {/* Left: meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-[16px] font-bold truncate">{c.name}</h3>
                    <span className="pill" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-ink-4">
                    {c.niche && <span className="mono">{c.niche}</span>}
                    {c.targetCountry && (
                      <>
                        <span>·</span>
                        <span className="mono">{c.targetCountry}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>Health <strong className="text-ink-2 mono">{c.health}%</strong></span>
                  </div>
                </div>

                {/* Right: stats */}
                <div className="flex items-center gap-6 shrink-0">
                  <StatCol label="Изпратени"  value={formatNumber(c.sent)}     />
                  <StatCol label="Отворени"   value={formatNumber(c.opened)}   sub={`${openRate}%`} />
                  <StatCol label="Отговори"   value={formatNumber(c.replied)}  sub={`${replyRate}%`} accent />
                  <StatCol label="Срещи"      value={formatNumber(c.meetings)} highlight />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-2">
                  <button className="w-8 h-8 grid place-items-center rounded-md hover:bg-surface text-ink-3" title={c.status === "active" ? "Спри" : "Стартирай"}>
                    {c.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button className="w-8 h-8 grid place-items-center rounded-md hover:bg-surface text-ink-3">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-1 rounded-full bg-surface-2 overflow-hidden flex">
                  <div className="bg-ink" style={{ width: `${(c.opened / Math.max(c.sent, 1)) * 100}%` }} />
                  <div className="bg-red" style={{ width: `${(c.replied / Math.max(c.sent, 1)) * 100}%` }} />
                  <div className="bg-green" style={{ width: `${(c.meetings / Math.max(c.sent, 1)) * 100}%` }} />
                </div>
                <button className="text-[11.5px] mono font-bold text-ink-3 hover:text-red flex items-center gap-0.5">
                  Детайли <ArrowUpRight size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state hint */}
      <div className="mt-6 card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-soft grid place-items-center">
            <Sparkles size={18} className="text-red" />
          </div>
          <div>
            <div className="text-[14px] font-bold mb-0.5">AI препоръка</div>
            <div className="text-[12px] text-ink-3">Виждам че ниша „Адвокати" има 24 нови lead-а без кампания. Препоръчвам да създадеш sequence сега.</div>
          </div>
        </div>
        <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-ink text-bg text-[12.5px] font-semibold hover:bg-ink-2 transition">
          <Plus size={13} /> Създай от AI
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] mono uppercase tracking-wider text-ink-4 mb-2">{label}</div>
      <div className={`text-[28px] mono font-bold leading-none mb-1 ${accent ? "text-red" : "text-ink"}`}>{value}</div>
      <div className="text-[11px] text-ink-4">{sub}</div>
    </div>
  );
}

function StatCol({ label, value, sub, accent, highlight }: { label: string; value: string; sub?: string; accent?: boolean; highlight?: boolean }) {
  return (
    <div className="text-right min-w-[72px]">
      <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">{label}</div>
      <div className={`text-[18px] mono font-bold leading-none ${highlight ? "text-green" : accent ? "text-red" : "text-ink"}`}>{value}</div>
      {sub && <div className="text-[10.5px] mono text-ink-4 mt-1">{sub}</div>}
    </div>
  );
}
