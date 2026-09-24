import { Router } from "express";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { placeOutboundCall, isValidTwilioRequest } from "../lib/telephony";
import { generateNextTurn, summarizeCall, openingLine, type TranscriptTurn } from "../lib/call-agent";

export const callsRouter = Router();

// ── Authenticated dashboard endpoints ──────────────────────────────

const startSchema = z.object({
  leadIds: z.array(z.string()).min(1).max(50),
});

callsRouter.post("/start", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Provide at least one leadId." });

  const leads = await prisma.lead.findMany({
    where: { id: { in: parsed.data.leadIds }, status: { not: "DO_NOT_CONTACT" } },
  });

  const results: Array<{ leadId: string; callId?: string; error?: string }> = [];

  for (const lead of leads) {
    if (!lead.phone) {
      results.push({ leadId: lead.id, error: "No phone number on file." });
      continue;
    }
    const call = await prisma.call.create({
      data: { leadId: lead.id, status: "QUEUED", initiatedById: req.user!.userId, transcript: [] },
    });
    try {
      const sid = await placeOutboundCall(call.id, lead.phone);
      await prisma.call.update({ where: { id: call.id }, data: { twilioCallSid: sid, status: "RINGING" } });
      results.push({ leadId: lead.id, callId: call.id });
    } catch (err) {
      await prisma.call.update({ where: { id: call.id }, data: { status: "FAILED" } });
      results.push({ leadId: lead.id, callId: call.id, error: (err as Error).message });
    }
  }

  return res.status(202).json({ started: results.filter((r) => r.callId && !r.error).length, results });
});

callsRouter.get("/", requireAuth, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 25);

  const [total, calls] = await Promise.all([
    prisma.call.count(),
    prisma.call.findMany({
      include: { lead: { select: { id: true, businessName: true, phone: true, city: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return res.json({ total, page, pageSize, calls });
});

callsRouter.get("/:id", requireAuth, async (req, res) => {
  const call = await prisma.call.findUnique({
    where: { id: req.params.id },
    include: { lead: true },
  });
  if (!call) return res.status(404).json({ error: "Call not found." });
  return res.json(call);
});

// ── Twilio webhooks (public — Twilio's servers call these, not our logged-in users) ──
// Twilio posts application/x-www-form-urlencoded, not JSON, so parse that here specifically.
const twilioForm = express.urlencoded({ extended: false });

/** Rejects any webhook POST that didn't actually come from Twilio, so a guessed callId can't be used to inject a fake transcript or fake a call outcome. */
function verifyTwilioSignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers["x-twilio-signature"] as string | undefined;
  const publicUrl = process.env.SERVER_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  const fullUrl = `${publicUrl}${req.originalUrl}`;
  if (!isValidTwilioRequest(signature, fullUrl, req.body)) {
    return res.status(403).type("text/xml").send("<Response><Reject/></Response>");
  }
  next();
}

function xml(res: import("express").Response, body: string) {
  res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>${body}`);
}

async function getCallWithLead(callId: string) {
  return prisma.call.findUnique({ where: { id: callId }, include: { lead: { include: { category: true } } } });
}

callsRouter.post("/webhook/voice/:callId", twilioForm, verifyTwilioSignature, async (req, res) => {
  const call = await getCallWithLead(req.params.callId);
  if (!call) return xml(res, "<Response><Say>Sorry, something went wrong.</Say><Hangup/></Response>");

  await prisma.call.update({ where: { id: call.id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });

  const opening = openingLine(call.lead.businessName);
  const transcript: TranscriptTurn[] = [{ role: "agent", text: opening, at: new Date().toISOString() }];
  await prisma.call.update({ where: { id: call.id }, data: { transcript: transcript as object[] } });

  xml(
    res,
    `<Response>
      <Gather input="speech" action="/api/calls/webhook/gather/${call.id}" method="POST" speechTimeout="auto" language="en-US">
        <Say voice="Polly.Aditi">${escapeXml(opening)}</Say>
      </Gather>
      <Say voice="Polly.Aditi">Sorry, I couldn't hear you. I'll try again another time. Bye for now.</Say>
      <Hangup/>
    </Response>`
  );
});

callsRouter.post("/webhook/gather/:callId", twilioForm, verifyTwilioSignature, async (req, res) => {
  const call = await getCallWithLead(req.params.callId);
  if (!call) return xml(res, "<Response><Hangup/></Response>");

  const callerSaid = String(req.body.SpeechResult || "").trim();
  const transcript: TranscriptTurn[] = Array.isArray(call.transcript) ? (call.transcript as unknown as TranscriptTurn[]) : [];

  if (callerSaid) {
    transcript.push({ role: "caller", text: callerSaid, at: new Date().toISOString() });
  }

  const { speech, outcome, shouldHangup } = await generateNextTurn(
    call.lead.businessName,
    call.lead.category?.name ?? null,
    transcript
  );
  transcript.push({ role: "agent", text: speech, at: new Date().toISOString() });

  await prisma.call.update({
    where: { id: call.id },
    data: { transcript: transcript as object[], ...(outcome !== "UNDETERMINED" && { outcome }) },
  });

  if (shouldHangup) {
    xml(res, `<Response><Say voice="Polly.Aditi">${escapeXml(speech)}</Say><Hangup/></Response>`);
  } else {
    xml(
      res,
      `<Response>
        <Gather input="speech" action="/api/calls/webhook/gather/${call.id}" method="POST" speechTimeout="auto" language="en-US">
          <Say voice="Polly.Aditi">${escapeXml(speech)}</Say>
        </Gather>
        <Say voice="Polly.Aditi">Alright, thanks for your time. Bye for now.</Say>
        <Hangup/>
      </Response>`
    );
  }
});

callsRouter.post("/webhook/status/:callId", twilioForm, verifyTwilioSignature, async (req, res) => {
  const call = await getCallWithLead(req.params.callId);
  if (!call) return res.sendStatus(200);

  const twilioStatus = String(req.body.CallStatus || "");
  const durationSeconds = req.body.CallDuration ? Number(req.body.CallDuration) : undefined;

  const statusMap: Record<string, string> = {
    completed: "COMPLETED",
    "no-answer": "NO_ANSWER",
    busy: "BUSY",
    failed: "FAILED",
    canceled: "FAILED",
  };
  const mapped = statusMap[twilioStatus];

  if (mapped) {
    const transcript: TranscriptTurn[] = Array.isArray(call.transcript) ? (call.transcript as unknown as TranscriptTurn[]) : [];

    let summary: string | undefined;
    if (mapped === "COMPLETED" && transcript.length > 0) {
      summary = await summarizeCall(call.lead.businessName, transcript);
    }

    await prisma.call.update({
      where: { id: call.id },
      data: {
        status: mapped as "COMPLETED" | "NO_ANSWER" | "BUSY" | "FAILED",
        endedAt: new Date(),
        ...(durationSeconds !== undefined && { durationSeconds }),
        ...(summary && { summary }),
        ...(!call.outcome && mapped !== "COMPLETED" && { outcome: "UNDETERMINED" as const }),
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: call.leadId,
        userId: call.initiatedById ?? undefined,
        type: "call",
        message: summary ?? `Cold call ${mapped.toLowerCase().replace("_", " ")}.`,
      },
    });

    if (call.outcome === "INTERESTED") {
      await prisma.lead.update({ where: { id: call.leadId }, data: { status: "INTERESTED" } });
    } else if (call.outcome === "NOT_INTERESTED") {
      await prisma.lead.update({ where: { id: call.leadId }, data: { status: "NOT_INTERESTED" } });
    } else if (mapped === "COMPLETED" && !call.outcome) {
      await prisma.lead.update({ where: { id: call.leadId }, data: { status: "CONTACTED" } });
    }
  }

  res.sendStatus(200);
});

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
