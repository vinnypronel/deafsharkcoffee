import assert from "node:assert/strict";
import test from "node:test";
import {
  ORDER_MAX_ITEM_QUANTITY,
  OrderRequestError,
  logOrderEvent,
  normalizeCartItems,
  normalizeCustomerName,
  normalizeIdempotencyKey,
  normalizePhone,
  orderTotals,
  priceCart,
  readOrderJson,
  resolveFulfillment,
  stationFlags,
} from "../lib/order-intake.ts";

const openSettings = {
  prepTimeMinutes: 15,
  paused: false,
  openTime: "06:00",
  closeTime: "20:00",
  cutoffMinutes: 30,
  schedulingEnabled: true,
  schedulingHorizonMinutes: 240,
  slotMinutes: 15,
};

/* 2026-09-10 14:00 America/New_York, comfortably inside store hours. */
const midday = new Date("2026-09-10T18:00:00Z");

function jsonRequest(body, headers = { "content-type": "application/json" }) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function statusOf(run) {
  try {
    await run();
    return null;
  } catch (error) {
    assert.ok(error instanceof OrderRequestError, `expected OrderRequestError, got ${error}`);
    return { status: error.status, code: error.code, message: error.message };
  }
}

test("rejects non-JSON requests before parsing a body", async () => {
  const failure = await statusOf(() =>
    readOrderJson(jsonRequest("id=regular-coffee", { "content-type": "application/x-www-form-urlencoded" })),
  );
  assert.equal(failure.status, 415);
  assert.equal(failure.code, "unsupported_media_type");
});

test("rejects malformed JSON and non-object bodies with 400", async () => {
  const broken = await statusOf(() => readOrderJson(jsonRequest("{ not json")));
  assert.equal(broken.status, 400);
  assert.equal(broken.code, "malformed_json");

  const array = await statusOf(() => readOrderJson(jsonRequest([1, 2, 3])));
  assert.equal(array.status, 400);
});

test("rejects an oversized body using the declared content length", async () => {
  const request = new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": String(64 * 1024 + 1) },
    body: JSON.stringify({}),
  });
  const failure = await statusOf(() => readOrderJson(request));
  assert.equal(failure.status, 413);
});

test("requires a well-formed idempotency key", async () => {
  assert.equal(normalizeIdempotencyKey(" 6f1e1f0c-6c1a-4b9e-9a1e-0d6b1f4c2a11 "), "6f1e1f0c-6c1a-4b9e-9a1e-0d6b1f4c2a11");
  for (const bad of [undefined, "", "short", "has spaces in it", "a".repeat(65), "semi;colon;key"]) {
    const failure = await statusOf(() => normalizeIdempotencyKey(bad));
    assert.equal(failure.status, 400, `expected ${JSON.stringify(bad)} to be rejected`);
    assert.equal(failure.code, "invalid_idempotency_key");
  }
});

test("validates the customer name and phone number", async () => {
  assert.equal(normalizeCustomerName("  Miguel  "), "Miguel");
  assert.equal(normalizePhone("(908)-555-0123"), "(908)-555-0123");

  assert.equal((await statusOf(() => normalizeCustomerName("M"))).status, 400);
  assert.equal((await statusOf(() => normalizePhone("908-555"))).code, "invalid_phone");
  assert.equal((await statusOf(() => normalizePhone("19085550123456"))).code, "invalid_phone");
});

test("shape-checks the cart before any pricing happens", async () => {
  assert.equal((await statusOf(() => normalizeCartItems([]))).code, "empty_cart");
  assert.equal((await statusOf(() => normalizeCartItems("regular-coffee"))).code, "empty_cart");
  assert.equal((await statusOf(() => normalizeCartItems([{ id: "", quantity: 1 }]))).code, "invalid_item");
  assert.equal(
    (await statusOf(() => normalizeCartItems([{ id: "regular-coffee", quantity: 0 }]))).code,
    "invalid_quantity",
  );
  assert.equal(
    (await statusOf(() => normalizeCartItems([{ id: "regular-coffee", quantity: ORDER_MAX_ITEM_QUANTITY + 1 }]))).code,
    "invalid_quantity",
  );
  assert.equal(
    (await statusOf(() => normalizeCartItems([{ id: "regular-coffee", quantity: 1.5 }]))).code,
    "invalid_quantity",
  );
  assert.equal(
    (await statusOf(() => normalizeCartItems([{ id: "regular-coffee", quantity: 1, selection: "large" }]))).code,
    "invalid_item",
  );

  const tooManyLines = Array.from({ length: 41 }, () => ({ id: "regular-coffee", quantity: 1 }));
  assert.equal((await statusOf(() => normalizeCartItems(tooManyLines))).code, "too_many_line_items");

  const tooManyUnits = Array.from({ length: 6 }, () => ({ id: "regular-coffee", quantity: 20 }));
  assert.equal((await statusOf(() => normalizeCartItems(tooManyUnits))).code, "too_many_units");

  assert.deepEqual(normalizeCartItems([{ id: " regular-coffee ", quantity: 2 }]), [
    { id: "regular-coffee", quantity: 2, selection: undefined },
  ]);
});

test("prices from the server catalog and ignores client-supplied prices", () => {
  const [item] = priceCart([{ id: "regular-coffee", quantity: 2, unitPrice: 0.01, name: "Free coffee" }]);
  assert.equal(item.id, "regular-coffee");
  assert.notEqual(item.name, "Free coffee");
  assert.ok(item.unitPrice > 0.01);
  assert.ok(["COFFEE", "KITCHEN", "RETAIL"].includes(item.prepStation));
});

test("opens configurable drinks at their advertised base price and charges only selected upgrades", () => {
  const [latte] = priceCart([{ id: "latte", quantity: 1 }]);
  assert.equal(latte.unitPrice, 5);
  assert.ok(latte.options.includes("Hot"));
  assert.ok(latte.options.includes("12 oz"));

  const [icedLatte] = priceCart([{ id: "latte", quantity: 1, selection: { temperature: "Iced" } }]);
  assert.equal(icedLatte.unitPrice, 6);

  const [latteWithAddOns] = priceCart([{
    id: "latte",
    quantity: 1,
    selection: { syrups: ["Vanilla"], extraShot: 1 },
  }]);
  assert.equal(latteWithAddOns.unitPrice, 6.75);

  const [americano] = priceCart([{ id: "americano", quantity: 1 }]);
  assert.equal(americano.unitPrice, 3.95);
});

test("returns 409 for an unknown product and for a sold-out product", async () => {
  const unknown = await statusOf(() => priceCart([{ id: "unicorn-latte", quantity: 1 }]));
  assert.equal(unknown.status, 409);
  assert.equal(unknown.code, "unknown_product");

  const soldOut = await statusOf(() =>
    priceCart([{ id: "regular-coffee", quantity: 1 }], { availability: new Map([["regular-coffee", false]]) }),
  );
  assert.equal(soldOut.status, 409);
  assert.equal(soldOut.code, "sold_out");
});

test("returns 400 for invalid modifiers and over-long special instructions", async () => {
  const badMilk = await statusOf(() =>
    priceCart([{ id: "latte", quantity: 1, selection: { milk: "Unicorn milk" } }]),
  );
  assert.equal(badMilk.status, 400);
  assert.equal(badMilk.code, "invalid_selection");

  const badSize = await statusOf(() => priceCart([{ id: "latte", quantity: 1, selection: { size: "Bucket" } }]));
  assert.equal(badSize.status, 400);

  const longNote = await statusOf(() =>
    priceCart([{ id: "latte", quantity: 1, selection: { notes: "x".repeat(181) } }]),
  );
  assert.equal(longNote.status, 400);
  assert.match(longNote.message, /180 characters/);
});

test("offers an ice level only on drinks actually served iced", () => {
  const [hot] = priceCart([{ id: "latte", quantity: 1, selection: { temperature: "Hot" } }]);
  const [iced] = priceCart([{ id: "latte", quantity: 1, selection: { temperature: "Iced" } }]);

  assert.equal(hot.options.some((option) => option.startsWith("Ice:")), false);
  assert.equal(iced.options.some((option) => option.startsWith("Ice:")), true);
  /* A stray ice choice on a hot drink is dropped rather than reaching the ticket. */
  const [smuggled] = priceCart([
    { id: "latte", quantity: 1, selection: { temperature: "Hot", modifiers: { Ice: ["No ice"] } } },
  ]);
  assert.equal(smuggled.options.some((option) => option.startsWith("Ice:")), false);
});

test("derives totals and New Jersey sales tax from the priced lines", () => {
  const totals = orderTotals([
    { unitPrice: 4.5, quantity: 2 },
    { unitPrice: 3.25, quantity: 1 },
  ]);
  assert.equal(totals.subtotalCents, 1225);
  assert.equal(totals.taxCents, Math.round(1225 * 0.06625));
  assert.equal(totals.totalCents, totals.subtotalCents + totals.taxCents);
});

test("refuses orders while online ordering is paused", async () => {
  const failure = await statusOf(() => resolveFulfillment({}, { ...openSettings, paused: true }, midday));
  assert.equal(failure.status, 409);
  assert.equal(failure.code, "ordering_paused");
});

test("accepts an ASAP order during store hours and derives the pickup estimate", () => {
  const result = resolveFulfillment({ fulfillmentType: "asap", pickupEta: "instant" }, openSettings, midday);
  assert.deepEqual(result, { fulfillmentType: "asap", scheduledFor: null, pickupEta: "15 min" });
});

test("refuses an ASAP order after the closing cutoff", async () => {
  const afterClose = new Date("2026-09-11T03:00:00Z");
  const failure = await statusOf(() => resolveFulfillment({}, openSettings, afterClose));
  assert.equal(failure.status, 409);
  assert.equal(failure.code, "ordering_closed");
});

test("validates scheduled pickup times against the scheduling window", async () => {
  const disabled = await statusOf(() =>
    resolveFulfillment({ fulfillmentType: "scheduled", scheduledFor: "2026-09-10T19:00:00Z" }, { ...openSettings, schedulingEnabled: false }, midday),
  );
  assert.equal(disabled.status, 409);
  assert.equal(disabled.code, "scheduling_disabled");

  const unparsable = await statusOf(() =>
    resolveFulfillment({ fulfillmentType: "scheduled", scheduledFor: "later today" }, openSettings, midday),
  );
  assert.equal(unparsable.status, 400);
  assert.equal(unparsable.code, "invalid_pickup_time");

  const tooSoon = await statusOf(() =>
    resolveFulfillment({ fulfillmentType: "scheduled", scheduledFor: "2026-09-10T18:05:00Z" }, openSettings, midday),
  );
  assert.equal(tooSoon.code, "pickup_time_unavailable");

  const beyondHorizon = await statusOf(() =>
    resolveFulfillment({ fulfillmentType: "scheduled", scheduledFor: "2026-09-10T23:00:00Z" }, openSettings, midday),
  );
  assert.equal(beyondHorizon.code, "pickup_time_unavailable");

  const offSlot = await statusOf(() =>
    resolveFulfillment({ fulfillmentType: "scheduled", scheduledFor: "2026-09-10T19:07:00Z" }, openSettings, midday),
  );
  assert.equal(offSlot.code, "pickup_time_unavailable");

  const accepted = resolveFulfillment(
    { fulfillmentType: "scheduled", scheduledFor: "2026-09-10T19:00:00Z" },
    openSettings,
    midday,
  );
  assert.equal(accepted.fulfillmentType, "scheduled");
  assert.ok(accepted.scheduledFor instanceof Date);
  assert.match(accepted.pickupEta, /Sep 10/);
});

test("routes items to the stations that actually have work", () => {
  assert.deepEqual(stationFlags([{ prepStation: "COFFEE" }]), { hasCoffeeItems: true, hasKitchenItems: false });
  assert.deepEqual(stationFlags([{ prepStation: "RETAIL" }]), { hasCoffeeItems: true, hasKitchenItems: false });
  assert.deepEqual(stationFlags([{ prepStation: "KITCHEN" }]), { hasCoffeeItems: false, hasKitchenItems: true });
  assert.deepEqual(stationFlags([{ prepStation: "KITCHEN" }, { prepStation: "COFFEE" }]), {
    hasCoffeeItems: true,
    hasKitchenItems: true,
  });
});

test("order logs carry no customer identity, contents, or tokens", (t) => {
  const lines = [];
  t.mock.method(console, "log", (line) => lines.push(line));

  logOrderEvent("created", {
    reference: "ref_a1b2c3d4e5f6",
    orderId: 42,
    lineItems: 2,
    totalCents: 1305,
    fulfillmentType: "asap",
    skipped: undefined,
  });

  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.event, "order.created");
  assert.equal(entry.reference, "ref_a1b2c3d4e5f6");
  assert.equal("skipped" in entry, false);
  assert.deepEqual(
    Object.keys(entry).filter((key) =>
      ["customerName", "phone", "items", "itemsJson", "turnstileToken", "selection", "notes"].includes(key),
    ),
    [],
  );
});
