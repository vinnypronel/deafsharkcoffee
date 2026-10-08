import { issueWelcomeOffer } from "../../../lib/welcome-offer";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { customerProfiles, loyaltyTransactions, memberOffers, newsletterSubscriptions } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";
import { PHONE_IN_USE_MESSAGE, phoneBelongsToAnotherAccount, phoneKey } from "../../../lib/account-rules";
import { isStaffEmail } from "../../../lib/staff-auth";
import { env } from "cloudflare:workers";
import { WELCOME_OFFER_TYPE, availableTiers, bestAvailableTier, nextTierProgress } from "../../../lib/loyalty";
import { BIRTHDAY_DRINK_MAX_CENTS, birthdayOfferType, birthdayStatus } from "../../../lib/birthday";
import { REFERRAL_POINTS } from "../../../lib/referral";
import { ensureReferralCode } from "../../../lib/referral-store";
import { loadPromotions } from "../../../lib/promotion-store";
import { describePromotion, promotionIsCurrent } from "../../../lib/promotions";
import { menuProducts } from "../../menu-data";
import { PRIVACY_VERSION, TERMS_VERSION, hasCurrentLegalAcceptance } from "../../../lib/legal-policy";
import { refreshLoyaltyBalance } from "../../../lib/loyalty-ledger";

/* No signup points: the shop's programme gives new members a half-off drink
   coupon instead, and points are earned by spending. */

async function ensureWelcomeBenefits(user: { id: string; email: string; name: string }) {
  const db = getDb();
  await db.insert(customerProfiles).values({
    userId: user.id,
    email: user.email,
    displayName: user.name || user.email.split("@")[0],
  }).onConflictDoNothing({ target: customerProfiles.userId });

  const [current] = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, user.id)).limit(1);
  if (!current) throw new Error("Customer profile could not be created.");
  await issueWelcomeOffer(user.id);
}

async function getOffer(userId: string, offerType: string) {
  const [offer] = await getDb().select().from(memberOffers)
    .where(and(eq(memberOffers.userId, userId), eq(memberOffers.offerType, offerType)))
    .limit(1);
  return offer ?? null;
}

export async function GET(request: Request) {
  const session = await getCustomerSession(request);
  if (!session) return Response.json({ authenticated: false });
  await ensureSchema();

  const user = session.user;
  /* Admin accounts run the shop; they do not collect points or coupons, so
     the account panel only needs who is signed in and a way to the dashboard. */
  if (user.emailVerified === true && isStaffEmail(user.email)) {
    return Response.json({
      authenticated: true,
      staff: true,
      profile: {
        displayName: user.name || user.email.split("@")[0],
        email: user.email,
        points: 0,
        lifetimePoints: 0,
      },
    });
  }
  await ensureWelcomeBenefits(user);
  if (env.LOYALTY_ENABLED === "true") await refreshLoyaltyBalance(env.DB, user.id);
  const [profile] = await getDb().select().from(customerProfiles).where(eq(customerProfiles.userId, user.id)).limit(1);
  const [marketingSubscription] = await getDb().select({ status: newsletterSubscriptions.status })
    .from(newsletterSubscriptions).where(eq(newsletterSubscriptions.email, user.email.toLowerCase())).limit(1);
  const preferences = { marketingEmail: marketingSubscription?.status === "active" };
  const birthday = birthdayStatus({ month: profile.birthdayMonth, day: profile.birthdayDay, setAt: profile.birthdaySetAt });

  if (env.LOYALTY_ENABLED !== "true") {
    return Response.json({
      authenticated: true,
      loyaltyEnabled: false,
      profile: {
        displayName: profile.displayName,
        email: profile.email,
        phone: profile.phone,
        points: 0,
        lifetimePoints: 0,
        activity: [],
        welcomeOffer: null,
        studentVerified: false,
        studentEmail: null,
        rewards: { available: null, progress: nextTierProgress(0) },
        birthday: {
          onFile: birthday.onFile,
          month: birthday.month,
          day: birthday.day,
          isToday: birthday.isToday,
          eligibleToday: false,
          redeemedThisYear: false,
          maxCents: 0,
        },
        referral: { code: null, points: 0, joined: 0, rewarded: 0 },
        promotions: [],
        legal: {
          acceptedCurrent: hasCurrentLegalAcceptance(profile),
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
        },
        preferences,
      },
    });
  }

  const [welcomeOffer, birthdayOffer, referralCode, activity, referralCounts, allPromotions] = await Promise.all([
    getOffer(user.id, WELCOME_OFFER_TYPE),
    birthday.isToday ? getOffer(user.id, birthdayOfferType(birthday.year)) : Promise.resolve(null),
    ensureReferralCode(user.id, profile.displayName, profile.referralCode),
    getDb().select({
      id: loyaltyTransactions.id,
      pointsChange: loyaltyTransactions.pointsChange,
      balanceAfter: loyaltyTransactions.balanceAfter,
      reason: loyaltyTransactions.reason,
      createdAt: loyaltyTransactions.createdAt,
    }).from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.userId, user.id))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(12),
    Promise.all([
      getDb().select({ count: sql<number>`count(*)` }).from(customerProfiles).where(eq(customerProfiles.referredByUserId, user.id)),
      getDb().select({ count: sql<number>`count(*)` }).from(loyaltyTransactions)
        .where(and(eq(loyaltyTransactions.userId, user.id), like(loyaltyTransactions.reference, "referral:%"))),
    ]),
    loadPromotions(),
  ]);

  const now = new Date();
  const productNames = new Map(menuProducts.map((product) => [product.id, product.name]));
  const currentPromotions = allPromotions
    .filter((promotion) => promotionIsCurrent(promotion, now))
    .map((promotion) => ({ id: promotion.id, name: promotion.name, summary: describePromotion(promotion, promotion.productId ? productNames.get(promotion.productId) : undefined) }));

  return Response.json({
    authenticated: true,
    loyaltyEnabled: true,
    profile: {
      displayName: profile.displayName,
      email: profile.email,
      phone: profile.phone,
      points: profile.points,
      lifetimePoints: profile.lifetimePoints,
      activity,
      /* Redeemed coupons remain in the database for staff auditing and the
         one-use constraint, but disappear completely from the customer's
         profile response as soon as they have been used. */
      welcomeOffer: welcomeOffer?.status === "active" ? welcomeOffer : null,
      studentVerified: Boolean(profile.studentVerifiedAt),
      studentEmail: profile.studentEmail,
      rewards: {
        available: bestAvailableTier(profile.points),
        options: availableTiers(profile.points),
        progress: nextTierProgress(profile.points),
      },
      birthday: {
        onFile: birthday.onFile,
        month: birthday.month,
        day: birthday.day,
        isToday: birthday.isToday,
        eligibleToday: birthday.eligibleToday,
        redeemedThisYear: Boolean(birthdayOffer),
        maxCents: BIRTHDAY_DRINK_MAX_CENTS,
      },
      referral: {
        code: referralCode,
        points: REFERRAL_POINTS,
        joined: Number(referralCounts[0][0]?.count ?? 0),
        rewarded: Number(referralCounts[1][0]?.count ?? 0),
      },
      promotions: currentPromotions,
      legal: {
        acceptedCurrent: hasCurrentLegalAcceptance(profile),
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      },
      preferences,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getCustomerSession(request);
  if (!session || session.user.emailVerified !== true) return Response.json({ error: "Sign in to update your profile." }, { status: 401 });
  await ensureSchema();
  let payload: { displayName?: unknown; phone?: unknown; marketingEmail?: unknown };
  try { payload = await request.json() as typeof payload; }
  catch { return Response.json({ error: "We could not read that update." }, { status: 400 }); }

  const displayName = typeof payload.displayName === "string" ? payload.displayName.trim().replace(/\s+/g, " ") : "";
  const phoneText = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const phone = phoneText ? phoneText.replace(/[^0-9+()\- .]/g, "") : null;
  if (displayName.length < 2 || displayName.length > 80) return Response.json({ error: "Enter the name we should use for your account." }, { status: 400 });
  if (phone && phone.replace(/\D/g, "").length !== 10) return Response.json({ error: "Enter a complete 10-digit mobile number or leave it blank." }, { status: 400 });

  /* Only a changed number is checked, so an account that already shares one
     can still save its other details. */
  const current = await env.DB.prepare("SELECT phone FROM customer_profiles WHERE user_id = ?").bind(session.user.id).first<{ phone: string | null }>();
  if (phoneKey(phone) !== phoneKey(current?.phone) && await phoneBelongsToAnotherAccount(phone, { userId: session.user.id })) {
    return Response.json({ error: PHONE_IN_USE_MESSAGE }, { status: 409 });
  }

  const now = new Date();
  await env.DB.batch([
    env.DB.prepare("UPDATE customer_profiles SET display_name = ?, phone = ?, updated_at = unixepoch() WHERE user_id = ?")
      .bind(displayName, phone, session.user.id),
    env.DB.prepare('UPDATE "user" SET name = ?, updated_at = unixepoch() WHERE id = ?').bind(displayName, session.user.id),
  ]);

  if (typeof payload.marketingEmail === "boolean") {
    if (payload.marketingEmail) {
      await getDb().insert(newsletterSubscriptions).values({
        email: session.user.email.toLowerCase(), status: "active",
        consentText: "I agree to receive Deaf Shark Coffee news and promotions by email. I can unsubscribe at any time.",
        consentSource: "account_preferences", consentedAt: now, updatedAt: now,
      }).onConflictDoUpdate({
        target: newsletterSubscriptions.email,
        set: { status: "active", consentSource: "account_preferences", consentedAt: now, updatedAt: now },
      });
    } else {
      await getDb().update(newsletterSubscriptions).set({ status: "unsubscribed", updatedAt: now })
        .where(eq(newsletterSubscriptions.email, session.user.email.toLowerCase()));
    }
  }

  return Response.json({ profile: { displayName, phone }, preferences: { marketingEmail: payload.marketingEmail === true } });
}
