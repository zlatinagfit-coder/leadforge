import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";
import { STATUS_META, NICHE_META, formatNumber, timeAgoBg } from "@/lib/utils";
import { Filter, Download, Search, Plus, Sparkles, Globe, Mail, Phone, MapPin, Linkedin, Instagram, MoreHorizontal } from "lucide-react";
import { FindNewLeadsButton } from "@/components/FindNewLeadsButton";
import { LeadStatusDropdown } from "@/components/LeadStatusDropdown";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const workspace = await getCurrentWorkspace();
  const leads = await prisma.lead.findMany({
    where: { workspaceId: workspace.id },
    include: { owner: true },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });

  const counts = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    replied: leads.filter((l) => l.status === "replied").length,
    interested: leads.filter((l) => l.status === "interested").length,
    meeting: leads.filter((l) => l.status === "meeting").length,
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">База от lead-ове</div>
          <h1 className="text-[32px] font-bold tracking-tight leading-none mb-2">Lead-ове <span className="font-serif-italic text-red ml-2">{formatNumber(counts.total)}</span></h1>
          <p className="text-[13px] text-ink-3">Всеки lead е намерен от AI, проверен, scored и готов за outreach.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold text-ink-2 hover:bg-surface transition">
            <Download size={13} /> Експортирай CSV
          </button>
          <FindNewLeadsButton />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-line">
        <TabBtn label="Всички" count={counts.total} active />
        <TabBtn label="Нови"            count={counts.new}        color={STATUS_META.new.color} />
        <TabBtn label="Контактирани"    count={counts.contacted}  color={STATUS_META.contacted.color} />
        <TabBtn label="Отговорили"      count={counts.replied}    color={STATUS_META.replied.color} />
        <TabBtn label="Заинтересовани"  count={counts.interested} color={STATUS_META.interested.color} />
        <TabBtn label="Срещи"           count={counts.meeting}    color={STATUS_META.meeting.color} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input placeholder="Търси по име, домейн, имейл..." className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface border border-line text-[13px] placeholder:text-ink-4 focus:outline-none focus:border-ink-5" />
        </div>
        <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold text-ink-2 hover:bg-surface">
          <Filter size={13} /> Ниша
        </button>
        <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold text-ink-2 hover:bg-surface">
          <Filter size={13} /> Държава
        </button>
        <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold text-ink-2 hover:bg-surface">
          <Filter size={13} /> Score
        </button>
        <div className="flex-1" />
        <div className="text-[11.5px] mono text-ink-4">{leads.length} от {leads.length}</div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-surface border-b border-line text-[11px] mono uppercase tracking-wider text-ink-4">
              <th className="text-left py-2.5 px-4 font-semibold w-8"><input type="checkbox" className="w-3.5 h-3.5 accent-red" /></th>
              <th className="text-left py-2.5 px-3 font-semibold">Бизнес</th>
              <th className="text-left py-2.5 px-3 font-semibold">Локация</th>
              <th className="text-left py-2.5 px-3 font-semibold">Контакти</th>
              <th className="text-left py-2.5 px-3 font-semibold">Pain points</th>
              <th className="text-left py-2.5 px-3 font-semibold">Owner</th>
              <th className="text-right py-2.5 px-3 font-semibold">Score</th>
              <th className="text-left py-2.5 px-3 font-semibold">Статус</th>
              <th className="text-right py-2.5 px-3 font-semibold">Активност</th>
              <th className="py-2.5 px-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const meta = STATUS_META[lead.status] ?? STATUS_META.new;
              const niche = NICHE_META[lead.niche] ?? { color: "#71717A", label: lead.niche };
              const pains: string[] = lead.painPoints ? JSON.parse(lead.painPoints) : [];
              return (
                <tr key={lead.id} className="border-b border-line last:border-0 hover:bg-surface transition group">
                  <td className="py-3 px-4"><input type="checkbox" className="w-3.5 h-3.5 accent-red" /></td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg grid place-items-center text-[10.5px] font-bold text-bg shrink-0" style={{ background: niche.color }}>
                        {lead.company.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate">{lead.company}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10.5px] mono px-1.5 py-px rounded" style={{ color: niche.color, background: niche.color + "12" }}>{niche.label}</span>
                          {lead.website && (
                            <a href={`https://${lead.website}`} target="_blank" rel="noreferrer" className="text-[10.5px] mono text-ink-4 hover:text-red flex items-center gap-0.5">
                              <Globe size={9} /> {lead.website}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 text-[12px] text-ink-3">
                      <MapPin size={11} className="text-ink-4" />
                      {lead.city ?? "—"}, <span className="mono text-ink-4">{lead.country}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="space-y-0.5 text-[11px]">
                      {lead.email && (
                        <div className="flex items-center gap-1 text-ink-3 mono">
                          <Mail size={10} className="text-ink-4" /> <span className="truncate max-w-[160px]">{lead.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        {lead.phone && <Phone size={10} className="text-green" />}
                        {lead.linkedin && <Linkedin size={10} className="text-blue" />}
                        {lead.instagram && <Instagram size={10} className="text-purple" />}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {pains.slice(0, 2).map((p, i) => (
                        <span key={i} className="text-[10.5px] px-1.5 py-0.5 rounded bg-red-soft text-red font-medium truncate max-w-[180px]" title={p}>
                          {p}
                        </span>
                      ))}
                      {pains.length > 2 && (
                        <span className="text-[10.5px] mono text-ink-4">+{pains.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {lead.owner ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full grid place-items-center text-[9px] font-bold text-bg" style={{ background: "linear-gradient(135deg,#FFB347,#E10C2F)" }}>
                          {lead.owner.name?.[0] ?? "?"}
                        </div>
                        <span className="text-[12px] text-ink-3 truncate">{lead.owner.name?.split(" ")[0]}</span>
                      </div>
                    ) : (
                      <span className="text-[10.5px] mono px-1.5 py-0.5 rounded bg-ink text-bg font-bold">AI</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <ScoreBadge score={lead.score} />
                  </td>
                  <td className="py-3 px-3">
                    <LeadStatusDropdown leadId={lead.id} currentStatus={lead.status} />
                  </td>
                  <td className="py-3 px-3 text-right text-[11px] mono text-ink-4">
                    {lead.lastTouchAt ? timeAgoBg(lead.lastTouchAt) : "—"}
                  </td>
                  <td className="py-3 px-3 opacity-0 group-hover:opacity-100 transition">
                    <button className="w-7 h-7 grid place-items-center rounded-md hover:bg-line">
                      <MoreHorizontal size={14} className="text-ink-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabBtn({ label, count, active = false, color }: { label: string; count: number; active?: boolean; color?: string }) {
  return (
    <button className={`relative h-10 px-4 flex items-center gap-2 text-[13px] font-semibold transition ${active ? "text-ink" : "text-ink-3 hover:text-ink"}`}>
      {color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      <span>{label}</span>
      <span className="text-[10.5px] mono text-ink-4">{count}</span>
      {active && <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-red" />}
    </button>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? "var(--green)" : score >= 75 ? "var(--amber)" : score >= 60 ? "var(--blue)" : "var(--ink-4)";
  const bg = score >= 90 ? "var(--green-soft)" : score >= 75 ? "var(--amber-soft)" : score >= 60 ? "var(--blue-soft)" : "var(--surface)";
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded mono text-[12px] font-bold" style={{ color, background: bg }}>
      {score}
    </span>
  );
}
