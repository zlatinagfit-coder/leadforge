import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";
import { Building2, Palette, Globe, Users, Mail, Sparkles, Key, Clock } from "lucide-react";
import { WorkspaceSettingsForm, InboxesPanel, TeamPanel, BrandingPanel, FollowupConfigPanel } from "@/components/SettingsPanels";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const workspace = await getCurrentWorkspace();
  const members = await prisma.membership.findMany({
    where: { workspaceId: workspace.id },
    include: { user: true },
  });
  const inboxes = await prisma.sendingInbox.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] mono uppercase tracking-wider text-ink-4 mb-1">Workspace администрация</div>
        <h1 className="text-[32px] font-bold tracking-tight leading-none mb-2">Настройки</h1>
        <p className="text-[13px] text-ink-3">Workspace настройки, бранд, екип и sending инфраструктура.</p>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-6">
        {/* Side nav — anchor links to sections */}
        <nav className="space-y-0.5 sticky top-[80px] self-start">
          <SettingsNavLink Icon={Key}       label="API ключове"     href="#apikeys" />
          <SettingsNavLink Icon={Clock}     label="Follow-up"      href="#followup" />
          <SettingsNavLink Icon={Building2} label="Workspace"      href="#workspace" />
          <SettingsNavLink Icon={Palette}   label="Brandиране"     href="#branding" />
          <SettingsNavLink Icon={Users}     label="Екип"           href="#team" />
          <SettingsNavLink Icon={Mail}      label="Sending inboxes" href="#inboxes" />
          <SettingsNavLink Icon={Globe}     label="Custom domain"  href="#domain" />
        </nav>

        {/* Content */}
        <div className="space-y-6">
          {/* API KEYS — most important */}
          <Section id="apikeys" title="🔑 Твоите API ключове" subtitle="Свържи всичките си платформи. Системата ще ги използва директно срещу твоите акаунти.">
            <ApiKeysPanel workspace={{
              openaiApiKey: workspace.openaiApiKey,
              apifyToken: workspace.apifyToken,
              hunterApiKey: workspace.hunterApiKey,
              resendApiKey: workspace.resendApiKey,
              resendFromEmail: workspace.resendFromEmail,
              resendFromName: workspace.resendFromName,
            }} />
          </Section>

          {/* FOLLOW-UP CONFIG */}
          <Section id="followup" title="🤖 Auto Follow-up sequences" subtitle="Ако lead не отговори след X часа → AI автоматично праща follow-up">
            <FollowupConfigPanel workspace={{ followupEnabled: workspace.followupEnabled, followupDelayHours: workspace.followupDelayHours, followupMaxSteps: workspace.followupMaxSteps }} />
          </Section>

          {/* WORKSPACE */}
          <Section id="workspace" title="Workspace" subtitle="Име на твоята организация">
            <WorkspaceSettingsForm workspace={{ name: workspace.name, slug: workspace.slug, accentColor: workspace.accentColor }} />
          </Section>

          {/* BRANDING */}
          <Section id="branding" title="Brandиране" subtitle="Цвят и лого. Когато имаш custom domain клиентите ти виждат ТВОЯ бранд.">
            <BrandingPanel accentColor={workspace.accentColor} />
          </Section>

          {/* CUSTOM DOMAIN */}
          <Section id="domain" title="Custom domain" subtitle="Достъп до dashboard през твой домейн (напр. clients.tvoyaagencia.bg)">
            <div className="space-y-3">
              <div className="bg-amber-soft border border-amber/20 rounded-lg p-3 text-[12px] text-amber">
                <strong>В роудмап-а:</strong> Custom domain ще е достъпно когато добавим NextAuth. Засега всички използват <span className="mono">leadforge-ss.vercel.app</span>.
              </div>
            </div>
          </Section>

          {/* TEAM */}
          <Section id="team" title="Екип" subtitle={`${members.length} ${members.length === 1 ? "член" : "членове"}`}>
            <TeamPanel members={members.map((m) => ({
              id: m.id,
              role: m.role,
              userName: m.user.name ?? m.user.email,
              userEmail: m.user.email,
            }))} />
          </Section>

          {/* SENDING INBOXES */}
          <Section id="inboxes" title="Sending inboxes" subtitle="Mailboxes от които AI изпраща. Препоръчвам 3-5 inboxes за по-добра deliverability.">
            <InboxesPanel inboxes={inboxes.map((i) => ({
              id: i.id,
              label: i.label,
              provider: i.provider,
              fromEmail: i.fromEmail,
              fromName: i.fromName,
              dailyLimit: i.dailyLimit,
              sentToday: i.sentToday,
              warmedUp: i.warmedUp,
              health: i.health,
            }))} />
          </Section>

          {/* AI tip */}
          <div className="card p-5 flex items-center justify-between bg-surface">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-soft grid place-items-center">
                <Sparkles size={18} className="text-red" />
              </div>
              <div>
                <div className="text-[14px] font-bold mb-0.5">Pro tip</div>
                <div className="text-[12px] text-ink-3">Купи домейн и го verify-ни в Resend → ще можеш да изпращаш истински имейли към клиенти.</div>
              </div>
            </div>
            <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="h-9 px-3 rounded-lg bg-ink text-bg text-[12.5px] font-semibold hover:bg-ink-2 inline-flex items-center">
              Resend Domains →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsNavLink({ Icon, label, href }: { Icon: React.ComponentType<{ size?: number; className?: string }>; label: string; href: string }) {
  return (
    <a href={href} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium text-ink-3 hover:bg-surface hover:text-ink transition">
      <Icon size={14} />
      <span>{label}</span>
    </a>
  );
}

function Section({ id, title, subtitle, children }: { id?: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div id={id} className="card p-6 scroll-mt-[80px]">
      <div className="mb-4">
        <h2 className="text-[16px] font-bold mb-1">{title}</h2>
        <p className="text-[12px] text-ink-4">{subtitle}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
