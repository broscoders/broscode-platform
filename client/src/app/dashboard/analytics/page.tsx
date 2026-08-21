"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Percent, Trophy, DollarSign, Mail } from "lucide-react";
import { api } from "@/lib/api";

interface AnalyticsData {
  leadConversionRate: number;
  dealWinRate: number;
  avgDealValue: number;
  emailReplyRate: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueByCategory: { category: string; leadCount: number }[];
  revenuePerEmployee: { name: string; revenue: number; dealsWon: number }[];
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AnalyticsData>("/analytics")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-text-muted">Key metrics computed from live records.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Lead Conversion Rate" value={`${data.leadConversionRate}%`} icon={Percent} />
        <StatCard label="Deal Win Rate" value={`${data.dealWinRate}%`} icon={Trophy} />
        <StatCard label="Avg Deal Value" value={money(data.avgDealValue)} icon={DollarSign} />
        <StatCard label="Email Reply Rate" value={`${data.emailReplyRate}%`} icon={Mail} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Total Revenue</span>
              <span className="font-data">{money(data.totalRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total Expenses</span>
              <span className="font-data text-danger">{money(data.totalExpenses)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <span className="font-medium">Net Profit</span>
              <span className="font-data font-medium">{money(data.netProfit)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-text-muted">
              <span>Deals Won / Lost</span>
              <span className="font-data">{data.wonDeals} / {data.lostDeals}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Leads by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.revenueByCategory.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-text-muted">No categories yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.revenueByCategory.map((c) => (
                  <div key={c.category} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span>{c.category}</span>
                    <span className="font-data text-text-muted">{c.leadCount}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="bracket-marker">Revenue per Employee</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.revenuePerEmployee.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">No won deals attributed to team members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Deals Won</th>
                    <th className="px-5 py-3 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenuePerEmployee.map((e) => (
                    <tr key={e.name} className="border-t border-border">
                      <td className="px-5 py-3 font-medium">{e.name}</td>
                      <td className="px-5 py-3">{e.dealsWon}</td>
                      <td className="px-5 py-3 font-data">{money(e.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}