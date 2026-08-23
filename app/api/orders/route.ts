import { desc } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { customerProfiles, menuAvailability, orders, storeSettings } from "../../../db/schema";
import { getCustomerSession } from "../../../lib/auth";
import { requireStaff } from "../../../lib/staff-auth";
import { effectiveOrderingHours } from "../../../lib/store-hours";
import { menuProducts, prepStationFor, priceProductSelection, type ProductSelection } from "../../menu-data";

type CartPayload = {
  id: string;
  quantity: number;
  selection?: ProductSelection;
};

function orderNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DS${Date.now().toString().slice(-4)}${rand}`;
}

const STORE_TIME_ZONE = "America/New_York";

function clockMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function localClockMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hours = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minutes = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hours * 60 + minutes;
}

function localDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function scheduledLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

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

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as {
      customerName?: string;
      phone?: string;
      paymentMethod?: string;
      pickupEta?: string;
      fulfillmentType?: "asap" | "scheduled";
      scheduledFor?: string;
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

    const [settingsRow, availabilityRows] = await Promise.all([
      getDb().select().from(storeSettings).limit(1),
      getDb().select().from(menuAvailability),
    ]);
    const settings = settingsRow[0];
    if (!settings) throw new Error("Store settings are unavailable.");
    if (settings.paused) {
      return Response.json({ error: "Online ordering is temporarily paused. Please order at the counter." }, { status: 409 });
    }

    const availability = new Map(availabilityRows.map((item) => [item.productId, item.available]));
    const orderItems = items.map((item) => {
      const product = menuProducts.find((candidate) => candidate.id === item.id);
      if (!product) throw new Error(`Unknown menu item: ${item.id}`);
      if (availability.get(product.id) === false) throw new Error(`${product.name} is currently sold out.`);
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
        throw new Error(`Choose a valid quantity for ${product.name}.`);
      }
      const priced = priceProductSelection(product, item.selection);
      return {
        id: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPrice: priced.unitPrice,
        options: priced.options,
        selection: priced.selection,
        prepStation: prepStationFor(product),
      };
    });

    const subtotalCents = Math.round(
      orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100,
    );
    const taxCents = Math.round(subtotalCents * 0.06625);
    const totalCents = subtotalCents + taxCents;
    const session = await getCustomerSession(request);

    const orderNum = orderNumber();
    const createdTimestamp = Math.floor(Date.now() / 1000);
    const fulfillmentType = payload.fulfillmentType === "scheduled" ? "scheduled" : "asap";
    const paymentMethod = payload.paymentMethod === "card" ? "card-demo" : "pickup";
    if (paymentMethod === "pickup" && !session) {
      return Response.json({ error: "Sign in to your Deaf Shark account to pay at pickup." }, { status: 401 });
    }
    const now = new Date();
    const effectiveHours = effectiveOrderingHours(settings, now);
    const closingCutoff = clockMinutes(effectiveHours.closeTime) - settings.cutoffMinutes;
    let scheduledFor: Date | null = null;
    let pickupEta = `${settings.prepTimeMinutes} min`;

    if (fulfillmentType === "scheduled") {
      if (!settings.schedulingEnabled) {
        return Response.json({ error: "Scheduled pickup is not available right now." }, { status: 409 });
      }
      if (paymentMethod !== "card-demo") {
        return Response.json({ error: "Scheduled pickup requires advance online payment." }, { status: 400 });
      }
      scheduledFor = payload.scheduledFor ? new Date(payload.scheduledFor) : null;
      if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) {
        return Response.json({ error: "Choose a valid scheduled pickup time." }, { status: 400 });
      }
      const minutesAhead = (scheduledFor.getTime() - now.getTime()) / 60_000;
      const scheduledMinutes = localClockMinutes(scheduledFor);
      if (
        minutesAhead < settings.prepTimeMinutes ||
        minutesAhead > settings.schedulingHorizonMinutes ||
        localDateKey(scheduledFor) !== localDateKey(now) ||
        scheduledMinutes < clockMinutes(effectiveHours.openTime) ||
        scheduledMinutes > closingCutoff ||
        scheduledMinutes % settings.slotMinutes !== 0
      ) {
        return Response.json({ error: "That pickup time is outside the available scheduling window." }, { status: 400 });
      }
      pickupEta = scheduledLabel(scheduledFor);
    } else if (localClockMinutes(now) < clockMinutes(effectiveHours.openTime) || localClockMinutes(now) > closingCutoff) {
      return Response.json({ error: "Online ordering is closed for today. Please schedule during store hours." }, { status: 409 });
    }
    const customerUserId = session?.user.id ?? null;
    const hasCoffeeItems = orderItems.some((item) => item.prepStation === "COFFEE" || item.prepStation === "RETAIL");
    const hasKitchenItems = orderItems.some((item) => item.prepStation === "KITCHEN");

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

    const [createdOrder] = await getDb().insert(orders).values({
      orderNumber: orderNum,
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
      paymentMethod,
      pickupEta,
      fulfillmentType,
      scheduledFor,
      customerUserId,
      createdAt: new Date(createdTimestamp * 1000),
    }).returning();

    const orderId = createdOrder.id;

    return Response.json(
      {
        order: {
          id: orderId,
          orderNumber: orderNum,
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
          paymentMethod,
          pickupEta,
          fulfillmentType,
          scheduledFor,
          customerUserId,
          createdAt: new Date(createdTimestamp * 1000),
          items: orderItems,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place order";
    return Response.json({ error: message }, { status: 500 });
  }
}
