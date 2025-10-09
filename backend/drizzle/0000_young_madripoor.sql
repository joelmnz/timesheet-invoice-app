CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`email` text,
	`contact_person` text,
	`default_hourly_rate` real DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
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
CREATE INDEX `expenses_project_invoiced_idx` ON `expenses` (`project_id`,`is_invoiced`);--> statement-breakpoint
CREATE INDEX `expenses_expense_date_idx` ON `expenses` (`expense_date`);--> statement-breakpoint
CREATE TABLE `invoice_line_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`linked_time_entry_id` integer,
	`linked_expense_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linked_time_entry_id`) REFERENCES `time_entries`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`linked_expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `invoice_line_items_invoice_id_idx` ON `invoice_line_items` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text NOT NULL,
	`client_id` integer NOT NULL,
	`project_id` integer NOT NULL,
	`date_invoiced` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'Unpaid' NOT NULL,
	`subtotal` real NOT NULL,
	`total` real NOT NULL,
	`notes` text,
	`date_paid` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (`number`);--> statement-breakpoint
CREATE INDEX `invoices_date_invoiced_idx` ON `invoices` (`date_invoiced`);--> statement-breakpoint
CREATE INDEX `invoices_status_due_date_idx` ON `invoices` (`status`,`due_date`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`name` text NOT NULL,
	`hourly_rate` real DEFAULT 0 NOT NULL,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `projects_client_active_idx` ON `projects` (`client_id`,`active`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`company_name` text DEFAULT 'Example Company' NOT NULL,
	`company_address` text DEFAULT '',
	`company_email` text DEFAULT '',
	`company_phone` text DEFAULT '',
	`invoice_footer_markdown` text DEFAULT '',
	`next_invoice_number` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text,
	`total_hours` real DEFAULT 0 NOT NULL,
	`is_invoiced` integer DEFAULT false NOT NULL,
	`invoice_id` integer,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `time_entries_project_invoiced_idx` ON `time_entries` (`project_id`,`is_invoiced`);--> statement-breakpoint
CREATE INDEX `time_entries_start_at_idx` ON `time_entries` (`start_at`);