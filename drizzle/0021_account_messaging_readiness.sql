UPDATE `customer_profiles`
SET `student_email` = lower(trim(`student_email`))
WHERE `student_email` IS NOT NULL;--> statement-breakpoint
WITH `ranked_student_emails` AS (
  SELECT
    `user_id`,
    row_number() OVER (
      PARTITION BY lower(`student_email`)
      ORDER BY `student_verified_at` ASC, `created_at` ASC, `user_id` ASC
    ) AS `position`
  FROM `customer_profiles`
  WHERE `student_email` IS NOT NULL
)
UPDATE `customer_profiles`
SET `student_email` = NULL, `student_verified_at` = NULL
WHERE `user_id` IN (
  SELECT `user_id` FROM `ranked_student_emails` WHERE `position` > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_customer_student_email_normalized_unique`
ON `customer_profiles` (lower(`student_email`))
WHERE `student_email` IS NOT NULL;--> statement-breakpoint
CREATE TABLE `order_notifications` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `order_id` integer NOT NULL,
  `notification_type` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `provider_message_id` text,
  `last_error` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `claimed_at` integer,
  `sent_at` integer,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_order_notification_order_type_unique`
ON `order_notifications` (`order_id`, `notification_type`);--> statement-breakpoint
CREATE INDEX `idx_order_notification_status_created_at`
ON `order_notifications` (`status`, `created_at`);
