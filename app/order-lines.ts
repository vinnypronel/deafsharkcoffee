import {
  DRINK_CATEGORIES,
  EXTRA_SHOT_PRICE,
  SYRUP_PRICE,
  hasMilkOptionsForProduct,
  menuProducts,
  modifierGroupsForProduct,
  syrupCounts,
  temperaturesForProduct,
  type ProductSelection,
} from "./menu-data";

/* One place that turns a saved order line into what people read: the item's
   own price, each extra with its charge, and the plain choices. The customer's
   order page, their account, the counter ticket and the order history all use
   it, so every screen shows the same numbers. */

export type StoredLineItem = {
  id?: string;
  name: string;
  quantity: number;
  /** Dollars per unit, including every paid extra. */
  unitPrice?: number;
  options?: string[];
  selection?: ProductSelection;
};

export type PricedDetail = { label: string; cents?: number };

export type ItemBreakdown = {
  /** Price of one unit before its paid extras; absent when it cannot be worked out. */
  baseCents?: number;
  /** Every choice, in reading order; paid ones carry their charge. */
  details: PricedDetail[];
  /** Whole line: unit price times quantity. */
  lineCents?: number;
};

const cents = (dollars: number) => Math.round(dollars * 100);

export function money(centsValue: number) {
  return `$${(centsValue / 100).toFixed(2)}`;
}

export function itemBreakdown(item: StoredLineItem): ItemBreakdown {
  const unitCents = typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice) ? cents(item.unitPrice) : undefined;
  const lineCents = unitCents === undefined ? undefined : unitCents * Math.max(1, item.quantity || 1);
  const product = item.id ? menuProducts.find((candidate) => candidate.id === item.id) : undefined;
  const selection = item.selection;
  if (!product || !selection) {
    return { details: (item.options ?? []).map((label) => ({ label })), lineCents, baseCents: unitCents };
  }

  const details: PricedDetail[] = [];
  const isDrink = DRINK_CATEGORIES.includes(product.category);
  const isSmoothie = Boolean(product.bases?.length);
  const temperature = selection.temperature;
  const sizeChoices = temperature === "Hot" ? product.sizing?.hot : temperature === "Iced" ? product.sizing?.iced : undefined;
  if (product.flavors?.length && selection.flavor) details.push({ label: `${isDrink ? "Flavor" : "Choice"}: ${selection.flavor}` });
  if (isDrink && temperature && temperaturesForProduct(product).length > 1) details.push({ label: `Temperature: ${temperature}` });
  if (isDrink && selection.base) details.push({ label: `Base: ${selection.base}` });
  if (isDrink && selection.milk && (isSmoothie ? selection.base === "Milk" : hasMilkOptionsForProduct(product))) {
    details.push({ label: `Milk: ${selection.milk}` });
  }
  if (selection.size && (isDrink ? Boolean(sizeChoices?.length) : true)) details.push({ label: `Size: ${selection.size}` });
  for (const { flavor, count } of syrupCounts(isDrink ? selection.syrups ?? [] : [])) {
    details.push({ label: `Syrup: ${flavor}${count > 1 ? ` x${count}` : ""}`, cents: cents(SYRUP_PRICE) * count });
  }
  if (isDrink && selection.extraShot) {
    details.push({
      label: selection.extraShot === 1 ? "Extra shot" : `${selection.extraShot} extra shots`,
      cents: cents(selection.extraShot * EXTRA_SHOT_PRICE),
    });
  }
  for (const group of modifierGroupsForProduct(product, temperature)) {
    for (const selected of selection.modifiers?.[group.label] ?? []) {
      const price = group.options.find((option) => option.label === selected)?.price ?? 0;
      details.push({ label: `${group.label}: ${selected}`, cents: price ? cents(price) : undefined });
    }
  }
  if (selection.notes) details.push({ label: `Note: ${selection.notes}` });

  /* The base is what is left of the charged unit price after the paid extras,
     so the lines always add up to what the customer was actually charged, even
     if a price has changed since the order was placed. */
  const extrasCents = details.reduce((total, detail) => total + (detail.cents ?? 0), 0);
  const baseCents = unitCents === undefined ? undefined : unitCents - extrasCents;
  return { baseCents, details, lineCents };
}

export type OrderMoney = {
  subtotalCents?: number | null;
  discountCents?: number | null;
  discountKind?: string | null;
  rewardPointsSpent?: number | null;
  taxCents?: number | null;
  totalCents: number;
};

const DISCOUNT_NAMES: Record<string, string> = {
  welcome: "Welcome coupon, 50% off one drink",
  reward: "Rewards points",
  student: "Kean student discount",
};

/** Subtotal, discount, tax and total lines. Orders saved before these were stored show the total only. */
export function orderTotalLines(order: OrderMoney): Array<{ label: string; cents: number; strong?: boolean }> {
  const lines: Array<{ label: string; cents: number; strong?: boolean }> = [];
  if (typeof order.subtotalCents === "number") lines.push({ label: "Subtotal", cents: order.subtotalCents });
  if (order.discountCents) {
    const name = (order.discountKind && DISCOUNT_NAMES[order.discountKind])
      || (order.rewardPointsSpent ? `Rewards (${order.rewardPointsSpent} points)` : "Discount");
    lines.push({ label: name, cents: -order.discountCents });
  }
  if (typeof order.taxCents === "number") lines.push({ label: "NJ sales tax (6.625%)", cents: order.taxCents });
  lines.push({ label: "Total", cents: order.totalCents, strong: true });
  return lines;
}

export function signedMoney(centsValue: number) {
  return centsValue < 0 ? `-${money(-centsValue)}` : money(centsValue);
}
