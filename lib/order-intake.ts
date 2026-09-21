import {
  applyMenuContentOverride,
  menuProducts,
  prepStationFor,
  priceProductSelection,
  type MenuContentOverride,
  type PrepStation,
  type ProductSelection,
} from "../app/menu-data.ts";
import { effectiveOrderingHours, type WeeklyHours } from "./store-hours.ts";

/* Pure validation and pricing for public pickup orders.

   Everything here is deliberately free of Cloudflare bindings so the rules that
   decide what a customer is allowed to submit can be tested with `node --test`.
   The route keeps ownership of Turnstile, sessions, and D1. */

export const ORDER_MAX_BODY_BYTES = 64 * 1024;
export const ORDER_MAX_LINE_ITEMS = 40;
/* Up to 99 of any one menu item per online order, counted across every cart
   line for that item, so splitting it into differently customized lines does
   not get around the limit. The total is only a sanity bound on top of that. */
export const ORDER_MAX_TOTAL_QUANTITY = 999;
export const ORDER_MAX_ITEM_QUANTITY = 99;
/** Production admission policy. These limits are intentionally server-owned;
 * launch validation requires the release environment to acknowledge the same
 * values before website ordering can be opened. */
export const ORDER_MAX_ACTIVE_PER_ACCOUNT = 2;
export const ORDER_MAX_PER_ACCOUNT_PER_HOUR = 5;
export const ORDER_MAX_PER_SCHEDULED_SLOT = 10;
export const ORDER_ROLLING_WINDOW_SECONDS = 60 * 60;
export const NJ_SALES_TAX_RATE = 0.06625;
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export class OrderRequestError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "invalid_order") {
    super(message);
    this.name = "OrderRequestError";
    this.status = status;
    this.code = code;
  }
}

export type CartPayload = {
  id: string;
  quantity: number;
  selection?: ProductSelection;
};

export type PricedOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options: string[];
  selection: ProductSelection;
  prepStation: PrepStation;
};

export type OrderSettings = {
  prepTimeMinutes: number;
  paused: boolean;
  openTime: string;
  closeTime: string;
  cutoffMinutes: number;
  schedulingEnabled: boolean;
  schedulingHorizonMinutes: number;
  slotMinutes: number;
  /** Admin-edited hours per weekday. When absent, the legacy fixed schedule applies. */
  weeklyHours?: WeeklyHours | null;
};

const STORE_TIME_ZONE = "America/New_York";

/** Short, non-identifying handle used to correlate a request with its logs. */
export function orderReference() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `ref_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function orderNumber(
  random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
) {
  const bytes = random(new Uint8Array(8));
  return `DS${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/**
 * This statement is an in-transaction assertion. When an account or scheduled
 * slot is already at capacity it deliberately attempts to duplicate the
 * customer's primary-key row, causing D1 to roll back the entire batch. When
 * capacity remains the SELECT is empty and the following order insert runs.
 */
export function orderAdmissionAssertion(input: {
  userId: string;
  rollingWindowStartEpoch: number;
  scheduledForEpoch: number | null;
}) {
  return {
    sql: `INSERT INTO customer_profiles (user_id, email, display_name)
      SELECT user_id, email, display_name FROM customer_profiles
      WHERE user_id = ? AND (
        (SELECT count(*) FROM orders
          WHERE customer_user_id = ? AND status IN ('new', 'preparing', 'ready')) >= ?
        OR (SELECT count(*) FROM orders
          WHERE customer_user_id = ? AND created_at >= ?) >= ?
        OR (? IS NOT NULL AND (SELECT count(*) FROM orders
          WHERE fulfillment_type = 'scheduled' AND scheduled_for = ?
            AND status IN ('new', 'preparing', 'ready')) >= ?)
      )`,
    values: [
      input.userId,
      input.userId,
      ORDER_MAX_ACTIVE_PER_ACCOUNT,
      input.userId,
      input.rollingWindowStartEpoch,
      ORDER_MAX_PER_ACCOUNT_PER_HOUR,
      input.scheduledForEpoch,
      input.scheduledForEpoch,
      ORDER_MAX_PER_SCHEDULED_SLOT,
    ] as unknown[],
  };
}

/* Structured logs for an order carry only non-identifying operational fields.
   Names, phone numbers, item contents, and tokens must never reach the log. */
export function logOrderEvent(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined>,
) {
  const entry: Record<string, string | number | boolean | null> = { event: `order.${event}` };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) entry[key] = value;
  }
  console.log(JSON.stringify(entry));
}

export function requestExceedsBytes(request: Request, maxBytes: number) {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const length = Number(value);
  return Number.isFinite(length) && length > maxBytes;
}

/** Rejects anything that is not a JSON body before the payload is parsed. */
export async function readOrderJson(request: Request): Promise<Record<string, unknown>> {
  if (requestExceedsBytes(request, ORDER_MAX_BODY_BYTES)) {
    throw new OrderRequestError("That order is too large.", 413, "payload_too_large");
  }
  const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new OrderRequestError("Send this order as JSON.", 415, "unsupported_media_type");
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new OrderRequestError("We could not read that order. Please try again.", 400, "malformed_json");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new OrderRequestError("We could not read that order. Please try again.", 400, "malformed_json");
  }
  return parsed as Record<string, unknown>;
}

export function normalizeIdempotencyKey(value: unknown) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new OrderRequestError(
      "This checkout session expired. Please reload the page and try again.",
      400,
      "invalid_idempotency_key",
    );
  }
  return key;
}

export function normalizeCustomerName(value: unknown) {
  const name = typeof value === "string" ? value.trim().slice(0, 100) : "";
  if (name.length < 2) {
    throw new OrderRequestError("Enter the name we should put on the order.", 400, "invalid_name");
  }
  return name;
}

export function normalizePhone(value: unknown) {
  const phone = typeof value === "string" ? value.trim().slice(0, 30).replace(/[^0-9+()\- .]/g, "") : "";
  if (phone.replace(/\D/g, "").length !== 10) {
    throw new OrderRequestError("Enter a complete 10-digit mobile number.", 400, "invalid_phone");
  }
  return phone;
}

/** Shape-checks the cart before any menu lookup or pricing happens. */
export function normalizeCartItems(value: unknown): CartPayload[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new OrderRequestError("Add at least one item before checking out.", 400, "empty_cart");
  }
  if (value.length > ORDER_MAX_LINE_ITEMS) {
    throw new OrderRequestError(
      `An online order can hold up to ${ORDER_MAX_LINE_ITEMS} different items. Please call the shop for large orders.`,
      400,
      "too_many_line_items",
    );
  }

  let totalQuantity = 0;
  const quantityByItem = new Map<string, number>();
  const items = value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new OrderRequestError("One of the items in your cart is not valid.", 400, "invalid_item");
    }
    const item = entry as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!id || id.length > 80) {
      throw new OrderRequestError("One of the items in your cart is not valid.", 400, "invalid_item");
    }
    const quantity = item.quantity;
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > ORDER_MAX_ITEM_QUANTITY) {
      throw new OrderRequestError(
        `Choose a quantity between 1 and ${ORDER_MAX_ITEM_QUANTITY} for every item.`,
        400,
        "invalid_quantity",
      );
    }
    const selection = item.selection;
    if (selection !== undefined && (typeof selection !== "object" || selection === null || Array.isArray(selection))) {
      throw new OrderRequestError("One of the items in your cart is not valid.", 400, "invalid_item");
    }
    totalQuantity += quantity as number;
    quantityByItem.set(id, (quantityByItem.get(id) ?? 0) + (quantity as number));
    return { id, quantity: quantity as number, selection: selection as ProductSelection | undefined };
  });

  if ([...quantityByItem.values()].some((count) => count > ORDER_MAX_ITEM_QUANTITY)) {
    throw new OrderRequestError(
      `You can order up to ${ORDER_MAX_ITEM_QUANTITY} of each item online. Please call the shop for larger orders.`,
      400,
      "item_quantity_limit",
    );
  }

  if (totalQuantity > ORDER_MAX_TOTAL_QUANTITY) {
    throw new OrderRequestError(
      "That order contains too many items. Please call the shop for large orders.",
      400,
      "too_many_units",
    );
  }
  return items;
}

/* Prices every line from the server's own catalog. Client-supplied names, prices,
   and totals are ignored: only the product id and the option selection are read. */
export function priceCart(
  items: CartPayload[],
  context: {
    availability?: Map<string, boolean>;
    overrides?: Map<string, MenuContentOverride>;
  } = {},
): PricedOrderItem[] {
  return items.map((item) => {
    const baseProduct = menuProducts.find((candidate) => candidate.id === item.id);
    if (!baseProduct) {
      throw new OrderRequestError(
        "One of the items in your cart is no longer on the menu. Please refresh and rebuild your order.",
        409,
        "unknown_product",
      );
    }
    const product = applyMenuContentOverride(baseProduct, context.overrides?.get(baseProduct.id));
    if (context.availability?.get(product.id) === false) {
      throw new OrderRequestError(
        `${product.name} just sold out. Please remove it and place the rest of your order.`,
        409,
        "sold_out",
      );
    }

    let priced;
    try {
      priced = priceProductSelection(product, item.selection);
    } catch (error) {
      /* `priceProductSelection` throws on an unknown size, milk, syrup, modifier,
         shot count, or over-long note. Those are customer input problems, not faults. */
      const message = error instanceof Error ? error.message : `Check your choices for ${product.name}.`;
      throw new OrderRequestError(message, 400, "invalid_selection");
    }

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
}

/* Tax is charged on what the customer actually pays, so a discount comes off
   the subtotal before tax is worked out, never after. */
export function orderTotals(items: PricedOrderItem[], discountCents = 0) {
  const subtotalCents = Math.round(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100,
  );
  const discount = Math.max(0, Math.min(Math.round(discountCents), subtotalCents));
  const taxableCents = subtotalCents - discount;
  const taxCents = Math.round(taxableCents * NJ_SALES_TAX_RATE);
  return { subtotalCents, discountCents: discount, taxCents, totalCents: taxableCents + taxCents };
}

export function clockMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function localClockMinutes(date: Date) {
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

export function localDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function scheduledLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export type ResolvedFulfillment = {
  fulfillmentType: "asap" | "scheduled";
  scheduledFor: Date | null;
  pickupEta: string;
};

/* Decides whether the shop can accept this order right now, and what pickup
   estimate the customer is promised. The client never sets the estimate. */
export function resolveFulfillment(
  payload: { fulfillmentType?: unknown; scheduledFor?: unknown },
  settings: OrderSettings,
  now = new Date(),
): ResolvedFulfillment {
  if (settings.paused) {
    throw new OrderRequestError(
      "Online ordering is temporarily paused. Please order at the counter.",
      409,
      "ordering_paused",
    );
  }

  const hours = effectiveOrderingHours(settings, now);
  if (hours.closed) {
    throw new OrderRequestError(
      "Online ordering is closed today. Please order during store hours.",
      409,
      "ordering_closed",
    );
  }
  const openMinutes = clockMinutes(hours.openTime);
  const closingCutoff = clockMinutes(hours.closeTime) - settings.cutoffMinutes;
  const fulfillmentType = payload.fulfillmentType === "scheduled" ? "scheduled" : "asap";

  if (fulfillmentType === "scheduled") {
    if (!settings.schedulingEnabled) {
      throw new OrderRequestError("Scheduled pickup is not available right now.", 409, "scheduling_disabled");
    }
    const raw = typeof payload.scheduledFor === "string" ? payload.scheduledFor : "";
    const scheduledFor = raw ? new Date(raw) : null;
    if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) {
      throw new OrderRequestError("Choose a valid scheduled pickup time.", 400, "invalid_pickup_time");
    }
    const minutesAhead = (scheduledFor.getTime() - now.getTime()) / 60_000;
    const scheduledMinutes = localClockMinutes(scheduledFor);
    if (
      minutesAhead < settings.prepTimeMinutes ||
      minutesAhead > settings.schedulingHorizonMinutes ||
      localDateKey(scheduledFor) !== localDateKey(now) ||
      scheduledMinutes < openMinutes ||
      scheduledMinutes > closingCutoff ||
      scheduledMinutes % settings.slotMinutes !== 0
    ) {
      throw new OrderRequestError(
        "That pickup time is outside the available scheduling window.",
        400,
        "pickup_time_unavailable",
      );
    }
    return { fulfillmentType, scheduledFor, pickupEta: scheduledLabel(scheduledFor) };
  }

  const nowMinutes = localClockMinutes(now);
  if (nowMinutes < openMinutes || nowMinutes > closingCutoff) {
    throw new OrderRequestError(
      "Online ordering is closed for today. Please schedule during store hours.",
      409,
      "ordering_closed",
    );
  }
  return { fulfillmentType, scheduledFor: null, pickupEta: `${settings.prepTimeMinutes} min` };
}

export function stationFlags(items: PricedOrderItem[]) {
  return {
    hasCoffeeItems: items.some((item) => item.prepStation === "COFFEE" || item.prepStation === "RETAIL"),
    hasKitchenItems: items.some((item) => item.prepStation === "KITCHEN"),
  };
}
