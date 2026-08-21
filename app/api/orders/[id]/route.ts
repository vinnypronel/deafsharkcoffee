import { eq, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles, loyaltyTransactions, orders } from "../../../../db/schema";

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

    if (payload.status === "complete" && updated.customerUserId) {
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
