import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureSchema, getDb } from "../../../../db";
import { orders } from "../../../../db/schema";
import { loyaltyChangeStatements } from "../../../../lib/loyalty-ledger";
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
    const earnedPoints = Math.floor(existing.subtotalCents / 100);
    if (env.LOYALTY_ENABLED === "true" && update.status === "complete" && existing.customerUserId && earnedPoints > 0) {
      statements.push(...loyaltyChangeStatements({
        userId: existing.customerUserId, orderId: existing.id,
        reference: `order:${existing.id}`, points: earnedPoints,
        reason: "completed_order", lifetimeCredit: true, requirePreviousChange: true,
      }).map((statement) => env.DB.prepare(statement.sql).bind(...statement.values)));
    }
    // Completing the ticket, writing its credit, and updating the balance either
    // all commit or all roll back. A lost response is safe to retry.
    const [result] = await env.DB.batch(statements);

    if (!result.results.length) {
      return Response.json({ error: "Another station updated this order. Refresh and try again." }, { status: 409 });
    }
    const updated = { ...existing, ...update };

    if (existing.status !== "ready" && updated.status === "ready" && updated.phone) {
      await notifyOrderReady(updated.phone, updated.orderNumber);
    }

    return Response.json({ order: updated });
  } catch (error) {
    console.error(JSON.stringify({ event: "order_update_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return Response.json({ error: "Unable to finish updating this order. Refresh and retry the same action." }, { status: 500 });
  }
}
