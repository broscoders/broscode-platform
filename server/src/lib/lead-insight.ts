import { askGroq, isGroqFailureResponse } from "./groq";

interface LeadForInsight {
  businessName: string;
  categoryName: string | null;
  city: string | null;
  website: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
  score: number;
  priority: string;
}

/**
 * Generates a short, honest read on a lead: why it's worth (or not worth) prioritizing,
 * and one concrete outreach angle. Grounded only in the fields we actually have - it's
 * told explicitly what data is missing so it doesn't guess at things like company size,
 * revenue, or pain points it has no way of knowing.
 */
export async function generateLeadInsight(lead: LeadForInsight): Promise<string> {
  const knownFacts = [
    `Business: ${lead.businessName}`,
    lead.categoryName ? `Category: ${lead.categoryName}` : `Category: unknown`,
    lead.city ? `City: ${lead.city}` : `City: unknown`,
    lead.website ? `Has a website: ${lead.website}` : `No website on file`,
    `Has a verified email: ${lead.hasEmail ? "yes" : "no"}`,
    `Has a phone number: ${lead.hasPhone ? "yes" : "no"}`,
    `Rule-based score: ${lead.score}/100 (${lead.priority})`,
  ].join("\n");

  const raw = await askGroq([
    {
      role: "system",
      content: `You are a sales analyst helping "Bro's Code" (a Pakistani software house) prioritize which leads to reach out to first.

You will be given only the facts listed below about one lead - nothing else is known. Do not invent, assume or guess anything not in that list (no revenue, no team size, no pain points, no online reviews).

Write exactly 2-3 sentences:
1. One sentence on how promising this lead looks based ONLY on the facts given, and why.
2. One concrete, specific outreach angle Bro's Code could use (e.g. "since they have no website, lead with that" or "since they already have a site, offer a free speed/SEO audit").
Plain text, no markdown, no headers, no bullet points.`,
    },
    { role: "user", content: knownFacts },
  ]);

  if (isGroqFailureResponse(raw)) {
    throw new Error("AI insight generation is temporarily unavailable - try again shortly.");
  }

  return raw.trim();
}
