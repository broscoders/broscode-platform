import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { askGroq } from "../lib/groq";

export const assistantRouter = Router();
assistantRouter.use(requireAuth);

const askSchema = z.object({
  question: z.string().min(2).max(500),
});

async function buildDataSnapshot() {
  const [
    totalLeads,
    leadsByCategory,
    leadsByStatus,
    hotLeads,
    totalCustomers,
    deals,
    wonDeals,
    invoices,
    topEmployeeRevenue,
    emailsSent,
    emailReplies,
    projects,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["categoryId"], _count: true }),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.lead.count({ where: { priority: "Hot" } }),
    prisma.customer.count(),
    prisma.deal.count(),
    prisma.deal.count({ where: { stage: "WON" } }),
    prisma.invoice.findMany({ select: { paidAmount: true } }),
    prisma.commission.groupBy({ by: ["userId"], _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 1 }),
    prisma.emailLog.count(),
    prisma.emailLog.count({ where: { status: "replied" } }),
    prisma.project.groupBy({ by: ["status"], _count: true }),
  ]);

  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const categoryMap: Record<string, string> = Object.fromEntries(categories.map((c: { id: string; name: string }) => [c.id, c.name]));

  let topEmployeeName: string | null = null;
  if (topEmployeeRevenue[0]) {
    const user = await prisma.user.findUnique({ where: { id: topEmployeeRevenue[0].userId } });
    topEmployeeName = user?.name ?? null;
  }

  const totalRevenue: number = invoices.reduce((sum: number, i: { paidAmount: number }) => sum + i.paidAmount, 0);

  return {
    totalLeads,
    leadsByCategory: leadsByCategory.map((g: { categoryId: string | null; _count: number }) => ({
      category: g.categoryId ? (categoryMap[g.categoryId] ?? "Unknown") : "Uncategorized",
      count: g._count,
    })),
    leadsByStatus: leadsByStatus.map((g: { status: string; _count: number }) => ({ status: g.status, count: g._count })),
    hotLeads,
    totalCustomers,
    totalDeals: deals,
    wonDeals,
    totalRevenue,
    topEmployee: topEmployeeName
      ? { name: topEmployeeName, commission: topEmployeeRevenue[0]._sum.amount ?? 0 }
      : null,
    emailsSent,
    emailReplies,
    emailReplyRate: emailsSent > 0 ? `${((emailReplies / emailsSent) * 100).toFixed(1)}%` : "0%",
    projectsByStatus: projects.map((g: { status: string; _count: number }) => ({ status: g.status, count: g._count })),
    generatedAt: new Date().toISOString(),
  };
}

assistantRouter.post("/ask", async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Ask a question (2-500 characters)." });

  const snapshot = await buildDataSnapshot();

  const systemPrompt = `You are the Bro's Code internal business assistant. You answer questions about the company's leads, sales, and revenue using ONLY the JSON data snapshot provided below - never your training data, and never invented or estimated numbers.

Rules:
- If the answer isn't in the data, say so plainly (e.g. "There's no data for that yet") - do not guess or extrapolate.
- Keep answers short and direct (1-4 sentences), citing specific numbers from the data.
- Currency is USD.

DATA SNAPSHOT (as of ${snapshot.generatedAt}):
${JSON.stringify(snapshot, null, 2)}`;

  try {
    const answer = await askGroq([
      { role: "system", content: systemPrompt },
      { role: "user", content: parsed.data.question },
    ]);
    res.json({ answer });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});