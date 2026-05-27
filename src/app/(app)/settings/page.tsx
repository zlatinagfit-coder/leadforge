import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";
import { Building2, Palette, Globe, Users, Mail, Key, CreditCard, Sparkles, Check, Plus, Crown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const workspace = await getCurrentWorkspace();
  const members = await prisma.membership.findMany({
    where: { workspaceId: workspace.id },
    include: { user: true },
  });
  const inboxes = await prisma.sendingInbox.findMany({
    where: { workspaceId: workspace.id },
  });

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Workspace администрация</div>
        <h1 className="text-[32px] font-bold tracking-tight leading-none mb-2">Настройки</h1>
        <p className="text-[13px] text-ink-3">White-label brandиране, екип, sending инфраструктура и плащания.</p>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-6">
        {/* Side nav */}
        <nav className="space-y-0.5 sticky top-[80px] self-start">
          <SettingsNav Icon={Building2} label="Workspace" active />
          <SettingsNav Icon={Palette}   label="Brandиране" />
          <SettingsNav Icon={Globe}     label="Custom domain" />
          <SettingsNav Icon={Users}     label="Екип" />
          <SettingsNav Icon={Mail}      label="Sending inboxes" />
          <SettingsNav Icon={Key}       label="API ключове" />
          <SettingsNav Icon={CreditCard} label="Билинг & план" />
        </nav>

        {/* Content */}
        <div className="space-y-6">
          {/* Workspace */}
          <Section title="Workspace" subtitle="Основни настройки за тази организация">
            <Field label="Име на workspace" hint="Показва се в sidebar и при клиентите ти">
              <input defaultValue={workspace.name} className="w-full h-9 px-3 rounded-lg bg-bg border border-line text-[13px] focus:outline-none focus:border-ink-5" />
            </Field>
            <Field label="URL slug" hint="Използва се за вътрешни линкове и API">
              <div className="flex items-center gap-2">
                <span className="text-[12px] mono text-ink-4">app.leadforge.ai/</span>
                <input defaultValue={workspace.slug} className="flex-1 h-9 px-3 rounded-lg bg-bg border border-line text-[13px] mono focus:outline-none focus:border-ink-5" />
              </div>
            </Field>
          </Section>

          {/* Branding */}
          <Section title="Brandиране (white-label)" subtitle={`Клиентът вижда твоя бранд, не нашия. Премахни „Powered by" с план Agency.`}>
            <Field label="Лого" hint="PNG / SVG · max 2MB · показва се в sidebar и имейли">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-ink grid place-items-center text-bg font-bold text-[18px]">Л</div>
                <div className="flex flex-col gap-1.5">
                  <button className="h-8 px-3 rounded-md border border-line text-[12px] font-semibold hover:bg-surface">Качи ново</button>
                  <button className="text-[11px] text-ink-4 hover:text-red text-left">Премахни</button>
                </div>
              </div>
            </Field>
            <Field label="Accent цвят" hint="Използва се за бутони, charts, badges">
              <div className="flex items-center gap-2">
                {["#E10C2F", "#0A0A0A", "#2563EB", "#16A34A", "#6E5CE8", "#B45309"].map((c) => (
                  <button key={c} className={`w-9 h-9 rounded-lg border-2 transition ${c === workspace.accentColor ? "border-ink ring-2 ring-ink ring-offset-2" : "border-transparent"}`} style={{ background: c }} />
                ))}
                <input value={workspace.accentColor} className="ml-2 w-28 h-9 px-2 rounded-lg bg-bg border border-line text-[12px] mono focus:outline-none" readOnly />
              </div>
            </Field>
            <Field label={`Hide „Powered by LeadForge"`} hint="Само за план Agency · клиентите няма да виждат наш бранд">
              <Toggle on />
            </Field>
          </Section>

          {/* Custom domain */}
          <Section title="Custom domain" subtitle="Достъп до dashboard-а през твоя домейн (напр. clients.tvoyaagencia.bg)">
            <Field label="Поддомейн" hint="Конфигурирай CNAME → cname.leadforge.ai">
              <div className="flex items-center gap-2">
                <input placeholder="clients" className="flex-1 h-9 px-3 rounded-lg bg-bg border border-line text-[13px] mono focus:outline-none focus:border-ink-5" />
                <span className="text-[12px] mono text-ink-4">.tvoyaagencia.bg</span>
                <button className="h-9 px-3 rounded-lg bg-ink text-bg text-[12px] font-bold">Verify DNS</button>
              </div>
            </Field>
          </Section>

          {/* Team */}
          <Section title="Екип" subtitle={`${members.length} активни · план Agency позволява до 10 потребителя`}>
            <ul className="divide-y divide-line">
              {members.map((m) => (
                <li key={m.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-bg" style={{ background: "linear-gradient(135deg,#FFB347,#E10C2F)" }}>
                    {m.user.name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold">{m.user.name}</div>
                    <div className="text-[11px] mono text-ink-4">{m.user.email}</div>
                  </div>
                  <span className="pill" style={{ background: m.role === "owner" ? "var(--red-soft)" : "var(--surface-2)", color: m.role === "owner" ? "var(--red)" : "var(--ink-3)" }}>
                    {m.role === "owner" && <Crown size={9} />}
                    {m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : m.role === "member" ? "Member" : "Viewer"}
                  </span>
                </li>
              ))}
            </ul>
            <button className="mt-2 h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold hover:bg-surface">
              <Plus size={13} /> Покани член
            </button>
          </Section>

          {/* Sending inboxes */}
          <Section title="Sending inboxes" subtitle="Mailboxes от които AI изпраща. Препоръчвам 3-5 inboxes за по-голяма deliverability.">
            <ul className="space-y-2">
              {inboxes.map((ib) => (
                <li key={ib.id} className="border border-line rounded-lg p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: ib.health >= 90 ? "var(--green-soft)" : ib.health >= 75 ? "var(--amber-soft)" : "var(--red-soft)" }}>
                    <Mail size={15} style={{ color: ib.health >= 90 ? "var(--green)" : ib.health >= 75 ? "var(--amber)" : "var(--red)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-bold">{ib.label}</span>
                      <span className="text-[10.5px] mono px-1.5 py-px rounded bg-surface-2 text-ink-3 font-semibold">{ib.provider}</span>
                      {ib.warmedUp && <span className="text-[10.5px] mono text-green flex items-center gap-0.5"><Check size={10} /> warmed</span>}
                    </div>
                    <div className="text-[11px] mono text-ink-4 truncate">{ib.fromName} &lt;{ib.fromEmail}&gt;</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10.5px] mono text-ink-4 mb-0.5">Днес</div>
                    <div className="text-[13px] mono font-bold">{ib.sentToday}<span className="text-ink-4">/{ib.dailyLimit}</span></div>
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <div className="text-[10.5px] mono text-ink-4 mb-0.5">Health</div>
                    <div className="text-[13px] mono font-bold" style={{ color: ib.health >= 90 ? "var(--green)" : ib.health >= 75 ? "var(--amber)" : "var(--red)" }}>{ib.health}%</div>
                  </div>
                </li>
              ))}
            </ul>
            <button className="mt-2 h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold hover:bg-surface">
              <Plus size={13} /> Добави inbox
            </button>
          </Section>

          {/* Plan */}
          <Section title="План & билинг" subtitle="Plan Agency · $399/мес · подновява се на 15 юни">
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "Starter", price: "$49", quota: "100 lead-а/мес", users: "1 потребител", current: false },
                { name: "Pro",     price: "$149", quota: "500 lead-а/мес", users: "3 потребителя", current: false },
                { name: "Agency",  price: "$399", quota: "Неограничено", users: "10 потребителя + white-label", current: true },
              ].map((p) => (
                <div key={p.name} className={`p-4 rounded-lg border ${p.current ? "border-red bg-red-soft" : "border-line"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-bold">{p.name}</span>
                    {p.current && <span className="text-[10.5px] mono font-bold text-red">ТЕКУЩ</span>}
                  </div>
                  <div className="text-[22px] font-bold mb-2 mono">{p.price}<span className="text-[11px] text-ink-4">/мес</span></div>
                  <ul className="text-[11.5px] text-ink-3 space-y-1">
                    <li className="flex items-center gap-1"><Check size={11} className="text-green" /> {p.quota}</li>
                    <li className="flex items-center gap-1"><Check size={11} className="text-green" /> {p.users}</li>
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {/* AI tip */}
          <div className="card p-5 flex items-center justify-between bg-surface">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-soft grid place-items-center">
                <Sparkles size={18} className="text-red" />
              </div>
              <div>
                <div className="text-[14px] font-bold mb-0.5">Pro tip от AI</div>
                <div className="text-[12px] text-ink-3">Препоръчвам да добавиш още 2 inboxes — текущите 3 ще достигнат лимит до петък.</div>
              </div>
            </div>
            <button className="h-9 px-3 rounded-lg bg-ink text-bg text-[12.5px] font-semibold">Добави</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsNav({ Icon, label, active }: { Icon: React.ComponentType<{ size?: number; className?: string }>; label: string; active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition ${active ? "bg-ink text-bg" : "text-ink-3 hover:bg-surface hover:text-ink"}`}>
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="mb-4">
        <h2 className="text-[16px] font-bold mb-1">{title}</h2>
        <p className="text-[12px] text-ink-4">{subtitle}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
      <div>
        <div className="text-[12.5px] font-semibold">{label}</div>
        {hint && <div className="text-[11px] text-ink-4 mt-0.5">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ on }: { on?: boolean }) {
  return (
    <button className={`relative w-10 h-6 rounded-full transition ${on ? "bg-red" : "bg-surface-2"}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-bg shadow-sm transition ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}
