CREATE TABLE `menu_content` (
	`product_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`price_cents` integer NOT NULL,
	`photo_url` text,
	`updated_at` integer NOT NULL
);
