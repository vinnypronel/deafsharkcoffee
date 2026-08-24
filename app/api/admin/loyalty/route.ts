import { and, desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles, loyaltyTransactions, memberOffers } from "../../../../db/schema";
import { requireStaff } from "../../../../lib/staff-auth";

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();

  const [members, transactions, offers] = await Promise.all([
    getDb().select().from(customerProfiles).orderBy(desc(customerProfiles.updatedAt)).limit(500),
    getDb().select().from(loyaltyTransactions).orderBy(desc(loyaltyTransactions.createdAt)).limit(250),
    getDb().select().from(memberOffers).orderBy(desc(memberOffers.issuedAt)).limit(500),
  ]);

  return Response.json({ members, transactions, offers });
}

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();

  const payload = (await request.json()) as { offerId?: number; action?: string };
  const offerId = Number(payload.offerId);
  if (!Number.isInteger(offerId) || offerId < 1 || payload.action !== "redeem") {
    return Response.json({ error: "Choose an active member offer to redeem." }, { status: 400 });
  }

  const [redeemed] = await getDb().update(memberOffers).set({
    status: "redeemed",
    redeemedAt: new Date(),
    redeemedBy: staff.session.user.email,
  }).where(and(eq(memberOffers.id, offerId), eq(memberOffers.status, "active"))).returning();

  if (!redeemed) {
    return Response.json({ error: "This offer has already been redeemed or is no longer active." }, { status: 409 });
  }
  return Response.json({ ok: true, offer: redeemed });
}

export async function PATCH(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();

  const payload = (await request.json()) as { userId?: string; pointsChange?: number; reason?: string };
  const userId = payload.userId?.trim();
  const pointsChange = Number(payload.pointsChange);
  const reason = payload.reason?.trim();

  if (!userId || !Number.isInteger(pointsChange) || pointsChange === 0 || Math.abs(pointsChange) > 10000) {
    return Response.json({ error: "Enter a whole-number points adjustment between -10,000 and 10,000." }, { status: 400 });
  }
  if (!reason || reason.length < 3 || reason.length > 120) {
    return Response.json({ error: "Add a short reason for this adjustment." }, { status: 400 });
  }

  const [profile] = await getDb().select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1);
  if (!profile) return Response.json({ error: "Customer account not found." }, { status: 404 });

  const balanceAfter = profile.points + pointsChange;
  if (balanceAfter < 0) {
    return Response.json({ error: `This customer only has ${profile.points} points available.` }, { status: 400 });
  }

  await getDb().batch([
    getDb().update(customerProfiles).set({ points: balanceAfter, updatedAt: new Date() }).where(eq(customerProfiles.userId, userId)),
    getDb().insert(loyaltyTransactions).values({
      userId,
      pointsChange,
      balanceAfter,
      reason: `staff_adjustment:${reason}`,
    }),
  ]);

  return Response.json({ ok: true, balanceAfter });
}
