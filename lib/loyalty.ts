/* Deaf Shark Rewards: earning, reward tiers, and the Kean student discount.

   Pure functions so the rules can be tested without a database or a browser.
   Every amount is in cents and every rate is integer maths: money is never
   held in a float. */

/** One point per whole dollar of subtotal, before tax and before discounts. */
export function pointsForSubtotal(subtotalCents: number) {
  if (!Number.isFinite(subtotalCents) || subtotalCents <= 0) return 0;
  return Math.floor(subtotalCents / 100);
}

export type RewardTier = { points: number; valueCents: number; label: string };

/** Redemption tiers, cheapest first. */
export const REWARD_TIERS: RewardTier[] = [
  { points: 50, valueCents: 300, label: "$3 reward" },
  { points: 100, valueCents: 700, label: "$7 reward" },
];

export const STUDENT_DISCOUNT_PERCENT = 10;

/** Signup coupon: half off a single drink, one use, online only. */
export const WELCOME_OFFER_TYPE = "signup_half_off_drink";
export const WELCOME_OFFER_PERCENT = 50;
export const WELCOME_OFFER_LABEL = "50% off one drink";

/** The tier a balance can afford right now, or null. Highest affordable wins. */
export function bestAvailableTier(points: number) {
  let best: RewardTier | null = null;
  for (const tier of REWARD_TIERS) if (points >= tier.points) best = tier;
  return best;
}

/** The tier being worked toward, and how many points remain. */
export function nextTierProgress(points: number) {
  const next = REWARD_TIERS.find((tier) => points < tier.points);
  if (!next) {
    const top = REWARD_TIERS[REWARD_TIERS.length - 1];
    return { tier: top, pointsAway: 0, percent: 100, atTop: true };
  }
  const previous = [...REWARD_TIERS].reverse().find((tier) => tier.points <= points);
  const floor = previous ? previous.points : 0;
  const span = next.points - floor;
  const gained = points - floor;
  return {
    tier: next,
    pointsAway: next.points - points,
    percent: span > 0 ? Math.max(0, Math.min(100, Math.round((gained / span) * 100))) : 0,
    atTop: false,
  };
}

export function findTier(points: unknown) {
  return REWARD_TIERS.find((tier) => tier.points === points) ?? null;
}

/** Kean issues student addresses on this domain. Case and spacing are ignored. */
export function isKeanEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@(?:[a-z0-9-]+\.)*kean\.edu$/.test(email) ? email : "";
}

export type DiscountChoice =
  | { kind: "none" }
  | { kind: "reward"; points: number }
  | { kind: "student" }
  | { kind: "welcome" };

/** A cart line, reduced to what the discount rules need. */
export type DiscountableItem = { unitPriceCents: number; quantity: number; isDrink: boolean };

/* The coupon covers one drink, so it is worth half of the dearest drink in the
   basket, counted one unit at a time. Applying it to the cheapest would be a
   worse deal than the customer expects from "any drink". */
export function welcomeOfferValue(items: DiscountableItem[]) {
  let dearestDrink = 0;
  for (const item of items) {
    if (!item.isDrink || item.quantity < 1) continue;
    if (item.unitPriceCents > dearestDrink) dearestDrink = item.unitPriceCents;
  }
  return Math.floor((dearestDrink * WELCOME_OFFER_PERCENT) / 100);
}

export type AppliedDiscount = {
  kind: "reward" | "student" | "welcome" | null;
  amountCents: number;
  pointsSpent: number;
  label: string;
};

/* One discount per order. Miguel's rule is that a reward cannot be combined
   with the student discount, so the two are resolved here rather than being
   added together anywhere. */
export function resolveDiscount(input: {
  subtotalCents: number;
  choice: DiscountChoice;
  pointsBalance: number;
  studentVerified: boolean;
  welcomeOfferAvailable?: boolean;
  items?: DiscountableItem[];
}): AppliedDiscount {
  const none: AppliedDiscount = { kind: null, amountCents: 0, pointsSpent: 0, label: "" };
  if (input.subtotalCents <= 0) return none;

  if (input.choice.kind === "reward") {
    const tier = findTier(input.choice.points);
    if (!tier) throw new Error("That reward is not available.");
    if (input.pointsBalance < tier.points) throw new Error("You do not have enough points for that reward yet.");
    return {
      kind: "reward",
      amountCents: Math.min(tier.valueCents, input.subtotalCents),
      pointsSpent: tier.points,
      label: tier.label,
    };
  }

  if (input.choice.kind === "welcome") {
    if (!input.welcomeOfferAvailable) throw new Error("That welcome offer is not available on this account.");
    const value = welcomeOfferValue(input.items ?? []);
    if (value <= 0) throw new Error("Add a drink to use your welcome offer.");
    return {
      kind: "welcome",
      amountCents: Math.min(value, input.subtotalCents),
      pointsSpent: 0,
      label: WELCOME_OFFER_LABEL,
    };
  }

  if (input.choice.kind === "student") {
    if (!input.studentVerified) throw new Error("Verify your Kean email to use the student discount.");
    return {
      kind: "student",
      amountCents: Math.floor((input.subtotalCents * STUDENT_DISCOUNT_PERCENT) / 100),
      pointsSpent: 0,
      label: `${STUDENT_DISCOUNT_PERCENT}% Kean student discount`,
    };
  }

  return none;
}
