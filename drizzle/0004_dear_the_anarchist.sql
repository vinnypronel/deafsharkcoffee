ALTER TABLE `account` ADD `issuer` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_account_issuer_account_id` ON `account` (`issuer`,`account_id`);