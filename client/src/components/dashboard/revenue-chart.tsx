"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { month: "Feb", revenue: 18400 },
  { month: "Mar", revenue: 24200 },
  { month: "Apr", revenue: 21100 },
  { month: "May", revenue: 29800 },
  { month: "Jun", revenue: 26300 },
  { month: "Jul", revenue: 34600 },
  { month: "Aug", revenue: 31200 },
];

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
        <XAxis dataKey="month" stroke="rgb(var(--text-muted))" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="rgb(var(--text-muted))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
        <Tooltip
          contentStyle={{
            background: "rgb(var(--surface))",
            border: "1px solid rgb(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
        />
        <Area type="monotone" dataKey="revenue" stroke="rgb(var(--primary))" strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
