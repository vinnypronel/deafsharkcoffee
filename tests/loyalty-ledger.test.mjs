import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { loyaltyChangeStatements } from "../lib/loyalty-ledger.ts";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE customer_profiles (user_id TEXT PRIMARY KEY, points INTEGER DEFAULT 0, lifetime_points INTEGER DEFAULT 0, updated_at INTEGER);
    CREATE TABLE loyalty_transactions (id INTEGER PRIMARY KEY, user_id TEXT, order_id INTEGER UNIQUE, reference TEXT UNIQUE, points_change INTEGER, balance_after INTEGER, reason TEXT, created_at INTEGER);
    INSERT INTO customer_profiles (user_id) VALUES ('member');`);
  return db;
}
function apply(db, input, fail = false) {
  db.exec("BEGIN");
  try {
    const statements = loyaltyChangeStatements({ userId: "member", reason: "completed_order", lifetimeCredit: true, ...input });
    statements.forEach((statement, index) => {
      db.prepare(statement.sql).run(...statement.values);
      if (fail && index === 0) throw new Error("interrupted");
    });
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}
test("order credit is atomic and replay-safe", () => {
  const db = setup();
  const input = { points: 10, reference: "order:1", orderId: 1 };
  assert.throws(() => apply(db, input, true), /interrupted/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM loyalty_transactions").get().n, 0);
  apply(db, input); apply(db, input);
  assert.equal(db.prepare("SELECT points FROM customer_profiles").get().points, 10);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM loyalty_transactions").get().n, 1);
  db.close();
});
test("sequential credits preserve balances and redemptions cannot overdraw", () => {
  const db = setup();
  apply(db, { points: 100, reference: "a" });
  apply(db, { points: 25, reference: "b" });
  apply(db, { points: -100, reference: "reward:1", lifetimeCredit: false });
  apply(db, { points: -100, reference: "reward:2", lifetimeCredit: false });
  assert.deepEqual({ ...db.prepare("SELECT points, lifetime_points FROM customer_profiles").get() }, { points: 25, lifetime_points: 125 });
  assert.deepEqual(db.prepare("SELECT balance_after FROM loyalty_transactions ORDER BY id").all().map(x => x.balance_after), [100, 125, 25]);
  db.close();
});

test("a stale order update cannot award points and a failed credit rolls back completion", () => {
  const db = setup();
  db.exec("CREATE TABLE orders (id INTEGER PRIMARY KEY, status TEXT); INSERT INTO orders VALUES (1, 'ready');");
  const credit = loyaltyChangeStatements({ userId: "member", points: 10, reference: "order:1", orderId: 1, reason: "completed_order", requirePreviousChange: true });
  const complete = (expected, fail = false) => {
    db.exec("BEGIN");
    try {
      db.prepare("UPDATE orders SET status = 'complete' WHERE id = 1 AND status = ?").run(expected);
      for (const statement of credit) db.prepare(statement.sql).run(...statement.values);
      if (fail) throw new Error("interrupted");
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  };
  complete("new");
  assert.equal(db.prepare("SELECT points FROM customer_profiles").get().points, 0);
  assert.throws(() => complete("ready", true), /interrupted/);
  assert.equal(db.prepare("SELECT status FROM orders").get().status, "ready");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM loyalty_transactions").get().n, 0);
  complete("ready");
  complete("complete");
  assert.equal(db.prepare("SELECT status FROM orders").get().status, "complete");
  assert.equal(db.prepare("SELECT points FROM customer_profiles").get().points, 10);
  db.close();
});
