import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

interface CalendarEvent {
  id: string;
  type: "deal_closing" | "follow_up" | "project_deadline" | "task_deadline" | "payment_due";
  title: string;
  date: string;
}

calendarRouter.get("/", async (_req, res) => {
  const [deals, followUps, projects, tasks, invoices] = await Promise.all([
    prisma.deal.findMany({
      where: { closingDate: { not: null }, stage: { notIn: ["WON", "LOST"] } },
      select: { id: true, name: true, closingDate: true },
    }),
    prisma.followUpTask.findMany({
      where: { status: "pending" },
      select: { id: true, label: true, dueDate: true, lead: { select: { businessName: true } } },
    }),
    prisma.project.findMany({
      where: { deadline: { not: null }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      select: { id: true, name: true, deadline: true },
    }),
    prisma.projectTask.findMany({
      where: { deadline: { not: null }, status: { not: "DONE" } },
      select: { id: true, title: true, deadline: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["pending", "partial", "overdue"] } },
      select: { id: true, invoiceNumber: true, dueDate: true },
    }),
  ]);

  const events: CalendarEvent[] = [
    ...deals.map((d: { id: string; name: string; closingDate: Date | null }) => ({
      id: `deal-${d.id}`,
      type: "deal_closing" as const,
      title: `Deal closing: ${d.name}`,
      date: d.closingDate!.toISOString(),
    })),
    ...followUps.map((f: { id: string; label: string; dueDate: Date; lead: { businessName: string } }) => ({
      id: `followup-${f.id}`,
      type: "follow_up" as const,
      title: `${f.label} - ${f.lead.businessName}`,
      date: f.dueDate.toISOString(),
    })),
    ...projects.map((p: { id: string; name: string; deadline: Date | null }) => ({
      id: `project-${p.id}`,
      type: "project_deadline" as const,
      title: `Project due: ${p.name}`,
      date: p.deadline!.toISOString(),
    })),
    ...tasks.map((t: { id: string; title: string; deadline: Date | null }) => ({
      id: `task-${t.id}`,
      type: "task_deadline" as const,
      title: `Task due: ${t.title}`,
      date: t.deadline!.toISOString(),
    })),
    ...invoices.map((i: { id: string; invoiceNumber: string; dueDate: Date }) => ({
      id: `invoice-${i.id}`,
      type: "payment_due" as const,
      title: `Payment due: ${i.invoiceNumber}`,
      date: i.dueDate.toISOString(),
    })),
  ];

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  res.json(events);
});