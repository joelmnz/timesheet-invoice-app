CREATE TABLE `api_keys` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text DEFAULT 'Default API Key' NOT NULL,
  `key_hash` text NOT NULL,
  `key_prefix` text NOT NULL,
  `key_last_four` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `last_used_at` text,
  `revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);
--> statement-breakpoint
CREATE INDEX `api_keys_active_idx` ON `api_keys` (`revoked_at`);
