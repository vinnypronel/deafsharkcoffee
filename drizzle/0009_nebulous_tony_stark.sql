CREATE TABLE `member_offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`offer_type` text NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`issued_at` integer NOT NULL,
	`redeemed_at` integer,
	`redeemed_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_member_offer_user_type_unique` ON `member_offers` (`user_id`,`offer_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_member_offer_code_unique` ON `member_offers` (`code`);--> statement-breakpoint
CREATE INDEX `idx_member_offer_status_issued_at` ON `member_offers` (`status`,`issued_at`);--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `signup_bonus_awarded` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD `reference` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_loyalty_reference_unique` ON `loyalty_transactions` (`reference`);