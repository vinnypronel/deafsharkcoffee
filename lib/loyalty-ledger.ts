/** Execute both statements in ONE D1 batch. D1 rolls back the entire batch on
 * failure. changes() ties the balance update to this batch's successful insert,
 * so duplicate webhook deliveries and staff retries never award points twice. */
import { POINT_EXPIRATION_SECONDS } from "./loyalty.ts";

export function loyaltyChangeStatements(input: {
  userId: string;
  points: number;
  reference: string;
  reason: string;
  orderId?: number;
  lifetimeCredit?: boolean;
  requirePreviousChange?: boolean;
  /** Only write when this order is complete. Used for bonuses that ride along
   * with an order completion but are not chained to its update statement. */
  onlyIfOrderComplete?: number;
  /** Limit successful credits of one reason inside a rolling window. The count
   * and insert execute in the same D1 transaction, so concurrent awards cannot
   * both take the final available place. */
  creditWindow?: { reason: string; sinceEpoch: number; maxCredits: number };
  /** Abort the containing batch unless this adjustment actually changed the
   * profile. Used where a zero-change result must be surfaced as a conflict. */
  assertApplied?: boolean;
}) {
  if (!input.userId || !input.reference || !Number.isSafeInteger(input.points) || input.points === 0) {
    throw new Error("Invalid loyalty adjustment.");
  }
  const completionGuard = input.onlyIfOrderComplete !== undefined;
  const creditWindow = input.creditWindow;
  if (creditWindow && (
    !creditWindow.reason ||
    !Number.isSafeInteger(creditWindow.sinceEpoch) ||
    !Number.isSafeInteger(creditWindow.maxCredits) ||
    creditWindow.maxCredits < 1
  )) {
    throw new Error("Invalid loyalty credit window.");
  }
  const statements = [
    {
      sql: `INSERT INTO loyalty_transactions
        (user_id, order_id, reference, points_change, balance_after, reason, created_at)
        SELECT user_id, ?, ?, ?, points + ?, ?, unixepoch()
        FROM customer_profiles WHERE user_id = ? AND points + ? >= 0
        ${input.points < 0 ? "AND (SELECT coalesce(sum(points_remaining), 0) FROM loyalty_point_lots WHERE user_id = ? AND points_remaining > 0 AND expires_at > unixepoch()) >= ?" : ""}
        ${input.requirePreviousChange ? "AND changes() = 1" : ""}
        ${completionGuard ? "AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'complete')" : ""}
        ${creditWindow ? "AND (SELECT count(*) FROM loyalty_transactions WHERE user_id = ? AND reason = ? AND created_at >= ?) < ?" : ""}
        ON CONFLICT DO NOTHING`,
      values: [
        input.orderId ?? null, input.reference, input.points, input.points, input.reason, input.userId, input.points,
        ...(input.points < 0 ? [input.userId, -input.points] : []),
        ...(completionGuard ? [input.onlyIfOrderComplete] : []),
        ...(creditWindow ? [input.userId, creditWindow.reason, creditWindow.sinceEpoch, creditWindow.maxCredits] : []),
      ],
    },
    {
      sql: `UPDATE customer_profiles
        SET points = points + ?, lifetime_points = lifetime_points + ?, updated_at = unixepoch()
        WHERE user_id = ? AND changes() = 1`,
      values: [input.points, input.lifetimeCredit ? Math.max(0, input.points) : 0, input.userId],
    },
  ];
  if (input.assertApplied) {
    statements.push({
      sql: `INSERT INTO customer_profiles (user_id, email, display_name)
        SELECT user_id, email, display_name FROM customer_profiles
        WHERE user_id = ? AND changes() <> 1`,
      values: [input.userId],
    });
    /* A successful assertion inserts zero rows, so restore a one-row changes()
       result for the following point-lot write. A failed assertion aborts the
       batch on the profile primary key before this statement can run. */
    statements.push({
      sql: "UPDATE customer_profiles SET updated_at = updated_at WHERE user_id = ?",
      values: [input.userId],
    });
  }
  if (input.points > 0) {
    statements.push({
      sql: `INSERT INTO loyalty_point_lots
        (user_id, source_reference, points_earned, points_remaining, earned_at, expires_at)
        SELECT ?, ?, ?, ?, unixepoch(), unixepoch() + ? WHERE changes() = 1
        ON CONFLICT(source_reference) DO NOTHING`,
      values: [input.userId, input.reference, input.points, input.points, POINT_EXPIRATION_SECONDS],
    });
  } else {
    statements.push({
      sql: `WITH eligible AS (
          SELECT id,
            coalesce(sum(points_remaining) OVER (
              ORDER BY earned_at, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ), 0) AS points_before
          FROM loyalty_point_lots
          WHERE user_id = ? AND points_remaining > 0 AND expires_at > unixepoch()
        )
        UPDATE loyalty_point_lots
        SET points_remaining = max(0, points_remaining - max(0, ? - (
          SELECT points_before FROM eligible WHERE eligible.id = loyalty_point_lots.id
        )))
        WHERE id IN (SELECT id FROM eligible WHERE points_before < ?) AND changes() = 1`,
      values: [input.userId, -input.points, -input.points],
    });
  }
  return statements;
}

/** Lazily expires old award lots and reconciles the cached profile balance. */
export function loyaltyBalanceStatements(userId: string) {
  return [
    { sql: "UPDATE loyalty_point_lots SET points_remaining = 0 WHERE user_id = ? AND points_remaining > 0 AND expires_at <= unixepoch()", values: [userId] },
    { sql: `UPDATE customer_profiles SET points = (
      SELECT coalesce(sum(points_remaining), 0) FROM loyalty_point_lots
      WHERE user_id = ? AND points_remaining > 0 AND expires_at > unixepoch()
    ), updated_at = unixepoch() WHERE user_id = ?`, values: [userId, userId] },
  ];
}

export async function refreshLoyaltyBalance(db: D1Database, userId: string) {
  await db.batch(loyaltyBalanceStatements(userId).map((statement) => db.prepare(statement.sql).bind(...statement.values)));
}

export async function refreshAllLoyaltyBalances(db: D1Database) {
  await db.batch([
    db.prepare("UPDATE loyalty_point_lots SET points_remaining = 0 WHERE points_remaining > 0 AND expires_at <= unixepoch()"),
    db.prepare(`UPDATE customer_profiles SET points = coalesce((
      SELECT sum(points_remaining) FROM loyalty_point_lots
      WHERE user_id = customer_profiles.user_id AND points_remaining > 0 AND expires_at > unixepoch()
    ), 0), updated_at = unixepoch()`),
  ]);
}
