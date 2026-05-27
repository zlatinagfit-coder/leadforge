"use client";

import { useState, useTransition } from "react";
import { Key, Loader2, CheckCircle2, AlertCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { updateApiKeysAction } from "@/lib/actions";

type ApiKeyConfig = {
  openaiApiKey?: string | null;
  apifyToken?: string | null;
  hunterApiKey?: string | null;
  resendApiKey?: string | null;
  resendFromEmail?: string | null;
  resendFromName?: string | null;
};

type TestResult = { ok: boolean; error?: string };

export function ApiKeysPanel({ workspace }: { workspace: ApiKeyConfig }) {
  const [openai, setOpenai] = useState(workspace.openaiApiKey ?? "");
  const [apify, setApify] = useState(workspace.apifyToken ?? "");
  const [hunter, setHunter] = useState(workspace.hunterApiKey ?? "");
  const [resend, setResend] = useState(workspace.resendApiKey ?? "");
  const [fromEmail, setFromEmail] = useState(workspace.resendFromEmail ?? "");
  const [fromName, setFromName] = useState(workspace.resendFromName ?? "");

  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [globalMsg, setGlobalMsg] = useState<{ success?: boolean; error?: string } | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalMsg(null);
    setResults({});
    const fd = new FormData();
    fd.set("openaiApiKey", openai);
    fd.set("apifyToken", apify);
    fd.set("hunterApiKey", hunter);
    fd.set("resendApiKey", resend);
    fd.set("resendFromEmail", fromEmail);
    fd.set("resendFromName", fromName);

    startTransition(async () => {
      const res = await updateApiKeysAction(fd);
      setResults(res.results ?? {});
      setGlobalMsg(res.success ? { success: true } : { success: false, error: res.error });
      if (res.success) setTimeout(() => setGlobalMsg(null), 4000);
    });
  };

  const isConfigured = !!(workspace.openaiApiKey && workspace.apifyToken && workspace.resendApiKey);

  return (
    <form onSubmit={save} className="space-y-4">
      {/* Status banner */}
      <div className={`p-3 rounded-lg border text-[12.5px] ${isConfigured ? "bg-green-soft border-green/20 text-green" : "bg-amber-soft border-amber/20 text-amber"}`}>
        <div className="font-bold flex items-center gap-1.5 mb-1">
          {isConfigured ? <><CheckCircle2 size={13} /> Роботът ти е конфигуриран</> : <><AlertCircle size={13} /> Незавършена конфигурация</>}
        </div>
        <div className="text-ink-3 text-[12px]">
          {isConfigured
            ? "Всички задължителни ключове са свързани. Роботът работи автоматично."
            : "Свържи поне OpenAI + Apify + Resend за да започнеш."}
        </div>
      </div>

      {/* OpenAI */}
      <ApiKeyField
        label="OpenAI API key"
        required
        provider="OpenAI"
        purpose="AI анализ на сайтове · композиране на имейли · парсване на промпти"
        placeholder="sk-proj-..."
        value={openai}
        onChange={setOpenai}
        result={results.openai}
        pending={pending}
        link="https://platform.openai.com/api-keys"
        priceHint="$0.0003-0.001 на lead · ~$1-3/мес при 1000 имейла"
      />

      {/* Apify */}
      <ApiKeyField
        label="Apify Token"
        required
        provider="Apify"
        purpose="Скрейпване на Google Maps за нови lead-ове"
        placeholder="apify_api_..."
        value={apify}
        onChange={setApify}
        result={results.apify}
        pending={pending}
        link="https://console.apify.com/settings/integrations"
        priceHint="$0.07 на 1000 lead-а · $5 безплатен кредит/мес"
      />

      {/* Resend */}
      <ApiKeyField
        label="Resend API key"
        required
        provider="Resend"
        purpose="Изпращане на outreach + follow-up имейли"
        placeholder="re_..."
        value={resend}
        onChange={setResend}
        result={results.resend}
        pending={pending}
        link="https://resend.com/api-keys"
        priceHint="FREE до 3000 имейла/мес · $20/мес за 50,000"
      />

      {/* Resend domain config */}
      <div className="grid grid-cols-2 gap-2 ml-7 pl-3 border-l-2 border-line">
        <div>
          <label className="text-[10.5px] mono uppercase tracking-wider text-ink-4 font-semibold">From email</label>
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            disabled={pending}
            placeholder="hi@yourcompany.com"
            className="w-full mt-1 h-9 px-3 rounded-lg bg-bg border border-line text-[12px] mono focus:outline-none focus:border-ink-5"
          />
        </div>
        <div>
          <label className="text-[10.5px] mono uppercase tracking-wider text-ink-4 font-semibold">From name</label>
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            disabled={pending}
            placeholder="напр. Zlatina от LeadForge"
            className="w-full mt-1 h-9 px-3 rounded-lg bg-bg border border-line text-[12px] focus:outline-none focus:border-ink-5"
          />
        </div>
      </div>

      {/* Hunter — optional */}
      <ApiKeyField
        label="Hunter.io API key"
        provider="Hunter.io"
        purpose="Премиум email finder · намира конкретни хора (опционално)"
        placeholder="..."
        value={hunter}
        onChange={setHunter}
        result={results.hunter}
        pending={pending}
        link="https://hunter.io/api-keys"
        priceHint="$49/мес за 500 търсения · БЕЗ него → използва pattern guessing (info@, contact@)"
      />

      {/* Save */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
        {globalMsg?.success && <span className="text-[12px] text-green flex items-center gap-1"><CheckCircle2 size={12} /> Всички ключове запазени и тествани</span>}
        {globalMsg?.error && <span className="text-[12px] text-red flex items-center gap-1"><AlertCircle size={12} /> {globalMsg.error}</span>}
        <button type="submit" disabled={pending} className="h-10 px-4 rounded-lg bg-ink text-bg text-[13px] font-bold hover:bg-ink-2 disabled:opacity-50 inline-flex items-center gap-2">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
          {pending ? "Тествам всеки ключ..." : "Запази и тествай"}
        </button>
      </div>

      <div className="text-[11.5px] text-ink-4 pt-2">
        💡 След като запазиш — всеки изпратен имейл, scrape и AI анализ ще използват <strong>твоите</strong> API ключове. Платформите ще таксуват <strong>твоята</strong> карта директно. Ние не виждаме нито един cent.
      </div>
    </form>
  );
}

function ApiKeyField({ label, required, provider, purpose, placeholder, value, onChange, result, pending, link, priceHint }: {
  label: string; required?: boolean; provider: string; purpose: string; placeholder: string;
  value: string; onChange: (v: string) => void; result?: TestResult; pending: boolean;
  link: string; priceHint: string;
}) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-[12.5px] font-bold flex items-center gap-1.5">
            <span className="w-5 h-5 rounded grid place-items-center bg-ink text-bg text-[10px] font-bold">{provider[0]}</span>
            {label}
            {required && <span className="text-red text-[10px]">*</span>}
          </label>
          {result && (
            result.ok
              ? <span className="text-[10.5px] mono text-green flex items-center gap-0.5"><CheckCircle2 size={10} /> валиден</span>
              : <span className="text-[10.5px] mono text-red flex items-center gap-0.5" title={result.error}><AlertCircle size={10} /> {result.error?.slice(0, 30)}</span>
          )}
        </div>
        <a href={link} target="_blank" rel="noreferrer" className="text-[10.5px] mono text-blue hover:underline flex items-center gap-0.5">
          Вземи ключ <ExternalLink size={10} />
        </a>
      </div>

      <div className="relative">
        <input
          type={showKey ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={pending}
          placeholder={placeholder}
          className="w-full h-9 pl-3 pr-12 rounded-lg bg-bg border border-line text-[12.5px] mono focus:outline-none focus:border-ink-5"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink"
        >
          {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      <div className="text-[11px] text-ink-4 ml-7">
        <span className="text-ink-3">{purpose}</span> · <span className="mono">{priceHint}</span>
      </div>
    </div>
  );
}
