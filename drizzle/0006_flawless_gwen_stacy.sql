CREATE TABLE `contact_inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`topic` text DEFAULT 'general' NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contact_status_created_at` ON `contact_inquiries` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `employment_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`position` text NOT NULL,
	`employment_type` text NOT NULL,
	`days_json` text DEFAULT '[]' NOT NULL,
	`shift` text,
	`start_date` text,
	`is_adult` integer NOT NULL,
	`experience` text,
	`why` text,
	`resume_key` text,
	`resume_name` text,
	`resume_type` text,
	`resume_size` integer,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_employment_status_created_at` ON `employment_applications` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `newsletter_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`consent_text` text NOT NULL,
	`consent_source` text DEFAULT 'website_footer' NOT NULL,
	`consented_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_newsletter_email_unique` ON `newsletter_subscriptions` (`email`);