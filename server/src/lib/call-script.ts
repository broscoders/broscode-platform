import { askGroq, isGroqFailureResponse } from "./groq";

interface LeadForScript {
  businessName: string;
  categoryName: string | null;
  city: string | null;
  website: string | null;
}

export interface CallScript {
  opener: string;
  talkingPoints: string[];
  objections: { objection: string; response: string }[];
  closing: string;
}

const SECTION_MARKERS = ["OPENER:", "POINTS:", "OBJECTIONS:", "CLOSING:"];

function splitBySections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let current = "";
  for (const line of raw.split("\n")) {
    const marker = SECTION_MARKERS.find((m) => line.trim().toUpperCase().startsWith(m));
    if (marker) {
      current = marker.slice(0, -1);
      sections[current] = line.trim().slice(marker.length).trim();
    } else if (current) {
      sections[current] += "\n" + line;
    }
  }
  return sections;
}

function parseBullets(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Writes a short prep script for a human to use while making a real call themselves
 * (no telephony involved - this just preps what to say). Grounded only in known facts.
 */
export async function generateCallScript(lead: LeadForScript): Promise<CallScript> {
  const websiteNote = lead.website
    ? `They already have a website (${lead.website}) - don't assume it's bad, offer to help them get more from it.`
    : `They don't appear to have a website - this can be the main hook, phrased as "I noticed you don't have a site yet" rather than a hard claim.`;

  const raw = await askGroq([
    {
      role: "system",
      content: `You write short cold-call prep scripts for a human sales rep at "Bro's Code", a Pakistani software house that builds websites, web apps and business software.

The rep is calling "${lead.businessName}"${lead.city ? ` in ${lead.city}` : ""}${lead.categoryName ? `, a ${lead.categoryName} business` : ""}. ${websiteNote}

Never invent facts you weren't given (no fake compliments, no fake shared connections, no made-up statistics).

Output EXACTLY in this format, nothing else, plain text no markdown:
OPENER: <one natural opening line/question, under 25 words>
POINTS:
- <talking point 1>
- <talking point 2>
- <talking point 3>
OBJECTIONS:
- <a likely objection> || <a short response to it>
- <another likely objection> || <a short response to it>
CLOSING: <one line to end the call with, whether they're interested or not>`,
    },
    { role: "user", content: "Write the script now." },
  ]);

  if (isGroqFailureResponse(raw)) {
    throw new Error("AI script generation is temporarily unavailable - try again shortly.");
  }

  const sections = splitBySections(raw);
  const objections = parseBullets(sections["OBJECTIONS"]).map((line) => {
    const [objection, response] = line.split("||").map((s) => s.trim());
    return { objection: objection || line, response: response || "" };
  });

  return {
    opener: sections["OPENER"]?.trim() || `Hi, this is calling from Bro's Code - am I speaking with someone from ${lead.businessName}?`,
    talkingPoints: parseBullets(sections["POINTS"]),
    objections,
    closing: sections["CLOSING"]?.trim() || "Thanks so much for your time today, have a great one!",
  };
}
