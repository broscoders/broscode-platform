import twilio from "twilio";

function assertConfigured() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const publicUrl = process.env.SERVER_PUBLIC_URL;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      "Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER to server/.env - see README for setup steps."
    );
  }
  if (!publicUrl) {
    throw new Error(
      "SERVER_PUBLIC_URL is not set. Twilio needs a public URL to send call webhooks to (use ngrok in local dev, or your deployed API URL in production)."
    );
  }
  return { accountSid, authToken, fromNumber, publicUrl: publicUrl.replace(/\/$/, "") };
}

let client: ReturnType<typeof twilio> | null = null;
function getClient() {
  const { accountSid, authToken } = assertConfigured();
  if (!client) client = twilio(accountSid, authToken);
  return client;
}

/** Normalizes a lead's stored phone number toward E.164 as a best effort. Does not fabricate a country code it wasn't given. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/[^\d+]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  // Pakistani local mobile format 03XXXXXXXXX -> +923XXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) return `+92${digits.slice(1)}`;
  return `+${digits}`;
}

/** Places an outbound call for the given Call record; Twilio will hit our webhook to get the conversation started. */
export async function placeOutboundCall(callId: string, toPhone: string): Promise<string> {
  const { fromNumber, publicUrl } = assertConfigured();
  const twilioClient = getClient();

  const call = await twilioClient.calls.create({
    to: normalizePhone(toPhone),
    from: fromNumber,
    url: `${publicUrl}/api/calls/webhook/voice/${callId}`,
    statusCallback: `${publicUrl}/api/calls/webhook/status/${callId}`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    machineDetection: "DetectMessageEnd",
  });

  return call.sid;
}

/** Validates that an incoming webhook request really came from Twilio (skipped automatically if auth token isn't set, e.g. in tests). */
export function isValidTwilioRequest(signature: string | undefined, fullUrl: string, params: Record<string, unknown>): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return process.env.NODE_ENV !== "production";
  return twilio.validateRequest(authToken, signature, fullUrl, params);
}

export const VoiceResponse = twilio.twiml.VoiceResponse;
