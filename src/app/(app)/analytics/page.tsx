import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";
import { TrendChart, ReplyRateChart, NichePie } from "@/components/charts";
import { formatNumber } from "@/lib/utils";
import { Calendar, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const workspace = await getCurrentWorkspace();
  const leads = await prisma.lead.findMany({ where: { workspaceId: workspace.id } });

  // Build 30-day trend data (synthetic for demo)
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const base = 80 + i * 8 + Math.round(Math.sin(i / 3) * 20);
    const replied = Math.round(base * 0.095 + Math.cos(i / 2) * 2);
    const meetings = Math.round(replied * 0.21);
    return {
      day: `${30 - i}д`,
      sent: base,
      replied,
      meetings,
    };
  }).reverse();

  const replyRateData = trendData.map((d) => ({
    day: d.day,
    rate: parseFloat(((d.replied / d.sent) * 100).toFixed(1)),
  }));

  // Niche distribution
  const nicheCounts: Record<string, number> = {};
  for (const l of leads) {
    nicheCounts[l.niche] = (nicheCounts[l.niche] || 0) + 1;
  }
  const nicheData = Object.entries(nicheCounts).map(([name, value]) => ({ name, value }));

  // Country breakdown
  const countryCounts: Record<string, number> = {};
  for (const l of leads) {
    if (l.country) countryCounts[l.country] = (countryCounts[l.country] || 0) + 1;
  }
  const countries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Performance analytics</div>
          <h1 className="text-[32px] font-bold tracking-tight leading-none mb-2">
            Аналитика <span className="font-serif-italic text-red ml-2">30 дни</span>
          </h1>
          <p className="text-[13px] text-ink-3">Реално време. AI follow-the-money — кои ниши, локации и кампании носят най-голяма възвръщаемост.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold text-ink-2 hover:bg-surface">
            <Calendar size={13} /> Последните 30 дни
          </button>
          <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold text-ink-2 hover:bg-surface">
            <Download size={13} /> Експорт PDF
          </button>
        </div>
      </div>

      {/* Big trend chart */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Outreach activity</div>
            <h2 className="text-[18px] font-bold">Send → Reply → Meeting · 30 дни</h2>
          </div>
          <div className="flex items-center gap-4 text-[11px] mono">
            <Legend color="#0A0A0A" label="Изпратени" value={formatNumber(trendData.reduce((a, d) => a + d.sent, 0))} />
            <Legend color="#E10C2F" label="Отговори" value={formatNumber(trendData.reduce((a, d) => a + d.replied, 0))} />
            <Legend color="#16A34A" label="Срещи" value={formatNumber(trendData.reduce((a, d) => a + d.meetings, 0))} />
          </div>
        </div>
        <TrendChart data={trendData} />
      </div>

      {/* Side-by-side */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-5">
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Reply rate trend</div>
          <h3 className="text-[16px] font-bold mb-3">9.6% средно <span className="text-[11px] mono text-green ml-1">↑ +2.1%</span></h3>
          <ReplyRateChart data={replyRateData} />
        </div>
        <div className="card p-5">
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Lead-ове по ниша</div>
          <h3 className="text-[16px] font-bold mb-3">{nicheData.length} ниши</h3>
          <NichePie data={nicheData} />
          <ul className="mt-2 space-y-1">
            {nicheData.slice(0, 4).map((n, i) => (
              <li key={n.name} className="flex items-center justify-between text-[11.5px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: ["#E10C2F", "#2563EB", "#16A34A", "#6E5CE8", "#B45309", "#0A0A0A"][i] }} />
                  <span className="text-ink-3">{n.name}</span>
                </span>
                <span className="mono text-ink-2 font-semibold">{n.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Топ държави</div>
          <h3 className="text-[16px] font-bold mb-3">{countries.length} активни</h3>
          <ul className="space-y-2.5">
            {countries.slice(0, 6).map(([code, n]) => {
              const pct = (n / leads.length) * 100;
              return (
                <li key={code}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="font-semibold mono">{code}</span>
                    <span className="mono text-ink-3">{n} <span className="text-ink-4">({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-red" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Best campaigns leaderboard */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Топ performers</div>
            <h2 className="text-[18px] font-bold">Най-добре работещи кампании</h2>
          </div>
        </div>
        <table className="w-full text-[13px]">
          <thead className="text-[10px] mono uppercase tracking-wider text-ink-4">
            <tr className="border-b border-line">
              <th className="text-left py-2 px-2 font-semibold">Кампания</th>
              <th className="text-right py-2 px-2 font-semibold">Изпратени</th>
              <th className="text-right py-2 px-2 font-semibold">Reply rate</th>
              <th className="text-right py-2 px-2 font-semibold">Срещи</th>
              <th className="text-right py-2 px-2 font-semibold">Conv.</th>
              <th className="text-right py-2 px-2 font-semibold">Health</th>
            </tr>
          </thead>
          <tbody>
            {(await prisma.campaign.findMany({ where: { workspaceId: workspace.id }, orderBy: { meetings: "desc" }, take: 6 })).map((c) => {
              const replyRate = c.sent > 0 ? ((c.replied / c.sent) * 100) : 0;
              const conv = c.sent > 0 ? ((c.meetings / c.sent) * 100) : 0;
              return (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="py-3 px-2">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-[10.5px] mono text-ink-4">{c.niche}</div>
                  </td>
                  <td className="py-3 px-2 text-right mono">{formatNumber(c.sent)}</td>
                  <td className="py-3 px-2 text-right mono font-bold" style={{ color: replyRate > 10 ? "var(--green)" : "var(--ink-2)" }}>{replyRate.toFixed(1)}%</td>
                  <td className="py-3 px-2 text-right mono font-bold text-ink">{c.meetings}</td>
                  <td className="py-3 px-2 text-right mono text-red font-bold">{conv.toFixed(1)}%</td>
                  <td className="py-3 px-2 text-right mono" style={{ color: c.health >= 90 ? "var(--green)" : c.health >= 75 ? "var(--amber)" : "var(--red)" }}>{c.health}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-ink-4">{label}</span>
      <span className="text-ink font-bold">{value}</span>
    </div>
  );
}
