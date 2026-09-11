import assert from "node:assert/strict";
import test from "node:test";
import { requirePickupAccount } from "../lib/checkout-policy.ts";

test("pickup requires a verified account; card attempts never become unpaid orders", () => {
  const user = { id: "customer", emailVerified: true };
  assert.equal(requirePickupAccount("pickup", user), "customer");
  assert.throws(() => requirePickupAccount("pickup", null), { status: 401 });
  assert.throws(() => requirePickupAccount("pickup", { ...user, emailVerified: false }), { status: 403 });
  for (const method of ["card", "paid", "stripe", null, false]) {
    assert.throws(() => requirePickupAccount(method, user), { status: 503 });
  }
});
