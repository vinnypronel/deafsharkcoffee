import { and, desc, eq, like } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles, loyaltyTransactions, memberOffers } from "../../../../db/schema";
import { requireStaff } from "../../../../lib/staff-auth";
import { loyaltyChangeStatements } from "../../../../lib/loyalty-ledger";
import { env } from "cloudflare:workers";
import { BIRTHDAY_DRINK_MAX_CENTS, birthdayOfferType, birthdayStatus } from "../../../../lib/birthday";

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();

  const [members, transactions, offers] = await Promise.all([
    getDb().select().from(customerProfiles).orderBy(desc(customerProfiles.updatedAt)).limit(500),
    getDb().select().from(loyaltyTransactions).orderBy(desc(loyaltyTransactions.createdAt)).limit(250),
    getDb().select().from(memberOffers).orderBy(desc(memberOffers.issuedAt)).limit(500),
  ]);

  /* Birthday eligibility is decided here in store time, so the counter screen
     never has to trust the tablet's clock. */
  const now = new Date();
  const offerKeys = new Set(offers.map((offer) => `${offer.userId}:${offer.offerType}`));
  const names = new Map(members.map((member) => [member.userId, member.displayName]));
  return Response.json({
    members: members.map((member) => {
      const birthday = birthdayStatus({ month: member.birthdayMonth, day: member.birthdayDay, setAt: member.birthdaySetAt, now });
      return {
        ...member,
        birthday: {
          ...birthday,
          redeemedThisYear: offerKeys.has(`${member.userId}:${birthdayOfferType(birthday.year)}`),
          maxCents: BIRTHDAY_DRINK_MAX_CENTS,
        },
        referredByName: member.referredByUserId ? names.get(member.referredByUserId) ?? "Another member" : null,
      };
    }),
    transactions,
    offers,
  });
}

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  if (env.LOYALTY_ENABLED !== "true") {
    return Response.json({ error: "Loyalty benefits are not enabled." }, { status: 409 });
  }
  await ensureSchema();

  const payload = (await request.json()) as { offerId?: number; action?: string; userId?: string };

  if (payload.action === "redeem_birthday") {
    const userId = typeof payload.userId === "string" ? payload.userId.trim() : "";
    const [profile] = userId
      ? await getDb().select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1)
      : [];
    if (!profile) return Response.json({ error: "Customer account not found." }, { status: 404 });

    const birthday = birthdayStatus({ month: profile.birthdayMonth, day: profile.birthdayDay, setAt: profile.birthdaySetAt });
    if (!birthday.isToday) return Response.json({ error: "The birthday drink can only be redeemed on the customer's birthday." }, { status: 400 });
    if (!birthday.eligibleToday) {
      return Response.json({ error: "This birthday was added today. It has to be on the account before the birthday to qualify." }, { status: 400 });
    }

    /* The unique (user, offer type) index is the once-a-year guarantee: a
       second tap, or a second tablet, cannot insert another row for this year. */
    const offerType = birthdayOfferType(birthday.year);
    const [redeemed] = await getDb().insert(memberOffers).values({
      userId,
      offerType,
      code: `BDAY-${birthday.year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: "redeemed",
      redeemedAt: new Date(),
      redeemedBy: staff.session.user.email,
    }).onConflictDoNothing({ target: [memberOffers.userId, memberOffers.offerType] }).returning();

    if (!redeemed) return Response.json({ error: "This customer's birthday drink was already redeemed this year." }, { status: 409 });
    return Response.json({ ok: true, offer: redeemed });
  }

  const offerId = Number(payload.offerId);
  if (!Number.isInteger(offerId) || offerId < 1 || payload.action !== "redeem") {
    return Response.json({ error: "Choose an active member offer to redeem." }, { status: 400 });
  }

  const [redeemed] = await getDb().update(memberOffers).set({
    status: "redeemed",
    redeemedAt: new Date(),
    redeemedBy: staff.session.user.email,
  }).where(and(eq(memberOffers.id, offerId), eq(memberOffers.status, "active"), like(memberOffers.offerType, "signup%"))).returning();

  if (!redeemed) {
    return Response.json({ error: "This offer has already been redeemed or is no longer active." }, { status: 409 });
  }
  return Response.json({ ok: true, offer: redeemed });
}

export async function PATCH(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  if (env.LOYALTY_ENABLED !== "true") {
    return Response.json({ error: "Loyalty benefits are not enabled." }, { status: 409 });
  }
  await ensureSchema();

  const payload = (await request.json()) as { userId?: string; pointsChange?: number; reason?: string; adjustmentId?: string };
  const userId = payload.userId?.trim();
  const pointsChange = Number(payload.pointsChange);
  const reason = payload.reason?.trim();
  const adjustmentId = payload.adjustmentId?.trim();

  if (!userId || !Number.isInteger(pointsChange) || pointsChange === 0 || Math.abs(pointsChange) > 10000) {
    return Response.json({ error: "Enter a whole-number points adjustment between -10,000 and 10,000." }, { status: 400 });
  }
  if (!reason || reason.length < 3 || reason.length > 120) {
    return Response.json({ error: "Add a short reason for this adjustment." }, { status: 400 });
  }
  if (!adjustmentId || !/^[A-Za-z0-9_-]{8,64}$/.test(adjustmentId)) {
    return Response.json({ error: "Start a new points adjustment and try again." }, { status: 400 });
  }

  const reference = `staff:${staff.session.user.email}:${adjustmentId}`;
  const ledgerReason = `staff_adjustment:${reason}`;
  const [existingAdjustment] = await getDb().select().from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.reference, reference)).limit(1);
  if (existingAdjustment) {
    if (
      existingAdjustment.userId !== userId ||
      existingAdjustment.pointsChange !== pointsChange ||
      existingAdjustment.reason !== ledgerReason
    ) {
      return Response.json({ error: "That adjustment ID was already used for a different change." }, { status: 409 });
    }
    return Response.json({ ok: true, balanceAfter: existingAdjustment.balanceAfter, replayed: true });
  }

  const [profile] = await getDb().select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1);
  if (!profile) return Response.json({ error: "Customer account not found." }, { status: 404 });

  const balanceAfter = profile.points + pointsChange;
  if (balanceAfter < 0) {
    return Response.json({ error: `This customer only has ${profile.points} points available.` }, { status: 400 });
  }

  /* A guarded, relative change through the shared ledger helper, not an absolute
     read-modify-write: an order completing or a redemption between the read and
     the write can no longer be erased. The unique reference carries the acting
     staff member for the audit trail, and the balance guard keeps it from ever
     going negative. */
  try {
    await env.DB.batch(loyaltyChangeStatements({
      userId,
      points: pointsChange,
      reference,
      reason: ledgerReason,
      assertApplied: true,
    }).map((statement) => env.DB.prepare(statement.sql).bind(...statement.values)));
  } catch {
    /* A simultaneous retry may have committed while this request was in flight.
       Return that exact result; otherwise the guarded balance update changed
       zero rows and the assertion rolled the entire batch back. */
    const [racedAdjustment] = await getDb().select().from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.reference, reference)).limit(1);
    if (racedAdjustment) {
      if (
        racedAdjustment.userId !== userId ||
        racedAdjustment.pointsChange !== pointsChange ||
        racedAdjustment.reason !== ledgerReason
      ) {
        return Response.json({ error: "That adjustment ID was already used for a different change." }, { status: 409 });
      }
      return Response.json({ ok: true, balanceAfter: racedAdjustment.balanceAfter, replayed: true });
    }
    const [current] = await getDb().select({ points: customerProfiles.points }).from(customerProfiles)
      .where(eq(customerProfiles.userId, userId)).limit(1);
    return Response.json({
      error: `The balance changed before this adjustment could be applied. It is now ${current?.points ?? 0} points. Review and retry.`,
    }, { status: 409 });
  }

  const [after] = await getDb().select({ points: customerProfiles.points }).from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1);
  return Response.json({ ok: true, balanceAfter: after?.points ?? balanceAfter });
}
