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
}) {
  if (!input.userId || !input.reference || !Number.isSafeInteger(input.points) || input.points === 0) {
    throw new Error("Invalid loyalty adjustment.");
  }
  return [
    {
      sql: `INSERT INTO loyalty_transactions
        (user_id, order_id, reference, points_change, balance_after, reason, created_at)
        SELECT user_id, ?, ?, ?, points + ?, ?, unixepoch()
        FROM customer_profiles WHERE user_id = ? AND points + ? >= 0
        ${input.requirePreviousChange ? "AND changes() = 1" : ""}
        ON CONFLICT DO NOTHING`,
      values: [input.orderId ?? null, input.reference, input.points, input.points, input.reason, input.userId, input.points],
    },
    {
      sql: `UPDATE customer_profiles
        SET points = points + ?, lifetime_points = lifetime_points + ?, updated_at = unixepoch()
        WHERE user_id = ? AND changes() = 1`,
      values: [input.points, input.lifetimeCredit ? Math.max(0, input.points) : 0, input.userId],
    },
  ];
}
