/** Execute both statements in ONE D1 batch. D1 rolls back the entire batch on
 * failure. changes() ties the balance update to this batch's successful insert,
 * so duplicate webhook deliveries and staff retries never award points twice. */
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
        ${input.requirePreviousChange ? "AND changes() = 1" : ""}
        ${completionGuard ? "AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'complete')" : ""}
        ${creditWindow ? "AND (SELECT count(*) FROM loyalty_transactions WHERE user_id = ? AND reason = ? AND created_at >= ?) < ?" : ""}
        ON CONFLICT DO NOTHING`,
      values: [
        input.orderId ?? null, input.reference, input.points, input.points, input.reason, input.userId, input.points,
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
  }
  return statements;
}
