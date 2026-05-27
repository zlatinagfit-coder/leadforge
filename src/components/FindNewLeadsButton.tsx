"use client";

import { useState, useTransition } from "react";
import { Sparkles, X, Loader2, Search, MapPin, Tag, Hash, CheckCircle2, AlertCircle } from "lucide-react";
import { scrapeNewLeadsAction } from "@/lib/actions";

const NICHES = ["Зъболекари", "Фитнес", "Ecommerce", "Недвижими имоти", "Ресторанти", "Адвокати", "Salon & Beauty", "Auto Repair", "Healthcare"];

const TEMPLATES = [
  { label: "Зъболекари София", query: "dental clinics in Sofia, Bulgaria", niche: "Зъболекари" },
  { label: "Фитнес Берлин", query: "fitness studios in Berlin, Germany", niche: "Фитнес" },
  { label: "Адвокати Пловдив", query: "law firms in Plovdiv, Bulgaria", niche: "Адвокати" },
  { label: "Ресторанти Варна", query: "restaurants in Varna, Bulgaria", niche: "Ресторанти" },
];

export function FindNewLeadsButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState("Зъболекари");
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setResult(null);
    const fd = new FormData();
    fd.set("query", query);
    fd.set("niche", niche);
    fd.set("limit", String(limit));

    startTransition(async () => {
      const res = await scrapeNewLeadsAction(fd);
      setResult(res);
      if (res.success) {
        setTimeout(() => {
          setOpen(false);
          setResult(null);
          setQuery("");
        }, 3000);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-ink text-bg text-[12.5px] font-semibold hover:bg-ink-2 transition"
      >
        <Sparkles size={13} /> Намери нови
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm" onClick={() => !pending && setOpen(false)}>
          <div
            className="bg-bg border border-line rounded-2xl shadow-2xl w-[480px] max-w-[90vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-line">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-soft grid place-items-center">
                    <Sparkles size={15} className="text-red" />
                  </div>
                  <h2 className="text-[16px] font-bold">Намери нови lead-ове</h2>
                </div>
                <button onClick={() => !pending && setOpen(false)} className="text-ink-4 hover:text-ink">
                  <X size={16} />
                </button>
              </div>
              <p className="text-[12px] text-ink-4">AI ще скрейпне Google Maps, ще намери имейли + ще анализира всеки сайт.</p>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              {/* Templates */}
              <div>
                <label className="text-[10px] mono uppercase tracking-wider text-ink-4 font-semibold">Бързи шаблони</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => {
                        setQuery(t.query);
                        setNiche(t.niche);
                      }}
                      className="text-left text-[11.5px] px-2 py-1.5 rounded border border-line hover:border-ink-5 hover:bg-surface transition"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Query */}
              <div>
                <label className="text-[10px] mono uppercase tracking-wider text-ink-4 font-semibold">
                  <Search size={10} className="inline mr-1" />
                  Какво да търсиш в Google Maps
                </label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="напр. dental clinics in London"
                  disabled={pending}
                  className="w-full mt-1 h-9 px-3 rounded-lg bg-surface border border-line text-[13px] focus:outline-none focus:border-ink-5"
                />
              </div>

              {/* Niche + Limit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] mono uppercase tracking-wider text-ink-4 font-semibold">
                    <Tag size={10} className="inline mr-1" /> Ниша
                  </label>
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    disabled={pending}
                    className="w-full mt-1 h-9 px-3 rounded-lg bg-surface border border-line text-[13px] focus:outline-none focus:border-ink-5"
                  >
                    {NICHES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] mono uppercase tracking-wider text-ink-4 font-semibold">
                    <Hash size={10} className="inline mr-1" /> Брой (max 25)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    disabled={pending}
                    className="w-full mt-1 h-9 px-3 rounded-lg bg-surface border border-line text-[13px] mono focus:outline-none focus:border-ink-5"
                  />
                </div>
              </div>

              {/* Result */}
              {result && (
                <div className={`flex items-start gap-2 p-2.5 rounded-lg text-[12px] ${result.success ? "bg-green-soft text-green" : "bg-red-soft text-red"}`}>
                  {result.success ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                  <div>
                    {result.success ? (
                      <>
                        <strong>{result.count} нови lead-а добавени!</strong>
                        <div className="text-ink-3 mt-0.5">Виж ги в таблицата след малко...</div>
                      </>
                    ) : (
                      <>
                        <strong>Грешка</strong>
                        <div className="text-ink-3 mt-0.5 break-all">{result.error}</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Cost preview */}
              <div className="text-[11px] text-ink-4 mono">
                💸 Примерен cost: ~${(limit * 0.07 / 1000).toFixed(4)} Apify + ~${(limit * 0.0002).toFixed(4)} OpenAI = ~${(limit * 0.07 / 1000 + limit * 0.0002).toFixed(4)} общо
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-line flex items-center justify-between bg-surface">
              <div className="text-[11px] text-ink-4">
                {pending && (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    AI работи... (до 2 мин)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => !pending && setOpen(false)}
                  disabled={pending}
                  className="h-8 px-3 rounded-md text-[12px] font-semibold text-ink-3 hover:bg-line disabled:opacity-50"
                >
                  Отказ
                </button>
                <button
                  onClick={submit}
                  disabled={pending || !query.trim()}
                  className="h-8 px-4 flex items-center gap-1.5 rounded-md bg-red text-bg text-[12px] font-bold hover:bg-red-hover disabled:opacity-50 transition"
                >
                  {pending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {pending ? "Работя..." : "Стартирай"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
