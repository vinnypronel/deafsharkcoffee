CREATE TABLE `store_settings_new` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`prep_time_minutes` integer DEFAULT 15 NOT NULL,
	`paused` integer DEFAULT false NOT NULL,
	`open_time` text DEFAULT '06:00' NOT NULL,
	`close_time` text DEFAULT '18:30' NOT NULL,
	`cutoff_minutes` integer DEFAULT 30 NOT NULL,
	`scheduling_enabled` integer DEFAULT true NOT NULL,
	`scheduling_horizon_minutes` integer DEFAULT 240 NOT NULL,
	`slot_minutes` integer DEFAULT 15 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `store_settings_new` (
	`id`, `prep_time_minutes`, `paused`, `open_time`, `close_time`, `cutoff_minutes`,
	`scheduling_enabled`, `scheduling_horizon_minutes`, `slot_minutes`, `updated_at`
)
SELECT
	`id`, `prep_time_minutes`, `paused`, `open_time`, `close_time`, `cutoff_minutes`,
	`scheduling_enabled`, `scheduling_horizon_minutes`, `slot_minutes`, `updated_at`
FROM `store_settings`;
--> statement-breakpoint
DROP TABLE `store_settings`;
--> statement-breakpoint
ALTER TABLE `store_settings_new` RENAME TO `store_settings`;
--> statement-breakpoint
UPDATE `store_settings`
SET `open_time` = '06:00',
    `close_time` = '18:30',
    `updated_at` = unixepoch()
WHERE `id` = 1;
