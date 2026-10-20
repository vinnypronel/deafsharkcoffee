import { getDb, ensureSchema } from "../../../db";
import { contactInquiries } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";
import { BodyTooLargeError, cleanEmail, cleanText, readCappedJson, verifyPublicForm } from "../../../lib/public-form";

/* Customer feedback: problems with the site, an account, an order, or the
   wording anywhere, and ideas.
   Stored with the contact messages under its own topic so it shows in the
   dashboard's Customer feedback tab. It deliberately sends no email to the shop. */
const KINDS: Record<string, string> = {
  broken: "Something's broken",
  order: "Problem with an order",
  wording: "Confusing or wrong wording",
  idea: "Idea or request",
  account: "Account or ordering problem",
};

export async function POST(request: Request) {
  try {
    let payload: Record<string, unknown>;
    try {
      payload = (await readCappedJson(request, 16 * 1024)) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof BodyTooLargeError) return Response.json({ error: "That message is too long." }, { status: 413 });
      return Response.json({ error: "We could not read that request." }, { status: 400 });
    }

    const kindKey = cleanText(payload.kind, 20).toLowerCase();
    const kind = KINDS[kindKey] ?? KINDS.broken;
    const message = cleanText(payload.message, 2000);
    if (message.length < 5) return Response.json({ error: "Tell us a little more so we can look into it." }, { status: 400 });
    if (!(await verifyPublicForm(request, payload.turnstileToken, "feedback"))) {
      return Response.json({ error: "Please complete the security check and try again." }, { status: 400 });
    }

    const session = await getCustomerSession(request).catch(() => null);
    const email = session?.user.email ?? cleanEmail(payload.email) ?? "";
    const name = session?.user.name?.trim() || "Website visitor";
    const page = cleanText(payload.page, 200) || "Unknown page";
    const orderNumber = cleanText(payload.orderNumber, 40);
    const device = cleanText(request.headers.get("user-agent"), 300) || "Unknown device";
    const screen = cleanText(payload.screen, 30);

    /* The context lines are what make a report fixable, so they travel with
       the message instead of being left for the customer to describe. */
    const body = [
      `[${kind}]`,
      message,
      "",
      `Page: ${page}`,
      orderNumber ? `Order: #${orderNumber}` : "",
      `Signed in: ${session ? "yes" : "no"}`,
      screen ? `Screen: ${screen}` : "",
      `Device: ${device}`,
    ].filter((line, index) => line !== "" || index === 2).join("\n");

    await ensureSchema();
    await getDb().insert(contactInquiries).values({ name, email: email || "Not provided", phone: null, topic: "website", message: body });
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ service: "deaf-shark-coffee", event: "feedback_submission_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return Response.json({ error: "We could not send that just now. Please try again." }, { status: 500 });
  }
}
