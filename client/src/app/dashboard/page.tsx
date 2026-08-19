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

const stats = [
  { label: "Total Leads", value: "3,482", delta: "+128 this week", trend: "up" as const, icon: Users },
  { label: "New Leads", value: "214", delta: "+18% vs last week", trend: "up" as const, icon: UserPlus },
  { label: "Contacted", value: "1,096", delta: "31.5% of total", trend: "neutral" as const, icon: PhoneCall },
  { label: "Qualified", value: "540", delta: "15.5% qualify rate", trend: "up" as const, icon: BadgeCheck },
  { label: "Total Customers", value: "312", delta: "+9 this month", trend: "up" as const, icon: Building2 },
  { label: "Active Deals", value: "87", delta: "$412k in pipeline", trend: "neutral" as const, icon: Target },
  { label: "Won Deals", value: "22", delta: "+4 this month", trend: "up" as const, icon: Trophy },
  { label: "Active Projects", value: "18", delta: "6 due this week", trend: "neutral" as const, icon: FolderKanban },
  { label: "Completed Projects", value: "64", delta: "96% on-time rate", trend: "up" as const, icon: CheckCircle2 },
  { label: "Total Revenue", value: "$186.4k", delta: "+12.4% MoM", trend: "up" as const, icon: DollarSign },
  { label: "Pending Payments", value: "$24.1k", delta: "9 invoices overdue", trend: "down" as const, icon: Clock },
  { label: "Total Expenses", value: "$41.8k", delta: "22.4% of revenue", trend: "neutral" as const, icon: Receipt },
  { label: "Net Profit", value: "$144.6k", delta: "77.6% margin", trend: "up" as const, icon: TrendingUp },
  { label: "Team Commission", value: "$18.2k", delta: "12 payees", trend: "neutral" as const, icon: Percent },
  { label: "Emails Sent", value: "4,920", delta: "312 today", trend: "neutral" as const, icon: Mail },
  { label: "Email Replies", value: "386", delta: "7.8% reply rate", trend: "up" as const, icon: MailOpen },
];

const recentLeads = [
  { name: "Al-Madina Restaurant", category: "Restaurant", city: "Lahore", score: 88, status: "Qualified" },
  { name: "Smile Care Dental", category: "Dental", city: "Karachi", score: 74, status: "Contacted" },
  { name: "Prime Realty Co.", category: "Real Estate", city: "Islamabad", score: 91, status: "Meeting" },
  { name: "FitZone Gym", category: "Fitness", city: "Lahore", score: 63, status: "New" },
  { name: "NextGen Softworks", category: "Software", city: "Karachi", score: 95, status: "Proposal" },
];

const statusVariant: Record<string, "default" | "success" | "warning" | "neutral"> = {
  Qualified: "default",
  Contacted: "warning",
  Meeting: "default",
  New: "neutral",
  Proposal: "success",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-text-muted">Business snapshot across leads, sales, and delivery.</p>
        </div>
        <div className="flex gap-2">
          {["Today", "7D", "30D", "This Month", "This Year"].map((f, i) => (
            <button
              key={f}
              className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${
                i === 2
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-text-muted hover:text-text"
              }`}
            >
              {f}
            </button>
          ))}
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
            <RevenueChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineChart />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="bracket-marker">Recently Discovered Leads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                  <tr key={lead.name} className="border-t border-border hover:bg-surface-2">
                    <td className="px-5 py-3 font-medium">{lead.name}</td>
                    <td className="px-5 py-3 text-text-muted">{lead.category}</td>
                    <td className="px-5 py-3 text-text-muted">{lead.city}</td>
                    <td className="px-5 py-3 font-data">{lead.score}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant[lead.status] ?? "neutral"}>{lead.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
