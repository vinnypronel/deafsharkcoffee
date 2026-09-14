ALTER TABLE `customer_profiles` ADD `birthday_set_at` integer;--> statement-breakpoint
UPDATE `customer_profiles` SET `birthday_set_at` = `created_at` WHERE `birthday_month` IS NOT NULL AND `birthday_day` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `referral_code` text;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `referred_by_user_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_customer_referral_code_unique` ON `customer_profiles` (`referral_code`);--> statement-breakpoint
CREATE INDEX `idx_customer_referred_by` ON `customer_profiles` (`referred_by_user_id`);--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`start_date` text,
	`end_date` text,
	`days_json` text DEFAULT '[]' NOT NULL,
	`start_time` text,
	`end_time` text,
	`multiplier` integer,
	`bonus_points` integer,
	`product_id` text,
	`visits_required` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
