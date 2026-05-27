"use client";

import { useActionState } from "react";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import type { SignupResult } from "@/lib/auth-actions";

export function SignupForm({ action }: { action: (prev: SignupResult | undefined, fd: FormData) => Promise<SignupResult> }) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Твоето име" name="name" required disabled={pending} placeholder="напр. Zlatina Georgieva" />
      <Field label="Email" name="email" type="email" required disabled={pending} placeholder="hi@yourcompany.com" mono />
      <Field label="Парола" name="password" type="password" required minLength={6} disabled={pending} placeholder="мин. 6 символа" mono />
      <Field label="Име на workspace (опц.)" name="workspace" disabled={pending} placeholder="напр. Acme Agency" hint="Името което ще показваш на клиенти" />

      {state?.error && (
        <div className="bg-red-soft text-red p-2.5 rounded-lg text-[12px] flex items-start gap-2">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 mt-2 rounded-lg bg-red text-bg text-[13.5px] font-bold hover:bg-red-hover disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {pending ? "Създавам акаунт..." : "Създай акаунт"}
      </button>

      <p className="text-[11px] text-ink-4 text-center mt-2">
        С регистрацията се съгласяваш с Terms of Service и Privacy Policy
      </p>
    </form>
  );
}

function Field({ label, name, type = "text", required, disabled, placeholder, mono, hint, minLength }: { label: string; name: string; type?: string; required?: boolean; disabled?: boolean; placeholder?: string; mono?: boolean; hint?: string; minLength?: number }) {
  return (
    <label className="block">
      <div className="text-[11px] mono uppercase tracking-wider text-ink-4 font-semibold mb-1">{label}{required && <span className="text-red ml-1">*</span>}</div>
      <input
        name={name}
        type={type}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        minLength={minLength}
        className={`w-full h-10 px-3 rounded-lg bg-surface border border-line text-[13px] ${mono ? "mono" : ""} placeholder:text-ink-4 focus:outline-none focus:border-ink-5 disabled:opacity-50`}
      />
      {hint && <div className="text-[10.5px] text-ink-4 mt-1">{hint}</div>}
    </label>
  );
}
