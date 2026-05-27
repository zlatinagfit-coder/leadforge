"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Filter, X, Download } from "lucide-react";

export function LeadsToolbar({
  niches,
  currentNiche,
  currentSearch,
  resultCount,
  totalCount,
}: {
  niches: string[];
  currentNiche?: string;
  currentSearch?: string;
  resultCount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(currentSearch ?? "");
  const [showNiches, setShowNiches] = useState(false);
  const [pending, startTransition] = useTransition();

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", search.trim() || undefined);
  };

  const clearAll = () => {
    setSearch("");
    startTransition(() => router.push(pathname));
  };

  const hasFilters = currentSearch || currentNiche;

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <form onSubmit={submitSearch} className="relative flex-1 max-w-[320px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Търси по име, домейн, имейл, град..."
          className="w-full h-9 pl-9 pr-9 rounded-lg bg-surface border border-line text-[13px] placeholder:text-ink-4 focus:outline-none focus:border-ink-5"
        />
        {search && (
          <button type="button" onClick={() => { setSearch(""); updateParam("q", undefined); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink">
            <X size={14} />
          </button>
        )}
      </form>

      <div className="relative">
        <button
          onClick={() => setShowNiches(!showNiches)}
          className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border text-[12.5px] font-semibold transition ${currentNiche ? "border-red bg-red-soft text-red" : "border-line text-ink-2 hover:bg-surface"}`}
        >
          <Filter size={13} /> {currentNiche ?? "Ниша"}
          {currentNiche && <X size={12} onClick={(e) => { e.stopPropagation(); updateParam("niche", undefined); setShowNiches(false); }} className="hover:opacity-70" />}
        </button>
        {showNiches && (
          <div className="absolute z-30 top-full left-0 mt-1 w-[200px] bg-bg border border-line rounded-lg shadow-lg overflow-hidden">
            <button onClick={() => { updateParam("niche", undefined); setShowNiches(false); }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface">Всички ниши</button>
            {niches.map((n) => (
              <button key={n} onClick={() => { updateParam("niche", n); setShowNiches(false); }} className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface ${currentNiche === n ? "bg-surface font-bold" : ""}`}>
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasFilters && (
        <button onClick={clearAll} className="text-[11.5px] text-ink-4 hover:text-red flex items-center gap-1">
          <X size={11} /> Изчисти филтрите
        </button>
      )}

      <div className="flex-1" />

      <div className="text-[11.5px] mono text-ink-4">
        {pending && "..."} {resultCount} {resultCount !== totalCount ? `от ${totalCount}` : ""}
      </div>

      <button
        onClick={() => alert("CSV export — в следващата версия")}
        className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold text-ink-2 hover:bg-surface"
      >
        <Download size={13} /> Експорт
      </button>
    </div>
  );
}
