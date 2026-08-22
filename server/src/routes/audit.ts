import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const auditRouter = Router();
auditRouter.use(requireAuth);

auditRouter.get("/", requireRole("SUPER_ADMIN", "ADMIN"), async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });
  res.json(logs);
});

export async function logAction(params: {
  userId?: string | null;
  action: string;
  recordType?: string;
  recordId?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? undefined,
      action: params.action,
      recordType: params.recordType,
      recordId: params.recordId,
    },
  });
}