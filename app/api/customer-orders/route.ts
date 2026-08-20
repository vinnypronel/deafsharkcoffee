import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { orders } from "../../../db/schema";

const digits = (value: string) => value.replace(/\D/g, "");

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { orderNumber?: string; phone?: string };
    const orderNumber = payload.orderNumber?.trim().toUpperCase() ?? "";
    const phone = payload.phone?.trim() ?? "";

    if (!orderNumber) {
      return Response.json({ error: "Enter your order number." }, { status: 400 });
    }

    const [order] = await getDb().select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
    if (!order) {
      return Response.json({ error: "We could not find an order with those details." }, { status: 404 });
    }

    if (phone && digits(phone).length >= 7 && digits(order.phone) && digits(order.phone) !== digits(phone)) {
      return Response.json({ error: "We could not find an order with those details." }, { status: 404 });
    }

    return Response.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        items: JSON.parse(order.itemsJson),
        totalCents: order.totalCents,
        status: order.status,
        paymentMethod: order.paymentMethod,
        pickupEta: order.pickupEta,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to find your order";
    return Response.json({ error: message }, { status: 500 });
  }
}
