import { askGroq } from "./groq";

interface LeadForEmail {
  businessName: string;
  contactName: string | null;
  city: string | null;
  website: string | null;
  categoryName: string | null;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

const SUBJECT_MARKER = "SUBJECT:";
const BODY_MARKER = "BODY:";

function parseSubjectAndBody(raw: string, fallbackSubject: string): GeneratedEmail {
  const subjectMatch = raw.match(new RegExp(`${SUBJECT_MARKER}\\s*(.+)`, "i"));
  const bodyMatch = raw.match(new RegExp(`${BODY_MARKER}\\s*([\\s\\S]+)`, "i"));
  return {
    subject: subjectMatch?.[1]?.trim() || fallbackSubject,
    body: (bodyMatch?.[1]?.trim() || raw.trim()).replace(/\n/g, "<br/>"),
  };
}

/** Writes a first-touch cold email for a lead. Never invents facts about the business it wasn't given. */
export async function generateColdEmail(lead: LeadForEmail): Promise<GeneratedEmail> {
  const websiteNote = lead.website
    ? `They already have a website at ${lead.website} — do not assume it's bad, just offer to help them get more out of it (redesign, speed, new features, e-commerce, etc).`
    : `They don't appear to have a website (none found) — this is the main hook, but phrase it as "I couldn't find a website for you" rather than a hard claim.`;

  const raw = await askGroq([
    {
      role: "system",
      content: `You write short, personalized cold outreach emails for "Bro's Code", a software house in Pakistan that builds websites, web apps and business software (MERN stack, Next.js, AI integrations).

Rules:
- Write to "${lead.businessName}"${lead.city ? ` in ${lead.city}` : ""}${lead.categoryName ? `, a ${lead.categoryName} business` : ""}.
- ${websiteNote}
- Never invent specific facts you weren't given (no fake compliments about a website you haven't seen, no fake shared connections, no fake statistics).
- 80-120 words max. Plain, human, no corporate buzzwords, no excessive exclamation marks.
- End with a low-pressure call to action (a quick call, or just "reply if you'd like to see some examples").
- Sign off as "Daniyal, Bro's Code".
- Output EXACTLY in this format, nothing else:
SUBJECT: <subject line, under 8 words>
BODY: <email body>`,
    },
    { role: "user", content: `Write the email now.${lead.contactName ? ` Address it to ${lead.contactName}.` : ""}` },
  ]);

  return parseSubjectAndBody(raw, `Quick question for ${lead.businessName}`);
}

/** Writes a short, low-pressure follow-up to a cold email that got no reply. */
export async function generateFollowUpEmail(lead: LeadForEmail, previousSubject: string, dayOffset: number): Promise<GeneratedEmail> {
  const raw = await askGroq([
    {
      role: "system",
      content: `You write short follow-up emails for "Bro's Code", a Pakistani software house. This is a follow-up to a cold email sent ${dayOffset} days ago with subject "${previousSubject}" to "${lead.businessName}" that got no reply.

Rules:
- Under 50 words. Friendly, not pushy, not guilt-tripping.
- Don't repeat the whole original pitch — just a light nudge ("just following up", "still happy to help if useful", etc).
- Sign off as "Daniyal, Bro's Code".
- Output EXACTLY in this format, nothing else:
SUBJECT: <short subject, can reference "Re:" style>
BODY: <email body>`,
    },
    { role: "user", content: "Write the follow-up now." },
  ]);

  return parseSubjectAndBody(raw, `Re: ${previousSubject}`);
}
