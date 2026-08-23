import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { customerProfiles, loyaltyTransactions } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";

export async function GET(request: Request) {
  const session = await getCustomerSession(request);
  if (!session) return Response.json({ authenticated: false });
  await ensureSchema();

  const user = session.user;
  const [existing] = await getDb().select().from(customerProfiles).where(eq(customerProfiles.userId, user.id)).limit(1);
  const profile = existing ?? (await getDb().insert(customerProfiles).values({
    userId: user.id,
    email: user.email,
    displayName: user.name || user.email.split("@")[0],
  }).returning())[0];
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

  return Response.json({
    profile: {
      displayName: profile.displayName,
      email: profile.email,
      phone: profile.phone,
      points: profile.points,
      lifetimePoints: profile.lifetimePoints,
    },
  });
}
