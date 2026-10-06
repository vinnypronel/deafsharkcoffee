CREATE TABLE `loyalty_point_lots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`source_reference` text NOT NULL,
	`points_earned` integer NOT NULL,
	`points_remaining` integer NOT NULL,
	`earned_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_loyalty_point_lot_reference_unique` ON `loyalty_point_lots` (`source_reference`);--> statement-breakpoint
CREATE INDEX `idx_loyalty_point_lot_user_expiry` ON `loyalty_point_lots` (`user_id`,`expires_at`);--> statement-breakpoint
INSERT INTO `loyalty_point_lots`
  (`user_id`, `source_reference`, `points_earned`, `points_remaining`, `earned_at`, `expires_at`)
WITH credits AS (
  SELECT id, user_id, reference, points_change, created_at,
    coalesce(sum(points_change) OVER (
      PARTITION BY user_id ORDER BY created_at, id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS credits_before
  FROM loyalty_transactions
  WHERE points_change > 0
), debits AS (
  SELECT user_id, coalesce(-sum(points_change), 0) AS points_spent
  FROM loyalty_transactions WHERE points_change < 0 GROUP BY user_id
)
SELECT credits.user_id, credits.reference, credits.points_change,
  max(0, credits.points_change - max(0, coalesce(debits.points_spent, 0) - credits.credits_before)),
  credits.created_at, credits.created_at + 31536000
FROM credits LEFT JOIN debits ON debits.user_id = credits.user_id;--> statement-breakpoint
UPDATE customer_profiles SET points = (
  SELECT coalesce(sum(points_remaining), 0) FROM loyalty_point_lots
  WHERE user_id = customer_profiles.user_id AND expires_at > unixepoch()
);
