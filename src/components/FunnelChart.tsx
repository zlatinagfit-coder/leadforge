"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";

type Series = { sent: number[]; replied: number[]; meeting: number[] };

export function FunnelChart({ series }: { series: Series }) {
  const days = series.sent.length;
  const data = Array.from({ length: days }, (_, i) => ({
    day: `Д${days - i}`,
    Изпратени: series.sent[i],
    Отговори: series.replied[i],
    Срещи: series.meeting[i],
  })).reverse();

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-4)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
          <Tooltip
            contentStyle={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, padding: "8px 10px" }}
            cursor={{ fill: "var(--surface)" }}
            labelStyle={{ color: "var(--ink-3)", marginBottom: 4 }}
          />
          <Bar dataKey="Изпратени" stackId="a" fill="#0A0A0A" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Отговори"  stackId="a" fill="#E10C2F" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Срещи"     stackId="a" fill="#16A34A" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
