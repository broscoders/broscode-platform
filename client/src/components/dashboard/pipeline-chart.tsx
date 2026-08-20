"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface PipelinePoint {
  stage: string;
  count: number;
}

const stageLabels: Record<string, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  MEETING: "Meeting",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
};

export function PipelineChart({ data }: { data: PipelinePoint[] }) {
  const chartData = data.map((d) => ({ stage: stageLabels[d.stage] ?? d.stage, count: d.count }));
  const hasData = chartData.some((d) => d.count > 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
          <XAxis dataKey="stage" stroke="rgb(var(--text-muted))" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="rgb(var(--text-muted))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "rgb(var(--surface))",
              border: "1px solid rgb(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={entry.stage} fill="#3B82F6" fillOpacity={i === chartData.length - 1 ? 1 : 0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-text-muted">No deals yet - create one from a qualified lead.</p>
        </div>
      )}
    </div>
  );
}