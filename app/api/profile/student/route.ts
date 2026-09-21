import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles } from "../../../../db/schema";
import { getCustomerSession } from "../../../../lib/auth";
import { isKeanEmail } from "../../../../lib/loyalty";
import { createStudentToken } from "../../../../lib/student-verify";
import { sendStudentVerificationEmail } from "../../../../lib/transactional-email";
import { env } from "cloudflare:workers";

/* Starts Kean student verification. The address is only stored once the student
   proves they can read mail at it, so an unverified claim never sits on an
   account and nobody can attach someone else's address to their own. */
export async function POST(request: Request) {
  if (env.LOYALTY_ENABLED !== "true") {
    return Response.json({ error: "Student rewards are not available right now." }, { status: 409 });
  }
  const session = await getCustomerSession(request);
  if (!session) return Response.json({ error: "Sign in to add your student discount." }, { status: 401 });

  const payload = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = isKeanEmail(payload.email);
  if (!email) {
    return Response.json({ error: "Enter your Kean address, ending in kean.edu." }, { status: 400 });
  }

  await ensureSchema();
  const [existing] = await getDb().select({ verifiedAt: customerProfiles.studentVerifiedAt })
    .from(customerProfiles).where(eq(customerProfiles.userId, session.user.id)).limit(1);
  if (existing?.verifiedAt) {
    return Response.json({ error: "Your student discount is already active." }, { status: 409 });
  }

  const token = await createStudentToken(session.user.id, email);
  const url = `https://deafsharkcoffee.com/api/profile/student/verify?token=${encodeURIComponent(token)}`;
  try {
    await sendStudentVerificationEmail(email, url);
  } catch {
    return Response.json({ error: "We could not send that email just now. Please try again shortly." }, { status: 502 });
  }

  return Response.json({ success: true, email }, { headers: { "Cache-Control": "no-store" } });
}
