import { and, desc, eq, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { customerProfiles, loyaltyTransactions, memberOffers } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";

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

export async function PATCH(request: Request) {
  const session = await getCustomerSession(request);
  if (!session) return Response.json({ error: "Sign in to update your profile." }, { status: 401 });
  await ensureSchema();

  const payload = (await request.json()) as { displayName?: string; phone?: string };
  const displayName = payload.displayName?.trim();
  const phone = payload.phone?.replace(/[^0-9+()\- .]/g, "").trim();

  if (!displayName || displayName.length > 80 || !phone || phone.length < 7 || phone.length > 24) {
    return Response.json({ error: "Enter a name and a valid phone number." }, { status: 400 });
  }

  const [profile] = await getDb().insert(customerProfiles).values({
    userId: session.user.id,
    email: session.user.email,
    displayName,
    phone,
  }).onConflictDoUpdate({
    target: customerProfiles.userId,
    set: { displayName, phone, email: session.user.email, updatedAt: new Date() },
  }).returning();
  await ensureWelcomeBenefits(session.user);
  const refreshed = (await getDb().select().from(customerProfiles).where(eq(customerProfiles.userId, session.user.id)).limit(1))[0] ?? profile;
  const welcomeOffer = await getWelcomeOffer(session.user.id);

  return Response.json({
    profile: {
      displayName: refreshed.displayName,
      email: refreshed.email,
      phone: refreshed.phone,
      points: refreshed.points,
      lifetimePoints: refreshed.lifetimePoints,
      welcomeOffer,
    },
  });
}
