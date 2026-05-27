"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { updateLeadStatusAction } from "@/lib/actions";
import { STATUS_META } from "@/lib/utils";

const STATUSES = ["new", "contacted", "replied", "interested", "meeting", "closed", "lost"];

export function LeadStatusDropdown({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const meta = STATUS_META[currentStatus] ?? STATUS_META.new;

  const update = (newStatus: string) => {
    setOpen(false);
    if (newStatus === currentStatus) return;
    startTransition(async () => {
      await updateLeadStatusAction(leadId, newStatus);
    });
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={pending}
        className="pill inline-flex items-center gap-1 hover:ring-2 hover:ring-line-2 transition disabled:opacity-50"
        style={{ background: meta.bg, color: meta.color }}
      >
        {pending ? <Loader2 size={9} className="animate-spin" /> : null}
        {meta.label}
        <ChevronDown size={9} />
      </button>

      {open && (
        <div className="absolute z-30 top-full right-0 mt-1 w-[160px] bg-bg border border-line rounded-lg shadow-lg overflow-hidden">
          {STATUSES.map((s) => {
            const m = STATUS_META[s];
            const isCurrent = s === currentStatus;
            return (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  update(s);
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between hover:bg-surface transition ${isCurrent ? "bg-surface font-bold" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </span>
                {isCurrent && <span className="text-[9px] mono text-ink-4">текущ</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
