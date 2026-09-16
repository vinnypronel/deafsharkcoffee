import { and, eq, ne } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles, orders } from "../../../../db/schema";
import { loadPromotions } from "../../../../lib/promotion-store";
import { promotionAwards } from "../../../../lib/promotions";
import { REFERRAL_POINTS, referralReference } from "../../../../lib/referral";
import { storeClock } from "../../../../lib/store-clock";
import { loyaltyChangeStatements } from "../../../../lib/loyalty-ledger";
import { pointsForSubtotal } from "../../../../lib/loyalty";
import { requireStaff } from "../../../../lib/staff-auth";
import { notifyOrderReady } from "../../../../lib/sms";

const validStatuses = new Set(["new", "preparing", "ready", "complete", "cancelled"]);
const validStationStatuses = new Set(["new", "preparing", "ready"]);

type Station = "coffee" | "kitchen";
type StationStatus = "new" | "preparing" | "ready" | "not_needed";

type StoredOrderItem = { prepStation?: "COFFEE" | "KITCHEN" | "RETAIL" };

function stationIsNeeded(items: StoredOrderItem[], station: Station) {
  return station === "coffee"
    ? items.some((item) => item.prepStation === "COFFEE" || item.prepStation === "RETAIL")
    : items.some((item) => item.prepStation === "KITCHEN");
}

function combinedStatus(coffee: StationStatus, kitchen: StationStatus) {
  const needed = [coffee, kitchen].filter((status) => status !== "not_needed");
  if (needed.length > 0 && needed.every((status) => status === "ready")) return "ready";
  if (needed.some((status) => status === "preparing" || status === "ready")) return "preparing";
  return "new";
}

type BonusStatement = ReturnType<typeof env.DB.prepare>;

/* Promotion bonuses and the referral reward for an order that is being
   completed. Each is written under its own unique reference and only when the
   order is complete, so they commit with the completion, and a retry or a
   second tablet can never pay any of them twice. */
async function bonusStatements(order: typeof orders.$inferSelect, basePoints: number): Promise<BonusStatement[]> {
  const userId = order.customerUserId;
  if (!userId) return [];
  const [promotions, [profile]] = await Promise.all([
    loadPromotions(),
    getDb().select({ referredByUserId: customerProfiles.referredByUserId }).from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1),
  ]);

  const visitsByPromotion = new Map<number, number>();
  const challenges = promotions.filter((promotion) => promotion.active && promotion.kind === "visit_challenge");
  if (challenges.length > 0) {
    const completed = await getDb().select({ createdAt: orders.createdAt }).from(orders)
      .where(and(eq(orders.customerUserId, userId), eq(orders.status, "complete"), ne(orders.id, order.id)))
      .limit(500);
    for (const challenge of challenges) {
      const inRange = (at: Date) => {
        const date = storeClock(at).date;
        return (!challenge.startDate || date >= challenge.startDate) && (!challenge.endDate || date <= challenge.endDate);
      };
      /* This order counts too: it is the one being completed. */
      const visits = completed.filter((row) => inRange(new Date(row.createdAt))).length + (inRange(new Date(order.createdAt)) ? 1 : 0);
      visitsByPromotion.set(challenge.id, visits);
    }
  }

  const items = (JSON.parse(order.itemsJson) as Array<{ id?: string; quantity?: number }>)
    .map((item) => ({ id: String(item.id ?? ""), quantity: Number(item.quantity ?? 0) }));
  const awards = promotionAwards({ promotions, orderId: order.id, userId, placedAt: new Date(order.createdAt), basePoints, items, visitsByPromotion });

  const changes = awards.filter((award) => award.points > 0).map((award) => ({ userId, points: award.points, reference: award.reference, reason: award.reason }));
  if (profile?.referredByUserId && profile.referredByUserId !== userId) {
    changes.push({ userId: profile.referredByUserId, points: REFERRAL_POINTS, reference: referralReference(userId), reason: "referral_first_order" });
  }

  return changes.flatMap((change) => loyaltyChangeStatements({
    ...change, lifetimeCredit: true, onlyIfOrderComplete: order.id,
  }).map((statement) => env.DB.prepare(statement.sql).bind(...statement.values)));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const staff = await requireStaff(request);
    if (staff.response) return staff.response;
    await ensureSchema();
    const { id } = await context.params;
    const orderId = Number(id);
    const payload = (await request.json()) as {
      status?: string;
      station?: Station;
      stationStatus?: string;
    };

    if (!Number.isInteger(orderId)) {
      return Response.json({ error: "Invalid order update." }, { status: 400 });
    }

    const [existing] = await getDb().select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing) return Response.json({ error: "Order not found." }, { status: 404 });
    if ((existing.status === "complete" || existing.status === "cancelled") && payload.status !== existing.status) {
      return Response.json({ error: "This order is already closed." }, { status: 409 });
    }

    let update: Partial<typeof orders.$inferInsert>;
    if (payload.station && payload.stationStatus) {
      if (!validStationStatuses.has(payload.stationStatus) || !["coffee", "kitchen"].includes(payload.station)) {
        return Response.json({ error: "Invalid station update." }, { status: 400 });
      }
      if (existing.status === "complete" || existing.status === "cancelled") {
        return Response.json({ error: "This order is already closed." }, { status: 409 });
      }
      const items = JSON.parse(existing.itemsJson) as StoredOrderItem[];
      if (!stationIsNeeded(items, payload.station)) {
        return Response.json({ error: "This order has no items for that station." }, { status: 400 });
      }
      const fallbackStatus = existing.status === "ready" ? "ready" : existing.status === "preparing" ? "preparing" : "new";
      const existingCoffeeStatus = stationIsNeeded(items, "coffee")
        ? (existing.coffeeStatus === "not_needed" ? fallbackStatus : existing.coffeeStatus)
        : "not_needed";
      const existingKitchenStatus = stationIsNeeded(items, "kitchen")
        ? (existing.kitchenStatus === "not_needed" ? fallbackStatus : existing.kitchenStatus)
        : "not_needed";
      const coffeeStatus = (payload.station === "coffee" ? payload.stationStatus : existingCoffeeStatus) as StationStatus;
      const kitchenStatus = (payload.station === "kitchen" ? payload.stationStatus : existingKitchenStatus) as StationStatus;
      update = {
        status: combinedStatus(coffeeStatus, kitchenStatus),
        coffeeStatus,
        kitchenStatus,
      };
    } else if (payload.status && validStatuses.has(payload.status)) {
      const items = JSON.parse(existing.itemsJson) as StoredOrderItem[];
      const stationValue = payload.status === "new" || payload.status === "preparing" || payload.status === "ready" ? payload.status : null;
      update = {
        status: payload.status,
        ...(stationValue && stationIsNeeded(items, "coffee") ? { coffeeStatus: stationValue } : {}),
        ...(stationValue && stationIsNeeded(items, "kitchen") ? { kitchenStatus: stationValue } : {}),
      };
    } else {
      return Response.json({ error: "Invalid order update." }, { status: 400 });
    }

    const updateQuery = getDb()
      .update(orders)
      .set(update)
      .where(and(
        eq(orders.id, orderId), eq(orders.status, existing.status),
        eq(orders.coffeeStatus, existing.coffeeStatus), eq(orders.kitchenStatus, existing.kitchenStatus),
      ))
      .returning({ id: orders.id }).toSQL();
    const statements = [env.DB.prepare(updateQuery.sql).bind(...updateQuery.params)];
    /* One point per dollar actually spent, so a discounted order earns on what
       the customer paid rather than on the pre-discount subtotal. */
    const earnedPoints = pointsForSubtotal(existing.subtotalCents - (existing.discountCents ?? 0));
    if (env.LOYALTY_ENABLED === "true" && update.status === "complete" && existing.customerUserId && earnedPoints > 0) {
      statements.push(...loyaltyChangeStatements({
        userId: existing.customerUserId, orderId: existing.id,
        reference: `order:${existing.id}`, points: earnedPoints,
        reason: "completed_order", lifetimeCredit: true, requirePreviousChange: true,
      }).map((statement) => env.DB.prepare(statement.sql).bind(...statement.values)));
    }
    if (env.LOYALTY_ENABLED === "true" && update.status === "complete" && existing.customerUserId) {
      statements.push(...(await bonusStatements(existing, earnedPoints)));
    }
    // Completing the ticket, writing its credit, and updating the balance either
    // all commit or all roll back. A lost response is safe to retry.
    const [result] = await env.DB.batch(statements);

    if (!result.results.length) {
      return Response.json({ error: "Another station updated this order. Refresh and try again." }, { status: 409 });
    }
    const updated = { ...existing, ...update };

    if (existing.status !== "ready" && updated.status === "ready" && updated.phone && existing.smsOptIn) {
      await notifyOrderReady(updated.phone, updated.orderNumber);
    }

    return Response.json({ order: updated });
  } catch (error) {
    console.error(JSON.stringify({ event: "order_update_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return Response.json({ error: "Unable to finish updating this order. Refresh and retry the same action." }, { status: 500 });
  }
}
