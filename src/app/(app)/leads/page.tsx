import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";
import { STATUS_META, NICHE_META, formatNumber, timeAgoBg } from "@/lib/utils";
import { Download, Search, Plus, Sparkles, Globe, Mail, Phone, MapPin, MoreHorizontal, Linkedin, Instagram } from "lucide-react";
import { FindNewLeadsButton } from "@/components/FindNewLeadsButton";
import { LeadStatusDropdown } from "@/components/LeadStatusDropdown";
import { SendOutreachButton } from "@/components/SendOutreachButton";
import { LeadsToolbar } from "@/components/LeadsToolbar";
import { LeadRowTrigger } from "@/components/LeadRowTrigger";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; q?: string; niche?: string }>;

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const { status, q, niche } = await searchParams;
  const workspace = await getCurrentWorkspace();

  const allLeads = await prisma.lead.findMany({
    where: { workspaceId: workspace.id },
    include: { owner: true },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });

  // Apply filters
  const search = (q ?? "").toLowerCase().trim();
  const leads = allLeads.filter((l) => {
    if (status && status !== "all" && l.status !== status) return false;
    if (niche && l.niche !== niche) return false;
    if (search) {
      const hay = `${l.company} ${l.email ?? ""} ${l.website ?? ""} ${l.city ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const counts = {
    total: allLeads.length,
    new: allLeads.filter((l) => l.status === "new").length,
    contacted: allLeads.filter((l) => l.status === "contacted").length,
    replied: allLeads.filter((l) => l.status === "replied").length,
    interested: allLeads.filter((l) => l.status === "interested").length,
    meeting: allLeads.filter((l) => l.status === "meeting").length,
  };

  const niches = [...new Set(allLeads.map((l) => l.niche))].filter(Boolean);
  const activeStatus = status ?? "all";

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
          <FindNewLeadsButton />
        </div>
      </div>

      {/* Status tabs — functional via URL params */}
      <div className="flex items-center gap-1 mb-5 border-b border-line overflow-x-auto">
        <TabLink label="Всички" count={counts.total} status="all" active={activeStatus === "all"} />
        <TabLink label="Нови"            count={counts.new}        status="new"        active={activeStatus === "new"}        color={STATUS_META.new.color} />
        <TabLink label="Контактирани"    count={counts.contacted}  status="contacted"  active={activeStatus === "contacted"}  color={STATUS_META.contacted.color} />
        <TabLink label="Отговорили"      count={counts.replied}    status="replied"    active={activeStatus === "replied"}    color={STATUS_META.replied.color} />
        <TabLink label="Заинтересовани"  count={counts.interested} status="interested" active={activeStatus === "interested"} color={STATUS_META.interested.color} />
        <TabLink label="Срещи"           count={counts.meeting}    status="meeting"    active={activeStatus === "meeting"}    color={STATUS_META.meeting.color} />
      </div>

      {/* Toolbar — search + niche filter */}
      <LeadsToolbar niches={niches} currentNiche={niche} currentSearch={q} resultCount={leads.length} totalCount={allLeads.length} />

      {/* Empty state */}
      {allLeads.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-soft grid place-items-center mx-auto mb-3">
            <Sparkles size={20} className="text-red" />
          </div>
          <h3 className="text-[18px] font-bold mb-1">Все още няма lead-ове</h3>
          <p className="text-[13px] text-ink-3 mb-4 max-w-[400px] mx-auto">
            Кликни „Намери нови" за да започнеш скрейпване на Google Maps. AI ще намери, анализира и обогати lead-овете автоматично.
          </p>
          <div className="flex items-center justify-center gap-2">
            <FindNewLeadsButton />
          </div>
        </div>
      )}

      {/* No results with current filters */}
      {allLeads.length > 0 && leads.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-[13px] text-ink-3">Няма lead-ове отговарящи на филтрите.</p>
        </div>
      )}

      {/* Table */}
      {leads.length > 0 && (
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
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                      <LeadRowTrigger lead={{
                        id: lead.id,
                        company: lead.company,
                        niche: lead.niche,
                        city: lead.city,
                        country: lead.country,
                        website: lead.website,
                        email: lead.email,
                        phone: lead.phone,
                        score: lead.score,
                        status: lead.status,
                        industry: lead.industry,
                        painPoints: lead.painPoints,
                        analysis: lead.analysis,
                        notes: lead.notes,
                      }} />
                      <SendOutreachButton leadId={lead.id} leadEmail={lead.email} leadCompany={lead.company} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function TabLink({ label, count, status, active = false, color }: { label: string; count: number; status: string; active?: boolean; color?: string }) {
  const href = status === "all" ? "/leads" : `/leads?status=${status}`;
  return (
    <Link href={href} className={`relative h-10 px-4 flex items-center gap-2 text-[13px] font-semibold whitespace-nowrap transition ${active ? "text-ink" : "text-ink-3 hover:text-ink"}`}>
      {color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      <span>{label}</span>
      <span className="text-[10.5px] mono text-ink-4">{count}</span>
      {active && <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-red" />}
    </Link>
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
