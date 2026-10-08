import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles, loyaltyTransactions, memberOffers, users } from "../../../../db/schema";
import { requireStaff, staffEmailList } from "../../../../lib/staff-auth";
import { refreshAllLoyaltyBalances } from "../../../../lib/loyalty-ledger";
import { env } from "cloudflare:workers";
import { BIRTHDAY_DRINK_MAX_CENTS, birthdayOfferType, birthdayStatus } from "../../../../lib/birthday";

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();

  const staffEmails = staffEmailList();
  await refreshAllLoyaltyBalances(env.DB);
  const [allMembers, transactions, offers, staffUsers] = await Promise.all([
    getDb().select().from(customerProfiles).orderBy(desc(customerProfiles.updatedAt)).limit(500),
    getDb().select().from(loyaltyTransactions).orderBy(desc(loyaltyTransactions.createdAt)).limit(250),
    getDb().select().from(memberOffers).orderBy(desc(memberOffers.issuedAt)).limit(500),
    staffEmails.length
      ? getDb().select({ email: users.email, name: users.name, emailVerified: users.emailVerified, createdAt: users.createdAt })
        .from(users).where(inArray(sql`lower(${users.email})`, staffEmails))
      : Promise.resolve([]),
  ]);
  /* Admin accounts are listed on their own, not as rewards customers. */
  const staffSet = new Set(staffEmails);
  const members = allMembers.filter((member) => !staffSet.has(member.email.trim().toLowerCase()));
  const staffByEmail = new Map(staffUsers.map((user) => [user.email.trim().toLowerCase(), user]));
  const admins = staffEmails.map((email) => {
    const user = staffByEmail.get(email);
    return { email, name: user?.name ?? null, hasAccount: Boolean(user), verified: user?.emailVerified === true, createdAt: user?.createdAt ?? null };
  });

  /* Birthday eligibility is decided here in store time, so the counter screen
     never has to trust the tablet's clock. */
  const now = new Date();
  const offerKeys = new Set(offers.map((offer) => `${offer.userId}:${offer.offerType}`));
  const welcomeOffers = new Map(offers
    .filter((offer) => offer.offerType === "signup_half_off_drink")
    .map((offer) => [offer.userId, offer]));
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
        welcomeOffer: welcomeOffers.get(member.userId) ?? null,
      };
    }),
    transactions,
    offers,
    admins,
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
