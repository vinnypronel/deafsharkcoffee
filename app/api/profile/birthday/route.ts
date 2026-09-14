import { and, eq, isNull } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles } from "../../../../db/schema";
import { getCustomerSession } from "../../../../lib/auth";
import { validBirthday } from "../../../../lib/birthday";

/* Lets a member who skipped the birthday at signup add it once. After that it
   is locked, like name and phone, so a birthday cannot be moved to today to
   collect a free drink. The save time is recorded, and the drink is only
   honored on a birthday that was on file before the day. */
export async function POST(request: Request) {
  const session = await getCustomerSession(request);
  if (!session) return Response.json({ error: "Sign in to add your birthday." }, { status: 401 });

  let payload: { month?: unknown; day?: unknown };
  try {
    payload = await request.json() as { month?: unknown; day?: unknown };
  } catch {
    return Response.json({ error: "We could not read that request." }, { status: 400 });
  }
  const month = Number(payload.month);
  const day = Number(payload.day);
  if (!validBirthday(month, day)) return Response.json({ error: "Choose a valid birthday month and day." }, { status: 400 });

  await ensureSchema();
  const [saved] = await getDb().update(customerProfiles)
    .set({ birthdayMonth: month, birthdayDay: day, birthdaySetAt: new Date(), updatedAt: new Date() })
    .where(and(eq(customerProfiles.userId, session.user.id), isNull(customerProfiles.birthdayMonth)))
    .returning({ userId: customerProfiles.userId });

  if (!saved) {
    return Response.json({ error: "Your birthday is already on file. Call the shop if it needs correcting." }, { status: 409 });
  }
  return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
