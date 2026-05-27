import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";
import { STATUS_META, NICHE_META, timeAgoBg, formatNumber } from "@/lib/utils";
import { Plus, Filter, MoreHorizontal, Globe, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

const STAGES: { key: string; label: string }[] = [
  { key: "new",        label: "Нов" },
  { key: "contacted",  label: "Контактиран" },
  { key: "replied",    label: "Отговорил" },
  { key: "interested", label: "Заинтересован" },
  { key: "meeting",    label: "Среща" },
  { key: "closed",     label: "Closed-Won" },
];

export default async function PipelinePage() {
  const workspace = await getCurrentWorkspace();
  const leads = await prisma.lead.findMany({
    where: { workspaceId: workspace.id },
    include: { owner: true },
    orderBy: [{ score: "desc" }, { lastTouchAt: "desc" }],
  });

  const byStage: Record<string, typeof leads> = {};
  for (const s of STAGES) byStage[s.key] = [];
  for (const l of leads) {
    if (byStage[l.status]) byStage[l.status].push(l);
  }

  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Sales pipeline</div>
          <h1 className="text-[32px] font-bold tracking-tight leading-none mb-2">
            Pipeline <span className="font-serif-italic text-red ml-2">{formatNumber(leads.length)}</span>
          </h1>
          <p className="text-[13px] text-ink-3">Drag-and-drop статус — AI автоматично местя lead-овете когато получи отговори.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold text-ink-2 hover:bg-surface">
            <Filter size={13} /> Owner: Всички
          </button>
          <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-ink text-bg text-[12.5px] font-semibold hover:bg-ink-2 transition">
            <Plus size={13} /> Добави lead
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-6 gap-3 min-h-[600px]">
        {STAGES.map((stage) => {
          const items = byStage[stage.key];
          const meta = STATUS_META[stage.key];
          return (
            <div key={stage.key} className="card flex flex-col">
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-line flex items-center justify-between sticky top-0 bg-bg rounded-t-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                  <span className="text-[12.5px] font-bold">{stage.label}</span>
                  <span className="text-[10.5px] mono px-1.5 py-px rounded-full bg-surface-2 text-ink-3 font-semibold">
                    {items.length}
                  </span>
                </div>
                <button className="text-ink-4 hover:text-ink"><MoreHorizontal size={14} /></button>
              </div>

              {/* Cards */}
              <ul className="flex-1 overflow-y-auto p-2 space-y-2">
                {items.map((lead) => {
                  const niche = NICHE_META[lead.niche] ?? { color: "#71717A", label: lead.niche };
                  const pains: string[] = lead.painPoints ? JSON.parse(lead.painPoints) : [];
                  return (
                    <li key={lead.id} className="bg-bg border border-line rounded-lg p-2.5 hover:border-ink-5 cursor-grab active:cursor-grabbing transition group">
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-md grid place-items-center text-[10px] font-bold text-bg shrink-0" style={{ background: niche.color }}>
                          {lead.company.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold truncate leading-tight">{lead.company}</div>
                          <div className="text-[10.5px] text-ink-4 mono truncate">{niche.label}</div>
                        </div>
                        <ScorePill score={lead.score} />
                      </div>

                      {lead.city && (
                        <div className="flex items-center gap-1 text-[10.5px] text-ink-4 mb-1">
                          <MapPin size={9} />
                          {lead.city}, <span className="mono">{lead.country}</span>
                        </div>
                      )}

                      {pains[0] && (
                        <div className="text-[10.5px] px-1.5 py-0.5 rounded bg-red-soft text-red font-medium truncate mb-1.5" title={pains[0]}>
                          {pains[0]}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] mono text-ink-4 pt-1 border-t border-line">
                        <span>{lead.lastTouchAt ? timeAgoBg(lead.lastTouchAt) : "—"}</span>
                        <div className="flex items-center gap-1">
                          {lead.owner ? (
                            <div className="w-4 h-4 rounded-full grid place-items-center text-[8px] font-bold text-bg" style={{ background: "linear-gradient(135deg,#FFB347,#E10C2F)" }}>
                              {lead.owner.name?.[0]}
                            </div>
                          ) : (
                            <span className="px-1 rounded bg-ink text-bg text-[9px] font-bold">AI</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {items.length === 0 && (
                  <li className="text-center py-6 text-[11px] text-ink-4">— празно —</li>
                )}
              </ul>

              {/* Footer */}
              <div className="px-3 py-2 border-t border-line text-[10.5px] mono text-ink-4 flex items-center justify-between">
                <span>{items.length} lead-а</span>
                <button className="hover:text-red flex items-center gap-0.5">
                  <Plus size={11} /> Добави
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 90 ? "var(--green)" : score >= 75 ? "var(--amber)" : "var(--ink-4)";
  const bg = score >= 90 ? "var(--green-soft)" : score >= 75 ? "var(--amber-soft)" : "var(--surface-2)";
  return (
    <span className="text-[10.5px] mono font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color, background: bg }}>
      {score}
    </span>
  );
}
