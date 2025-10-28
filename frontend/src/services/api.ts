import type {
  Settings,
  Client,
  Project,
  TimeEntry,
  Expense,
  Invoice,
  InvoiceLineItem,
  DashboardSummary,
  ChartData,
  ReportData,
  ImportPreview,
  ImportResult,
} from '../types';

const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || response.statusText);
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    fetchApi<{ success: boolean; username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    fetchApi<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  me: () =>
    fetchApi<{ authenticated: boolean; username?: string }>('/auth/me'),
};

// Settings API
export const settingsApi = {
  get: () => fetchApi<Settings>('/settings'),
  
  update: (data: Partial<Settings>) =>
    fetchApi<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Clients API
export const clientsApi = {
  list: (query?: string, page = 1, pageSize = 25) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    return fetchApi<import('../types').PaginatedResponse<Client>>(`/clients?${params}`);
  },

  get: (id: number) => fetchApi<Client>(`/clients/${id}`),

  create: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) =>
    fetchApi<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Client>) =>
    fetchApi<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/clients/${id}`, { method: 'DELETE' }),
};

// Projects API
export const projectsApi = {
  list: (active: 'all' | 'true' | 'false' = 'all', page = 1, pageSize = 25) => {
    const params = new URLSearchParams();
    params.append('active', active);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    return fetchApi<import('../types').PaginatedResponse<Project>>(`/projects?${params}`);
  },

  listByClient: (clientId: number, active: 'all' | 'true' | 'false' = 'all', page = 1, pageSize = 1000) => {
    const params = new URLSearchParams();
    params.append('clientId', clientId.toString());
    params.append('active', active);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    return fetchApi<import('../types').PaginatedResponse<Project>>(`/projects?${params}`);
  },

  get: (id: number) => fetchApi<Project>(`/projects/${id}`),

  create: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'client'>) =>
    fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Project>) =>
    fetchApi<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  startTimer: (projectId: number) =>
    fetchApi<TimeEntry>(`/projects/${projectId}/timer/start`, {
      method: 'POST',
    }),

  stopTimer: (projectId: number, clientStopAt?: string) =>
    fetchApi<TimeEntry>(`/projects/${projectId}/timer/stop`, {
      method: 'POST',
      body: JSON.stringify({ clientStopAt }),
    }),

  getCurrentTimer: () => fetchApi<TimeEntry | null>('/projects/timer/current'),
};

// Time Entries API
export const timeEntriesApi = {
  list: (projectId: number, page = 1, pageSize = 25) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    return fetchApi<import('../types').PaginatedResponse<TimeEntry>>(`/projects/${projectId}/time-entries?${params}`);
  },

  listAll: (params?: {
    projectId?: number;
    status?: 'all' | 'uninvoiced' | 'invoiced';
    page?: number;
    pageSize?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.append('projectId', params.projectId.toString());
    if (params?.status) searchParams.append('status', params.status);
    searchParams.append('page', (params?.page || 1).toString());
    searchParams.append('page_size', (params?.pageSize || 25).toString());
    return fetchApi<import('../types').PaginatedResponse<TimeEntry>>(`/time-entries?${searchParams}`);
  },

  create: (projectId: number, data: Partial<TimeEntry>) =>
    fetchApi<TimeEntry>(`/projects/${projectId}/time-entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createWithProject: (data: Partial<TimeEntry> & { projectId: number }) =>
    fetchApi<TimeEntry>('/time-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<TimeEntry>) =>
    fetchApi<TimeEntry>(`/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/time-entries/${id}`, {
      method: 'DELETE',
    }),
};

// Expenses API
export const expensesApi = {
  list: (projectId: number, page = 1, pageSize = 25) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    return fetchApi<import('../types').PaginatedResponse<Expense>>(`/projects/${projectId}/expenses?${params}`);
  },

  create: (projectId: number, data: Partial<Expense>) =>
    fetchApi<Expense>(`/projects/${projectId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Expense>) =>
    fetchApi<Expense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/expenses/${id}`, { method: 'DELETE' }),
};

// Invoices API
export const invoicesApi = {
  list: (params?: {
    status?: string;
    clientId?: number;
    projectId?: number;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.clientId) searchParams.append('clientId', params.clientId.toString());
    if (params?.projectId) searchParams.append('projectId', params.projectId.toString());
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('page_size', params.pageSize.toString());
    return fetchApi<import('../types').PaginatedResponse<Invoice>>(`/invoices?${searchParams}`);
  },

  get: (id: number) => fetchApi<Invoice>(`/invoices/${id}`),

  create: (projectId: number, data: {
    dateInvoiced: string;
    upToDate: string;
    notes?: string;
    groupByDay?: boolean;
  }) =>
    fetchApi<{ invoice: Invoice; lineItems: InvoiceLineItem[] }>(
      `/projects/${projectId}/invoices`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  update: (id: number, data: Partial<Invoice>) =>
    fetchApi<Invoice>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/invoices/${id}`, { method: 'DELETE' }),

  getLines: (invoiceId: number) =>
    fetchApi<InvoiceLineItem[]>(`/invoices/${invoiceId}/lines`),

  addLine: (invoiceId: number, data: Partial<InvoiceLineItem>) =>
    fetchApi<InvoiceLineItem>(`/invoices/${invoiceId}/lines`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLine: (lineId: number, data: Partial<InvoiceLineItem>) =>
    fetchApi<InvoiceLineItem>(`/invoice-lines/${lineId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteLine: (lineId: number) =>
    fetchApi<{ success: boolean }>(`/invoice-lines/${lineId}`, {
      method: 'DELETE',
    }),

  downloadPdf: async (id: number, filename: string) => {
    const response = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || response.statusText);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Clean up the blob URL after a short delay to allow the browser to load it
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  },
};

// Dashboard API
export const dashboardApi = {
  getSummary: () => fetchApi<DashboardSummary>('/dashboard/summary'),

  getInvoicedByMonth: (months = 12) =>
    fetchApi<ChartData[]>(`/charts/invoiced-by-month?months=${months}`),

  getHoursByMonth: (months = 12) =>
    fetchApi<ChartData[]>(`/charts/hours-by-month?months=${months}`),
};

// Reports API
export const reportsApi = {
  getInvoices: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return fetchApi<ReportData>(`/reports/invoices?${params}`);
  },

  getIncome: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return fetchApi<ReportData>(`/reports/income?${params}`);
  },

  exportCsv: async (
    entity: 'invoices' | 'time-entries' | 'expenses' | 'clients' | 'projects',
    from?: string,
    to?: string
  ) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const response = await fetch(`${API_BASE}/export/${entity}?${params}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || response.statusText);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Clean up the blob URL after a short delay
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  },
};

// Import API
export const importApi = {
  validateInvoices: (csvContent: string) =>
    fetchApi<ImportPreview>('/import/invoices/validate', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    }),

  confirmInvoices: (csvContent: string) =>
    fetchApi<ImportResult>('/import/invoices/confirm', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    }),

  downloadExample: async () => {
    const response = await fetch(`${API_BASE}/import/invoices/example`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || response.statusText);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Clean up the blob URL after a short delay
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  },
};

// Migrations API
export const migrationsApi = {
  getStatus: () =>
    fetchApi<{
      needed: boolean;
      reason?: string;
      tablesExist: boolean;
      settingsExist: boolean;
    }>('/migrations/status'),

  runMigrations: () =>
    fetchApi<{
      success: boolean;
      message: string;
      backupPath?: string;
      error?: string;
    }>('/migrations/run', { method: 'POST' }),

  createBackup: () =>
    fetchApi<{
      success: boolean;
      message: string;
      backupPath: string;
    }>('/migrations/backup', { method: 'POST' }),
};
