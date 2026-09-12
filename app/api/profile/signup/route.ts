import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles, newsletterSubscriptions, users } from "../../../../db/schema";
import { getAuth } from "../../../../lib/auth";
import { verifyPublicForm } from "../../../../lib/public-form";

/* Account creation and profile capture in one server request.

   The details collected at signup (phone, birthday, consent) used to be parked
   in browser storage and applied after the customer clicked the verification
   link. That silently lost them whenever the link was opened somewhere else:
   another device, another browser, or a new tab with fresh storage. Worse, the
   terms and privacy timestamps ride along with it, so an account could exist
   with no record of the consent its signup form required.

   Writing the profile here removes the handoff entirely. The user row exists as
   soon as signup succeeds, unverified, so the profile can be stored in the same
   request and verification carries nothing. */

const MARKETING_CONSENT = "I agree to receive Deaf Shark Coffee news and promotions by email. I can unsubscribe at any time.";

type SignupPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
  birthdayMonth?: number | null;
  birthdayDay?: number | null;
  policiesAccepted?: boolean;
  marketingOptIn?: boolean;
  callbackURL?: string;
  turnstileToken?: string;
};

function badRequest(error: string) {
  return Response.json({ error }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

/* Sends the verification link and answers identically on every path.

   The send is awaited rather than left to sign-up's background task, so a mail
   outage is reported instead of leaving the customer waiting for a link that
   never arrives. The response shape never varies: a repeat signup on an
   existing address must look exactly like a new one, or the reply becomes a way
   to discover which addresses have accounts. */
async function sendLinkAndRespond(request: Request, email: string, callbackURL?: string) {
  let emailSent = true;
  try {
    await getAuth().api.sendVerificationEmail({
      body: { email, ...(callbackURL ? { callbackURL } : {}) },
      headers: request.headers,
    });
  } catch {
    emailSent = false;
  }
  return Response.json({ success: true, emailSent }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let payload: SignupPayload;
  try {
    payload = (await request.json()) as SignupPayload;
  } catch {
    return badRequest("We could not read that request.");
  }

  const firstName = payload.firstName?.trim() ?? "";
  const lastName = payload.lastName?.trim() ?? "";
  const displayName = `${firstName} ${lastName}`.trim();
  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const phone = payload.phone?.replace(/[^0-9+()\- .]/g, "").trim() || null;
  const birthdayMonth = Number.isInteger(payload.birthdayMonth) ? Number(payload.birthdayMonth) : null;
  const birthdayDay = Number.isInteger(payload.birthdayDay) ? Number(payload.birthdayDay) : null;

  if (!firstName || !lastName || displayName.length > 80) return badRequest("Enter your first and last name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return badRequest("Enter a complete email address.");
  if (password.length < 8 || password.length > 128) return badRequest("Your password needs at least 8 characters.");
  if (phone && (phone.replace(/\D/g, "").length < 10 || phone.length > 24)) {
    return badRequest("Enter a complete phone number or leave it blank.");
  }
  if ((birthdayMonth === null) !== (birthdayDay === null)) {
    return badRequest("Choose both a birthday month and day, or leave both blank.");
  }
  if (birthdayMonth !== null && birthdayDay !== null) {
    const daysInMonth = new Date(2000, birthdayMonth, 0).getDate();
    if (birthdayMonth < 1 || birthdayMonth > 12 || birthdayDay < 1 || birthdayDay > daysInMonth) {
      return badRequest("Choose a valid birthday month and day.");
    }
  }
  if (payload.policiesAccepted !== true) {
    return badRequest("Accept the Terms and Privacy Policy to create an account.");
  }

  /* Account creation sends a real email on every attempt, so it needs the same
     bot check the other public forms carry. Verified before anything is
     written, so a failed challenge costs nothing. */
  if (!(await verifyPublicForm(request, payload.turnstileToken, "signup"))) {
    return badRequest("Please complete the security check and try again.");
  }

  await ensureSchema();

  try {
    await getAuth().api.signUpEmail({
      body: {
        name: displayName,
        email,
        password,
        ...(payload.callbackURL ? { callbackURL: payload.callbackURL } : {}),
      },
      headers: request.headers,
    });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? (error as { status?: unknown }).status : undefined;
    const message = error instanceof Error ? error.message : "";
    if (status === "UNPROCESSABLE_ENTITY" || status === 422 || /already/i.test(message)) {
      /* Deliberately the same wording as success. Because verification is
         required, better-auth answers a repeat signup with a response that is
         indistinguishable from a new one, so that strangers cannot discover
         which addresses have accounts. Saying "that email is taken" here would
         undo exactly that protection. */
      return sendLinkAndRespond(request, email, payload.callbackURL);
    }
    return Response.json(
      { error: "We could not create that account. Please try again or call the shop." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  /* Never trust the id in the signup response. On a repeat signup better-auth
     returns a synthetic user with a fabricated id, so writing a profile from it
     would leave a row pointing at a user that does not exist, and would leak
     which emails are already registered. Look the account up instead, and only
     store the profile when signup actually created one. */
  const [account] = await getDb().select({ id: users.id, email: users.email })
    .from(users).where(eq(users.email, email)).limit(1);
  if (!account) {
    return sendLinkAndRespond(request, email, payload.callbackURL);
  }

  const [existingProfile] = await getDb().select({ userId: customerProfiles.userId })
    .from(customerProfiles).where(eq(customerProfiles.userId, account.id)).limit(1);
  if (existingProfile) {
    /* An established account signing up again. Leave their saved details alone,
       but still send a link: someone repeating signup usually never received
       the first one. */
    return sendLinkAndRespond(request, account.email, payload.callbackURL);
  }

  const now = new Date();
  await getDb().insert(customerProfiles).values({
    userId: account.id,
    email: account.email,
    displayName,
    phone,
    birthdayMonth,
    birthdayDay,
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
  }).onConflictDoUpdate({
    target: customerProfiles.userId,
    set: { email: account.email, displayName, phone, birthdayMonth, birthdayDay, termsAcceptedAt: now, privacyAcceptedAt: now, updatedAt: now },
  });

  if (payload.marketingOptIn === true) {
    await getDb().insert(newsletterSubscriptions).values({
      email: account.email,
      status: "active",
      consentText: MARKETING_CONSENT,
      consentSource: "account_signup",
      consentedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: newsletterSubscriptions.email,
      set: { status: "active", consentText: MARKETING_CONSENT, consentSource: "account_signup", consentedAt: now, updatedAt: now },
    });
  }

  return sendLinkAndRespond(request, account.email, payload.callbackURL);
}
