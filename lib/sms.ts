import { env } from "cloudflare:workers";

/* One text per order, sent when it is ready for pickup. That promise is made to
   the customer at checkout, so nothing else in the app should send messages.

   Every message must stay within a single 160-character GSM-7 segment: Twilio
   bills per segment, so a 161-character message costs double. `buildOrderReadyMessage`
   keeps it short and `SEGMENT_LIMIT` is asserted before sending.

   Until the Twilio credentials exist the sender is inert: it reports `skipped`
   rather than throwing, so order handling is never blocked by messaging. */

const SEGMENT_LIMIT = 160;
const TWILIO_API = "https://api.twilio.com/2010-04-01";

export type SmsResult =
  | { status: "sent"; sid: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export function smsConfigured(): boolean {
  return Boolean(
    env.TWILIO_ACCOUNT_SID?.trim() &&
    env.TWILIO_AUTH_TOKEN?.trim() &&
    env.TWILIO_FROM_NUMBER?.trim(),
  );
}

export function buildOrderReadyMessage(orderNumber: string): string {
  return `Deaf Shark Coffee: order ${orderNumber} is ready for pickup. See you soon!`;
}

/* Twilio needs E.164. Accepts the "(908)-555-0123" shape the checkout form produces. */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 8) return `+${digits}`;
  return null;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!smsConfigured()) return { status: "skipped", reason: "Twilio is not configured yet" };

  const recipient = toE164(to);
  if (!recipient) return { status: "skipped", reason: "Phone number is not dialable" };

  if (body.length > SEGMENT_LIMIT) {
    return { status: "skipped", reason: `Message is ${body.length} characters, over the ${SEGMENT_LIMIT} single-segment limit` };
  }

  const accountSid = env.TWILIO_ACCOUNT_SID!.trim();
  const credentials = btoa(`${accountSid}:${env.TWILIO_AUTH_TOKEN!.trim()}`);

  try {
    const response = await fetch(`${TWILIO_API}/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: recipient,
        From: env.TWILIO_FROM_NUMBER!.trim(),
        Body: body,
      }),
    });

    const payload = await response.json() as { sid?: string; message?: string };
    if (!response.ok) return { status: "failed", reason: payload.message ?? `Twilio returned ${response.status}` };
    return { status: "sent", sid: payload.sid ?? "unknown" };
  } catch (caught) {
    return { status: "failed", reason: caught instanceof Error ? caught.message : "Network error" };
  }
}

/* Fire-and-forget helper for the order route. Never throws, so a messaging
   outage cannot stop staff from marking an order ready. */
export async function notifyOrderReady(phone: string, orderNumber: string): Promise<SmsResult> {
  const result = await sendSms(phone, buildOrderReadyMessage(orderNumber));
  if (result.status === "failed") {
    console.error(`Order ${orderNumber}: ready text failed - ${result.reason}`);
  }
  return result;
}
