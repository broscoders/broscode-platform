import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) return res.json({ leads: [], customers: [], deals: [], projects: [], orders: [] });

  const [leads, customers, deals, projects, orders] = await Promise.all([
    prisma.lead.findMany({
      where: { businessName: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, businessName: true, status: true },
    }),
    prisma.customer.findMany({
      where: { company: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, company: true },
    }),
    prisma.deal.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, name: true, stage: true },
    }),
    prisma.project.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, name: true, status: true },
    }),
    prisma.order.findMany({
      where: { orderNumber: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, orderNumber: true, total: true },
    }),
  ]);

  res.json({ leads, customers, deals, projects, orders });
});