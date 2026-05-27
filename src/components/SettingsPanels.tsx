"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Crown, Check, Loader2, CheckCircle2, AlertCircle, X, Mail } from "lucide-react";
import { updateWorkspaceAction, addSendingInboxAction, deleteSendingInboxAction, inviteMemberAction, removeMemberAction } from "@/lib/actions";

const ACCENT_COLORS = [
  { name: "Red", value: "#E10C2F" },
  { name: "Black", value: "#0A0A0A" },
  { name: "Blue", value: "#2563EB" },
  { name: "Green", value: "#16A34A" },
  { name: "Purple", value: "#6E5CE8" },
  { name: "Amber", value: "#B45309" },
];

// ============================================================
// WORKSPACE FORM
// ============================================================

export function WorkspaceSettingsForm({ workspace }: { workspace: { name: string; slug: string; accentColor: string } }) {
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("slug", slug);
    startTransition(async () => {
      const res = await updateWorkspaceAction(fd);
      setResult(res);
      if (res.success) setTimeout(() => setResult(null), 3000);
    });
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Име на workspace" hint="Показва се в sidebar и при клиентите">
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={pending} className="w-full h-9 px-3 rounded-lg bg-bg border border-line text-[13px] focus:outline-none focus:border-ink-5" />
      </Field>
      <Field label="URL slug" hint="Използва се за вътрешни линкове">
        <div className="flex items-center gap-2">
          <span className="text-[12px] mono text-ink-4">app.leadforge.ai/</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={pending} className="flex-1 h-9 px-3 rounded-lg bg-bg border border-line text-[13px] mono focus:outline-none focus:border-ink-5" />
        </div>
      </Field>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
        {result?.success && <span className="text-[12px] text-green flex items-center gap-1"><CheckCircle2 size={12} /> Запазено</span>}
        {result?.error && <span className="text-[12px] text-red flex items-center gap-1"><AlertCircle size={12} /> {result.error}</span>}
        <button type="submit" disabled={pending} className="h-9 px-4 rounded-lg bg-ink text-bg text-[12.5px] font-semibold hover:bg-ink-2 disabled:opacity-50 inline-flex items-center gap-1.5">
          {pending && <Loader2 size={12} className="animate-spin" />}
          {pending ? "Запазвам..." : "Запази промените"}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// BRANDING PANEL
// ============================================================

export function BrandingPanel({ accentColor }: { accentColor: string }) {
  const [color, setColor] = useState(accentColor);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = (newColor: string) => {
    setColor(newColor);
    const fd = new FormData();
    fd.set("accentColor", newColor);
    fd.set("name", ""); // workspace name unchanged is OK, server uses ?? guard
    startTransition(async () => {
      // Re-fetch workspace name first to avoid wiping it
      const realFd = new FormData();
      realFd.set("name", document.querySelector<HTMLInputElement>('input[name="ws-name"]')?.value ?? "LeadForge HQ");
      realFd.set("accentColor", newColor);
      await updateWorkspaceAction(realFd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <Field label="Лого" hint="PNG / SVG · max 2MB · показва се в sidebar и имейли">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-ink grid place-items-center text-bg font-bold text-[18px]">LF</div>
          <div className="flex flex-col gap-1.5">
            <button type="button" disabled className="h-8 px-3 rounded-md border border-line text-[12px] font-semibold text-ink-4 cursor-not-allowed" title="В роудмап">
              Качи ново (скоро)
            </button>
            <span className="text-[11px] text-ink-4">Логото се конфигурира с upload в следваща версия</span>
          </div>
        </div>
      </Field>
      <Field label="Accent цвят" hint="Използва се за бутони, charts, badges">
        <div className="flex items-center gap-2 flex-wrap">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => save(c.value)}
              disabled={pending}
              title={c.name}
              className={`w-9 h-9 rounded-lg transition ${c.value === color ? "ring-2 ring-ink ring-offset-2" : "hover:ring-1 hover:ring-line-2 hover:ring-offset-1"}`}
              style={{ background: c.value }}
            />
          ))}
          <span className="ml-2 text-[12px] mono text-ink-3">{color}</span>
          {pending && <Loader2 size={12} className="animate-spin text-red ml-1" />}
          {saved && <span className="text-[11.5px] text-green flex items-center gap-1"><CheckCircle2 size={11} /> Запазено</span>}
        </div>
      </Field>
    </div>
  );
}

// ============================================================
// TEAM PANEL
// ============================================================

export function TeamPanel({ members }: { members: Array<{ id: string; role: string; userName: string; userEmail: string }> }) {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("member");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("name", name);
    fd.set("role", role);
    startTransition(async () => {
      const res = await inviteMemberAction(fd);
      setResult(res);
      if (res.success) {
        setEmail("");
        setName("");
        setTimeout(() => { setShowInvite(false); setResult(null); }, 1500);
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm("Сигурна ли си че искаш да премахнеш този член?")) return;
    startTransition(async () => {
      await removeMemberAction(id);
    });
  };

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line">
        {members.map((m) => (
          <li key={m.id} className="py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-bg" style={{ background: "linear-gradient(135deg,#FFB347,#E10C2F)" }}>
              {m.userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate">{m.userName}</div>
              <div className="text-[11px] mono text-ink-4 truncate">{m.userEmail}</div>
            </div>
            <span className="pill" style={{ background: m.role === "owner" ? "var(--red-soft)" : "var(--surface-2)", color: m.role === "owner" ? "var(--red)" : "var(--ink-3)" }}>
              {m.role === "owner" && <Crown size={9} />}
              {m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : m.role === "member" ? "Member" : "Viewer"}
            </span>
            {m.role !== "owner" && (
              <button onClick={() => remove(m.id)} disabled={pending} className="w-7 h-7 grid place-items-center rounded-md text-ink-4 hover:text-red hover:bg-red-soft disabled:opacity-50">
                <Trash2 size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {!showInvite && (
        <button onClick={() => setShowInvite(true)} className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold hover:bg-surface">
          <Plus size={13} /> Покани член
        </button>
      )}

      {showInvite && (
        <form onSubmit={invite} className="bg-surface rounded-lg p-3 space-y-2 border border-line">
          <div className="flex items-center justify-between mb-1">
            <strong className="text-[13px]">Покани нов член</strong>
            <button type="button" onClick={() => { setShowInvite(false); setResult(null); }} className="text-ink-4 hover:text-ink"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Име" disabled={pending} className="h-9 px-3 rounded-lg bg-bg border border-line text-[13px] focus:outline-none focus:border-ink-5" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" required disabled={pending} className="h-9 px-3 rounded-lg bg-bg border border-line text-[13px] mono focus:outline-none focus:border-ink-5" />
          </div>
          <div className="flex items-center gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value)} disabled={pending} className="h-9 px-3 rounded-lg bg-bg border border-line text-[13px] focus:outline-none focus:border-ink-5">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <div className="flex-1" />
            {result?.error && <span className="text-[11.5px] text-red flex items-center gap-1"><AlertCircle size={11} /> {result.error}</span>}
            {result?.success && <span className="text-[11.5px] text-green flex items-center gap-1"><CheckCircle2 size={11} /> Добавен!</span>}
            <button type="submit" disabled={pending} className="h-9 px-3 rounded-lg bg-red text-bg text-[12.5px] font-bold hover:bg-red-hover disabled:opacity-50 inline-flex items-center gap-1.5">
              {pending && <Loader2 size={11} className="animate-spin" />}
              Добави
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ============================================================
// INBOXES PANEL
// ============================================================

export function InboxesPanel({ inboxes }: { inboxes: Array<{ id: string; label: string; provider: string; fromEmail: string; fromName: string; dailyLimit: number; sentToday: number; warmedUp: boolean; health: number }> }) {
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [provider, setProvider] = useState("resend");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const fd = new FormData();
    fd.set("label", label);
    fd.set("fromEmail", fromEmail);
    fd.set("fromName", fromName);
    fd.set("provider", provider);
    startTransition(async () => {
      const res = await addSendingInboxAction(fd);
      setResult(res);
      if (res.success) {
        setLabel(""); setFromEmail(""); setFromName("");
        setTimeout(() => { setShowAdd(false); setResult(null); }, 1500);
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm("Премахни този sending inbox?")) return;
    startTransition(async () => {
      await deleteSendingInboxAction(id);
    });
  };

  return (
    <div className="space-y-3">
      {inboxes.length === 0 && (
        <div className="text-center py-6 text-[12.5px] text-ink-4">
          Все още няма sending inboxes. Добави първия за да започне AI да изпраща.
        </div>
      )}

      <ul className="space-y-2">
        {inboxes.map((ib) => (
          <li key={ib.id} className="border border-line rounded-lg p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: ib.health >= 90 ? "var(--green-soft)" : ib.health >= 75 ? "var(--amber-soft)" : "var(--red-soft)" }}>
              <Mail size={15} style={{ color: ib.health >= 90 ? "var(--green)" : ib.health >= 75 ? "var(--amber)" : "var(--red)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-[13px] font-bold">{ib.label}</span>
                <span className="text-[10.5px] mono px-1.5 py-px rounded bg-surface-2 text-ink-3 font-semibold">{ib.provider}</span>
                {ib.warmedUp && <span className="text-[10.5px] mono text-green flex items-center gap-0.5"><Check size={10} /> warmed</span>}
              </div>
              <div className="text-[11px] mono text-ink-4 truncate">{ib.fromName} &lt;{ib.fromEmail}&gt;</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10.5px] mono text-ink-4 mb-0.5">Днес</div>
              <div className="text-[13px] mono font-bold">{ib.sentToday}<span className="text-ink-4">/{ib.dailyLimit}</span></div>
            </div>
            <div className="text-right shrink-0 w-16">
              <div className="text-[10.5px] mono text-ink-4 mb-0.5">Health</div>
              <div className="text-[13px] mono font-bold" style={{ color: ib.health >= 90 ? "var(--green)" : ib.health >= 75 ? "var(--amber)" : "var(--red)" }}>{ib.health}%</div>
            </div>
            <button onClick={() => remove(ib.id)} disabled={pending} className="w-7 h-7 grid place-items-center rounded-md text-ink-4 hover:text-red hover:bg-red-soft disabled:opacity-50">
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>

      {!showAdd && (
        <button onClick={() => setShowAdd(true)} className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-line text-[12.5px] font-semibold hover:bg-surface">
          <Plus size={13} /> Добави inbox
        </button>
      )}

      {showAdd && (
        <form onSubmit={add} className="bg-surface rounded-lg p-3 space-y-2 border border-line">
          <div className="flex items-center justify-between mb-1">
            <strong className="text-[13px]">Нов sending inbox</strong>
            <button type="button" onClick={() => { setShowAdd(false); setResult(null); }} className="text-ink-4 hover:text-ink"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (напр. bg-01)" required disabled={pending} className="h-9 px-3 rounded-lg bg-bg border border-line text-[13px] focus:outline-none focus:border-ink-5" />
            <select value={provider} onChange={(e) => setProvider(e.target.value)} disabled={pending} className="h-9 px-3 rounded-lg bg-bg border border-line text-[13px] focus:outline-none focus:border-ink-5">
              <option value="resend">Resend</option>
              <option value="gmail_smtp">Gmail SMTP</option>
              <option value="sendgrid">SendGrid</option>
            </select>
          </div>
          <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="From Name (напр. Zlatina от LeadForge)" required disabled={pending} className="w-full h-9 px-3 rounded-lg bg-bg border border-line text-[13px] focus:outline-none focus:border-ink-5" />
          <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="hi@yourdomain.com" type="email" required disabled={pending} className="w-full h-9 px-3 rounded-lg bg-bg border border-line text-[13px] mono focus:outline-none focus:border-ink-5" />
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1" />
            {result?.error && <span className="text-[11.5px] text-red flex items-center gap-1"><AlertCircle size={11} /> {result.error}</span>}
            {result?.success && <span className="text-[11.5px] text-green flex items-center gap-1"><CheckCircle2 size={11} /> Добавен!</span>}
            <button type="submit" disabled={pending} className="h-9 px-3 rounded-lg bg-red text-bg text-[12.5px] font-bold hover:bg-red-hover disabled:opacity-50 inline-flex items-center gap-1.5">
              {pending && <Loader2 size={11} className="animate-spin" />}
              Добави inbox
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ============================================================
// Shared
// ============================================================

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
      <div>
        <div className="text-[12.5px] font-semibold">{label}</div>
        {hint && <div className="text-[11px] text-ink-4 mt-0.5">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
