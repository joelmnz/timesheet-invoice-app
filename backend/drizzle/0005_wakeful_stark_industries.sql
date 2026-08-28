PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer,
	`expense_date` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`is_billable` integer DEFAULT true NOT NULL,
	`is_invoiced` integer DEFAULT false NOT NULL,
	`invoice_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_expenses`("id", "project_id", "expense_date", "description", "amount", "is_billable", "is_invoiced", "invoice_id", "created_at", "updated_at") SELECT "id", "project_id", "expense_date", "description", "amount", "is_billable", "is_invoiced", "invoice_id", "created_at", "updated_at" FROM `expenses`;--> statement-breakpoint
DROP TABLE `expenses`;--> statement-breakpoint
ALTER TABLE `__new_expenses` RENAME TO `expenses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `expenses_project_invoiced_idx` ON `expenses` (`project_id`,`is_invoiced`);--> statement-breakpoint
CREATE INDEX `expenses_expense_date_idx` ON `expenses` (`expense_date`);