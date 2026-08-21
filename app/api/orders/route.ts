import { env } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { customerProfiles, orders } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";

type CartPayload = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: string[];
};

function orderNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DS${Date.now().toString().slice(-4)}${rand}`;
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
    const session = await getCustomerSession(request);

    const orderNum = orderNumber();
    const createdTimestamp = Math.floor(Date.now() / 1000);
    const paymentMethod = payload.paymentMethod === "card" ? "card-demo" : "pickup";
    const pickupEta = payload.pickupEta ?? "15 min";
    const customerUserId = session?.user.id ?? null;

    if (session) {
      await getDb().insert(customerProfiles).values({
        userId: session.user.id,
        email: session.user.email,
        displayName: session.user.name || customerName,
        phone,
      }).onConflictDoUpdate({
        target: customerProfiles.userId,
        set: { email: session.user.email, phone, updatedAt: new Date() },
      });
    }

    const d1 = env.DB;
    let insertResult: any;

    try {
      insertResult = await d1
        .prepare(
          `INSERT INTO orders (
            order_number,
            customer_name,
            phone,
            items_json,
            subtotal_cents,
            tax_cents,
            total_cents,
            status,
            source,
            payment_method,
            pickup_eta,
            customer_user_id,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          orderNum,
          customerName,
          phone,
          JSON.stringify(items),
          subtotalCents,
          taxCents,
          totalCents,
          "new",
          "website",
          paymentMethod,
          pickupEta,
          customerUserId,
          createdTimestamp,
        )
        .run();
    } catch (insertError: any) {
      if (insertError?.message?.includes("customer_user_id")) {
        try {
          await d1.prepare("ALTER TABLE orders ADD COLUMN customer_user_id text").run();
        } catch {
          // ignore if already added
        }

        try {
          insertResult = await d1
            .prepare(
              `INSERT INTO orders (
                order_number,
                customer_name,
                phone,
                items_json,
                subtotal_cents,
                tax_cents,
                total_cents,
                status,
                source,
                payment_method,
                pickup_eta,
                customer_user_id,
                created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              orderNum,
              customerName,
              phone,
              JSON.stringify(items),
              subtotalCents,
              taxCents,
              totalCents,
              "new",
              "website",
              paymentMethod,
              pickupEta,
              customerUserId,
              createdTimestamp,
            )
            .run();
        } catch {
          // fallback without customer_user_id if column still cannot be modified
          insertResult = await d1
            .prepare(
              `INSERT INTO orders (
                order_number,
                customer_name,
                phone,
                items_json,
                subtotal_cents,
                tax_cents,
                total_cents,
                status,
                source,
                payment_method,
                pickup_eta,
                created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              orderNum,
              customerName,
              phone,
              JSON.stringify(items),
              subtotalCents,
              taxCents,
              totalCents,
              "new",
              "website",
              paymentMethod,
              pickupEta,
              createdTimestamp,
            )
            .run();
        }
      } else {
        throw insertError;
      }
    }

    const orderId = insertResult?.meta?.last_row_id ?? Date.now();

    return Response.json(
      {
        order: {
          id: orderId,
          orderNumber: orderNum,
          customerName,
          phone,
          itemsJson: JSON.stringify(items),
          subtotalCents,
          taxCents,
          totalCents,
          status: "new",
          source: "website",
          paymentMethod,
          pickupEta,
          customerUserId,
          createdAt: new Date(createdTimestamp * 1000),
          items,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place order";
    return Response.json({ error: message }, { status: 500 });
  }
}
