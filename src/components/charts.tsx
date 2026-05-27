"use client";

import { ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const tooltipStyle = {
  contentStyle: { background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, padding: "8px 10px" },
  cursor: { stroke: "var(--line-2)" },
  labelStyle: { color: "var(--ink-3)", marginBottom: 4 },
};

export function TrendChart({ data }: { data: { day: string; sent: number; replied: number; meetings: number }[] }) {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-sent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A0A0A" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#0A0A0A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-replied" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E10C2F" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#E10C2F" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-meetings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity={0.30} />
              <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-4)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--ink-4)", fontSize: 10, fontFamily: "var(--font-mono)" }} width={30} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--ink-3)" }} iconType="circle" iconSize={7} />
          <Area name="Изпратени" type="monotone" dataKey="sent" stroke="#0A0A0A" strokeWidth={1.5} fill="url(#g-sent)" />
          <Area name="Отговори" type="monotone" dataKey="replied" stroke="#E10C2F" strokeWidth={1.5} fill="url(#g-replied)" />
          <Area name="Срещи" type="monotone" dataKey="meetings" stroke="#16A34A" strokeWidth={1.5} fill="url(#g-meetings)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReplyRateChart({ data }: { data: { day: string; rate: number }[] }) {
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-4)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--ink-4)", fontSize: 10, fontFamily: "var(--font-mono)" }} width={30} />
          <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
          <Line type="monotone" dataKey="rate" stroke="#E10C2F" strokeWidth={2} dot={{ fill: "#E10C2F", r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const NICHE_COLORS = ["#E10C2F", "#2563EB", "#16A34A", "#6E5CE8", "#B45309", "#0A0A0A"];

export function NichePie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius={48}
            outerRadius={78}
            paddingAngle={2}
            dataKey="value"
            stroke="var(--bg)"
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={NICHE_COLORS[i % NICHE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
