import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const emailAccountsRouter = Router();
emailAccountsRouter.use(requireAuth);

emailAccountsRouter.get("/", async (_req, res) => {
  const accounts = await prisma.emailAccount.findMany({ orderBy: { createdAt: "desc" } });
  res.json(accounts);
});

const schema = z.object({
  senderName: z.string().min(2),
  senderEmail: z.string().email(),
  provider: z.enum(["resend", "smtp"]).default("resend"),
});

emailAccountsRouter.post("/", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });

  const account = await prisma.emailAccount.create({
    data: { ...parsed.data, connectionStatus: "connected" },
  });
  res.status(201).json(account);
});
