import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { customerProfiles, menuAvailability, menuContent, orders, storeSettings } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";
import { requireStaff } from "../../../lib/staff-auth";
import { verifyPublicForm } from "../../../lib/public-form";
import {
  OrderRequestError,
  logOrderEvent,
  normalizeCartItems,
  normalizeCustomerName,
  normalizeIdempotencyKey,
  normalizePhone,
  orderNumber,
  orderReference,
  orderTotals,
  priceCart,
  readOrderJson,
  resolveFulfillment,
  stationFlags,
  type OrderSettings,
} from "../../../lib/order-intake";
import type { MenuContentOverride } from "../../menu-data";
import { CUSTOM_CHECKOUT_ENABLED } from "../../ordering";
import { requirePickupAccount } from "../../../lib/checkout-policy";
import { readStoreHours } from "../../../lib/store-hours-store";
import { sendStaffNotification } from "../../../lib/transactional-email";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff(request);
    if (staff.response) return staff.response;
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

type StoredOrder = typeof orders.$inferSelect;

function orderResponse(order: StoredOrder, status: number, reference: string) {
  return Response.json(
    {
      reference,
      order: {
        ...order,
        items: JSON.parse(order.itemsJson),
      },
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function isUniqueConstraintError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed/i.test(message);
}

export async function POST(request: Request) {
  const reference = orderReference();

  if (!CUSTOM_CHECKOUT_ENABLED) {
    return Response.json(
      { error: "Online ordering is not open yet. Please call the shop or order at the counter.", reference },
      { status: 503 },
    );
  }

  try {
    const payload = await readOrderJson(request);

    /* Turnstile runs before any database work so unverified traffic never
       reaches D1. The token is never logged. */
    if (!(await verifyPublicForm(request, payload.turnstileToken, "order"))) {
      logOrderEvent("rejected", { reference, code: "turnstile_failed", status: 400 });
      return Response.json(
        { error: "Please complete the security check and try again.", reference },
        { status: 400 },
      );
    }

    const idempotencyKey = normalizeIdempotencyKey(payload.idempotencyKey);
    const customerName = normalizeCustomerName(payload.customerName);
    const phone = normalizePhone(payload.phone);
    const cartItems = normalizeCartItems(payload.items);

    await ensureSchema();

    const session = await getCustomerSession(request);
    const customerUserId = requirePickupAccount(payload.paymentMethod, session?.user);

    /* A retried or double-clicked submit resolves to the order already stored
       for this checkout session instead of creating a second ticket. */
    const [alreadyPlaced] = await getDb()
      .select()
      .from(orders)
      .where(eq(orders.idempotencyKey, idempotencyKey))
      .limit(1);
    if (alreadyPlaced) {
      if (alreadyPlaced.customerUserId !== customerUserId) throw new OrderRequestError("Please start a new checkout.", 409, "checkout_conflict");
      logOrderEvent("replayed", { reference, orderId: alreadyPlaced.id, status: 200 });
      return orderResponse(alreadyPlaced, 200, reference);
    }

    const [settingsRow, availabilityRows, menuRows, storeHours] = await Promise.all([
      getDb().select().from(storeSettings).limit(1),
      getDb().select().from(menuAvailability),
      getDb().select().from(menuContent),
      readStoreHours(),
    ]);
    const storedSettings = settingsRow[0] as OrderSettings | undefined;
    if (!storedSettings) throw new Error("Store settings row is missing.");
    const settings: OrderSettings = { ...storedSettings, weeklyHours: storeHours.weeklyHours };

    const availability = new Map(availabilityRows.map((item) => [item.productId, item.available]));
    const overrides = new Map<string, MenuContentOverride>(
      menuRows.map((item) => [item.productId, item as MenuContentOverride]),
    );

    const orderItems = priceCart(cartItems, { availability, overrides });
    const { subtotalCents, taxCents, totalCents } = orderTotals(orderItems);
    const { fulfillmentType, scheduledFor, pickupEta } = resolveFulfillment(payload, settings);
    const { hasCoffeeItems, hasKitchenItems } = stationFlags(orderItems);

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

    /* Every stored field below is server-derived. Nothing the client sends about
       prices, tax, payment state, source, or station routing is trusted. */
    let createdOrder: StoredOrder;
    try {
      [createdOrder] = await getDb().insert(orders).values({
        orderNumber: orderNumber(),
        customerName,
        phone,
        itemsJson: JSON.stringify(orderItems),
        subtotalCents,
        taxCents,
        totalCents,
        status: "new",
        coffeeStatus: hasCoffeeItems ? "new" : "not_needed",
        kitchenStatus: hasKitchenItems ? "new" : "not_needed",
        source: "website",
        paymentMethod: "pickup",
        pickupEta,
        fulfillmentType,
        scheduledFor,
        customerUserId,
        idempotencyKey,
        createdAt: new Date(),
      }).returning();
    } catch (error) {
      /* Two submits raced past the lookup above. The winner's order is the order. */
      if (!isUniqueConstraintError(error)) throw error;
      const [raced] = await getDb()
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, idempotencyKey))
        .limit(1);
      if (!raced) throw error;
      if (raced.customerUserId !== customerUserId) throw new OrderRequestError("Please start a new checkout.", 409, "checkout_conflict");
      logOrderEvent("replayed", { reference, orderId: raced.id, status: 200 });
      return orderResponse(raced, 200, reference);
    }

    logOrderEvent("created", {
      reference,
      orderId: createdOrder.id,
      lineItems: orderItems.length,
      units: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      totalCents,
      fulfillmentType,
      paymentMethod: "pickup",
      coffee: hasCoffeeItems,
      kitchen: hasKitchenItems,
      authenticated: Boolean(customerUserId),
    });

    /* Tells the shop an order landed without anyone watching the board. Never
       allowed to affect the order: the helper swallows and logs its own
       failures, so a mail outage cannot fail a paid-at-pickup ticket. */
    await sendStaffNotification(
      "admin",
      `New online order ${createdOrder.orderNumber} · $${(totalCents / 100).toFixed(2)}`,
      [
        `Order ${createdOrder.orderNumber}`,
        `${customerName} · ${phone}`,
        fulfillmentType === "scheduled" ? `Scheduled pickup: ${pickupEta}` : `Pickup in about ${pickupEta}`,
        ...orderItems.map((item) => `${item.quantity} x ${item.name}${item.options.length ? ` (${item.options.join(", ")})` : ""}`),
        `Total $${(totalCents / 100).toFixed(2)} · pay at pickup`,
        "Open the dashboard to accept it: https://deafsharkcoffee.com/dashboard",
      ],
    );

    return orderResponse(createdOrder, 201, reference);
  } catch (error) {
    if (error instanceof OrderRequestError) {
      logOrderEvent("rejected", { reference, code: error.code, status: error.status });
      return Response.json({ error: error.message, reference }, { status: error.status });
    }
    /* Internal failures never leak their message to the customer. The reference
       ties the generic response to the detailed server log. */
    logOrderEvent("failed", {
      reference,
      status: 500,
      cause: error instanceof Error ? error.name : "unknown",
    });
    return Response.json(
      { error: "We could not place that order. Please try again or call the shop.", reference },
      { status: 500 },
    );
  }
}
