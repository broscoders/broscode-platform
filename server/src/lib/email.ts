import { Resend } from "resend";

let client: Resend | null = null;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set. Add it to server/.env — see README for setup.");
  }
  if (!client) client = new Resend(apiKey);
  return client;
}

// Replaces {{business_name}}, {{contact_name}}, etc. with real lead data only.
export function fillTemplate(template: string, vars: Record<string, string | null | undefined>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => vars[key] || "");
}
