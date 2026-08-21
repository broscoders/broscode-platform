import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";

export const teamRouter = Router();
teamRouter.use(requireAuth);

const roles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES", "DEVELOPER", "DESIGNER", "MARKETER"] as const;

teamRouter.get("/", async (_req, res) => {
  const members = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      status: true,
      commissionRate: true,
      commissionType: true,
      _count: { select: { assignedLeads: true, assignedDeals: true, projectsManaged: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const withPerformance = await Promise.all(
    members.map(async (m: { id: string; [key: string]: unknown }) => {
      const [wonDeals, commissionSum] = await Promise.all([
        prisma.deal.count({ where: { assignedToId: m.id, stage: "WON" } }),
        prisma.commission.aggregate({ where: { userId: m.id }, _sum: { amount: true } }),
      ]);
      return { ...m, wonDeals, totalCommission: commissionSum._sum.amount ?? 0 };
    })
  );

  res.json(withPerformance);
});

const inviteSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(roles),
  department: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  commissionType: z.enum(["percentage", "fixed"]).optional(),
});

teamRouter.post("/", requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthedRequest, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid team member data." });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: "A user with this email already exists." });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const { password: _password, ...rest } = parsed.data;
  const user = await prisma.user.create({
    data: { ...rest, passwordHash },
    select: { id: true, name: true, email: true, role: true, department: true, status: true },
  });

  res.status(201).json(user);
});

const updateSchema = z.object({
  role: z.enum(roles).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  commissionType: z.enum(["percentage", "fixed"]).optional(),
});

teamRouter.patch("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  const id = String(req.params.id);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update." });

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, status: true, commissionRate: true, commissionType: true },
  });
  res.json(user);
});