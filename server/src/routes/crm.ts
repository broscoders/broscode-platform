import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

export const customersRouter = Router();
export const dealsRouter = Router();
customersRouter.use(requireAuth);
dealsRouter.use(requireAuth);

customersRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const customers = await prisma.customer.findMany({
    where: q ? { company: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { createdAt: "desc" },
  });

  const withRevenue = await Promise.all(
    customers.map(async (c: { id: string; [key: string]: unknown }) => {
      const orders = await prisma.order.findMany({
        where: { customerId: c.id },
        include: { invoice: true },
      });
      const totalRevenue = orders.reduce((sum: number, o: { invoice: { paidAmount: number } | null }) => sum + (o.invoice?.paidAmount ?? 0), 0);
      const outstanding = orders.reduce(
        (sum: number, o: { invoice: { total: number; paidAmount: number } | null }) => sum + ((o.invoice?.total ?? 0) - (o.invoice?.paidAmount ?? 0)),
        0
      );
      return { ...c, totalRevenue, outstanding, orderCount: orders.length };
    })
  );

  res.json(withRevenue);
});

const customerSchema = z.object({
  company: z.string().min(1),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  leadId: z.string().optional(),
});

customersRouter.post("/", async (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid customer data." });

  const customer = await prisma.customer.create({ data: parsed.data });

  if (parsed.data.leadId) {
    await prisma.leadActivity.create({
      data: { leadId: parsed.data.leadId, type: "converted", message: `Converted to customer: ${customer.company}` },
    });
  }

  res.status(201).json(customer);
});

customersRouter.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      deals: { orderBy: { createdAt: "desc" } },
      orders: { include: { invoice: true }, orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found." });
  res.json(customer);
});

const stages = ["NEW", "QUALIFIED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

dealsRouter.get("/", async (_req, res) => {
  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { company: true } },
      lead: { select: { businessName: true } },
      assignedTo: { select: { name: true } },
    },
  });
  res.json(deals);
});

const dealSchema = z.object({
  name: z.string().min(1),
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  value: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
  probability: z.number().min(0).max(100).optional(),
  assignedToId: z.string().optional(),
  closingDate: z.string().optional(),
});

dealsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = dealSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid deal data." });

  const { closingDate, ...rest } = parsed.data;
  const deal = await prisma.deal.create({
    data: {
      ...rest,
      expectedRevenue: rest.value - (rest.discount ?? 0),
      closingDate: closingDate ? new Date(closingDate) : undefined,
    },
  });

  await prisma.dealActivity.create({ data: { dealId: deal.id, message: "Deal created" } });
  res.status(201).json(deal);
});

const stageSchema = z.object({ stage: z.enum(stages) });

dealsRouter.patch("/:id/stage", async (req: AuthedRequest, res) => {
  const id = String(req.params.id);
  const parsed = stageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid stage." });

  const deal = await prisma.deal.update({ where: { id }, data: { stage: parsed.data.stage } });
  await prisma.dealActivity.create({ data: { dealId: id, message: `Stage changed to ${parsed.data.stage}` } });

  if (parsed.data.stage === "WON" && deal.leadId) {
    await prisma.lead.update({ where: { id: deal.leadId }, data: { status: "WON" } });
    await prisma.leadActivity.create({ data: { leadId: deal.leadId, type: "deal_won", message: `Deal won: ${deal.name}` } });
  }

  res.json(deal);
});