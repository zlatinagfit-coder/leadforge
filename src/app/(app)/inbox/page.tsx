import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";
import { timeAgoBg } from "@/lib/utils";
import { Inbox as InboxIcon, Flame, Sparkles, Archive, Send, Reply, CheckCheck, Star } from "lucide-react";
import { ReplyBox } from "@/components/ReplyBox";
import Link from "next/link";

export const dynamic = "force-dynamic";

const INTENT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  hot:             { label: "Hot",             bg: "var(--red-soft)",   color: "var(--red)" },
  interested:      { label: "Interested",      bg: "var(--green-soft)", color: "var(--green)" },
  not_interested:  { label: "Not interested",  bg: "var(--surface-2)",  color: "var(--ink-3)" },
  objection:       { label: "Възражение",      bg: "var(--amber-soft)", color: "var(--amber)" },
  auto_reply:      { label: "Auto-reply",      bg: "var(--surface)",    color: "var(--ink-4)" },
};

type SP = Promise<{ filter?: string; thread?: string }>;

export default async function InboxPage({ searchParams }: { searchParams: SP }) {
  const { filter = "all", thread: threadId } = await searchParams;
  const workspace = await getCurrentWorkspace();
  const allThreads = await prisma.inboxThread.findMany({
    where: { workspaceId: workspace.id },
    include: { messages: { orderBy: { at: "asc" } }, lead: true },
    orderBy: { lastAt: "desc" },
  });

  // Apply filter
  const threads = filter === "hot"
    ? allThreads.filter((t) => t.intent === "hot")
    : filter === "unread"
    ? allThreads.filter((t) => t.unread)
    : allThreads;

  // Active thread = explicit param OR first hot/unread one
  const activeThread =
    (threadId && allThreads.find((t) => t.id === threadId)) ||
    threads.find((t) => t.unread && t.intent === "hot") ||
    threads[0];

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Thread list */}
      <div className="w-[380px] shrink-0 border-r border-line flex flex-col">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <InboxIcon size={15} className="text-ink-3" />
            <span className="text-[13px] font-bold">Inbox</span>
            <span className="text-[10.5px] mono px-1.5 py-px rounded-full bg-red text-bg font-bold">
              {allThreads.filter((t) => t.unread).length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/inbox?filter=hot" className={`text-[11px] mono px-2 py-1 rounded flex items-center gap-1 transition ${filter === "hot" ? "bg-red-soft text-red font-bold" : "text-ink-3 hover:bg-surface"}`}>
              <Flame size={11} /> Hot
            </Link>
            <Link href="/inbox?filter=unread" className={`text-[11px] mono px-2 py-1 rounded transition ${filter === "unread" ? "bg-ink text-bg font-bold" : "text-ink-3 hover:bg-surface"}`}>
              Непрочетени
            </Link>
            <Link href="/inbox" className={`text-[11px] mono px-2 py-1 rounded transition ${filter === "all" ? "bg-ink text-bg font-bold" : "text-ink-3 hover:bg-surface"}`}>
              Всички
            </Link>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-line">
          {threads.length === 0 && (
            <li className="p-6 text-center text-[12.5px] text-ink-4">
              Няма {filter === "hot" ? "hot" : filter === "unread" ? "непрочетени" : ""} threads. Изпрати outreach имейл и чакай отговор.
            </li>
          )}
          {threads.map((t) => {
            const isActive = t.id === activeThread?.id;
            const badge = t.intent ? INTENT_BADGE[t.intent] : null;
            const href = `/inbox?${filter !== "all" ? `filter=${filter}&` : ""}thread=${t.id}`;
            return (
              <Link
                key={t.id}
                href={href}
                className={`block px-4 py-3 cursor-pointer transition border-l-2 ${
                  isActive ? "bg-surface border-l-red" : "border-l-transparent hover:bg-surface"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-bg shrink-0" style={{ background: "linear-gradient(135deg,#FFB347,#E10C2F)" }}>
                    {t.fromName?.[0] ?? t.fromEmail[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[13px] truncate ${t.unread ? "font-bold text-ink" : "font-medium text-ink-2"}`}>
                        {t.fromName ?? t.fromEmail}
                      </span>
                      <span className="text-[10.5px] mono text-ink-4 shrink-0">{timeAgoBg(t.lastAt)}</span>
                    </div>
                    <div className="text-[11.5px] text-ink-4 truncate mb-1">{t.fromCompany}</div>
                    <div className={`text-[12px] line-clamp-2 ${t.unread ? "text-ink-2" : "text-ink-4"}`}>
                      {t.lastPreview}
                    </div>
                    {badge && (
                      <span className="pill mt-1.5" style={{ background: badge.bg, color: badge.color }}>
                        {t.intent === "hot" && <Flame size={9} />}
                        {badge.label}
                      </span>
                    )}
                  </div>
                  {t.unread && <span className="w-2 h-2 rounded-full bg-red shrink-0 mt-2" />}
                </div>
              </Link>
            );
          })}
        </ul>
      </div>

      {/* Thread view */}
      {!activeThread && (
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div className="text-center max-w-[320px]">
            <div className="w-12 h-12 rounded-xl bg-red-soft grid place-items-center mx-auto mb-3">
              <InboxIcon size={20} className="text-red" />
            </div>
            <h3 className="text-[16px] font-bold mb-1">Inbox-ът е празен</h3>
            <p className="text-[12.5px] text-ink-3">Изпрати outreach имейл от Lead-ове и чакай отговор. AI автоматично класифицира всеки reply.</p>
          </div>
        </div>
      )}
      {activeThread && (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="px-6 py-4 border-b border-line flex items-start justify-between">
            <div>
              <h2 className="text-[18px] font-bold mb-1">{activeThread.subject}</h2>
              <div className="flex items-center gap-2 text-[12px] text-ink-3">
                <span className="font-semibold text-ink-2">{activeThread.fromName}</span>
                <span className="mono text-ink-4">&lt;{activeThread.fromEmail}&gt;</span>
                <span>·</span>
                <span>{activeThread.fromCompany}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-surface text-ink-3" title="Маркирай"><Star size={14} /></button>
              <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-surface text-ink-3" title="Архивирай"><Archive size={14} /></button>
              <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-surface text-ink-3" title="Маркирай като прочетено"><CheckCheck size={14} /></button>
            </div>
          </div>

          {/* AI classification banner */}
          {activeThread.intent && (
            <div className="px-6 py-3 bg-red-soft border-b border-red-tint flex items-center gap-3">
              <Sparkles size={14} className="text-red shrink-0" />
              <div className="flex-1 text-[12px]">
                <strong className="text-red">AI класификация:</strong>
                <span className="text-ink-2 ml-2">
                  {activeThread.intent === "hot" && "Високо намерение за покупка. Препоръчвам да отговориш в рамките на 30 минути с конкретно предложение за среща."}
                  {activeThread.intent === "interested" && "Заинтересован но няма ясно намерение. Изпрати case study + предложение за 15-мин call."}
                  {activeThread.intent === "not_interested" && "Не е заинтересован. Премахни от sequence. AI ще добави в blacklist автоматично."}
                </span>
              </div>
              <span className="pill" style={{ background: "var(--bg)", color: "var(--red)" }}>
                {activeThread.sentiment === "positive" ? "Positive" : activeThread.sentiment === "negative" ? "Negative" : "Neutral"}
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {activeThread.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[560px] rounded-2xl px-4 py-3 ${msg.direction === "outbound" ? "bg-ink text-bg" : "bg-surface border border-line"}`}>
                  <div className={`text-[10.5px] mono mb-1.5 ${msg.direction === "outbound" ? "text-bg/60" : "text-ink-4"}`}>
                    {msg.direction === "outbound" ? "Ти →" : `${activeThread.fromName} →`} {new Date(msg.at).toLocaleDateString("bg-BG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className={`text-[13px] whitespace-pre-wrap leading-relaxed ${msg.direction === "outbound" ? "text-bg" : "text-ink-2"}`}>
                    {msg.body}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply box */}
          <div className="border-t border-line p-4">
            <ReplyBox threadId={activeThread.id} />
          </div>
        </div>
      )}
    </div>
  );
}
