import { getDb, ensureSchema } from "../../../db";
import { contactInquiries } from "../../../db/schema";
import { cleanEmail, cleanPhone, cleanText, requestExceedsBytes, verifyPublicForm } from "../../../lib/public-form";
import { sendStaffNotification } from "../../../lib/transactional-email";

const topics = new Set(["general", "catering", "order", "events", "feedback"]);

export async function POST(request: Request) {
  try {
    if (requestExceedsBytes(request, 32 * 1024)) {
      return Response.json({ error: "That message is too large." }, { status: 413 });
    }
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
    if (!(await verifyPublicForm(request, payload.turnstileToken, "contact"))) {
      return Response.json({ error: "Please complete the security check and try again." }, { status: 400 });
    }

    await ensureSchema();
    const [inquiry] = await getDb().insert(contactInquiries).values({ name, email, phone, topic, message }).returning({ id: contactInquiries.id });
    const reference = `DSC-${inquiry.id}`;
    const notificationDelivered = await sendStaffNotification("contact", `New website message ${reference}`, [
      `From: ${name} <${email}>`,
      `Phone: ${phone || "Not provided"}`,
      `Topic: ${topic}`,
      `Message: ${message}`,
      "Open the staff dashboard to manage this inquiry.",
    ], email);
    if (!notificationDelivered) {
      console.warn(JSON.stringify({ service: "deaf-shark-coffee", event: "staff_notification_pending", channel: "contact", reference }));
    }
    return Response.json({ success: true, reference }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ service: "deaf-shark-coffee", event: "contact_submission_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return Response.json({ error: "We could not send your message. Please call the shop or try again." }, { status: 500 });
  }
}
