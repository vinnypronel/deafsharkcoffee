ALTER TABLE `customer_profiles` ADD `terms_version` text;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `privacy_version` text;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD `age_guardian_confirmed_at` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `sms_opt_in` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `sms_consented_at` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `sms_consent_text` text;
