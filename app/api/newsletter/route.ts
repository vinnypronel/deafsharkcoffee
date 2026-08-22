import { getDb, ensureSchema } from "../../../db";
import { newsletterSubscriptions } from "../../../db/schema";
import { cleanEmail, cleanText, verifyPublicForm } from "../../../lib/public-form";

const CONSENT_TEXT = "I agree to receive Deaf Shark Coffee news and promotions by email. I can unsubscribe at any time.";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string; consent?: boolean; turnstileToken?: string };
    const email = cleanEmail(payload.email);
    if (!email) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    if (payload.consent !== true) return Response.json({ error: "Please agree to receive marketing email." }, { status: 400 });
    if (!(await verifyPublicForm(request, payload.turnstileToken))) {
      return Response.json({ error: "Please complete the security check and try again." }, { status: 400 });
    }

    await ensureSchema();
    const now = new Date();
    await getDb().insert(newsletterSubscriptions).values({
      email,
      status: "pending",
      consentText: cleanText(CONSENT_TEXT, 500),
      consentSource: "website_footer",
      consentedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: newsletterSubscriptions.email,
      set: { status: "pending", consentText: CONSENT_TEXT, consentSource: "website_footer", consentedAt: now, updatedAt: now },
    });

    return Response.json({ success: true, message: "Check your inbox soon to finish joining the list." }, { status: 201 });
  } catch {
    return Response.json({ error: "We could not save your subscription. Please try again." }, { status: 500 });
  }
}
