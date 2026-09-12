import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../../db";
import { customerProfiles } from "../../../../../db/schema";
import { readStudentToken } from "../../../../../lib/student-verify";

/* Opened from the student's inbox, so it is a GET with no session of its own:
   the signed token carries which account it belongs to. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const claim = await readStudentToken(token);
  const done = (state: string) => Response.redirect(`https://deafsharkcoffee.com/?student=${state}`, 302);
  if (!claim) return done("expired");

  await ensureSchema();
  const [updated] = await getDb().update(customerProfiles)
    .set({ studentEmail: claim.email, studentVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(customerProfiles.userId, claim.userId))
    .returning({ userId: customerProfiles.userId });

  return done(updated ? "verified" : "unknown");
}
