import { desc } from "drizzle-orm";
import { getDb } from "../db";
import { promotions } from "../db/schema";
import { PROMOTION_KINDS, type Promotion, type PromotionKind } from "./promotions.ts";

type PromotionRow = typeof promotions.$inferSelect;

export function promotionFromRow(row: PromotionRow): Promotion {
  let days: number[] = [];
  try {
    const parsed = JSON.parse(row.daysJson) as unknown;
    if (Array.isArray(parsed)) days = parsed.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  } catch {
    days = [];
  }
  return {
    id: row.id,
    name: row.name,
    kind: (PROMOTION_KINDS.includes(row.kind as PromotionKind) ? row.kind : "flat_bonus") as PromotionKind,
    active: row.active,
    startDate: row.startDate,
    endDate: row.endDate,
    days,
    startTime: row.startTime,
    endTime: row.endTime,
    multiplier: row.multiplier,
    bonusPoints: row.bonusPoints,
    productId: row.productId,
    visitsRequired: row.visitsRequired,
  };
}

export async function loadPromotions() {
  const rows = await getDb().select().from(promotions).orderBy(desc(promotions.createdAt)).limit(200);
  return rows.map(promotionFromRow);
}
