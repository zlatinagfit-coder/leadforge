"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Megaphone,
  Inbox,
  GitBranch,
  BarChart3,
  Bot,
  Settings,
  ChevronDown,
} from "lucide-react";
import { BrandFull } from "./Brand";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: number | string;
  pro?: boolean;
  section?: string;
};

const NAV: NavItem[] = [
  { href: "/",           label: "Преглед",   Icon: LayoutGrid },
  { href: "/leads",      label: "Lead-ове",  Icon: Users, badge: 47 },
  { href: "/campaigns",  label: "Кампании",  Icon: Megaphone },
  { href: "/inbox",      label: "Inbox",     Icon: Inbox, badge: 3 },
  { href: "/pipeline",   label: "Pipeline",  Icon: GitBranch },
  { href: "/analytics",  label: "Аналитика", Icon: BarChart3 },
  { href: "/agent",      label: "AI Агент",  Icon: Bot, pro: true, section: "Автоматизация" },
  { href: "/settings",   label: "Настройки", Icon: Settings },
];

export function Sidebar({ workspaceName, userName, userEmail }: { workspaceName: string; userName: string; userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-[224px] shrink-0 border-r border-line bg-bg flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-3 pt-4 pb-3">
        <BrandFull workspaceName={workspaceName} />
      </div>

      {/* Workspace pill */}
      <div className="px-3 pb-3">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-line text-[12.5px] text-ink-2 hover:bg-surface-2 transition">
          <div className="w-[14px] h-[14px] rounded-[4px]" style={{ background: "linear-gradient(135deg,#E10C2F,#FF7E5F)" }} />
          <span className="font-semibold text-ink truncate">{workspaceName}</span>
          <ChevronDown size={14} className="ml-auto text-ink-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="px-2 flex-1 overflow-y-auto">
        {NAV.map((item, idx) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const showSection = item.section && (idx === 0 || NAV[idx - 1].section !== item.section);
          return (
            <div key={item.href}>
              {showSection && (
                <div className="px-3 pt-3 pb-1 text-[10px] mono text-ink-5 uppercase tracking-[0.1em] font-semibold">
                  {item.section}
                </div>
              )}
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition",
                  isActive
                    ? "bg-ink text-bg"
                    : "text-ink-3 hover:bg-surface hover:text-ink"
                )}
              >
                <item.Icon size={15} className={isActive ? "text-bg" : "text-ink-4"} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "ml-auto text-[10.5px] mono px-1.5 py-px rounded-full font-semibold",
                      isActive ? "bg-bg/15 text-bg" : "bg-surface-2 text-ink-3"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
                {item.pro && (
                  <span className="ml-auto text-[9px] px-1.5 py-px rounded-[3px] bg-red text-bg font-bold tracking-wider">
                    PRO
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Quota + User */}
      <div className="border-t border-line p-3 space-y-3">
        <div className="text-[11px] text-ink-4">
          <div className="flex items-center justify-between mb-1.5">
            <span>Lead-ове този месец</span>
            <span className="mono text-ink-2">340 / 500</span>
          </div>
          <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-red" style={{ width: "68%" }} />
          </div>
        </div>
        <UserMenu userName={userName} userEmail={userEmail} />
      </div>
    </aside>
  );
}
