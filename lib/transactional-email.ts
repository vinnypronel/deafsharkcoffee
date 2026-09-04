import { env } from "cloudflare:workers";

type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

export type StaffNotificationChannel = "contact" | "employment" | "admin";

type EmailProvider = "cloudflare" | "resend" | "unconfigured";

function emailProvider(): EmailProvider {
  if (env.CLOUDFLARE_EMAIL_ENABLED?.trim().toLowerCase() === "true" && env.EMAIL) return "cloudflare";
  if (env.RESEND_API_KEY?.trim() && env.AUTH_EMAIL_FROM?.trim()) return "resend";
  return "unconfigured";
}

function emailErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "unknown";
  const code = String((error as { code?: unknown }).code ?? "unknown");
  return /^[A-Z0-9_-]{1,80}$/.test(code) ? code : "unknown";
}

function logEmailEvent(event: Record<string, string | boolean>) {
  console.log(JSON.stringify({ service: "deaf-shark-coffee", component: "transactional-email", ...event }));
}

const defaultRecipients: Record<StaffNotificationChannel, string[]> = {
  contact: ["contact@deafsharkcoffee.com"],
  employment: ["employment@deafsharkcoffee.com"],
  admin: ["admin@deafsharkcoffee.com"],
};

export function transactionalEmailConfigured() {
  return emailProvider() !== "unconfigured";
}

function emailList(value: string | undefined) {
  return (value ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}

function staffRecipients(channel: StaffNotificationChannel) {
  const configured = channel === "contact"
    ? emailList(env.CONTACT_EMAILS)
    : channel === "employment"
      ? emailList(env.EMPLOYMENT_EMAILS)
      : emailList(env.ADMIN_EMAILS);
  return configured.length > 0 ? configured : defaultRecipients[channel];
}

function parseSender(value: string | undefined) {
  const sender = value?.trim() || "Deaf Shark Coffee <account@deafsharkcoffee.com>";
  const match = sender.match(/^(.+?)\s*<([^<>]+)>$/);
  return match
    ? { name: match[1].trim(), email: match[2].trim() }
    : { name: "Deaf Shark Coffee", email: sender };
}

export async function sendTransactionalEmail(message: EmailMessage) {
  if (env.CLOUDFLARE_EMAIL_ENABLED?.trim().toLowerCase() === "true" && env.EMAIL) {
    await env.EMAIL.send({
      from: parseSender(env.AUTH_EMAIL_FROM),
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return;
  }

  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.AUTH_EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Transactional email is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(message.to) ? message.to : [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error("Transactional email delivery failed.");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export async function sendStaffNotification(channel: StaffNotificationChannel, subject: string, lines: string[], replyTo?: string) {
  const to = staffRecipients(channel);
  const provider = emailProvider();
  if (to.length === 0 || provider === "unconfigured") {
    logEmailEvent({ event: "staff_notification", channel, provider, delivered: false, reason: "not_configured" });
    return false;
  }
  const text = lines.join("\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#28140c"><h1 style="font-family:Georgia,serif">${escapeHtml(subject)}</h1>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>`;
  try {
    await sendTransactionalEmail({ to, subject, text, html, replyTo });
    logEmailEvent({ event: "staff_notification", channel, provider, delivered: true });
    return true;
  } catch (error) {
    logEmailEvent({ event: "staff_notification", channel, provider, delivered: false, reason: emailErrorCode(error) });
    return false;
  }
}

function emailShell(title: string, body: string, actionLabel: string, actionUrl: string) {
  return `<!doctype html><html><body style="margin:0;background:#f7efe2;color:#28140c;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 24px"><h1 style="font-family:Georgia,serif;font-size:32px">${title}</h1><p style="font-size:16px;line-height:1.6">${body}</p><p style="margin:30px 0"><a href="${actionUrl}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#32190f;color:#fff;text-decoration:none;font-weight:700">${actionLabel}</a></p><p style="font-size:13px;line-height:1.5;color:#715f55">If you did not request this, you can ignore this email. This link expires in one hour.</p></div></body></html>`;
}

export async function sendVerificationEmail(to: string, url: string) {
  await sendTransactionalEmail({
    to,
    subject: "Verify your Deaf Shark Coffee account",
    text: `Verify your Deaf Shark Coffee account: ${url}\n\nThis link expires in one hour.`,
    html: emailShell("Verify your email", "Confirm your email address to finish setting up your Deaf Shark Coffee account.", "Verify email", url),
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await sendTransactionalEmail({
    to,
    subject: "Reset your Deaf Shark Coffee password",
    text: `Reset your Deaf Shark Coffee password: ${url}\n\nThis link expires in one hour.`,
    html: emailShell("Reset your password", "Use the secure link below to choose a new password for your Deaf Shark Coffee account.", "Reset password", url),
  });
}
