export interface Settings {
  id: number;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  invoiceFooterMarkdown: string;
  nextInvoiceNumber: number;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: number;
  name: string;
  address?: string;
  email?: string;
  contactPerson?: string;
  defaultHourlyRate: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  clientId: number;
  name: string;
  hourlyRate: number;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  client?: Client;
}

export interface TimeEntry {
  id: number;
  projectId: number;
  startAt: string;
  endAt?: string;
  totalHours: number;
  isInvoiced: boolean;
  invoiceId?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  client?: Client;
}

export interface Expense {
  id: number;
  projectId: number;
  expenseDate: string;
  description?: string;
  amount: number;
  isBillable: boolean;
  isInvoiced: boolean;
  invoiceId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: number;
  number: string;
  clientId: number;
  projectId: number;
  dateInvoiced: string;
  dueDate: string;
  status: 'Unpaid' | 'Paid';
  subtotal: number;
  total: number;
  notes?: string;
  datePaid?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  project?: Project;
}

export interface InvoiceLineItem {
  id: number;
  invoiceId: number;
  type: 'time' | 'expense' | 'manual';
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  linkedTimeEntryId?: number;
  linkedExpenseId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  uninvoicedHoursByProject: Array<{
    projectId: number;
    projectName: string;
    clientId: number;
    clientName: string;
    totalHours: number;
  }>;
  uninvoicedExpensesByProject: Array<{
    projectId: number;
    projectName: string;
    clientName: string;
    totalAmount: number;
  }>;
  outstandingInvoices: Array<{
    id: number;
    number: string;
    dateInvoiced: string;
    dueDate: string;
    clientName: string;
    total: number;
    daysOverdue: number;
  }>;
}

export interface ChartData {
  month: string;
  total?: number;
  totalHours?: number;
}

export interface ReportData {
  data: any[];
  total: number;
}
