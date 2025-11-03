PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text NOT NULL,
	`client_id` integer NOT NULL,
	`project_id` integer NOT NULL,
	`date_invoiced` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`subtotal` real NOT NULL,
	`total` real NOT NULL,
	`notes` text,
	`date_sent` text,
	`date_paid` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_invoices`("id", "number", "client_id", "project_id", "date_invoiced", "due_date", "status", "subtotal", "total", "notes", "date_sent", "date_paid", "created_at", "updated_at") SELECT "id", "number", "client_id", "project_id", "date_invoiced", "due_date", "status", "subtotal", "total", "notes", NULL, "date_paid", "created_at", "updated_at" FROM `invoices`;--> statement-breakpoint
DROP TABLE `invoices`;--> statement-breakpoint
ALTER TABLE `__new_invoices` RENAME TO `invoices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
UPDATE `invoices` SET `status` = 'Sent', `date_sent` = `date_invoiced` WHERE `status` = 'Unpaid';--> statement-breakpoint--> statement-breakpoint
UPDATE `invoices` SET `status` = 'Sent', `date_sent` = `date_invoiced` WHERE `status` = 'Unpaid';--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (`number`);--> statement-breakpoint
CREATE INDEX `invoices_date_invoiced_idx` ON `invoices` (`date_invoiced`);--> statement-breakpoint
CREATE INDEX `invoices_status_due_date_idx` ON `invoices` (`status`,`due_date`);