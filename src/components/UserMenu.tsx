"use client";

import { useState, useEffect, useRef } from "react";
import { LogOut, Settings as SettingsIcon, ChevronUp } from "lucide-react";
import { logoutAction } from "@/lib/auth-actions";
import Link from "next/link";

export function UserMenu({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface transition"
      >
        <div className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold text-bg" style={{ background: "linear-gradient(135deg,#FFB347,#E10C2F)" }}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="leading-tight text-left flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold truncate">{userName}</div>
          <div className="text-[10.5px] text-ink-4 truncate">{userEmail}</div>
        </div>
        <ChevronUp size={12} className={`text-ink-4 transition ${open ? "" : "rotate-180"}`} />
      </button>

      {open && (
        <div className="absolute z-30 bottom-full left-0 right-0 mb-1 bg-bg border border-line rounded-lg shadow-lg overflow-hidden">
          <Link href="/settings" onClick={() => setOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-surface transition">
            <SettingsIcon size={13} className="text-ink-4" />
            Настройки
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-surface text-red transition">
              <LogOut size={13} />
              Излез
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
