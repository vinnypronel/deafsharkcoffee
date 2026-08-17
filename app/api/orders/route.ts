import { desc, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { customerProfiles, orders } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

type CartPayload = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: string[];
};

function orderNumber() {
  return `DS${Date.now().toString().slice(-6)}`;
}

export async function GET() {
  try {
    await ensureSchema();
    const rows = await getDb()
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(80);

    return Response.json({
      orders: rows.map((order) => ({
        ...order,
        items: JSON.parse(order.itemsJson),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load orders";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as {
      customerName?: string;
      phone?: string;
      paymentMethod?: string;
      pickupEta?: string;
      items?: CartPayload[];
    };

    const customerName = payload.customerName?.trim() ?? "";
    const phone = payload.phone?.trim() ?? "";
    const items = payload.items ?? [];

    if (!customerName || !phone || items.length === 0) {
      return Response.json(
        { error: "Name, phone, and at least one item are required." },
        { status: 400 },
      );
    }

    const subtotalCents = Math.round(
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100,
    );
    const taxCents = Math.round(subtotalCents * 0.06625);
    const totalCents = subtotalCents + taxCents;
    const user = await getChatGPTUser();

    const [created] = await getDb()
      .insert(orders)
      .values({
        orderNumber: orderNumber(),
        customerName,
        phone,
        itemsJson: JSON.stringify(items),
        subtotalCents,
        taxCents,
        totalCents,
        status: "new",
        source: "website",
        paymentMethod: payload.paymentMethod === "card" ? "card-demo" : "pickup",
        pickupEta: payload.pickupEta ?? "15 min",
        customerUserId: user?.userId ?? null,
      })
      .returning();

    if (user) {
      const earnedPoints = Math.max(1, Math.floor(totalCents / 100));
      await getDb().insert(customerProfiles).values({
        userId: user.userId,
        email: user.email,
        displayName: user.fullName ?? user.email.split("@")[0],
        points: earnedPoints,
      }).onConflictDoUpdate({
        target: customerProfiles.userId,
        set: {
          email: user.email,
          points: sql`${customerProfiles.points} + ${earnedPoints}`,
          updatedAt: new Date(),
        },
      });
    }

    return Response.json(
      { order: { ...created, items: JSON.parse(created.itemsJson) } },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place order";
    return Response.json({ error: message }, { status: 500 });
  }
}
