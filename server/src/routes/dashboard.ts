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
