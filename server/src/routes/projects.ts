import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const statuses = ["PLANNING", "ACTIVE", "REVIEW", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
const taskStatuses = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;

projectsRouter.get("/", async (_req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { company: true } },
      manager: { select: { name: true } },
      members: { include: { user: { select: { name: true, role: true } } } },
      tasks: { select: { status: true } },
    },
  });

  const withProgress = projects.map((p: { tasks: { status: string }[]; progress: number; [key: string]: unknown }) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t: { status: string }) => t.status === "DONE").length;
    return { ...p, progress: total > 0 ? Math.round((done / total) * 100) : p.progress };
  });

  res.json(withProgress);
});

projectsRouter.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: { select: { company: true } },
      manager: { select: { name: true } },
      members: { include: { user: { select: { name: true, role: true } } } },
      tasks: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return res.status(404).json({ error: "Project not found." });
  res.json(project);
});

const projectSchema = z.object({
  name: z.string().min(1),
  customerId: z.string().optional(),
  orderId: z.string().optional(),
  categoryId: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  managerId: z.string().optional(),
});

projectsRouter.post("/", async (req, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid project data." });

  const { startDate, deadline, ...rest } = parsed.data;
  const project = await prisma.project.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : undefined,
      deadline: deadline ? new Date(deadline) : undefined,
    },
  });
  res.status(201).json(project);
});

const statusSchema = z.object({ status: z.enum(statuses) });

projectsRouter.patch("/:id/status", async (req, res) => {
  const id = String(req.params.id);
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status." });
  const project = await prisma.project.update({ where: { id }, data: { status: parsed.data.status } });
  res.json(project);
});

const memberSchema = z.object({ userId: z.string().min(1), role: z.string().min(1) });

projectsRouter.post("/:id/members", async (req, res) => {
  const projectId = String(req.params.id);
  const parsed = memberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid member data." });
  const member = await prisma.projectMember.create({ data: { projectId, ...parsed.data } });
  res.status(201).json(member);
});

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  deadline: z.string().optional(),
});

projectsRouter.post("/:id/tasks", async (req, res) => {
  const projectId = String(req.params.id);
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid task data." });

  const { deadline, ...rest } = parsed.data;
  const task = await prisma.projectTask.create({
    data: { projectId, ...rest, deadline: deadline ? new Date(deadline) : undefined },
  });
  res.status(201).json(task);
});

const taskStatusSchema = z.object({ status: z.enum(taskStatuses) });

projectsRouter.patch("/tasks/:taskId/status", async (req, res) => {
  const taskId = String(req.params.taskId);
  const parsed = taskStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status." });
  const task = await prisma.projectTask.update({ where: { id: taskId }, data: { status: parsed.data.status } });
  res.json(task);
});