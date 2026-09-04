INSERT OR IGNORE INTO `store_settings` (
	`id`, `prep_time_minutes`, `paused`, `open_time`, `close_time`, `cutoff_minutes`,
	`scheduling_enabled`, `scheduling_horizon_minutes`, `slot_minutes`, `updated_at`
) VALUES (1, 15, false, '06:00', '20:00', 30, true, 240, 15, unixepoch());
--> statement-breakpoint
INSERT OR IGNORE INTO `featured_content` (`slot`, `product_id`, `category_label`, `title`, `button_label`, `price_cents`, `media_url`, `updated_at`) VALUES
	(1, 'strawberry-matcha', 'Beverages', 'Strawberry Matcha', 'Order online', 775, '/featured-strawberry-matcha.mp4', unixepoch()),
	(2, 'ocean-blend-bag', 'Coffee Beans', 'Ocean Blend', 'Order online', 1900, '/featured-ocean-blend.mp4', unixepoch()),
	(3, 'chicken-pesto', 'Sandwiches', 'Chicken Pesto', 'Order online', 775, '/featured-chicken-pesto.mp4', unixepoch());
--> statement-breakpoint
UPDATE `featured_content`
SET `button_label` = 'Order online', `updated_at` = unixepoch()
WHERE `slot` IN (1, 2, 3) AND `button_label` = 'Add to cart';
--> statement-breakpoint
INSERT INTO `events` (
	`title`, `description`, `date_label`, `time_label`, `location`, `entry_label`, `details`,
	`button_label`, `button_href`, `image_left_url`, `image_right_url`, `image_caption`,
	`published`, `sort_order`, `created_at`, `updated_at`
)
SELECT
	'Puppy Party',
	'An evening for the neighborhood and their dogs, hosted by Mango the Doxy. Free entry, a menu made for dogs, raffles and prizes through the night. BYOB.',
	'Friday, August 21, 2026',
	'6:00 to 9:00 PM',
	'900 Green Lane, Union NJ 07083',
	'Free entry',
	'BYOB, puppies, dog menu, raffles, prizes',
	'RSVP for Puppy Party · FREE',
	'/contact',
	'/events/puppy-mango.jpg',
	'/events/puppy-party-flyer.jpg',
	'Mango the Doxy, your host.',
	true,
	0,
	unixepoch(),
	unixepoch()
WHERE NOT EXISTS (SELECT 1 FROM `events`);
