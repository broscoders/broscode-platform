import { askGroq } from "./groq";

export interface TranscriptTurn {
  role: "agent" | "caller";
  text: string;
  at: string;
}

export type CallOutcomeTag = "INTERESTED" | "NOT_INTERESTED" | "CALLBACK_REQUESTED" | "WRONG_NUMBER" | "UNDETERMINED";

const OUTCOME_TAG_PATTERN = /\[\[OUTCOME:\s*(INTERESTED|NOT_INTERESTED|CALLBACK_REQUESTED|WRONG_NUMBER|CONTINUE)\]\]/i;

const MAX_TURNS = 8;

function buildSystemPrompt(businessName: string, categoryName: string | null): string {
  return `You are Sara, a friendly cold-calling sales rep for "Bro's Code", a software house in Pakistan that builds websites, web apps and business software.
You are on a live phone call with someone at "${businessName}"${categoryName ? ` (a ${categoryName} business)` : ""}. This is TEXT that will be spoken aloud by text-to-speech, so:
- Keep every reply to 1-3 short sentences. Never use bullet points, markdown, or emojis.
- Sound natural and conversational, not scripted. React to what they actually say.
- Your goal: introduce Bro's Code briefly, find out if they have a website / online presence problem, and gauge interest in a free consultation call.
- If they sound busy or say "not interested" clearly, politely thank them and end the call - do not push.
- If they show genuine interest (want to know more, ask about pricing, agree to a follow-up), confirm the best way to reach them and wrap up.
- If they ask you to call back later, note that and wrap up politely.
- If it's clear you reached the wrong number or wrong business, apologize briefly and wrap up.
- Match the caller's language: reply in Roman Urdu if they speak Roman Urdu/Urdu, English if they speak English.

At the VERY END of every reply, on its own, append exactly one tag with no other text after it:
[[OUTCOME: CONTINUE]] - if the conversation should keep going
[[OUTCOME: INTERESTED]] - if they showed real interest and the call should now end
[[OUTCOME: NOT_INTERESTED]] - if they declined and the call should now end
[[OUTCOME: CALLBACK_REQUESTED]] - if they asked to be called back later and the call should now end
[[OUTCOME: WRONG_NUMBER]] - if this is the wrong person/business and the call should now end
Never mention this tag out loud - it is stripped before speaking.`;
}

export function openingLine(businessName: string): string {
  return `Hi, this is Sara calling from Bro's Code, a software house here in Pakistan. Am I speaking with someone from ${businessName}?`;
}

/** Feeds the transcript so far to the AI brain and gets back the next spoken line plus a parsed outcome tag. */
export async function generateNextTurn(
  businessName: string,
  categoryName: string | null,
  transcript: TranscriptTurn[]
): Promise<{ speech: string; outcome: CallOutcomeTag; shouldHangup: boolean }> {
  const turnsSoFar = transcript.filter((t) => t.role === "caller").length;

  if (turnsSoFar >= MAX_TURNS) {
    return {
      speech: "Thanks so much for your time today, I'll let you get back to your day. Have a great one!",
      outcome: "UNDETERMINED",
      shouldHangup: true,
    };
  }

  const messages = [
    { role: "system" as const, content: buildSystemPrompt(businessName, categoryName) },
    ...transcript.map((t) => ({
      role: t.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: t.text,
    })),
  ];

  const raw = await askGroq(messages);
  const match = raw.match(OUTCOME_TAG_PATTERN);
  const tag = (match?.[1]?.toUpperCase() as CallOutcomeTag | "CONTINUE" | undefined) ?? "CONTINUE";
  const speech = raw.replace(OUTCOME_TAG_PATTERN, "").trim() || "Sorry, could you say that again?";

  return {
    speech,
    outcome: tag === "CONTINUE" ? "UNDETERMINED" : tag,
    shouldHangup: tag !== "CONTINUE",
  };
}

/** Summarizes a finished call transcript into one or two sentences for the lead activity log. */
export async function summarizeCall(businessName: string, transcript: TranscriptTurn[]): Promise<string> {
  if (transcript.length === 0) return "Call did not connect or no conversation took place.";
  const convo = transcript.map((t) => `${t.role === "agent" ? "Sara (us)" : "Caller"}: ${t.text}`).join("\n");
  const raw = await askGroq([
    {
      role: "system",
      content: `Summarize this cold call transcript with ${businessName} in exactly one short sentence for a CRM activity log. Be factual, no speculation.`,
    },
    { role: "user", content: convo },
  ]);
  return raw.trim();
}
