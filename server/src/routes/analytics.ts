import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

analyticsRouter.get("/", async (_req, res) => {
  const [
    totalLeads,
    wonDeals,
    lostDeals,
    totalDeals,
    invoices,
    expenses,
    categories,
    emailsSent,
    emailReplies,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.deal.count({ where: { stage: "WON" } }),
    prisma.deal.count({ where: { stage: "LOST" } }),
    prisma.deal.count(),
    prisma.invoice.findMany({ select: { total: true, paidAmount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.category.findMany({ include: { _count: { select: { leads: true } } } }),
    prisma.emailLog.count(),
    prisma.emailLog.count({ where: { status: "replied" } }),
  ]);

  const totalRevenue: number = invoices.reduce((sum: number, i: { paidAmount: number }) => sum + i.paidAmount, 0);
  const closedDeals = wonDeals + lostDeals;
  const dealWinRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0;
  const avgDealValue = wonDeals > 0 ? totalRevenue / wonDeals : 0;
  const leadConversionRate = totalLeads > 0 ? (wonDeals / totalLeads) * 100 : 0;
  const emailReplyRate = emailsSent > 0 ? (emailReplies / emailsSent) * 100 : 0;
  const totalExpenses = expenses._sum.amount ?? 0;

  const employees = await prisma.user.findMany({ select: { id: true, name: true } });
  const revenuePerEmployee = await Promise.all(
    employees.map(async (e: { id: string; name: string }) => {
      const deals = await prisma.deal.findMany({ where: { assignedToId: e.id, stage: "WON" }, select: { value: true } });
      const revenue: number = deals.reduce((sum: number, d: { value: number }) => sum + d.value, 0);
      return { name: e.name, revenue, dealsWon: deals.length };
    })
  );

  res.json({
    leadConversionRate: Number(leadConversionRate.toFixed(1)),
    dealWinRate: Number(dealWinRate.toFixed(1)),
    avgDealValue: Math.round(avgDealValue),
    emailReplyRate: Number(emailReplyRate.toFixed(1)),
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    revenueByCategory: categories.map((c: { name: string; _count: { leads: number } }) => ({ category: c.name, leadCount: c._count.leads })),
    revenuePerEmployee: revenuePerEmployee.filter((e) => e.dealsWon > 0).sort((a, b) => b.revenue - a.revenue),
    totalDeals,
    wonDeals,
    lostDeals,
  });
});