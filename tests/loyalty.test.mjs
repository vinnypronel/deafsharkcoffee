import assert from "node:assert/strict";
import test from "node:test";
import {
  REWARD_TIERS,
  bestAvailableTier,
  isKeanEmail,
  nextTierProgress,
  pointsForSubtotal,
  resolveDiscount,
  welcomeOfferValue,
} from "../lib/loyalty.ts";

test("earns one point per whole dollar of subtotal", () => {
  assert.equal(pointsForSubtotal(0), 0);
  assert.equal(pointsForSubtotal(99), 0);
  assert.equal(pointsForSubtotal(100), 1);
  assert.equal(pointsForSubtotal(1066), 10);
  assert.equal(pointsForSubtotal(-500), 0);
});

test("progress points at the next tier", () => {
  const fresh = nextTierProgress(0);
  assert.equal(fresh.tier.points, 50);
  assert.equal(fresh.pointsAway, 50);
  assert.equal(fresh.percent, 0);

  const miguelsExample = nextTierProgress(63);
  assert.equal(miguelsExample.tier.valueCents, 700);
  assert.equal(miguelsExample.pointsAway, 37);

  const maxed = nextTierProgress(120);
  assert.equal(maxed.atTop, true);
  assert.equal(maxed.pointsAway, 0);
});

test("offers the best reward a balance can afford", () => {
  assert.equal(bestAvailableTier(49), null);
  assert.equal(bestAvailableTier(50)?.valueCents, 300);
  assert.equal(bestAvailableTier(99)?.valueCents, 300);
  assert.equal(bestAvailableTier(100)?.valueCents, 700);
});

test("accepts Kean addresses only", () => {
  assert.equal(isKeanEmail("Student@kean.edu"), "student@kean.edu");
  assert.equal(isKeanEmail(" someone@live.kean.edu "), "someone@live.kean.edu");
  assert.equal(isKeanEmail("someone@gmail.com"), "");
  assert.equal(isKeanEmail("someone@notkean.edu"), "");
  assert.equal(isKeanEmail("someone@kean.edu.evil.com"), "");
  assert.equal(isKeanEmail(null), "");
});

test("redeems a reward and never exceeds the subtotal", () => {
  const applied = resolveDiscount({ subtotalCents: 1200, choice: { kind: "reward", points: 100 }, pointsBalance: 100, studentVerified: false });
  assert.equal(applied.amountCents, 700);
  assert.equal(applied.pointsSpent, 100);

  const small = resolveDiscount({ subtotalCents: 450, choice: { kind: "reward", points: 100 }, pointsBalance: 100, studentVerified: false });
  assert.equal(small.amountCents, 450, "a $7 reward on a $4.50 order cannot pay out more than the order");
});

test("refuses a reward the balance cannot cover", () => {
  assert.throws(() => resolveDiscount({ subtotalCents: 1200, choice: { kind: "reward", points: 100 }, pointsBalance: 99, studentVerified: false }), /enough points/);
  assert.throws(() => resolveDiscount({ subtotalCents: 1200, choice: { kind: "reward", points: 75 }, pointsBalance: 500, studentVerified: false }), /not available/);
});

test("student discount is 10 percent and requires verification", () => {
  const applied = resolveDiscount({ subtotalCents: 1000, choice: { kind: "student" }, pointsBalance: 0, studentVerified: true });
  assert.equal(applied.amountCents, 100);
  assert.equal(applied.pointsSpent, 0);
  assert.throws(() => resolveDiscount({ subtotalCents: 1000, choice: { kind: "student" }, pointsBalance: 0, studentVerified: false }), /Verify your Kean email/);
});

test("only one discount applies to an order", () => {
  const reward = resolveDiscount({ subtotalCents: 2000, choice: { kind: "reward", points: 50 }, pointsBalance: 500, studentVerified: true });
  assert.equal(reward.kind, "reward");
  assert.equal(reward.amountCents, 300, "the student discount must not be added on top");
  assert.equal(REWARD_TIERS.length, 2);
});

test("welcome coupon takes half off the dearest drink only", () => {
  const cart = [
    { unitPriceCents: 500, quantity: 2, isDrink: true },
    { unitPriceCents: 775, quantity: 1, isDrink: true },
    { unitPriceCents: 1200, quantity: 1, isDrink: false },
  ];
  assert.equal(welcomeOfferValue(cart), 387, "half of the $7.75 drink, not the $12 food");

  const applied = resolveDiscount({
    subtotalCents: 2975, choice: { kind: "welcome" }, pointsBalance: 0,
    studentVerified: false, welcomeOfferAvailable: true, items: cart,
  });
  assert.equal(applied.kind, "welcome");
  assert.equal(applied.amountCents, 387);
  assert.equal(applied.pointsSpent, 0);
});

test("welcome coupon needs a drink and an unused offer", () => {
  const foodOnly = [{ unitPriceCents: 900, quantity: 1, isDrink: false }];
  assert.throws(() => resolveDiscount({ subtotalCents: 900, choice: { kind: "welcome" }, pointsBalance: 0, studentVerified: false, welcomeOfferAvailable: true, items: foodOnly }), /Add a drink/);
  assert.throws(() => resolveDiscount({ subtotalCents: 900, choice: { kind: "welcome" }, pointsBalance: 0, studentVerified: false, welcomeOfferAvailable: false, items: [{ unitPriceCents: 500, quantity: 1, isDrink: true }] }), /not available/);
});
