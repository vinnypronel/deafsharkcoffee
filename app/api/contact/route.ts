import { getDb, ensureSchema } from "../../../db";
import { contactInquiries } from "../../../db/schema";
import { cleanEmail, cleanPhone, cleanText, verifyPublicForm } from "../../../lib/public-form";

const topics = new Set(["general", "catering", "order", "events", "feedback"]);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const name = cleanText(payload.name, 100);
    const email = cleanEmail(payload.email);
    const phone = cleanPhone(payload.phone) || null;
    const topicValue = cleanText(payload.topic, 30).toLowerCase();
    const topic = topics.has(topicValue) ? topicValue : "general";
    const message = cleanText(payload.message, 3000);

    if (name.length < 2 || !email || message.length < 10) {
      return Response.json({ error: "Enter your name, a valid email, and a message of at least 10 characters." }, { status: 400 });
    }
    if (!(await verifyPublicForm(request, payload.turnstileToken))) {
      return Response.json({ error: "Please complete the security check and try again." }, { status: 400 });
    }

    await ensureSchema();
    const [inquiry] = await getDb().insert(contactInquiries).values({ name, email, phone, topic, message }).returning({ id: contactInquiries.id });
    return Response.json({ success: true, reference: `DSC-${inquiry.id}` }, { status: 201 });
  } catch {
    return Response.json({ error: "We could not send your message. Please call the shop or try again." }, { status: 500 });
  }
}
