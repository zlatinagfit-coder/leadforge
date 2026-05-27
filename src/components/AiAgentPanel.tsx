"use client";

import { Bot, Sparkles, Search, FileEdit, Send, MessageSquare, CalendarCheck, RotateCw, AlertTriangle } from "lucide-react";
import { timeAgoBg } from "@/lib/utils";
import { AgentPromptInput } from "./AgentPromptInput";

const KIND_ICON: Record<string, { Icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  scrape:   { Icon: Search,        color: "text-blue" },
  analyze:  { Icon: Sparkles,      color: "text-purple" },
  compose:  { Icon: FileEdit,      color: "text-amber" },
  send:     { Icon: Send,          color: "text-red" },
  reply:    { Icon: MessageSquare, color: "text-green" },
  meeting:  { Icon: CalendarCheck, color: "text-green" },
  followup: { Icon: RotateCw,      color: "text-ink-3" },
  error:    { Icon: AlertTriangle, color: "text-red" },
};

export type AiActivityItem = {
  id: string;
  kind: string;
  tag: string;
  text: string;
  createdAt: Date | string;
};

export function AiAgentPanel({ activity, queueCount = 14 }: { activity: AiActivityItem[]; queueCount?: number }) {
  return (
    <aside className="w-[320px] shrink-0 border-l border-line bg-bg flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-ink grid place-items-center">
              <Bot size={16} className="text-bg" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 live-dot" />
          </div>
          <div className="leading-tight flex-1">
            <div className="text-[13.5px] font-bold">AI Агент</div>
            <div className="text-[11px] text-ink-4">{queueCount} в опашка · работи</div>
          </div>
          <button className="text-[11px] mono text-ink-4 px-2 py-1 rounded border border-line hover:bg-surface">
            Пауза
          </button>
        </div>
      </div>

      {/* Live feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2.5 flex items-center justify-between text-[10.5px] mono uppercase tracking-wider text-ink-4 sticky top-0 bg-bg border-b border-line">
          <span>Активност · live</span>
          <span>last 60m</span>
        </div>
        <ul className="divide-y divide-line">
          {activity.map((a) => {
            const meta = KIND_ICON[a.kind] ?? KIND_ICON.followup;
            return (
              <li key={a.id} className="px-4 py-3 hover:bg-surface transition">
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 ${meta.color}`}>
                    <meta.Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] text-ink leading-snug">{a.text}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10.5px] mono text-ink-4">
                      <span className="px-1.5 py-px rounded bg-surface-2 text-ink-3">{a.tag}</span>
                      <span>{timeAgoBg(a.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer — interactive AI prompt */}
      <div className="border-t border-line p-3">
        <AgentPromptInput />
      </div>
    </aside>
  );
}
