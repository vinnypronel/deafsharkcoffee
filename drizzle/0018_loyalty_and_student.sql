ALTER TABLE `customer_profiles` ADD `student_email` text;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `student_verified_at` integer;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `last_activity_at` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_kind` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `reward_points_spent` integer DEFAULT 0 NOT NULL;
