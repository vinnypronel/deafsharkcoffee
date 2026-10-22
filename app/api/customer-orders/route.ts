import { and, desc, eq, inArray } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { loyaltyTransactions, orders } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";
import { serveOwnedCustomerOrder } from "../../../lib/customer-order-access";

export async function GET(request: Request) {
  const session = await getCustomerSession(request);
  if (!session) return Response.json({ error: "Sign in to view your orders." }, { status: 401 });
  await ensureSchema();
  const rows = await getDb().select({
    id: orders.id, orderNumber: orders.orderNumber, status: orders.status, totalCents: orders.totalCents,
    createdAt: orders.createdAt, pickupEta: orders.pickupEta, itemsJson: orders.itemsJson,
    discountCents: orders.discountCents, rewardPointsSpent: orders.rewardPointsSpent,
    subtotalCents: orders.subtotalCents, taxCents: orders.taxCents, discountKind: orders.discountKind,
  }).from(orders).where(eq(orders.customerUserId, session.user.id)).orderBy(desc(orders.createdAt)).limit(10);

  /* Points each order earned, so the account can show them inside the order
     instead of in a separate list. */
  const earned = new Map<number, number>();
  if (rows.length > 0) {
    const credits = await getDb().select({ orderId: loyaltyTransactions.orderId, pointsChange: loyaltyTransactions.pointsChange })
      .from(loyaltyTransactions)
      .where(and(eq(loyaltyTransactions.userId, session.user.id), inArray(loyaltyTransactions.orderId, rows.map((row) => row.id))));
    for (const credit of credits) {
      if (credit.orderId !== null) earned.set(credit.orderId, (earned.get(credit.orderId) ?? 0) + credit.pointsChange);
    }
  }

  const recent = rows.map(({ id, itemsJson, ...order }) => {
    let items: Array<{ id?: string; name: string; quantity: number; unitPrice?: number; options: string[]; selection?: unknown }> = [];
    try {
      const parsed: unknown = JSON.parse(itemsJson);
      if (Array.isArray(parsed)) {
        items = parsed.map((entry) => {
          const item = entry as { id?: unknown; name?: unknown; quantity?: unknown; unitPrice?: unknown; options?: unknown; selection?: unknown };
          return {
            id: typeof item.id === "string" ? item.id : undefined,
            name: String(item.name ?? "Item"),
            quantity: Number(item.quantity ?? 1),
            unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : undefined,
            options: Array.isArray(item.options) ? item.options.map(String) : [],
            selection: item.selection && typeof item.selection === "object" ? item.selection : undefined,
          };
        });
      }
    } catch { /* A malformed row still lists, just without its items. */ }
    return { ...order, items, pointsEarned: earned.get(id) ?? 0 };
  });
  return Response.json({ orders: recent }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession(request);
    if (!session) {
      return Response.json(
        { error: "Sign in to view your order." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    await ensureSchema();
    return serveOwnedCustomerOrder(
      request,
      session.user.id,
      async (orderNumber, customerUserId) => {
        const [order] = await getDb()
          .select()
          .from(orders)
          .where(and(
            eq(orders.orderNumber, orderNumber),
            eq(orders.customerUserId, customerUserId),
          ))
          .limit(1);
        return order ?? null;
      },
    );
  } catch {
    return Response.json(
      { error: "Unable to load your order right now." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
