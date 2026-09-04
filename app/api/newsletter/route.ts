import { getDb, ensureSchema } from "../../../db";
import { newsletterSubscriptions } from "../../../db/schema";
import { cleanEmail, cleanText, requestExceedsBytes, verifyPublicForm } from "../../../lib/public-form";

const CONSENT_TEXT = "I agree to receive Deaf Shark Coffee news and promotions by email. I can unsubscribe at any time.";

export async function POST(request: Request) {
  try {
    if (requestExceedsBytes(request, 8 * 1024)) {
      return Response.json({ error: "That request is too large." }, { status: 413 });
    }
    const payload = (await request.json()) as { email?: string; consent?: boolean; turnstileToken?: string };
    const email = cleanEmail(payload.email);
    if (!email) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    if (payload.consent !== true) return Response.json({ error: "Please agree to receive marketing email." }, { status: 400 });
    if (!(await verifyPublicForm(request, payload.turnstileToken, "newsletter"))) {
      return Response.json({ error: "Please complete the security check and try again." }, { status: 400 });
    }

    await ensureSchema();
    const now = new Date();
    await getDb().insert(newsletterSubscriptions).values({
      email,
      status: "active",
      consentText: cleanText(CONSENT_TEXT, 500),
      consentSource: "website_footer",
      consentedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: newsletterSubscriptions.email,
      set: { status: "active", consentText: CONSENT_TEXT, consentSource: "website_footer", consentedAt: now, updatedAt: now },
    });

    return Response.json({ success: true, message: "You're on the Deaf Shark Coffee email list." }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ service: "deaf-shark-coffee", event: "newsletter_subscription_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return Response.json({ error: "We could not save your subscription. Please try again." }, { status: 500 });
  }
}
