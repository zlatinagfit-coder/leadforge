"use client";

import { useState, useTransition } from "react";
import { Plus, X, Loader2, Play, Pause, MoreHorizontal, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { createCampaignAction, toggleCampaignStatusAction } from "@/lib/actions";

const NICHES = ["Зъболекари", "Фитнес", "Ecommerce", "Недвижими имоти", "Ресторанти", "Адвокати", "Salon & Beauty", "Auto Repair", "Healthcare"];

export function NewCampaignButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const submit = (formData: FormData) => {
    setResult(null);
    startTransition(async () => {
      const res = await createCampaignAction(formData);
      setResult(res);
      if (res.success) {
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 1500);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-ink text-bg text-[12.5px] font-semibold hover:bg-ink-2 transition"
      >
        <Plus size={13} /> Нова кампания
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm" onClick={() => !pending && setOpen(false)}>
          <form
            action={submit}
            className="bg-bg border border-line rounded-2xl shadow-2xl w-[480px] max-w-[90vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 border-b border-line">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[16px] font-bold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-soft grid place-items-center"><Plus size={14} className="text-red" /></div>
                  Нова кампания
                </h2>
                <button type="button" onClick={() => !pending && setOpen(false)} className="text-ink-4 hover:text-ink"><X size={16} /></button>
              </div>
              <p className="text-[12px] text-ink-4">Създай outreach sequence за конкретна ниша и държава.</p>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[10px] mono uppercase tracking-wider text-ink-4 font-semibold">Име на кампания</label>
                <input name="name" required disabled={pending} placeholder="напр. UK Dental · Q3 Cold" className="w-full mt-1 h-9 px-3 rounded-lg bg-surface border border-line text-[13px] focus:outline-none focus:border-ink-5" />
              </div>

              <div>
                <label className="text-[10px] mono uppercase tracking-wider text-ink-4 font-semibold">Ниша</label>
                <select name="niche" disabled={pending} className="w-full mt-1 h-9 px-3 rounded-lg bg-surface border border-line text-[13px] focus:outline-none focus:border-ink-5">
                  {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] mono uppercase tracking-wider text-ink-4 font-semibold">Държава (ISO)</label>
                  <input name="targetCountry" disabled={pending} placeholder="BG, UK, DE..." className="w-full mt-1 h-9 px-3 rounded-lg bg-surface border border-line text-[13px] mono focus:outline-none focus:border-ink-5" />
                </div>
                <div>
                  <label className="text-[10px] mono uppercase tracking-wider text-ink-4 font-semibold">Град (опц.)</label>
                  <input name="targetCity" disabled={pending} placeholder="София" className="w-full mt-1 h-9 px-3 rounded-lg bg-surface border border-line text-[13px] focus:outline-none focus:border-ink-5" />
                </div>
              </div>

              {result && (
                <div className={`flex items-start gap-2 p-2.5 rounded-lg text-[12px] ${result.success ? "bg-green-soft text-green" : "bg-red-soft text-red"}`}>
                  {result.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <strong>{result.success ? "Кампанията е създадена!" : result.error}</strong>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-line flex items-center justify-end bg-surface gap-2">
              <button type="button" onClick={() => !pending && setOpen(false)} disabled={pending} className="h-8 px-3 rounded-md text-[12px] font-semibold text-ink-3 hover:bg-line disabled:opacity-50">Отказ</button>
              <button type="submit" disabled={pending} className="h-8 px-4 flex items-center gap-1.5 rounded-md bg-red text-bg text-[12px] font-bold hover:bg-red-hover disabled:opacity-50">
                {pending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {pending ? "Създавам..." : "Създай кампания"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function CampaignToggleButton({ campaignId, currentStatus }: { campaignId: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();
  const isActive = currentStatus === "active";

  const toggle = () => {
    startTransition(async () => {
      await toggleCampaignStatusAction(campaignId);
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending || (currentStatus !== "active" && currentStatus !== "paused")}
      className="w-8 h-8 grid place-items-center rounded-md hover:bg-surface text-ink-3 disabled:opacity-30"
      title={isActive ? "Спри" : "Стартирай"}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : isActive ? <Pause size={14} /> : <Play size={14} />}
    </button>
  );
}
