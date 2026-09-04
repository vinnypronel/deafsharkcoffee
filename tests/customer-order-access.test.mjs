import assert from "node:assert/strict";
import test from "node:test";
import { serveOwnedCustomerOrder } from "../lib/customer-order-access.ts";

const ownedOrder = {
  id: 7,
  orderNumber: "DS-PRIVATE",
  customerName: "Account Owner",
  itemsJson: JSON.stringify([{ name: "Coffee", quantity: 1 }]),
  totalCents: 450,
  status: "preparing",
  paymentMethod: "pickup",
  pickupEta: "15 min",
  fulfillmentType: "asap",
  scheduledFor: null,
  createdAt: new Date("2026-08-25T12:00:00Z"),
};

function orderRequest(body) {
  return new Request("http://localhost/api/customer-orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("scopes customer order loading to the authenticated user", async () => {
  let lookup;
  const response = await serveOwnedCustomerOrder(
    orderRequest({ orderNumber: " ds-private ", phone: "908-555-0000" }),
    "user-owner",
    async (orderNumber, userId) => {
      lookup = { orderNumber, userId };
      return ownedOrder;
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(lookup, { orderNumber: "DS-PRIVATE", userId: "user-owner" });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal((await response.json()).order.orderNumber, "DS-PRIVATE");
});

test("does not expose an order rejected by the ownership-scoped loader", async () => {
  const response = await serveOwnedCustomerOrder(
    orderRequest({ orderNumber: "DS-SOMEONE-ELSES" }),
    "user-requester",
    async () => null,
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: "We could not find that order in your account.",
  });
});

test("rejects missing or malformed order selections before loading", async () => {
  let calls = 0;
  const loader = async () => {
    calls += 1;
    return ownedOrder;
  };

  const missing = await serveOwnedCustomerOrder(orderRequest({}), "user-owner", loader);
  const malformed = await serveOwnedCustomerOrder(
    new Request("http://localhost/api/customer-orders", { method: "POST", body: "{" }),
    "user-owner",
    loader,
  );

  assert.equal(missing.status, 400);
  assert.equal(malformed.status, 400);
  assert.equal(calls, 0);
});
