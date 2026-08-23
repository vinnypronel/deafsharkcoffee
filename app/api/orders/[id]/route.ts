import { eq, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles, loyaltyTransactions, orders } from "../../../../db/schema";
import { requireStaff } from "../../../../lib/staff-auth";

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

    const [updated] = await getDb()
      .update(orders)
      .set(update)
      .where(eq(orders.id, orderId))
      .returning();

    if (!updated) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    if (updated.status === "complete" && updated.customerUserId) {
      const earnedPoints = Math.floor(updated.subtotalCents / 100);

      if (earnedPoints > 0) {
        const [profile] = await getDb()
          .select()
          .from(customerProfiles)
          .where(eq(customerProfiles.userId, updated.customerUserId))
          .limit(1);

        if (profile) {
          const [ledgerEntry] = await getDb().insert(loyaltyTransactions).values({
            userId: updated.customerUserId,
            orderId: updated.id,
            pointsChange: earnedPoints,
            balanceAfter: profile.points + earnedPoints,
            reason: "completed_order",
          }).onConflictDoNothing({ target: loyaltyTransactions.orderId }).returning();

          if (ledgerEntry) {
            await getDb().update(customerProfiles).set({
              points: sql`${customerProfiles.points} + ${earnedPoints}`,
              lifetimePoints: sql`${customerProfiles.lifetimePoints} + ${earnedPoints}`,
              updatedAt: new Date(),
            }).where(eq(customerProfiles.userId, updated.customerUserId));
          }
        }
      }
    }

    return Response.json({ order: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update order";
    return Response.json({ error: message }, { status: 500 });
  }
}
