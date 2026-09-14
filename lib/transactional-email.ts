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

/* Absolute and hardcoded on purpose: mail clients cannot resolve relative paths,
   and BETTER_AUTH_URL points at localhost during development. These two files
   ship with the site, so the template and the assets must deploy together. */
const EMAIL_ASSET_ORIGIN = "https://deafsharkcoffee.com";

/* Tables, not flex or grid: Outlook ignores modern layout. The fin is a darkened
   copy of the site mark, because the pale original disappears on cream. Both
   files are exported at twice their display size so they stay sharp on phones
   and retina screens. */
function emailLogo(kind: "badge" | "fin", maxWidth: number) {
  const file = kind === "badge" ? "email-logo-badge.png" : "email-logo-fin.png";
  const alt = kind === "badge" ? "Deaf Shark Coffee" : "";
  return `<img src="${EMAIL_ASSET_ORIGIN}/${file}" width="${maxWidth}" alt="${alt}" style="display:block;border:0;outline:none;width:100%;max-width:${maxWidth}px;height:auto" />`;
}

/* Gmail groups messages by subject and then hides everything that repeats
   between them, so a resent link arrived collapsed behind a "..." toggle with
   only the new line showing. A per-send stamp in the subject keeps each message
   in its own conversation, so there is nothing to collapse and it opens in
   full. Short by design: it reads as a timestamp, not clutter. */
export function emailSubjectStamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Send time in store time, e.g. "September 11, 2026 at 8:46 PM". */
export function emailSentStamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/* The send time here does not prevent Gmail's collapsing: Gmail hides whatever
   repeats and shows only what is new, so a body stamp alone left the message
   collapsed down to that one line. The unique subject above is what keeps each
   email in its own conversation. This line stays because it tells the reader
   which request a link belongs to when several arrive.

   The message keeps its original centered 560px column. The logos fill the
   empty space either side of it, never above it. Side columns are a share of
   the width and each logo fills its column up to its full size, so they shrink
   on smaller screens. On phones a media query hands most of the width back to
   the text; apps that strip media queries keep the same side layout, just
   tighter. */
function emailShell(title: string, body: string, actionLabel: string, actionUrl: string, sentAt = emailSentStamp()) {
  const preheader = `${body} Sent ${sentAt}.`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>@media only screen and (max-width:640px){.ds-side{width:17%!important;padding:0 6px!important}.ds-main{width:66%!important}.ds-title{font-size:24px!important}}</style></head><body style="margin:0;background:#f7efe2;color:#28140c;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">${preheader}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7efe2"><tr><td class="ds-side" width="25%" align="center" valign="middle" style="width:25%;padding:24px 20px">${emailLogo("badge", 240)}</td><td class="ds-main" width="50%" align="center" valign="middle" style="width:50%;padding:24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px"><tr><td align="left"><h1 class="ds-title" style="margin:0 0 14px;font-family:Georgia,serif;font-size:32px;line-height:1.2">${title}</h1><p style="margin:0;font-size:16px;line-height:1.6">${body}</p><p style="margin:26px 0"><a href="${actionUrl}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#32190f;color:#fff;text-decoration:none;font-weight:700">${actionLabel}</a></p><p style="margin:0;font-size:13px;line-height:1.5;color:#715f55">If you did not request this, you can ignore this email. This link expires in one hour.</p><p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#8a7a70">Sent ${sentAt} &middot; Deaf Shark Coffee, 900 Green Lane, Union, NJ</p></td></tr></table></td><td class="ds-side" width="25%" align="center" valign="middle" style="width:25%;padding:24px 20px">${emailLogo("fin", 280)}</td></tr></table></body></html>`;
}

export async function sendVerificationEmail(to: string, url: string) {
  await sendTransactionalEmail({
    to,
    subject: `Verify your Deaf Shark Coffee account (${emailSubjectStamp()})`,
    text: `Verify your Deaf Shark Coffee account: ${url}\n\nThis link expires in one hour.\n\nSent ${emailSentStamp()}.`,
    html: emailShell("Verify your email", "Confirm your email address to finish setting up your Deaf Shark Coffee account.", "Verify email", url),
  });
}

export async function sendStudentVerificationEmail(to: string, url: string) {
  await sendTransactionalEmail({
    to,
    subject: `Confirm your Kean email for Deaf Shark Coffee (${emailSubjectStamp()})`,
    text: `Confirm your Kean email to add the 10% student discount to your Deaf Shark Coffee account: ${url}

This link expires in one hour.

Sent ${emailSentStamp()}.`,
    html: emailShell(
      "Confirm your Kean email",
      "Confirm this address to add the 10% Kean student discount to your Deaf Shark Coffee account. The discount stays on your account.",
      "Confirm my Kean email",
      url,
    ),
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await sendTransactionalEmail({
    to,
    subject: `Reset your Deaf Shark Coffee password (${emailSubjectStamp()})`,
    text: `Reset your Deaf Shark Coffee password: ${url}\n\nThis link expires in one hour.\n\nSent ${emailSentStamp()}.`,
    html: emailShell("Reset your password", "Use the secure link below to choose a new password for your Deaf Shark Coffee account.", "Reset password", url),
  });
}
