import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { birthdayStatus, validBirthday } from "../lib/birthday.ts";
import { createReferralCode, normalizeReferralCode } from "../lib/referral.ts";
import { describePromotion, promotionApplies, promotionAwards, validatePromotion } from "../lib/promotions.ts";
import { loyaltyChangeStatements } from "../lib/loyalty-ledger.ts";

/* Noon in New York on the given calendar day, so UTC offsets never shift the date. */
const nyNoon = (date) => new Date(`${date}T16:00:00Z`);

test("birthday drink is only on the day itself", () => {
  const setAt = nyNoon("2026-01-01");
  assert.equal(birthdayStatus({ month: 9, day: 12, setAt, now: nyNoon("2026-09-12") }).eligibleToday, true);
  assert.equal(birthdayStatus({ month: 9, day: 12, setAt, now: nyNoon("2026-09-11") }).eligibleToday, false);
  assert.equal(birthdayStatus({ month: 9, day: 12, setAt, now: nyNoon("2026-09-13") }).eligibleToday, false);
});

test("birthday saved on the day does not qualify, saved the day before does", () => {
  const today = nyNoon("2026-09-12");
  const sameDay = birthdayStatus({ month: 9, day: 12, setAt: new Date("2026-09-12T13:00:00Z"), now: today });
  assert.equal(sameDay.isToday, true);
  assert.equal(sameDay.eligibleToday, false);
  const dayBefore = birthdayStatus({ month: 9, day: 12, setAt: new Date("2026-09-12T03:30:00Z"), now: today });
  assert.equal(dayBefore.eligibleToday, true, "11:30 PM on Sept 11 in New York is the day before");
  assert.equal(birthdayStatus({ month: 9, day: 12, setAt: null, now: today }).eligibleToday, false);
});

test("birthday day boundaries use store time, not UTC", () => {
  const setAt = nyNoon("2026-01-01");
  /* 1 AM UTC on Sept 13 is still 9 PM Sept 12 in New York. */
  assert.equal(birthdayStatus({ month: 9, day: 12, setAt, now: new Date("2026-09-13T01:00:00Z") }).eligibleToday, true);
});

test("February 29 birthdays are honored on February 28 in other years", () => {
  const setAt = nyNoon("2025-01-01");
  assert.equal(birthdayStatus({ month: 2, day: 29, setAt, now: nyNoon("2027-02-28") }).eligibleToday, true);
  assert.equal(birthdayStatus({ month: 2, day: 29, setAt, now: nyNoon("2028-02-28") }).eligibleToday, false);
  assert.equal(birthdayStatus({ month: 2, day: 29, setAt, now: nyNoon("2028-02-29") }).eligibleToday, true);
});

test("validates birthday month and day", () => {
  assert.equal(validBirthday(2, 29), true);
  assert.equal(validBirthday(4, 31), false);
  assert.equal(validBirthday(13, 1), false);
  assert.equal(validBirthday("9", 12), false);
});

test("referral codes are readable and normalized", () => {
  const code = createReferralCode("vinny pronel", () => new Uint8Array([0, 1, 2, 3]));
  assert.equal(code, "VINNYABCD");
  assert.equal(createReferralCode("  ", () => new Uint8Array([0, 0, 0, 0])), "SHARKAAAA");
  assert.equal(normalizeReferralCode(" vinnyabcd "), "VINNYABCD");
  assert.equal(normalizeReferralCode("bad code!"), "");
});

const base = { id: 1, name: "Promo", active: true, startDate: null, endDate: null, days: [], startTime: null, endTime: null, multiplier: null, bonusPoints: null, productId: null, visitsRequired: null };

test("promotion windows respect dates, days and hours in store time", () => {
  const slowHours = { ...base, kind: "flat_bonus", bonusPoints: 10, days: [1, 2, 3, 4, 5], startTime: "14:00", endTime: "16:00" };
  /* Monday Sept 14 2026, 3 PM New York is 19:00 UTC. */
  assert.equal(promotionApplies(slowHours, new Date("2026-09-14T19:00:00Z")), true);
  assert.equal(promotionApplies(slowHours, new Date("2026-09-14T20:00:00Z")), false, "4 PM is the exclusive end");
  assert.equal(promotionApplies(slowHours, new Date("2026-09-13T19:00:00Z")), false, "Sunday is excluded");
  assert.equal(promotionApplies({ ...slowHours, active: false }, new Date("2026-09-14T19:00:00Z")), false);
  const dated = { ...base, kind: "multiplier", multiplier: 2, startDate: "2026-10-01", endDate: "2026-10-31" };
  assert.equal(promotionApplies(dated, nyNoon("2026-09-30")), false);
  assert.equal(promotionApplies(dated, nyNoon("2026-10-31")), true);
});

test("biggest multiplier wins, bonuses add on top", () => {
  const placedAt = nyNoon("2026-09-14");
  const awards = promotionAwards({
    promotions: [
      { ...base, id: 1, kind: "multiplier", multiplier: 2 },
      { ...base, id: 2, kind: "multiplier", multiplier: 3 },
      { ...base, id: 3, kind: "flat_bonus", bonusPoints: 10 },
      { ...base, id: 4, kind: "product_bonus", bonusPoints: 15, productId: "pumpkin-spice-latte" },
    ],
    orderId: 77,
    userId: "u1",
    placedAt,
    basePoints: 12,
    items: [{ id: "pumpkin-spice-latte", quantity: 2 }, { id: "latte", quantity: 1 }],
  });
  assert.deepEqual(awards.map((award) => [award.promotionId, award.points, award.reference]), [
    [2, 24, "promo:2:order:77"],
    [3, 10, "promo:3:order:77"],
    [4, 30, "promo:4:order:77"],
  ]);
});

test("visit challenge pays once per member when the count is reached", () => {
  const challenge = { ...base, id: 9, kind: "visit_challenge", bonusPoints: 50, visitsRequired: 5, startDate: "2026-10-01", endDate: "2026-10-31" };
  const input = { promotions: [challenge], orderId: 5, userId: "u1", placedAt: nyNoon("2026-10-20"), basePoints: 4, items: [] };
  assert.equal(promotionAwards({ ...input, visitsByPromotion: new Map([[9, 4]]) }).length, 0);
  const [award] = promotionAwards({ ...input, visitsByPromotion: new Map([[9, 5]]) });
  assert.equal(award.points, 50);
  assert.equal(award.reference, "promo:9:user:u1");
});

test("promotion validation explains what to fix", () => {
  assert.match(validatePromotion({ name: "", kind: "multiplier" }).error, /name/);
  assert.match(validatePromotion({ name: "X", kind: "multiplier", multiplier: 9 }).error, /2x to 5x/);
  assert.match(validatePromotion({ name: "X", kind: "visit_challenge", bonusPoints: 5, visitsRequired: 3 }).error, /start and end date/);
  assert.match(validatePromotion({ name: "X", kind: "flat_bonus", bonusPoints: 5, startTime: "16:00", endTime: "14:00" }).error, /end is after/);
  const ok = validatePromotion({ name: "Slow hours", kind: "flat_bonus", bonusPoints: "10", days: [5, 1, 1], startTime: "14:00", endTime: "16:00" });
  assert.deepEqual(ok.value.days, [1, 5]);
  assert.equal(describePromotion({ ...base, ...ok.value }), "10 bonus points per order, Mon, Fri, 2 PM to 4 PM");
});

test("order-complete guard only writes bonus points for a completed order, once", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE customer_profiles (user_id TEXT PRIMARY KEY, points INTEGER NOT NULL DEFAULT 0, lifetime_points INTEGER NOT NULL DEFAULT 0, updated_at INTEGER);
    CREATE TABLE loyalty_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, order_id INTEGER UNIQUE, reference TEXT UNIQUE, points_change INTEGER NOT NULL, balance_after INTEGER NOT NULL, reason TEXT NOT NULL, created_at INTEGER);
    CREATE TABLE orders (id INTEGER PRIMARY KEY, status TEXT NOT NULL);
    INSERT INTO customer_profiles (user_id) VALUES ('referrer');
    INSERT INTO orders (id, status) VALUES (1, 'ready');`);
  const run = () => {
    for (const statement of loyaltyChangeStatements({ userId: "referrer", points: 25, reference: "referral:friend", reason: "referral_first_order", lifetimeCredit: true, onlyIfOrderComplete: 1 })) {
      db.prepare(statement.sql).run(...statement.values);
    }
  };
  const points = () => db.prepare("SELECT points FROM customer_profiles WHERE user_id = 'referrer'").get().points;
  run();
  assert.equal(points(), 0, "order not complete yet");
  db.exec("UPDATE orders SET status = 'complete' WHERE id = 1");
  run();
  run();
  assert.equal(points(), 25, "paid once");
});
