CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`date_label` text NOT NULL,
	`time_label` text NOT NULL,
	`location` text NOT NULL,
	`entry_label` text NOT NULL,
	`details` text NOT NULL,
	`button_label` text DEFAULT 'Learn more' NOT NULL,
	`button_href` text DEFAULT '/contact' NOT NULL,
	`image_left_url` text NOT NULL,
	`image_right_url` text NOT NULL,
	`image_caption` text,
	`published` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_published_sort` ON `events` (`published`,`sort_order`);--> statement-breakpoint
CREATE TABLE `featured_content` (
	`slot` integer PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`category_label` text NOT NULL,
	`title` text NOT NULL,
	`button_label` text DEFAULT 'Add to cart' NOT NULL,
	`price_cents` integer NOT NULL,
	`media_url` text NOT NULL,
	`updated_at` integer NOT NULL
);
