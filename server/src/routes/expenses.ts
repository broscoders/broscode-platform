import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

expensesRouter.get("/", async (_req, res) => {
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: { addedBy: { select: { name: true } } },
  });
  res.json(expenses);
});

const categories = ["Marketing", "Software", "Hosting", "Salary", "Office", "Other"] as const;

const expenseSchema = z.object({
  name: z.string().min(1),
  category: z.enum(categories),
  amount: z.number().positive(),
  date: z.string().optional(),
  description: z.string().optional(),
});

expensesRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid expense data." });

  const { date, ...rest } = parsed.data;
  const expense = await prisma.expense.create({
    data: {
      ...rest,
      date: date ? new Date(date) : undefined,
      addedById: req.user?.userId,
    },
  });
  res.status(201).json(expense);
});

expensesRouter.delete("/:id", async (req, res) => {
  await prisma.expense.delete({ where: { id: String(req.params.id) } });
  res.status(204).end();
});