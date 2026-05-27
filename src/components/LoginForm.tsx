"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Грешен имейл или парола");
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <div className="text-[11px] mono uppercase tracking-wider text-ink-4 font-semibold mb-1">Email</div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          autoFocus
          className="w-full h-10 px-3 rounded-lg bg-surface border border-line text-[13px] mono focus:outline-none focus:border-ink-5 disabled:opacity-50"
        />
      </label>
      <label className="block">
        <div className="text-[11px] mono uppercase tracking-wider text-ink-4 font-semibold mb-1">Парола</div>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          className="w-full h-10 px-3 rounded-lg bg-surface border border-line text-[13px] mono focus:outline-none focus:border-ink-5 disabled:opacity-50"
        />
      </label>

      {error && (
        <div className="bg-red-soft text-red p-2.5 rounded-lg text-[12px] flex items-start gap-2">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !email || !password}
        className="w-full h-11 mt-2 rounded-lg bg-ink text-bg text-[13.5px] font-bold hover:bg-ink-2 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        {pending ? "Влизам..." : "Влез"}
      </button>
    </form>
  );
}
