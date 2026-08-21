import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.get("/", async (_req, res) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { company: true } },
      items: true,
      invoice: { include: { payments: true } },
      project: { select: { id: true } },
    },
  });
  res.json(orders);
});

ordersRouter.post("/:id/create-project", async (req, res) => {
  const orderId = String(req.params.id);
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
  if (!order) return res.status(404).json({ error: "Order not found." });

  const existing = await prisma.project.findUnique({ where: { orderId } });
  if (existing) return res.status(409).json({ error: "A project already exists for this order." });

  const project = await prisma.project.create({
    data: {
      name: `${order.customer.company} - ${order.orderNumber}`,
      customerId: order.customerId,
      orderId: order.id,
      budget: order.total,
      revenue: order.total,
    },
  });

  res.status(201).json(project);
});

const orderItemSchema = z.object({
  service: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
});

const orderSchema = z.object({
  customerId: z.string().min(1),
  dealId: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  discount: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  dueDate: z.string(),
});

function generateNumber(prefix: string) {
  const stamp = Date.now().toString().slice(-8);
  return `${prefix}-${stamp}`;
}

ordersRouter.post("/", async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid order data." });

  const { customerId, dealId, items, discount = 0, tax = 0, dueDate } = parsed.data;
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = subtotal - discount + tax;

  const order = await prisma.order.create({
    data: {
      orderNumber: generateNumber("ORD"),
      customerId,
      dealId,
      subtotal,
      discount,
      tax,
      total,
      items: { create: items },
    },
    include: { items: true },
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: generateNumber("INV"),
      orderId: order.id,
      subtotal,
      discount,
      tax,
      total,
      dueDate: new Date(dueDate),
    },
  });

  if (dealId) {
    await prisma.deal.update({ where: { id: dealId }, data: { stage: "WON" } }).catch(() => {});
  }

  res.status(201).json({ order, invoice });
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.string().optional(),
});

ordersRouter.post("/invoices/:invoiceId/payments", async (req, res) => {
  const invoiceId = String(req.params.invoiceId);
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payment." });

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return res.status(404).json({ error: "Invoice not found." });

  await prisma.payment.create({ data: { invoiceId, ...parsed.data } });

  const newPaid = invoice.paidAmount + parsed.data.amount;
  const status = newPaid >= invoice.total ? "paid" : newPaid > 0 ? "partial" : "pending";

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount: newPaid, status },
    include: { payments: true },
  });

  const admins = await prisma.user.findMany({ where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } } });
  await prisma.notification.createMany({
    data: admins.map((a: { id: string }) => ({
      userId: a.id,
      type: "payment_received",
      message: `Payment of $${parsed.data.amount.toLocaleString()} received for invoice ${invoice.invoiceNumber}`,
    })),
  });

  res.json(updated);
});