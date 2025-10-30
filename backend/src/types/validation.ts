import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Settings schemas
export const updateSettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().optional(),
  companyEmail: z.string().email().or(z.literal('')).optional(),
  companyPhone: z.string().optional(),
  invoiceFooterMarkdown: z.string().max(5000, 'Invoice footer must be less than 5000 characters').optional(),
  nextInvoiceNumber: z.number().int().positive(),
});

// Client schemas
export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  email: z.string().email().or(z.literal('')).optional(),
  contactPerson: z.string().optional(),
  defaultHourlyRate: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

// Project schemas
export const createProjectSchema = z.object({
  clientId: z.number().int().positive(),
  name: z.string().min(1, 'Name is required'),
  hourlyRate: z.number().min(0).default(0),
  notes: z.string().optional(),
  active: z.boolean().default(true),
});

export const updateProjectSchema = createProjectSchema.partial();

// Time entry schemas
export const createTimeEntrySchema = z.object({
  projectId: z.number().int().positive().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  note: z.string().optional(),
});

export const updateTimeEntrySchema = z.object({
  projectId: z.number().int().positive().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  note: z.string().optional(),
});

export const stopTimerSchema = z.object({
  clientStopAt: z.string().datetime().optional(),
});

// Expense schemas
export const createExpenseSchema = z.object({
  expenseDate: z.string(),
  description: z.string().optional(),
  amount: z.number().min(0),
  isBillable: z.boolean().default(true),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// Invoice schemas
export const createInvoiceSchema = z.object({
  dateInvoiced: z.string(),
  upToDate: z.string(),
  notes: z.string().optional(),
  groupByDay: z.boolean().optional().default(false),
});

// Client-level invoice schema (for creating invoices across multiple projects)
export const createClientInvoiceSchema = z.object({
  dateInvoiced: z.string(),
  upToDate: z.string(),
  notes: z.string().optional(),
  groupByDay: z.boolean().optional().default(false),
  projectIds: z.array(z.number().int().positive()).min(1, 'At least one project must be selected'),
});

export const updateInvoiceSchema = z.object({
  number: z.string().optional(),
  dateInvoiced: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['Unpaid', 'Paid']).optional(),
  datePaid: z.string().optional().nullable(),
});

// Invoice line item schemas
export const createInvoiceLineItemSchema = z.object({
  type: z.enum(['time', 'expense', 'manual']),
  description: z.string().min(1, 'Description is required'),
  // Quantity must be greater than 0; allow decimals for hours/units
  quantity: z.number().gt(0, 'Quantity must be greater than 0').default(1),
  // Allow negative, zero, and positive unit prices
  unitPrice: z.number(),
  linkedTimeEntryId: z.number().int().positive().optional(),
  linkedExpenseId: z.number().int().positive().optional(),
});

export const updateInvoiceLineItemSchema = z.object({
  description: z.string().min(1).optional(),
  quantity: z.number().gt(0).optional(),
  unitPrice: z.number().refine((v) => v !== 0).optional(),
});

// Invoice import schemas
export const importInvoiceRowSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  datePaid: z.string().optional().nullable(),
});

export const importInvoicesSchema = z.object({
  csvContent: z.string().min(1, 'CSV content is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type StopTimerInput = z.infer<typeof stopTimerSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreateClientInvoiceInput = z.infer<typeof createClientInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CreateInvoiceLineItemInput = z.infer<typeof createInvoiceLineItemSchema>;
export type UpdateInvoiceLineItemInput = z.infer<typeof updateInvoiceLineItemSchema>;
export type ImportInvoiceRowInput = z.infer<typeof importInvoiceRowSchema>;
export type ImportInvoicesInput = z.infer<typeof importInvoicesSchema>;
