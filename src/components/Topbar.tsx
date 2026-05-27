"use client";

import { Search, Bell, Command, Plus } from "lucide-react";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  "/":           "Преглед",
  "/leads":      "Lead-ове",
  "/campaigns":  "Кампании",
  "/inbox":      "Inbox",
  "/pipeline":   "Pipeline",
  "/analytics":  "Аналитика",
  "/agent":      "AI Агент",
  "/settings":   "Настройки",
};

export function Topbar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();
  const currentLabel = ROUTE_LABELS[pathname] ?? "—";

  return (
    <header className="h-[52px] shrink-0 border-b border-line flex items-center px-5 gap-3 bg-bg sticky top-0 z-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-ink-4">{workspaceName}</span>
        <span className="text-ink-5">/</span>
        <span className="text-ink font-semibold">{currentLabel}</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-[480px] mx-auto">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input
            type="text"
            placeholder="Търси lead-ове, бизнеси, домейни..."
            className="w-full h-9 pl-9 pr-12 rounded-lg bg-surface border border-line text-[13px] placeholder:text-ink-4 focus:outline-none focus:border-ink-5 transition"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 mono text-[10.5px] text-ink-4 px-1.5 py-0.5 rounded border border-line bg-bg">
            <Command size={10} /> K
          </kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-soft border border-red-tint">
          <span className="live-dot" />
          <span className="text-[11.5px] font-semibold text-red mono uppercase tracking-wider">Live</span>
        </div>
        <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-surface transition relative">
          <Bell size={15} className="text-ink-3" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red" />
        </button>
        <button className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-ink text-bg text-[12.5px] font-semibold hover:bg-ink-2 transition">
          <Plus size={14} />
          <span>Нова кампания</span>
        </button>
      </div>
    </header>
  );
}
