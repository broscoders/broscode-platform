import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

export function getMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS are not set. Add them to server/.env.");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
    });
  }
  return transporter;
}

export function fillTemplate(template: string, vars: Record<string, string | null | undefined>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => vars[key] || "");
}