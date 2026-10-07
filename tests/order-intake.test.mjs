import assert from "node:assert/strict";
import test from "node:test";
import { menuProducts } from "../app/menu-data.ts";
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
  closeTime: "18:30",
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

  /* A full cart at the per-item cap stays under the total sanity bound. */
  const fullCart = Array.from({ length: 40 }, (_, index) => ({ id: `item-${index}`, quantity: ORDER_MAX_ITEM_QUANTITY }));
  assert.equal(normalizeCartItems(fullCart).length, 40);
  assert.equal((await statusOf(() => normalizeCartItems([{ id: "regular-coffee", quantity: 21 }]))).code, "invalid_quantity");

  /* The 20 limit counts every line for the same item together. */
  assert.equal(normalizeCartItems([{ id: "regular-coffee", quantity: 20 }]).length, 1);
  assert.equal(
    (await statusOf(() => normalizeCartItems([{ id: "regular-coffee", quantity: 10 }, { id: "regular-coffee", quantity: 11 }]))).code,
    "item_quantity_limit",
  );
  assert.equal(normalizeCartItems([{ id: "regular-coffee", quantity: 20 }, { id: "latte", quantity: 20 }]).length, 2);

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

test("offers regular fries or sweet potato fries for fries and wing orders", () => {
  for (const id of ["fries", "chicken-wings-fries"]) {
    const [regular] = priceCart([{ id, quantity: 1 }]);
    assert.ok(regular.options.includes("Fries choice: Regular fries"));

    const [sweetPotato] = priceCart([{
      id,
      quantity: 1,
      selection: { modifiers: { "Fries choice": ["Sweet potato fries"] } },
    }]);
    assert.ok(sweetPotato.options.includes("Fries choice: Sweet potato fries"));
    assert.equal(sweetPotato.unitPrice, regular.unitPrice);
  }
});

test("every sandwich served with fries can be ordered without French fries", () => {
  const excluded = new Set(["italian"]);
  const sandwiches = menuProducts.filter((product) => product.category === "Sandwiches");

  for (const product of sandwiches) {
    const sideGroup = product.modifierGroups?.find((group) => group.label === "Side");
    if (excluded.has(product.id)) {
      assert.equal(sideGroup, undefined, `${product.name} does not include fries`);
      continue;
    }

    assert.ok(sideGroup?.options.some((option) => option.label === "No French fries"), product.name);
    const [withoutFries] = priceCart([{
      id: product.id,
      quantity: 1,
      selection: { modifiers: { Side: ["No French fries"] } },
    }]);
    assert.equal(withoutFries.unitPrice, product.price, product.name);
    assert.ok(withoutFries.options.includes("Side: No French fries"), product.name);
  }
});

test("only the NJ Classic, Ham and Cheese and Turkey BLT can switch to white bread", () => {
  const swappable = new Set(["nj-classic", "ham-cheese-croissant", "turkey-blt"]);

  for (const product of menuProducts) {
    const breadGroup = product.modifierGroups?.find((group) => group.label === "Bread");
    const offersWhite = Boolean(breadGroup?.options.some((option) => option.label === "White bread"));
    assert.equal(offersWhite, swappable.has(product.id), product.name);
    if (!offersWhite) continue;
    const [regular] = priceCart([{ id: product.id, quantity: 1 }]);
    const [whiteBread] = priceCart([{
      id: product.id,
      quantity: 1,
      selection: { modifiers: { Bread: ["White bread"] } },
    }]);
    assert.equal(whiteBread.unitPrice, regular.unitPrice, product.name);
    assert.ok(whiteBread.options.includes("Bread: White bread"), product.name);
  }
});

test("made-to-order cheese items offer the shop's cheese swaps", () => {
  const cheeseItemIds = [
    "nj-classic",
    "jersey-devil",
    "ham-cheese-croissant",
    "grilled-cheese",
    "breakfast-wrap",
    "tuna-sandwich",
    "shark-cubano",
    "chicken-deluxe",
    "chicken-pesto",
    "chicken-cutlet-fuego",
    "tuna-wrap",
    "italian",
    "garden-salad",
    "emilia",
    "cachapa",
    "pupusas",
  ];

  for (const id of cheeseItemIds) {
    const product = menuProducts.find((item) => item.id === id);
    const cheeseChoice = product?.modifierGroups?.find((group) => group.label === "Cheese choice");
    const expectedDefault = "Yellow American";
    assert.deepEqual(cheeseChoice?.options.map((option) => option.label), [
      expectedDefault,
      "Swiss",
      "Provolone",
      "Pepper Jack",
    ], id);
    assert.deepEqual(cheeseChoice?.options.map((option) => option.price ?? 0), [0, 1, 1, 1], id);

    const [swapped] = priceCart([{
      id,
      quantity: 1,
      selection: { modifiers: { "Cheese choice": ["Pepper Jack"] } },
    }]);
    assert.equal(swapped.unitPrice, product.price + 1, id);
    assert.ok(swapped.options.includes("Cheese choice: Pepper Jack"), id);
  }
});

test("places Garden Salad in Bites and marks only unfinished menu photos as coming soon", () => {
  const gardenSalad = menuProducts.find((product) => product.id === "garden-salad");
  assert.equal(gardenSalad?.category, "Bites");

  const cachapa = menuProducts.find((product) => product.id === "cachapa");
  assert.equal(cachapa?.photo, "/menu/owner/cachapa-v5.png");
  assert.equal(cachapa?.imageComingSoon, undefined);

  for (const id of ["shark-cubano", "tequenos", "pupusas"]) {
    const product = menuProducts.find((item) => item.id === id);
    assert.equal(product?.photo, undefined, id);
    assert.equal(product?.imageComingSoon, true, id);
  }
});

test("prices and routes the fall drinks and desserts from the posted menus", () => {
  for (const [id, price] of [
    ["pumpkin-spice-latte", 6.5],
    ["brown-sugar-shaken-espresso", 6.5],
    ["dirty-soda", 5.25],
    ["iced-toasted-marshmallow-latte", 7],
  ]) {
    const [drink] = priceCart([{ id, quantity: 1 }]);
    assert.equal(drink.unitPrice, price);
    assert.equal(drink.prepStation, "COFFEE");
  }

  for (const [id, price] of [
    ["chocoflan", 7],
    ["tres-leches", 6],
    ["tiramisu", 7],
  ]) {
    const [dessert] = priceCart([{ id, quantity: 1 }]);
    assert.equal(dessert.unitPrice, price);
    assert.equal(dessert.prepStation, "KITCHEN");
  }
});

test("prices the October owner menu update and keeps required choices on the kitchen ticket", async () => {
  for (const [id, price, station] of [
    ["french-toast", 10, "KITCHEN"],
    ["grilled-cheese", 8.5, "KITCHEN"],
    ["tuna-sandwich", 8.5, "KITCHEN"],
    ["pupusas", 4, "KITCHEN"],
    ["cheesecake", 7, "KITCHEN"],
    ["vita-coco", 2.95, "RETAIL"],
    ["tropicana-juice", 3.25, "RETAIL"],
    ["gatorade", 3.25, "RETAIL"],
  ]) {
    const [item] = priceCart([{ id, quantity: 1 }]);
    assert.equal(item.unitPrice, price, id);
    assert.equal(item.prepStation, station, id);
  }

  const [njClassic] = priceCart([{ id: "nj-classic", quantity: 1 }]);
  assert.ok(njClassic.options.includes("Meat: Taylor ham"));
  assert.ok(njClassic.options.includes("Bread: Kaiser roll"));
  assert.ok(njClassic.options.includes("Preparation: Toasted"));

  for (const id of ["nj-classic"]) {
    const product = menuProducts.find((candidate) => candidate.id === id);
    const [defaultBread] = priceCart([{ id, quantity: 1 }]);
    const [croissant] = priceCart([{ id, quantity: 1, selection: { modifiers: { Bread: ["Croissant"] } } }]);
    assert.ok(defaultBread.options.includes("Bread: Kaiser roll"), `${id} should default to a Kaiser roll`);
    assert.equal(croissant.unitPrice, product.price + 0.75, `${id} croissant should cost 75 cents extra`);
    assert.ok(croissant.options.includes("Bread: Croissant"));
  }

  const [whiteBread] = priceCart([{ id: "nj-classic", quantity: 1, selection: { modifiers: { Bread: ["White bread"], Preparation: ["Not toasted"] } } }]);
  assert.equal(whiteBread.unitPrice, 8, "white bread is a free swap");
  assert.ok(whiteBread.options.includes("Bread: White bread"));
  assert.ok(whiteBread.options.includes("Preparation: Not toasted"));

  const [hamAndCheese] = priceCart([{ id: "ham-cheese-croissant", quantity: 1 }]);
  assert.ok(hamAndCheese.options.includes("Bread: Kaiser roll"));

  const [frenchToast] = priceCart([{ id: "french-toast", quantity: 1, selection: { modifiers: { Bacon: ["Turkey bacon"], "Remove ingredients": ["No hash brown"] } } }]);
  assert.ok(frenchToast.options.includes("Bacon: Turkey bacon"));
  assert.ok(frenchToast.options.includes("Remove ingredients: No hash brown"));
  assert.equal(frenchToast.selection.temperature, undefined);
  assert.equal(frenchToast.selection.milk, undefined);
  assert.equal(frenchToast.selection.size, undefined);

  const [pupusa] = priceCart([{ id: "pupusas", quantity: 1, selection: { flavor: "Revueltas (beans, cheese, and pork)" } }]);
  assert.ok(pupusa.options.includes("Revueltas (beans, cheese, and pork)"));

  const [smallVitaCoco] = priceCart([{ id: "vita-coco", quantity: 1 }]);
  assert.equal(smallVitaCoco.unitPrice, 2.95);
  assert.ok(smallVitaCoco.options.includes("Size: 11 oz"));
  const [largeVitaCoco] = priceCart([{ id: "vita-coco", quantity: 1, selection: { modifiers: { Size: ["16.9 oz"] } } }]);
  assert.equal(largeVitaCoco.unitPrice, 3.95);
  assert.ok(largeVitaCoco.options.includes("Size: 16.9 oz"));

  for (const removed of ["cachitos", "tropicana-juice-15", "arnold-palmer", "vita-coco-16-9"]) {
    const failure = await statusOf(() => priceCart([{ id: removed, quantity: 1 }]));
    assert.equal(failure.status, 409, removed);
    assert.equal(failure.code, "unknown_product", removed);
  }
});

test("matches the printed Morning Handhelds menu and accommodations", () => {
  const expectedPrices = new Map([
    ["nj-classic", 8],
    ["jersey-devil", 9.75],
    ["tuna-sandwich", 8.5],
    ["french-toast", 10],
    ["grilled-cheese", 8.5],
    ["breakfast-wrap", 8.25],
    ["turkey-blt", 8.25],
    ["plain-croissant", 3.25],
    ["ham-cheese-croissant", 7.25],
  ]);

  for (const [id, price] of expectedPrices) {
    const product = menuProducts.find((candidate) => candidate.id === id);
    assert.ok(product, `${id} should be on the breakfast menu`);
    assert.equal(product.category, "Breakfast", id);
    assert.equal(product.price, price, id);
  }

  const group = (id, label) => menuProducts.find((product) => product.id === id)?.modifierGroups?.find((candidate) => candidate.label === label);
  assert.deepEqual(group("nj-classic", "Meat")?.options.map((option) => option.label), ["Taylor ham", "Ham", "Bacon", "Turkey bacon", "Sausage"]);
  assert.deepEqual(group("nj-classic", "Bread")?.options, [{ label: "Kaiser roll" }, { label: "White bread" }, { label: "Croissant", price: 0.75 }]);
  assert.deepEqual(group("nj-classic", "Preparation")?.options.map((option) => option.label), ["Toasted", "Not toasted"]);
  assert.match(menuProducts.find((product) => product.id === "jersey-devil").description, /Kaiser roll/);
  assert.match(menuProducts.find((product) => product.id === "tuna-sandwich").description, /white bread/);
  assert.match(menuProducts.find((product) => product.id === "grilled-cheese").description, /white bread/);
  assert.deepEqual(group("breakfast-wrap", "Meat")?.options.map((option) => option.label).slice(0, 5), ["Ham", "Bacon", "Turkey bacon", "Taylor ham", "Sausage"]);
  assert.deepEqual(group("turkey-blt", "Bread")?.options.map((option) => option.label), ["Roll", "White bread", "Wrap"]);
  assert.deepEqual(group("plain-croissant", "Spread")?.options, [{ label: "Butter", price: 1 }, { label: "Jelly", price: 1 }]);
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

  const [hotDecaf] = priceCart([{ id: "decaf-coffee", quantity: 1, selection: { temperature: "Hot" } }]);
  assert.equal(hotDecaf.unitPrice, 4);
  assert.ok(hotDecaf.options.includes("Hot"));
  assert.ok(hotDecaf.options.includes("12 oz"));

  const [icedDecaf] = priceCart([{ id: "decaf-coffee", quantity: 1, selection: { temperature: "Iced" } }]);
  assert.equal(icedDecaf.unitPrice, 4);
  assert.ok(icedDecaf.options.includes("Iced"));
  assert.ok(icedDecaf.options.includes("16 oz"));
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

test("uses Saturday hours and keeps Sunday closed", async () => {
  const saturdayNoon = new Date("2026-09-12T16:00:00Z");
  const saturdayLate = new Date("2026-09-12T17:45:00Z");
  const sundayNoon = new Date("2026-09-13T16:00:00Z");

  assert.deepEqual(resolveFulfillment({}, openSettings, saturdayNoon), {
    fulfillmentType: "asap",
    scheduledFor: null,
    pickupEta: "15 min",
  });

  assert.equal((await statusOf(() => resolveFulfillment({}, openSettings, saturdayLate))).code, "ordering_closed");
  assert.equal((await statusOf(() => resolveFulfillment({}, openSettings, sundayNoon))).code, "ordering_closed");
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
