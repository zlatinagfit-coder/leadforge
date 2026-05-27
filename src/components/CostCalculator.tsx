"use client";

import { useState, useMemo } from "react";
import { Calculator, TrendingDown, DollarSign } from "lucide-react";

// Real prices (verified Nov 2024)
const PRICES = {
  openai: {
    analyzeInputPer1M: 0.150,   // USD per 1M input tokens (gpt-4o-mini)
    analyzeOutputPer1M: 0.600,
    avgAnalyzeInputTokens: 3000,
    avgAnalyzeOutputTokens: 400,
    avgComposeInputTokens: 700,
    avgComposeOutputTokens: 250,
  },
  apify: {
    pricePerPlace: 0.07 / 1000, // $0.07 per 1000 places
    freeMonthlyCredit: 5,        // $5 credit / month auto-renewing
  },
  resend: {
    freeMonthly: 3000,
    proPrice: 20,
    proLimit: 50000,
  },
  domain: 1,   // $/mo amortized
  emailsPerLead: 3, // 1 outreach + 2 follow-ups
};

function calc(monthlyEmails: number) {
  const leadsFound = Math.ceil(monthlyEmails / PRICES.emailsPerLead);

  // OpenAI scrape+analyze cost
  const analyzeIn = (leadsFound * PRICES.openai.avgAnalyzeInputTokens / 1_000_000) * PRICES.openai.analyzeInputPer1M;
  const analyzeOut = (leadsFound * PRICES.openai.avgAnalyzeOutputTokens / 1_000_000) * PRICES.openai.analyzeOutputPer1M;
  const analyzeTotal = analyzeIn + analyzeOut;

  // OpenAI compose cost (per email sent)
  const composeIn = (monthlyEmails * PRICES.openai.avgComposeInputTokens / 1_000_000) * PRICES.openai.analyzeInputPer1M;
  const composeOut = (monthlyEmails * PRICES.openai.avgComposeOutputTokens / 1_000_000) * PRICES.openai.analyzeOutputPer1M;
  const composeTotal = composeIn + composeOut;

  // Apify
  const apifyRaw = leadsFound * PRICES.apify.pricePerPlace;
  const apifyCost = Math.max(0, apifyRaw - PRICES.apify.freeMonthlyCredit); // first $5 is free

  // Resend
  let resendCost = 0;
  if (monthlyEmails > PRICES.resend.freeMonthly) resendCost = PRICES.resend.proPrice;
  if (monthlyEmails > PRICES.resend.proLimit) resendCost = PRICES.resend.proPrice * Math.ceil(monthlyEmails / PRICES.resend.proLimit);

  const total = analyzeTotal + composeTotal + apifyCost + resendCost + PRICES.domain;

  return {
    leadsFound,
    analyzeCost: analyzeTotal,
    composeCost: composeTotal,
    apifyCost,
    apifyRaw,
    resendCost,
    domain: PRICES.domain,
    total,
  };
}

const PRESETS = [500, 1000, 2000, 5000, 10000];

export function CostCalculator() {
  const [emails, setEmails] = useState(1000);

  const result = useMemo(() => calc(emails), [emails]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-red-soft grid place-items-center">
          <Calculator size={15} className="text-red" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold">Колко ще струва на клиента ти всеки месец?</h3>
          <p className="text-[11.5px] text-ink-4">Реални цени по платформи. Без скрити такси.</p>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setEmails(p)}
            className={`text-[12px] mono px-2.5 py-1 rounded transition ${emails === p ? "bg-ink text-bg font-bold" : "bg-surface text-ink-3 hover:bg-surface-2"}`}
          >
            {p.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] mono uppercase tracking-wider text-ink-4 font-semibold">Имейли на месец</label>
          <input
            type="number"
            min={0}
            max={50000}
            step={100}
            value={emails}
            onChange={(e) => setEmails(Number(e.target.value) || 0)}
            className="w-24 h-7 px-2 rounded bg-surface border border-line text-[12.5px] mono text-right focus:outline-none focus:border-ink-5"
          />
        </div>
        <input
          type="range"
          min={0}
          max={10000}
          step={100}
          value={Math.min(emails, 10000)}
          onChange={(e) => setEmails(Number(e.target.value))}
          className="w-full h-2 bg-surface-2 rounded-full appearance-none cursor-pointer accent-red"
        />
        <div className="flex justify-between mt-1 text-[10px] mono text-ink-4">
          <span>0</span><span>2,500</span><span>5,000</span><span>7,500</span><span>10,000</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 bg-surface rounded-lg p-3">
        <Row label="🔍 Apify (~{n} lead-а scraped)" value={result.apifyCost} replace={{ n: result.leadsFound.toLocaleString() }} note={result.apifyRaw < 5 ? "напълно покрит от $5 free кредит" : `над $5 free credit: $${result.apifyRaw.toFixed(2)}`} />
        <Row label="🧠 OpenAI (анализ на {n} сайта)" value={result.analyzeCost} replace={{ n: result.leadsFound.toLocaleString() }} note="gpt-4o-mini" />
        <Row label="✍️ OpenAI (compose {e} имейла)" value={result.composeCost} replace={{ e: emails.toLocaleString() }} note="gpt-4o-mini" />
        <Row label="📧 Resend ({e} имейла)" value={result.resendCost} replace={{ e: emails.toLocaleString() }} note={emails <= 3000 ? "под 3000 → FREE" : "Pro plan"} />
        <Row label="🌐 Домейн (амортизация)" value={result.domain} note="$10-15/год от Cloudflare" />
      </div>

      {/* Total */}
      <div className="bg-ink text-bg p-4 rounded-lg flex items-center justify-between">
        <div>
          <div className="text-[10.5px] mono uppercase tracking-wider opacity-60 mb-0.5">ОБЩО НА МЕСЕЦ</div>
          <div className="text-[28px] mono font-bold">${result.total.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] mono uppercase tracking-wider opacity-60 mb-0.5">На имейл</div>
          <div className="text-[16px] mono font-bold">${(result.total / Math.max(emails, 1)).toFixed(5)}</div>
        </div>
      </div>

      {/* Sales angle */}
      <div className="bg-green-soft border border-green/20 rounded-lg p-3 text-[12px]">
        <div className="font-bold text-green flex items-center gap-1.5 mb-1">
          <TrendingDown size={13} /> Sales angle
        </div>
        <div className="text-ink-2 leading-relaxed">
          „Купуваш робота еднократно за <strong>€3,500</strong>. Той ще ти изпрати <strong>{emails.toLocaleString()} имейла/мес</strong> при разход само <strong>${result.total.toFixed(2)}/мес</strong> към платформите. При 5% conversion → ~{Math.ceil(emails * 0.05 / 30)} нови клиента/ден. ROI след 2-3 седмици."
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, replace, note }: { label: string; value: number; replace?: Record<string, string>; note?: string }) {
  let l = label;
  if (replace) for (const k in replace) l = l.replace(`{${k}}`, replace[k]);
  return (
    <div className="flex items-center justify-between text-[12px]">
      <div className="flex-1">
        <div className="text-ink-2">{l}</div>
        {note && <div className="text-[10.5px] text-ink-4 mono">{note}</div>}
      </div>
      <div className="mono font-bold text-ink">${value.toFixed(2)}</div>
    </div>
  );
}
