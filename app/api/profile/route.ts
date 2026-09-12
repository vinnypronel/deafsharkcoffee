import { and, desc, eq, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { customerProfiles, loyaltyTransactions, memberOffers } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";
import { env } from "cloudflare:workers";

const SIGNUP_BONUS_POINTS = 25;
const WELCOME_OFFER_TYPE = "signup_half_off_coffee";

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

  if (!current.signupBonusAwarded) {
    const balanceAfter = current.points + SIGNUP_BONUS_POINTS;
    await db.batch([
      db.update(customerProfiles).set({
        points: sql`${customerProfiles.points} + ${SIGNUP_BONUS_POINTS}`,
        lifetimePoints: sql`${customerProfiles.lifetimePoints} + ${SIGNUP_BONUS_POINTS}`,
        signupBonusAwarded: true,
        updatedAt: new Date(),
      }).where(and(
        eq(customerProfiles.userId, user.id),
        eq(customerProfiles.signupBonusAwarded, false),
      )),
      db.insert(loyaltyTransactions).values({
        userId: user.id,
        reference: `signup:${user.id}`,
        pointsChange: SIGNUP_BONUS_POINTS,
        balanceAfter,
        reason: "signup_bonus",
      }).onConflictDoNothing({ target: loyaltyTransactions.reference }),
    ]);
  }

  await db.insert(memberOffers).values({
    userId: user.id,
    offerType: WELCOME_OFFER_TYPE,
    code: `SHARK50-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  }).onConflictDoNothing({ target: [memberOffers.userId, memberOffers.offerType] });
}

async function getWelcomeOffer(userId: string) {
  const [offer] = await getDb().select().from(memberOffers)
    .where(and(eq(memberOffers.userId, userId), eq(memberOffers.offerType, WELCOME_OFFER_TYPE)))
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
  const welcomeOffer = await getWelcomeOffer(user.id);
  const activity = await getDb().select({
    id: loyaltyTransactions.id,
    pointsChange: loyaltyTransactions.pointsChange,
    balanceAfter: loyaltyTransactions.balanceAfter,
    reason: loyaltyTransactions.reason,
    createdAt: loyaltyTransactions.createdAt,
  }).from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.userId, user.id))
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(12);

  return Response.json({
    authenticated: true,
    profile: {
      displayName: profile.displayName,
      email: profile.email,
      phone: profile.phone,
      points: profile.points,
      lifetimePoints: profile.lifetimePoints,
      activity,
      welcomeOffer,
    },
  });
}

/* No PATCH here on purpose. Name and phone are captured at signup and are
   deliberately not editable afterwards: a ticket in the kitchen is matched to
   them, so they must not change underneath an order already being made. A
   customer who needs them corrected calls the shop. Removing the endpoint
   rather than only hiding the form means the rule cannot be bypassed by
   posting to the API directly. */
