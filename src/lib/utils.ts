import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("bg-BG").format(n);
}

export function formatCompact(n: number): string {
  if (n >= 1000) return new Intl.NumberFormat("bg-BG", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  return n.toString();
}

export function timeAgoBg(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "сега";
  if (minutes < 60) return `преди ${minutes} мин`;
  if (hours < 24) return `преди ${hours} ч`;
  if (days === 1) return "вчера";
  if (days < 7) return `преди ${days} дни`;
  if (days < 30) return `преди ${Math.floor(days / 7)} седм`;
  return d.toLocaleDateString("bg-BG", { day: "numeric", month: "short" });
}

export const STATUS_META: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  new:        { label: "Нов",           color: "#2563EB", bg: "#EFF6FF", ring: "#DBEAFE" },
  contacted:  { label: "Контактиран",   color: "#6E5CE8", bg: "#F1EEFE", ring: "#E0DAFA" },
  replied:    { label: "Отговорил",     color: "#B45309", bg: "#FFFBEB", ring: "#FEF3C7" },
  interested: { label: "Заинтересован", color: "#16A34A", bg: "#F0FDF4", ring: "#DCFCE7" },
  meeting:    { label: "Среща",         color: "#E10C2F", bg: "#FFF1F2", ring: "#FED7D7" },
  closed:     { label: "Closed-Won",    color: "#0A0A0A", bg: "#F4F4F5", ring: "#E4E4E7" },
  lost:       { label: "Изгубен",       color: "#71717A", bg: "#FAFAFA", ring: "#ECECEC" },
};

export const NICHE_META: Record<string, { label: string; color: string }> = {
  "Зъболекари":       { label: "Зъболекари",       color: "#2563EB" },
  "Фитнес":           { label: "Фитнес",           color: "#16A34A" },
  "Ecommerce":        { label: "Ecommerce",        color: "#E10C2F" },
  "Недвижими имоти":  { label: "Недвижими имоти",  color: "#6E5CE8" },
  "Ресторанти":       { label: "Ресторанти",       color: "#B45309" },
  "Адвокати":         { label: "Адвокати",         color: "#0A0A0A" },
};
