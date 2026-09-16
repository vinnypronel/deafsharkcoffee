import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles } from "../../../../db/schema";
import { getCustomerSession } from "../../../../lib/auth";
import { PRIVACY_VERSION, TERMS_VERSION } from "../../../../lib/legal-policy";

export async function POST(request: Request) {
  const session = await getCustomerSession(request);
  if (!session) {
    return Response.json({ error: "Sign in to accept the current policies." }, { status: 401 });
  }

  let payload: { policiesAccepted?: boolean; ageGuardianConfirmed?: boolean };
  try {
    payload = await request.json() as typeof payload;
  } catch {
    return Response.json({ error: "We could not read that request." }, { status: 400 });
  }
  if (payload.policiesAccepted !== true || payload.ageGuardianConfirmed !== true) {
    return Response.json(
      { error: "Accept the current policies and confirm the age requirement to continue." },
      { status: 400 },
    );
  }

  await ensureSchema();
  const now = new Date();
  await getDb().update(customerProfiles).set({
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    ageGuardianConfirmedAt: now,
    updatedAt: now,
  }).where(eq(customerProfiles.userId, session.user.id));

  return Response.json({
    success: true,
    legal: { acceptedCurrent: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION },
  }, { headers: { "Cache-Control": "no-store" } });
}
