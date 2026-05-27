import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace, getCurrentUser } from "@/lib/workspace";
import { KpiCard } from "@/components/KpiCard";
import { FunnelChart } from "@/components/FunnelChart";
import { Users, Send, MessageSquare, CalendarCheck, ArrowRight, TrendingUp } from "lucide-react";
import { formatNumber, STATUS_META, timeAgoBg } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const workspace = await getCurrentWorkspace();
  const user = await getCurrentUser();

  const [totalLeads, sent7d, replies7d, meetingsMonth, campaigns, recentLeads, recentThreads] = await Promise.all([
    prisma.lead.count({ where: { workspaceId: workspace.id } }),
    prisma.message.count({ where: { campaign: { workspaceId: workspace.id }, status: { in: ["sent", "opened", "replied"] }, sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60_000) } } }),
    prisma.inboxThread.count({ where: { workspaceId: workspace.id } }),
    prisma.lead.count({ where: { workspaceId: workspace.id, status: "meeting" } }),
    prisma.campaign.findMany({ where: { workspaceId: workspace.id, status: "active" }, orderBy: { sent: "desc" }, take: 5 }),
    prisma.lead.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.inboxThread.findMany({ where: { workspaceId: workspace.id, unread: true }, orderBy: { lastAt: "desc" }, take: 5 }),
  ]);

  // Synthetic but realistic numbers for the demo (mirror data.js)
  const kpiData = {
    totalLeads: { value: 12847, delta: "+18.4%", sub: "намерени тази седмица", spark: [120, 168, 142, 201, 188, 234, 211, 256, 240, 289, 274, 312, 298, 341] },
    emailsSent: { value: 4291, delta: "+12.1%", sub: "през последните 7 дни", spark: [200, 240, 280, 310, 340, 360, 380, 400, 420, 410, 430, 450, 440, 470] },
    replies:    { value: 412, delta: "+24.7%", sub: "reply rate 9.6%", spark: [20, 28, 32, 30, 35, 38, 36, 40, 42, 45, 44, 48, 46, 52] },
    meetings:   { value: 87, delta: "+6.2%", sub: "насрочени този месец", spark: [3, 4, 5, 4, 6, 7, 5, 6, 8, 7, 9, 8, 10, 11] },
  };

  const funnelSeries = {
    sent:    [120, 168, 142, 201, 188, 234, 211, 256, 240, 289, 274, 312, 298, 341],
    replied: [12, 18, 16, 22, 21, 27, 24, 31, 29, 34, 33, 39, 36, 42],
    meeting: [2, 3, 3, 4, 5, 6, 5, 7, 7, 8, 8, 10, 9, 11],
  };

  const replyRate = ((kpiData.replies.value / kpiData.emailsSent.value) * 100).toFixed(1);
  const meetingRate = ((kpiData.meetings.value / kpiData.replies.value) * 100).toFixed(1);
  const overallConv = ((kpiData.meetings.value / kpiData.emailsSent.value) * 100).toFixed(1);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-[40px] font-bold leading-none tracking-tight">Добро утро,</h1>
          <span className="text-[40px] font-serif-italic leading-none text-red">{user.name?.split(" ")[0] ?? "Мария"}</span>
          <span className="ml-2 flex items-center gap-1.5 px-2 py-1 rounded bg-red-soft border border-red-tint">
            <span className="live-dot" />
            <span className="text-[11px] mono font-bold text-red uppercase tracking-widest">Live</span>
          </span>
        </div>
        <p className="text-[14px] text-ink-3 max-w-[640px]">
          Тук е обобщението от последните 7 дни. Агентът насрочи <strong className="text-ink">{kpiData.meetings.value} срещи</strong> без human input · намери <strong className="text-ink">{formatNumber(totalLeads)}</strong> нови lead-а в системата.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiCard label="Общо lead-ове"    value={kpiData.totalLeads.value} delta={kpiData.totalLeads.delta} sub={kpiData.totalLeads.sub} spark={kpiData.totalLeads.spark} Icon={Users}        accent="red" />
        <KpiCard label="Email-и изпратени" value={kpiData.emailsSent.value} delta={kpiData.emailsSent.delta} sub={kpiData.emailsSent.sub} spark={kpiData.emailsSent.spark} Icon={Send}         accent="blue" />
        <KpiCard label="Отговори"           value={kpiData.replies.value}    delta={kpiData.replies.delta}    sub={kpiData.replies.sub}    spark={kpiData.replies.spark}    Icon={MessageSquare} accent="amber" />
        <KpiCard label="Срещи насрочени"    value={kpiData.meetings.value}   delta={kpiData.meetings.delta}   sub={kpiData.meetings.sub}   spark={kpiData.meetings.spark}   Icon={CalendarCheck} accent="green" />
      </div>

      {/* Funnel + Active campaigns */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Funnel */}
        <div className="col-span-2 card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Pipeline funnel</div>
              <h2 className="text-[18px] font-bold flex items-baseline gap-2">
                Последните 14 дни
                <span className="text-[12px] text-ink-4 font-normal">· stacked bars</span>
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
              {["Daily", "Weekly", "Niche"].map((t, i) => (
                <button key={t} className={`px-3 py-1 text-[12px] font-semibold rounded-md transition ${i === 0 ? "bg-bg text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <FunnelChart series={funnelSeries} />

          <div className="mt-4 pt-4 border-t border-line grid grid-cols-3 gap-4">
            <ConversionRow icon="→" from="Send" to="Reply" rate={`${replyRate}%`} delta="+2.1%" deltaPositive />
            <ConversionRow icon="→" from="Reply" to="Meeting" rate={`${meetingRate}%`} delta="+4.3%" deltaPositive />
            <ConversionRow icon="⇒" from="Send" to="Meeting" rate={`${overallConv}%`} delta="+1.2%" deltaPositive />
          </div>
        </div>

        {/* Active campaigns */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Активни кампании</div>
              <h2 className="text-[18px] font-bold">{campaigns.length}</h2>
            </div>
            <Link href="/campaigns" className="text-[12px] font-semibold text-ink-3 hover:text-red flex items-center gap-1">
              Всички <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="space-y-3">
            {campaigns.map((c) => (
              <li key={c.id} className="border-b border-line last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-ink truncate">{c.name}</span>
                  <span className="text-[10px] mono font-bold" style={{ color: c.health >= 90 ? "var(--green)" : c.health >= 75 ? "var(--amber)" : "var(--red)" }}>
                    {c.health}%
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] mono text-ink-4">
                  <span>{c.niche}</span>
                  <span>·</span>
                  <span>{formatNumber(c.sent)} sent</span>
                  <span>·</span>
                  <span className="text-green">{c.replied} replies</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Hot replies + Recent leads */}
      <div className="grid grid-cols-2 gap-3">
        {/* Hot replies */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Горещи отговори</div>
              <h2 className="text-[18px] font-bold flex items-center gap-2">
                Нужни ти 5 минути <TrendingUp size={16} className="text-red" />
              </h2>
            </div>
            <Link href="/inbox" className="text-[12px] font-semibold text-ink-3 hover:text-red flex items-center gap-1">
              Inbox <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="space-y-3">
            {recentThreads.map((t) => (
              <li key={t.id} className="flex items-start gap-3 group cursor-pointer hover:bg-surface -mx-2 px-2 py-1.5 rounded-md transition">
                <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-bg shrink-0" style={{ background: "linear-gradient(135deg,#FFB347,#E10C2F)" }}>
                  {t.fromName?.[0] ?? t.fromEmail[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[13px] font-semibold text-ink truncate">{t.fromName ?? t.fromEmail}</span>
                    <span className="text-[10.5px] mono text-ink-4 shrink-0 ml-2">{timeAgoBg(t.lastAt)}</span>
                  </div>
                  <div className="text-[11.5px] text-ink-4 mb-1">{t.fromCompany}</div>
                  <div className="text-[12px] text-ink-3 line-clamp-1">{t.lastPreview}</div>
                </div>
                {t.intent && (
                  <span
                    className="pill shrink-0 mt-0.5"
                    style={{
                      background: t.intent === "hot" ? "var(--red-soft)" : t.intent === "interested" ? "var(--green-soft)" : "var(--surface-2)",
                      color: t.intent === "hot" ? "var(--red)" : t.intent === "interested" ? "var(--green)" : "var(--ink-3)",
                    }}
                  >
                    {t.intent === "hot" ? "Hot" : t.intent === "interested" ? "Interested" : t.intent}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Recent leads */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Нови lead-ове</div>
              <h2 className="text-[18px] font-bold">Топ намерени днес</h2>
            </div>
            <Link href="/leads" className="text-[12px] font-semibold text-ink-3 hover:text-red flex items-center gap-1">
              Всички <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="space-y-2">
            {recentLeads.map((lead) => {
              const meta = STATUS_META[lead.status] ?? STATUS_META.new;
              return (
                <li key={lead.id} className="flex items-center gap-3 py-1.5 group cursor-pointer hover:bg-surface -mx-2 px-2 rounded-md transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-semibold text-ink truncate">{lead.company}</span>
                      <span className="text-[10px] mono text-ink-5">·</span>
                      <span className="text-[11px] text-ink-4">{lead.niche}</span>
                    </div>
                    <div className="text-[11px] text-ink-4 mono">
                      {lead.city ?? "—"}, {lead.country ?? ""} · {lead.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="pill" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    <div className="mono text-[12px] font-bold w-8 text-right text-ink">{lead.score}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ConversionRow({ icon, from, to, rate, delta, deltaPositive }: { icon: string; from: string; to: string; rate: string; delta: string; deltaPositive: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[11px] mono uppercase tracking-wider text-ink-4 mb-0.5">
          {from} {icon} {to}
        </div>
        <div className="text-[22px] mono font-bold tracking-tight">{rate}</div>
      </div>
      <span
        className="text-[10.5px] mono font-bold px-1.5 py-0.5 rounded"
        style={{
          background: deltaPositive ? "var(--green-soft)" : "var(--red-soft)",
          color: deltaPositive ? "var(--green)" : "var(--red)",
        }}
      >
        {deltaPositive ? "↑" : "↓"} {delta}
      </span>
    </div>
  );
}
