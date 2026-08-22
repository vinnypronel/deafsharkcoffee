CREATE TABLE `store_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`prep_time_minutes` integer DEFAULT 15 NOT NULL,
	`paused` integer DEFAULT false NOT NULL,
	`open_time` text DEFAULT '06:00' NOT NULL,
	`close_time` text DEFAULT '20:00' NOT NULL,
	`cutoff_minutes` integer DEFAULT 30 NOT NULL,
	`scheduling_enabled` integer DEFAULT true NOT NULL,
	`scheduling_horizon_minutes` integer DEFAULT 240 NOT NULL,
	`slot_minutes` integer DEFAULT 15 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `fulfillment_type` text DEFAULT 'asap' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `scheduled_for` integer;