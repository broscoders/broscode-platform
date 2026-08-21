import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

interface DashboardInvoiceRow {
  total: number;
  paidAmount: number;
  status: string;
}

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (_req, res) => {
  const [
    totalLeads,
    newLeads,
    contactedLeads,
    qualifiedLeads,
    totalCustomers,
    activeDeals,
    wonDeals,
    activeProjects,
    completedProjects,
    invoices,
    expenses,
    commissions,
    emailsSent,
    emailReplies,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({ where: { status: "CONTACTED" } }),
    prisma.lead.count({ where: { status: "QUALIFIED" } }),
    prisma.customer.count(),
    prisma.deal.count({ where: { stage: { notIn: ["WON", "LOST"] } } }),
    prisma.deal.count({ where: { stage: "WON" } }),
    prisma.project.count({ where: { status: { in: ["PLANNING", "ACTIVE", "REVIEW"] } } }),
    prisma.project.count({ where: { status: "COMPLETED" } }),
    prisma.invoice.findMany({ select: { total: true, paidAmount: true, status: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.commission.aggregate({ _sum: { amount: true } }),
    prisma.emailLog.count(),
    prisma.emailLog.count({ where: { status: "replied" } }),
  ]);

  const invoiceRows = invoices as DashboardInvoiceRow[];
  const totalRevenue = invoiceRows.reduce((sum, i) => sum + i.paidAmount, 0);
  const pendingPayments = invoiceRows.reduce((sum, i) => sum + (i.total - i.paidAmount), 0);
  const totalExpenses = expenses._sum.amount ?? 0;
  const netProfit = totalRevenue - totalExpenses;

  res.json({
    totalLeads,
    newLeads,
    contactedLeads,
    qualifiedLeads,
    totalCustomers,
    activeDeals,
    wonDeals,
    activeProjects,
    completedProjects,
    totalRevenue,
    pendingPayments,
    totalExpenses,
    netProfit,
    totalCommission: commissions._sum.amount ?? 0,
    emailsSent,
    emailReplies,
  });
});

// Monthly revenue for the last 7 months, built from real invoice payments -
// months with no paid invoices show as 0 rather than being omitted or faked.
dashboardRouter.get("/revenue-trend", async (_req, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { paidAmount: { gt: 0 } },
    select: { paidAmount: true, createdAt: true },
  });

  const months: { key: string; label: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
    });
  }

  for (const inv of invoices) {
    const d = new Date(inv.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.revenue += inv.paidAmount;
  }

  res.json(months.map(({ label, revenue }) => ({ month: label, revenue })));
});

// Deal counts per pipeline stage, in blueprint order - every stage is present
// even at 0 so the chart shape never implies data that doesn't exist.
dashboardRouter.get("/pipeline", async (_req, res) => {
  const stages = ["NEW", "QUALIFIED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON"] as const;
  const counts = await Promise.all(stages.map((stage) => prisma.deal.count({ where: { stage } })));
  res.json(stages.map((stage, i) => ({ stage, count: counts[i] })));
});