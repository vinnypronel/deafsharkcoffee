import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { loyaltyChangeStatements } from "../lib/loyalty-ledger.ts";

/* Guards the fix for the reward double-spend: the points debit and the order
   insert commit in ONE transaction, and an assert statement aborts the whole
   batch when the guarded debit changed 0 rows. Two checkouts racing on one
   balance must yield exactly one discounted order and one debit. */

const ASSERT_SQL =
  "INSERT INTO customer_profiles (user_id, email, display_name) SELECT user_id, email, display_name FROM customer_profiles WHERE user_id = ? AND changes() <> 1";

function db(points) {
  const d = new DatabaseSync(":memory:");
  d.exec(`
    CREATE TABLE customer_profiles (user_id TEXT PRIMARY KEY, email TEXT, display_name TEXT, points INTEGER NOT NULL DEFAULT 0, lifetime_points INTEGER NOT NULL DEFAULT 0, updated_at INTEGER);
    CREATE TABLE loyalty_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, order_id INTEGER UNIQUE, reference TEXT UNIQUE, points_change INTEGER, balance_after INTEGER, reason TEXT, created_at INTEGER);
    CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT, reward_points_spent INTEGER DEFAULT 0, idempotency_key TEXT UNIQUE);
    INSERT INTO customer_profiles (user_id, email, display_name, points) VALUES ('u1','a@b.c','A', ${points});
  `);
  return d;
}

// One atomic checkout: [debit insert, balance update, assert, order insert].
function checkout(d, key, spend) {
  const statements = loyaltyChangeStatements({ userId: "u1", points: -spend, reference: `redeem:${key}`, reason: "reward_redeemed" });
  d.exec("BEGIN");
  try {
    for (const s of statements) d.prepare(s.sql.replace(/unixepoch\(\)/g, "0")).run(...s.values);
    d.prepare(ASSERT_SQL).run("u1");
    d.prepare("INSERT INTO orders (order_number, reward_points_spent, idempotency_key) VALUES (?, ?, ?)").run(`DS${key}`, spend, key);
    d.exec("COMMIT");
    return true;
  } catch {
    d.exec("ROLLBACK");
    return false;
  }
}

test("two concurrent redeems on one balance produce one discounted order, not two", () => {
  const d = db(50);
  const a = checkout(d, "AAA", 50);
  const b = checkout(d, "BBB", 50);
  assert.equal(a, true, "first redeem commits");
  assert.equal(b, false, "second redeem aborts");
  assert.equal(d.prepare("SELECT points FROM customer_profiles WHERE user_id='u1'").get().points, 0);
  assert.equal(d.prepare("SELECT count(*) c FROM orders WHERE reward_points_spent > 0").get().c, 1);
  assert.equal(d.prepare("SELECT count(*) c FROM loyalty_transactions WHERE points_change < 0").get().c, 1);
});

test("a redeem does not block earning points on the same order (NULL order_id on redeem)", () => {
  const d = db(50);
  assert.equal(checkout(d, "XYZ", 50), true);
  // completion earn attaches order_id 1; must not collide with the redeem row.
  for (const s of loyaltyChangeStatements({ userId: "u1", orderId: 1, reference: "order:1", points: 5, reason: "completed_order", lifetimeCredit: true })) {
    d.prepare(s.sql.replace(/unixepoch\(\)/g, "0")).run(...s.values);
  }
  assert.equal(d.prepare("SELECT points FROM customer_profiles WHERE user_id='u1'").get().points, 5);
  assert.equal(d.prepare("SELECT count(*) c FROM loyalty_transactions").get().c, 2);
});

test("a single valid redeem still succeeds", () => {
  const d = db(100);
  assert.equal(checkout(d, "ONE", 50), true);
  assert.equal(d.prepare("SELECT points FROM customer_profiles WHERE user_id='u1'").get().points, 50);
});
