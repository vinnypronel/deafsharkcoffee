import { storeClock } from "./store-clock.ts";

/* Points promotions the shop runs from the dashboard.

   Every promotion has an optional date range, optional days of the week and an
   optional time of day, all judged in store time against when the order was
   placed. That one shape covers double points weekends, slow-hour bonuses and
   seasonal product pushes. Visit challenges also count the member's completed
   orders inside the promotion's dates.

   Bonuses only ever add points. They never change what a customer pays. */

export const PROMOTION_KINDS = ["multiplier", "flat_bonus", "product_bonus", "visit_challenge"] as const;
export type PromotionKind = typeof PROMOTION_KINDS[number];

export type Promotion = {
  id: number;
  name: string;
  kind: PromotionKind;
  active: boolean;
  /** "YYYY-MM-DD" inclusive, or null for open ended. */
  startDate: string | null;
  endDate: string | null;
  /** 0 is Sunday. Empty means every day. */
  days: number[];
  /** "HH:MM", start inclusive and end exclusive. Both null means all day. */
  startTime: string | null;
  endTime: string | null;
  /** multiplier only: 2 means double points. */
  multiplier: number | null;
  /** flat_bonus, product_bonus (per unit) and visit_challenge. */
  bonusPoints: number | null;
  productId: string | null;
  visitsRequired: number | null;
};

export type PromotionFields = Omit<Promotion, "id">;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function wholeNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

/** Validates a dashboard draft into clean fields, or explains what to fix. */
export function validatePromotion(input: Record<string, unknown>): { value: PromotionFields } | { error: string } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 80) return { error: "Give the promotion a short name customers will recognize." };
  const kind = input.kind as PromotionKind;
  if (!PROMOTION_KINDS.includes(kind)) return { error: "Choose a promotion type." };

  const startDate = typeof input.startDate === "string" && input.startDate ? input.startDate : null;
  const endDate = typeof input.endDate === "string" && input.endDate ? input.endDate : null;
  if ((startDate && !DATE.test(startDate)) || (endDate && !DATE.test(endDate))) return { error: "Enter valid start and end dates." };
  if (startDate && endDate && endDate < startDate) return { error: "The end date is before the start date." };
  if (kind === "visit_challenge" && (!startDate || !endDate)) return { error: "A visit challenge needs a start and end date." };

  const days = Array.isArray(input.days)
    ? [...new Set(input.days.map(Number))].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort((a, b) => a - b)
    : [];

  const startTime = typeof input.startTime === "string" && input.startTime ? input.startTime : null;
  const endTime = typeof input.endTime === "string" && input.endTime ? input.endTime : null;
  if ((startTime === null) !== (endTime === null)) return { error: "Set both a start and end time, or leave both blank for all day." };
  if (startTime && endTime && (!TIME.test(startTime) || !TIME.test(endTime) || endTime <= startTime)) {
    return { error: "Enter a time window where the end is after the start." };
  }

  let multiplier: number | null = null;
  let bonusPoints: number | null = null;
  let productId: string | null = null;
  let visitsRequired: number | null = null;

  if (kind === "multiplier") {
    multiplier = wholeNumber(input.multiplier);
    if (multiplier === null || multiplier < 2 || multiplier > 5) return { error: "Choose a points multiplier from 2x to 5x." };
  } else {
    bonusPoints = wholeNumber(input.bonusPoints);
    if (bonusPoints === null || bonusPoints < 1 || bonusPoints > 500) return { error: "Bonus points must be between 1 and 500." };
  }
  if (kind === "product_bonus") {
    productId = typeof input.productId === "string" && input.productId ? input.productId : null;
    if (!productId) return { error: "Choose the menu item that earns the bonus." };
  }
  if (kind === "visit_challenge") {
    visitsRequired = wholeNumber(input.visitsRequired);
    if (visitsRequired === null || visitsRequired < 2 || visitsRequired > 50) return { error: "A visit challenge needs between 2 and 50 orders." };
  }

  return {
    value: { name, kind, active: input.active !== false, startDate, endDate, days, startTime, endTime, multiplier, bonusPoints, productId, visitsRequired },
  };
}

/** Whether the promotion applies at this moment, in store time. */
export function promotionApplies(promotion: Promotion, at: Date) {
  if (!promotion.active) return false;
  const clock = storeClock(at);
  if (promotion.startDate && clock.date < promotion.startDate) return false;
  if (promotion.endDate && clock.date > promotion.endDate) return false;
  if (promotion.days.length > 0 && !promotion.days.includes(clock.weekday)) return false;
  if (promotion.startTime && promotion.endTime && (clock.time < promotion.startTime || clock.time >= promotion.endTime)) return false;
  return true;
}

/** Whether the promotion is still to come or running today, for the customer's rewards card. */
export function promotionIsCurrent(promotion: Promotion, at: Date) {
  if (!promotion.active) return false;
  const clock = storeClock(at);
  if (promotion.startDate && clock.date < promotion.startDate) return false;
  if (promotion.endDate && clock.date > promotion.endDate) return false;
  return true;
}

export type PromotionAward = { promotionId: number; points: number; reference: string; reason: string };

/* Multipliers do not stack: the biggest one running wins. Flat, product and
   challenge bonuses add on top of it. */
export function promotionAwards(input: {
  promotions: Promotion[];
  orderId: number;
  userId: string;
  placedAt: Date;
  basePoints: number;
  items: Array<{ id: string; quantity: number }>;
  /** Completed orders by this member inside each challenge's dates, including this one. */
  visitsByPromotion?: Map<number, number>;
}): PromotionAward[] {
  const awards: PromotionAward[] = [];
  const running = input.promotions.filter((promotion) => promotionApplies(promotion, input.placedAt));
  const reason = (promotion: Promotion) => `promotion:${promotion.name}`;

  const bestMultiplier = running
    .filter((promotion) => promotion.kind === "multiplier" && (promotion.multiplier ?? 1) > 1)
    .sort((a, b) => (b.multiplier ?? 0) - (a.multiplier ?? 0))[0];
  if (bestMultiplier && input.basePoints > 0) {
    awards.push({
      promotionId: bestMultiplier.id,
      points: input.basePoints * ((bestMultiplier.multiplier ?? 1) - 1),
      reference: `promo:${bestMultiplier.id}:order:${input.orderId}`,
      reason: reason(bestMultiplier),
    });
  }

  for (const promotion of running) {
    if (promotion.kind === "flat_bonus" && promotion.bonusPoints) {
      awards.push({ promotionId: promotion.id, points: promotion.bonusPoints, reference: `promo:${promotion.id}:order:${input.orderId}`, reason: reason(promotion) });
    }
    if (promotion.kind === "product_bonus" && promotion.bonusPoints && promotion.productId) {
      const units = input.items.filter((item) => item.id === promotion.productId).reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
      if (units > 0) {
        awards.push({ promotionId: promotion.id, points: promotion.bonusPoints * units, reference: `promo:${promotion.id}:order:${input.orderId}`, reason: reason(promotion) });
      }
    }
    if (promotion.kind === "visit_challenge" && promotion.bonusPoints && promotion.visitsRequired) {
      const visits = input.visitsByPromotion?.get(promotion.id) ?? 0;
      if (visits >= promotion.visitsRequired) {
        /* Keyed to the member rather than the order, so a challenge pays once. */
        awards.push({ promotionId: promotion.id, points: promotion.bonusPoints, reference: `promo:${promotion.id}:user:${input.userId}`, reason: reason(promotion) });
      }
    }
  }
  return awards;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function clockLabel(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 || 12;
  return minute ? `${twelve}:${String(minute).padStart(2, "0")} ${suffix}` : `${twelve} ${suffix}`;
}

function dateLabel(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

/** Plain-language summary, e.g. "Double points, Mon, Tue, 2 PM to 4 PM, through Oct 31". */
export function describePromotion(promotion: Promotion, productName?: string) {
  const what = promotion.kind === "multiplier"
    ? (promotion.multiplier === 2 ? "Double points" : promotion.multiplier === 3 ? "Triple points" : `${promotion.multiplier}x points`)
    : promotion.kind === "flat_bonus"
      ? `${promotion.bonusPoints} bonus points per order`
      : promotion.kind === "product_bonus"
        ? `${promotion.bonusPoints} bonus points per ${productName ?? "featured item"}`
        : `${promotion.bonusPoints} bonus points after ${promotion.visitsRequired} orders`;
  const parts = [what];
  if (promotion.days.length > 0 && promotion.days.length < 7) parts.push(promotion.days.map((day) => DAY_NAMES[day]).join(", "));
  if (promotion.startTime && promotion.endTime) parts.push(`${clockLabel(promotion.startTime)} to ${clockLabel(promotion.endTime)}`);
  if (promotion.startDate && promotion.endDate) parts.push(`${dateLabel(promotion.startDate)} to ${dateLabel(promotion.endDate)}`);
  else if (promotion.endDate) parts.push(`through ${dateLabel(promotion.endDate)}`);
  else if (promotion.startDate) parts.push(`from ${dateLabel(promotion.startDate)}`);
  return parts.join(", ");
}
