DROP INDEX IF EXISTS `api_keys_active_idx`;
--> statement-breakpoint
CREATE TABLE `api_keys_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_last_four` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
INSERT INTO `api_keys_new` (`id`, `name`, `key_hash`, `key_prefix`, `key_last_four`, `created_at`, `last_used_at`)
SELECT `id`, `name`, `key_hash`, `key_prefix`, `key_last_four`, `created_at`, `last_used_at`
FROM `api_keys` WHERE `revoked_at` IS NULL;
--> statement-breakpoint
DROP TABLE `api_keys`;
--> statement-breakpoint
ALTER TABLE `api_keys_new` RENAME TO `api_keys`;
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_name_unique` ON `api_keys` (`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);
