"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useDict } from "@/i18n/locale-context";

const COLORS = ["var(--success)", "var(--danger)"];

export function WinLossPie({ won, lost }: { won: number; lost: number }) {
  const dict = useDict();
  const data = [
    { name: dict.reports.won, value: won },
    { name: dict.reports.lost, value: lost },
  ];
  const total = won + lost;

  if (total === 0) {
    return <p className="flex h-56 items-center justify-center text-sm text-muted">{dict.reports.noClosedOpportunities}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const num = Number(value ?? 0);
            return [`${num} (${((num / total) * 100).toFixed(0)}%)`, String(name ?? "")];
          }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            fontSize: 12,
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
