"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const data = [
  { stage: "New", count: 240 },
  { stage: "Qualified", count: 168 },
  { stage: "Meeting", count: 96 },
  { stage: "Proposal", count: 61 },
  { stage: "Negotiation", count: 34 },
  { stage: "Won", count: 22 },
];

const colors = ["#3B82F6", "#3B82F6", "#3B82F6", "#3B82F6", "#3B82F6", "#22C55E"];

export function PipelineChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
        <XAxis dataKey="stage" stroke="rgb(var(--text-muted))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="rgb(var(--text-muted))" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "rgb(var(--surface))",
            border: "1px solid rgb(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={entry.stage} fill={colors[i]} fillOpacity={i === data.length - 1 ? 1 : 0.55} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
