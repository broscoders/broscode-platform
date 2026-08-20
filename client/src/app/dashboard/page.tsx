"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  PhoneCall,
  BadgeCheck,
  Building2,
  Target,
  Trophy,
  FolderKanban,
  CheckCircle2,
  DollarSign,
  Clock,
  Receipt,
  TrendingUp,
  Percent,
  Mail,
  MailOpen,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface DashboardSummary {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  totalCustomers: number;
  activeDeals: number;
  wonDeals: number;
  activeProjects: number;
  completedProjects: number;
  totalRevenue: number;
  pendingPayments: number;
  totalExpenses: number;
  netProfit: number;
  totalCommission: number;
  emailsSent: number;
  emailReplies: number;
}

interface RevenuePoint {
  month: string;
  revenue: number;
}

interface PipelinePoint {
  stage: string;
  count: number;
}

interface LeadRow {
  id: string;
  businessName: string;
  city: string | null;
  score: number;
  status: string;
  category: { name: string } | null;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "neutral"> = {
  QUALIFIED: "default",
  CONTACTED: "warning",
  MEETING: "default",
  NEW: "neutral",
  PROPOSAL: "success",
  WON: "success",
};

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenuePoint[]>([]);
  const [pipeline, setPipeline] = useState<PipelinePoint[]>([]);
  const [recentLeads, setRecentLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summaryRes, revenueRes, pipelineRes, leadsRes] = await Promise.all([
          api.get<DashboardSummary>("/dashboard/summary"),
          api.get<RevenuePoint[]>("/dashboard/revenue-trend"),
          api.get<PipelinePoint[]>("/dashboard/pipeline"),
          api.get<{ leads: LeadRow[] }>("/leads", { params: { page: 1, pageSize: 5 } }),
        ]);
        if (cancelled) return;
        setSummary(summaryRes.data);
        setRevenueTrend(revenueRes.data);
        setPipeline(pipelineRes.data);
        setRecentLeads(leadsRes.data.leads);
      } catch {
        if (!cancelled) setError("Couldn't load dashboard data. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="font-data text-xs text-text-muted">{"<"} loading dashboard {"/>"}</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-danger">{error ?? "Something went wrong."}</p>
      </div>
    );
  }

  const stats = [
    { label: "Total Leads", value: summary.totalLeads.toLocaleString(), icon: Users },
    { label: "New Leads", value: summary.newLeads.toLocaleString(), icon: UserPlus },
    { label: "Contacted", value: summary.contactedLeads.toLocaleString(), icon: PhoneCall },
    { label: "Qualified", value: summary.qualifiedLeads.toLocaleString(), icon: BadgeCheck },
    { label: "Total Customers", value: summary.totalCustomers.toLocaleString(), icon: Building2 },
    { label: "Active Deals", value: summary.activeDeals.toLocaleString(), icon: Target },
    { label: "Won Deals", value: summary.wonDeals.toLocaleString(), icon: Trophy },
    { label: "Active Projects", value: summary.activeProjects.toLocaleString(), icon: FolderKanban },
    { label: "Completed Projects", value: summary.completedProjects.toLocaleString(), icon: CheckCircle2 },
    { label: "Total Revenue", value: money(summary.totalRevenue), icon: DollarSign },
    { label: "Pending Payments", value: money(summary.pendingPayments), icon: Clock },
    { label: "Total Expenses", value: money(summary.totalExpenses), icon: Receipt },
    { label: "Net Profit", value: money(summary.netProfit), icon: TrendingUp },
    { label: "Team Commission", value: money(summary.totalCommission), icon: Percent },
    { label: "Emails Sent", value: summary.emailsSent.toLocaleString(), icon: Mail },
    { label: "Email Replies", value: summary.emailReplies.toLocaleString(), icon: MailOpen },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-text-muted">Business snapshot across leads, sales, and delivery.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineChart data={pipeline} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="bracket-marker">Recently Discovered Leads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentLeads.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">
              No leads yet - use AI Lead Finder to discover your first batch.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Business</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">City</th>
                    <th className="px-5 py-3 font-medium">Score</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="border-t border-border hover:bg-surface-2">
                      <td className="px-5 py-3 font-medium">{lead.businessName}</td>
                      <td className="px-5 py-3 text-text-muted">{lead.category?.name ?? "Uncategorized"}</td>
                      <td className="px-5 py-3 text-text-muted">{lead.city ?? "-"}</td>
                      <td className="px-5 py-3 font-data">{lead.score}</td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[lead.status] ?? "neutral"}>{lead.status}</Badge>
                      </td>
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