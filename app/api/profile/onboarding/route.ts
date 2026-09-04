import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles, newsletterSubscriptions } from "../../../../db/schema";
import { getCustomerSession } from "../../../../lib/auth";

const MARKETING_CONSENT = "I agree to receive Deaf Shark Coffee news and promotions by email. I can unsubscribe at any time.";

export async function POST(request: Request) {
  const session = await getCustomerSession(request);
  if (!session) return Response.json({ error: "Sign in to finish creating your profile." }, { status: 401 });

  const payload = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    phone?: string;
    birthdayMonth?: number | null;
    birthdayDay?: number | null;
    policiesAccepted?: boolean;
    marketingOptIn?: boolean;
  };
  const firstName = payload.firstName?.trim() ?? "";
  const lastName = payload.lastName?.trim() ?? "";
  const displayName = `${firstName} ${lastName}`.trim();
  const phone = payload.phone?.replace(/[^0-9+()\- .]/g, "").trim() || null;
  const birthdayMonth = Number.isInteger(payload.birthdayMonth) ? Number(payload.birthdayMonth) : null;
  const birthdayDay = Number.isInteger(payload.birthdayDay) ? Number(payload.birthdayDay) : null;

  if (!firstName || !lastName || displayName.length > 80) {
    return Response.json({ error: "Enter your first and last name." }, { status: 400 });
  }
  if (phone && (phone.replace(/\D/g, "").length < 10 || phone.length > 24)) {
    return Response.json({ error: "Enter a complete phone number or leave it blank." }, { status: 400 });
  }
  if ((birthdayMonth === null) !== (birthdayDay === null)) {
    return Response.json({ error: "Choose both a birthday month and day, or leave both blank." }, { status: 400 });
  }
  if (birthdayMonth !== null && birthdayDay !== null) {
    const daysInMonth = new Date(2000, birthdayMonth, 0).getDate();
    if (birthdayMonth < 1 || birthdayMonth > 12 || birthdayDay < 1 || birthdayDay > daysInMonth) {
      return Response.json({ error: "Choose a valid birthday month and day." }, { status: 400 });
    }
  }
  if (payload.policiesAccepted !== true) {
    return Response.json({ error: "Accept the Terms and Privacy Policy to create an account." }, { status: 400 });
  }

  await ensureSchema();
  const now = new Date();
  await getDb().insert(customerProfiles).values({
    userId: session.user.id,
    email: session.user.email,
    displayName,
    phone,
    birthdayMonth,
    birthdayDay,
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
  }).onConflictDoUpdate({
    target: customerProfiles.userId,
    set: {
      email: session.user.email,
      displayName,
      phone,
      birthdayMonth,
      birthdayDay,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      updatedAt: now,
    },
  });

  if (payload.marketingOptIn === true) {
    await getDb().insert(newsletterSubscriptions).values({
      email: session.user.email,
      status: "active",
      consentText: MARKETING_CONSENT,
      consentSource: "account_signup",
      consentedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: newsletterSubscriptions.email,
      set: {
        status: "active",
        consentText: MARKETING_CONSENT,
        consentSource: "account_signup",
        consentedAt: now,
        updatedAt: now,
      },
    });
  }

  const [profile] = await getDb().select().from(customerProfiles)
    .where(eq(customerProfiles.userId, session.user.id)).limit(1);
  return Response.json({ success: true, profile }, { status: 201 });
}
