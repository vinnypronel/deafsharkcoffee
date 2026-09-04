import { and, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { orders } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";
import { serveOwnedCustomerOrder } from "../../../lib/customer-order-access";

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
