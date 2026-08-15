import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { orders } from "../../../../db/schema";

const validStatuses = new Set(["new", "preparing", "ready", "complete", "cancelled"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureSchema();
    const { id } = await context.params;
    const orderId = Number(id);
    const payload = (await request.json()) as { status?: string };

    if (!Number.isInteger(orderId) || !payload.status || !validStatuses.has(payload.status)) {
      return Response.json({ error: "Invalid order update." }, { status: 400 });
    }

    const [updated] = await getDb()
      .update(orders)
      .set({ status: payload.status })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updated) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    return Response.json({ order: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update order";
    return Response.json({ error: message }, { status: 500 });
  }
}
