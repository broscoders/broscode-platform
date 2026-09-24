import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { getMailTransporter } from "../lib/email";
import { generateColdEmail, generateFollowUpEmail } from "../lib/email-agent";

export const coldEmailRouter = Router();

const FOLLOW_UP_LABEL = "AI follow-up email";
const FOLLOW_UP_DAYS = [3, 7];

async function sendEmail(to: string, from: string, subject: string, html: string) {
  const mailer = getMailTransporter();
  await mailer.sendMail({ from, to, subject, html });
}

// ── Start an AI cold-email run for a batch of leads ──────────────────
const startSchema = z.object({ leadIds: z.array(z.string()).min(1).max(50) });

coldEmailRouter.post("/ai-campaign/start", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Provide at least one leadId." });

  const account = await prisma.emailAccount.findFirst({ where: { connectionStatus: "connected" } });
  if (!account) {
    return res.status(400).json({ error: "No connected email account. Connect one in Settings -> Email Accounts." });
  }
  const fromAddress = `${account.senderName} <${process.env.SMTP_USER}>`;

  const leads = await prisma.lead.findMany({
    where: { id: { in: parsed.data.leadIds }, status: { not: "DO_NOT_CONTACT" } },
    include: { category: true },
  });

  const results: Array<{ leadId: string; sent: boolean; error?: string }> = [];

  for (const lead of leads) {
    if (!lead.email) {
      results.push({ leadId: lead.id, sent: false, error: "No verified email on file." });
      continue;
    }

    try {
      const { subject, body } = await generateColdEmail({
        businessName: lead.businessName,
        contactName: lead.contactName,
        city: lead.city,
        website: lead.website,
        categoryName: lead.category?.name ?? null,
      });

      await sendEmail(lead.email, fromAddress, subject, body);

      await prisma.emailLog.create({
        data: { leadId: lead.id, recipient: lead.email, sender: account.senderEmail, subject, status: "sent" },
      });

      await prisma.leadActivity.create({
        data: { leadId: lead.id, userId: req.user!.userId, type: "email_sent", message: `AI cold email sent: "${subject}"` },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: lead.status === "NEW" ? "CONTACTED" : lead.status },
      });

      for (const dayOffset of FOLLOW_UP_DAYS) {
        await prisma.followUpTask.create({
          data: {
            leadId: lead.id,
            dayOffset,
            label: FOLLOW_UP_LABEL,
            dueDate: new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000),
            status: "pending",
          },
        });
      }

      results.push({ leadId: lead.id, sent: true });
    } catch (err) {
      await prisma.emailLog.create({
        data: {
          leadId: lead.id,
          recipient: lead.email,
          sender: account.senderEmail,
          subject: "(generation or send failed)",
          status: "failed",
        },
      });
      results.push({ leadId: lead.id, sent: false, error: (err as Error).message });
    }
  }

  res.status(202).json({ sent: results.filter((r) => r.sent).length, results });
});

// ── Visibility for the dashboard ──────────────────────────────────────
coldEmailRouter.get("/log", requireAuth, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 30);

  const [total, logs] = await Promise.all([
    prisma.emailLog.count(),
    prisma.emailLog.findMany({
      include: { lead: { select: { id: true, businessName: true, email: true } } },
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({ total, page, pageSize, logs });
});

coldEmailRouter.get("/follow-ups", requireAuth, async (req, res) => {
  const followUps = await prisma.followUpTask.findMany({
    where: { label: FOLLOW_UP_LABEL, status: "pending" },
    include: { lead: { select: { id: true, businessName: true, email: true, status: true } } },
    orderBy: { dueDate: "asc" },
    take: 100,
  });
  res.json(followUps);
});

// ── Cron target: sends any AI follow-ups that are now due ─────────────
// Protected by a shared secret rather than a login, since this is hit by
// Vercel Cron (or any scheduler), not by a person sitting at the dashboard.
// Vercel Cron sends GET requests, so this responds to GET; POST is also
// wired up so it can be triggered manually (e.g. with curl) while testing.
async function runDueFollowUps(req: import("express").Request, res: import("express").Response) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (secret && provided !== secret) {
    return res.status(403).json({ error: "Invalid or missing cron secret." });
  }

  const account = await prisma.emailAccount.findFirst({ where: { connectionStatus: "connected" } });
  if (!account) return res.status(200).json({ processed: 0, note: "No connected email account." });
  const fromAddress = `${account.senderName} <${process.env.SMTP_USER}>`;

  const due = await prisma.followUpTask.findMany({
    where: { label: FOLLOW_UP_LABEL, status: "pending", dueDate: { lte: new Date() } },
    include: { lead: { include: { category: true } } },
    take: 100,
  });

  // Only follow up if the lead hasn't already moved forward or been marked don't-contact.
  const stopStatuses = new Set(["INTERESTED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "LOST", "NOT_INTERESTED", "DO_NOT_CONTACT"]);

  let processed = 0;
  for (const task of due) {
    if (stopStatuses.has(task.lead.status) || !task.lead.email) {
      await prisma.followUpTask.update({ where: { id: task.id }, data: { status: "skipped" } });
      continue;
    }

    try {
      const lastEmail = await prisma.emailLog.findFirst({
        where: { leadId: task.leadId },
        orderBy: { sentAt: "desc" },
      });

      const { subject, body } = await generateFollowUpEmail(
        {
          businessName: task.lead.businessName,
          contactName: task.lead.contactName,
          city: task.lead.city,
          website: task.lead.website,
          categoryName: task.lead.category?.name ?? null,
        },
        lastEmail?.subject ?? task.lead.businessName,
        task.dayOffset
      );

      await sendEmail(task.lead.email, fromAddress, subject, body);

      await prisma.emailLog.create({
        data: { leadId: task.leadId, recipient: task.lead.email, sender: account.senderEmail, subject, status: "sent" },
      });
      await prisma.leadActivity.create({
        data: { leadId: task.leadId, type: "email_sent", message: `AI follow-up sent: "${subject}"` },
      });
      await prisma.followUpTask.update({ where: { id: task.id }, data: { status: "completed" } });
      processed++;
    } catch (err) {
      console.error(`[cold-email] follow-up failed for lead ${task.leadId}:`, err);
    }
  }

  res.json({ processed });
}

coldEmailRouter.get("/follow-ups/run", runDueFollowUps);
coldEmailRouter.post("/follow-ups/run", runDueFollowUps);
