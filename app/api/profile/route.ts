import { and, desc, eq, like, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { customerProfiles, loyaltyTransactions, memberOffers } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";
import { env } from "cloudflare:workers";
import { WELCOME_OFFER_TYPE, bestAvailableTier, nextTierProgress } from "../../../lib/loyalty";
import { BIRTHDAY_DRINK_MAX_CENTS, birthdayOfferType, birthdayStatus } from "../../../lib/birthday";
import { REFERRAL_POINTS } from "../../../lib/referral";
import { ensureReferralCode } from "../../../lib/referral-store";
import { loadPromotions } from "../../../lib/promotion-store";
import { describePromotion, promotionIsCurrent } from "../../../lib/promotions";
import { menuProducts } from "../../menu-data";
import { PRIVACY_VERSION, TERMS_VERSION, hasCurrentLegalAcceptance } from "../../../lib/legal-policy";

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
  if (env.LOYALTY_ENABLED !== "true") return;

  await db.insert(memberOffers).values({
    userId: user.id,
    offerType: WELCOME_OFFER_TYPE,
    code: `SHARK50-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  }).onConflictDoNothing({ target: [memberOffers.userId, memberOffers.offerType] });
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
  await ensureWelcomeBenefits(user);
  const [profile] = await getDb().select().from(customerProfiles).where(eq(customerProfiles.userId, user.id)).limit(1);
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
      welcomeOffer,
      studentVerified: Boolean(profile.studentVerifiedAt),
      studentEmail: profile.studentEmail,
      rewards: {
        available: bestAvailableTier(profile.points),
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
    },
  });
}

/* No PATCH here on purpose. Name and phone are captured at signup and are
   deliberately not editable afterwards: a ticket in the kitchen is matched to
   them, so they must not change underneath an order already being made. A
   customer who needs them corrected calls the shop. Removing the endpoint
   rather than only hiding the form means the rule cannot be bypassed by
   posting to the API directly. */
