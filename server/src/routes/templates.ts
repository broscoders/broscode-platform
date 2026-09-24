import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { getMailTransporter, fillTemplate } from "../lib/email";

export const templatesRouter = Router();
export const emailRouter = Router();
templatesRouter.use(requireAuth);
emailRouter.use(requireAuth);

const templateSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().optional(),
  subject: z.string().min(2),
  body: z.string().min(2),
});

templatesRouter.get("/", async (req, res) => {
  const categoryId = req.query.categoryId as string | undefined;
  const templates = await prisma.emailTemplate.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(templates);
});

templatesRouter.post("/", async (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });

  const template = await prisma.emailTemplate.create({
    data: {
      ...parsed.data,
      versions: { create: { version: 1, subject: parsed.data.subject, body: parsed.data.body } },
    },
  });
  res.status(201).json(template);
});

// Editing a template creates a new version. Previously sent emails keep the
// version they were sent with, per the blueprint's "no retroactive change" rule.
templatesRouter.put("/:id", async (req, res) => {
  const parsed = templateSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });

  const current = await prisma.emailTemplate.findUnique({
    where: { id: req.params.id },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!current) return res.status(404).json({ error: "Template not found." });

  const nextVersion = (current.versions[0]?.version ?? 0) + 1;
  const subject = parsed.data.subject ?? current.subject;
  const body = parsed.data.body ?? current.body;

  const template = await prisma.emailTemplate.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      versions: { create: { version: nextVersion, subject, body } },
    },
  });
  res.json(template);
});

templatesRouter.patch("/:id/status", async (req, res) => {
  const status = req.body?.status === "inactive" ? "inactive" : "active";
  const template = await prisma.emailTemplate.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(template);
});

templatesRouter.post("/:id/duplicate", async (req, res) => {
  const original = await prisma.emailTemplate.findUnique({ where: { id: req.params.id } });
  if (!original) return res.status(404).json({ error: "Template not found." });

  const copy = await prisma.emailTemplate.create({
    data: {
      name: `${original.name} (Copy)`,
      categoryId: original.categoryId,
      subject: original.subject,
      body: original.body,
      status: "inactive",
      versions: { create: { version: 1, subject: original.subject, body: original.body } },
    },
  });
  res.status(201).json(copy);
});

templatesRouter.delete("/:id", async (req, res) => {
  const id = req.params.id;
  await prisma.emailTemplateVersion.deleteMany({ where: { templateId: id } });
  await prisma.emailLog.updateMany({ where: { templateId: id }, data: { templateId: null } });
  await prisma.emailTemplate.delete({ where: { id } });
  res.status(204).end();
});

// ONE-CLICK EMAIL: category is checked, active template auto-selected,
// lead data merged in, and the send is logged with the exact version used.
emailRouter.post("/send/:leadId", async (req: AuthedRequest, res) => {
  const leadId = String(req.params.leadId);
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { category: true } });
  if (!lead) return res.status(404).json({ error: "Lead not found." });
  if (!lead.email) {
    return res.status(400).json({ error: "This lead has no verified email on file." });
  }
  if (!lead.categoryId) {
    return res.status(400).json({ error: "Assign a category to this lead before sending." });
  }

  const template = await prisma.emailTemplate.findFirst({
    where: { categoryId: lead.categoryId, status: "active" },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!template) {
    return res.status(400).json({
      error: `No active email template for category "${lead.category?.name}". Create one in Settings -> Email Templates.`,
    });
  }

  const account = await prisma.emailAccount.findFirst({ where: { connectionStatus: "connected" } });
  if (!account) {
    return res.status(400).json({ error: "No connected email account. Connect one in Settings -> Email Accounts." });
  }

  const vars = {
    business_name: lead.businessName,
    contact_name: lead.contactName,
    city: lead.city,
    website: lead.website,
    industry: lead.category?.name,
    company_name: account.senderName,
  };

  const version = template.versions[0]?.version ?? 1;
  const subject = fillTemplate(template.subject, vars);
  const html = fillTemplate(template.body, vars);

  try {
    const mailer = getMailTransporter();
    await mailer.sendMail({
      from: `${account.senderName} <${process.env.SMTP_USER}>`,
      to: lead.email,
      subject,
      html,
    });
  } catch (err) {
    await prisma.emailLog.create({
      data: {
        leadId: lead.id,
        templateId: template.id,
        templateVersion: version,
        recipient: lead.email,
        sender: account.senderEmail,
        subject,
        status: "failed",
      },
    });
    return res.status(502).json({ error: (err as Error).message });
  }

  const log = await prisma.emailLog.create({
    data: {
      leadId: lead.id,
      templateId: template.id,
      templateVersion: version,
      recipient: lead.email,
      sender: account.senderEmail,
      subject,
      status: "sent",
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: lead.status === "NEW" ? "CONTACTED" : lead.status },
  });

  await prisma.leadActivity.create({
    data: { leadId: lead.id, userId: req.user!.userId, type: "email_sent", message: `Email sent: "${subject}"` },
  });

  res.status(201).json(log);
});
