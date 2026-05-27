import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { formatNumber } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  delta?: string;
  deltaPositive?: boolean;
  sub?: string;
  spark?: number[];
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  accent?: "red" | "blue" | "green" | "purple" | "amber" | "ink";
};

const ACCENT_COLORS: Record<NonNullable<Props["accent"]>, { stroke: string; fill: string; soft: string }> = {
  red:    { stroke: "#E10C2F", fill: "rgba(225,12,47,0.10)",  soft: "var(--red-soft)" },
  blue:   { stroke: "#2563EB", fill: "rgba(37,99,235,0.10)",  soft: "var(--blue-soft)" },
  green:  { stroke: "#16A34A", fill: "rgba(22,163,74,0.10)",  soft: "var(--green-soft)" },
  purple: { stroke: "#6E5CE8", fill: "rgba(110,92,232,0.10)", soft: "var(--purple-soft)" },
  amber:  { stroke: "#B45309", fill: "rgba(180,83,9,0.10)",   soft: "var(--amber-soft)" },
  ink:    { stroke: "#0A0A0A", fill: "rgba(0,0,0,0.06)",      soft: "var(--surface)" },
};

export function KpiCard({ label, value, delta, deltaPositive = true, sub, spark, Icon, accent = "red" }: Props) {
  const c = ACCENT_COLORS[accent];

  return (
    <div className="card card-hover p-4 flex flex-col gap-3 transition">
      <div className="flex items-start justify-between">
        <div className="text-[12px] font-semibold text-ink-3 uppercase tracking-wider">{label}</div>
        {Icon && (
          <div className="w-7 h-7 rounded-md grid place-items-center" style={{ background: c.soft }}>
            <Icon size={14} className="text-ink-2" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mono tracking-tight">
        <div className="text-[34px] font-bold leading-none text-ink">{formatNumber(value)}</div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          {delta && (
            <div className="flex items-center gap-1 text-[11.5px] font-bold mono">
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                style={{
                  background: deltaPositive ? "var(--green-soft)" : "var(--red-soft)",
                  color: deltaPositive ? "var(--green)" : "var(--red)",
                }}
              >
                {deltaPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {delta}
              </span>
            </div>
          )}
          {sub && <div className="text-[11px] text-ink-4 leading-tight">{sub}</div>}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline data={spark} width={96} height={32} stroke={c.stroke} fill={c.fill} />
        )}
      </div>
    </div>
  );
}
