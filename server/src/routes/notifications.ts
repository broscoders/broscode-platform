import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req: AuthedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: req.user!.userId, read: false },
  });
  res.json({ notifications, unreadCount });
});

notificationsRouter.patch("/:id/read", async (req, res) => {
  const notification = await prisma.notification.update({
    where: { id: String(req.params.id) },
    data: { read: true },
  });
  res.json(notification);
});

notificationsRouter.post("/mark-all-read", async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, read: false },
    data: { read: true },
  });
  res.status(204).end();
});