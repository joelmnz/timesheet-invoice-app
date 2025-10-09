import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  authApi,
  settingsApi,
  clientsApi,
  projectsApi,
  timeEntriesApi,
  expensesApi,
  invoicesApi,
  dashboardApi,
  reportsApi,
} from './api';

describe('API Service Path Validation', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    global.fetch = fetchMock;
  });

  describe('Auth API', () => {
    it('should call POST /api/auth/login', async () => {
      await authApi.login('user', 'pass');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should call POST /api/auth/logout', async () => {
      await authApi.logout();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should call GET /api/auth/me', async () => {
      await authApi.me();
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.any(Object));
    });
  });

  describe('Settings API', () => {
    it('should call GET /api/settings', async () => {
      await settingsApi.get();
      expect(fetchMock).toHaveBeenCalledWith('/api/settings', expect.any(Object));
    });

    it('should call PUT /api/settings', async () => {
      await settingsApi.update({ companyName: 'Test' });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('Clients API', () => {
    it('should call GET /api/clients', async () => {
      await clientsApi.list();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/clients?'),
        expect.any(Object)
      );
    });

    it('should call GET /api/clients/:id', async () => {
      await clientsApi.get(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/clients/1', expect.any(Object));
    });

    it('should call POST /api/clients', async () => {
      await clientsApi.create({ name: 'Test', email: 'test@test.com' } as any);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/clients',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should call PUT /api/clients/:id', async () => {
      await clientsApi.update(1, { name: 'Updated' });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/clients/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should call DELETE /api/clients/:id', async () => {
      await clientsApi.delete(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/clients/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Projects API', () => {
    it('should call GET /api/projects', async () => {
      await projectsApi.list();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects?active=all',
        expect.any(Object)
      );
    });

    it('should call GET /api/projects/:id', async () => {
      await projectsApi.get(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/projects/1', expect.any(Object));
    });

    it('should call POST /api/projects/:id/timer/start', async () => {
      await projectsApi.startTimer(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/1/timer/start',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should call POST /api/projects/:id/timer/stop', async () => {
      await projectsApi.stopTimer(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/1/timer/stop',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should call GET /api/projects/timer/current', async () => {
      await projectsApi.getCurrentTimer();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/timer/current',
        expect.any(Object)
      );
    });
  });

  describe('Time Entries API', () => {
    it('should call GET /api/projects/:projectId/time-entries', async () => {
      await timeEntriesApi.list(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/1/time-entries',
        expect.any(Object)
      );
    });

    it('should call POST /api/projects/:projectId/time-entries', async () => {
      await timeEntriesApi.create(1, {});
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/1/time-entries',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should call PUT /api/time-entries/:id', async () => {
      await timeEntriesApi.update(1, {});
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/time-entries/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should call DELETE /api/time-entries/:id', async () => {
      await timeEntriesApi.delete(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/time-entries/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Expenses API', () => {
    it('should call GET /api/projects/:projectId/expenses', async () => {
      await expensesApi.list(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/1/expenses',
        expect.any(Object)
      );
    });

    it('should call POST /api/projects/:projectId/expenses', async () => {
      await expensesApi.create(1, {});
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/1/expenses',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Invoices API', () => {
    it('should call GET /api/invoices', async () => {
      await invoicesApi.list();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/invoices?'),
        expect.any(Object)
      );
    });

    it('should call GET /api/invoices/:id', async () => {
      await invoicesApi.get(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/invoices/1', expect.any(Object));
    });

    it('should call POST /api/projects/:projectId/invoices', async () => {
      await invoicesApi.create(1, {
        dateInvoiced: '2025-10-09',
        upToDate: '2025-10-09',
      });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/1/invoices',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should call PUT /api/invoices/:id', async () => {
      await invoicesApi.update(1, {});
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/invoices/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should call DELETE /api/invoices/:id', async () => {
      await invoicesApi.delete(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/invoices/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should call GET /api/invoices/:id/lines', async () => {
      await invoicesApi.getLines(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/invoices/1/lines',
        expect.any(Object)
      );
    });

    it('should call POST /api/invoices/:id/lines', async () => {
      await invoicesApi.addLine(1, {} as any);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/invoices/1/lines',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should call PUT /api/invoice-lines/:lineId', async () => {
      await invoicesApi.updateLine(1, {});
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/invoice-lines/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should call DELETE /api/invoice-lines/:lineId', async () => {
      await invoicesApi.deleteLine(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/invoice-lines/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Dashboard API', () => {
    it('should call GET /api/dashboard/summary', async () => {
      await dashboardApi.getSummary();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/dashboard/summary',
        expect.any(Object)
      );
    });

    it('should call GET /api/charts/invoiced-by-month', async () => {
      await dashboardApi.getInvoicedByMonth();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/charts/invoiced-by-month?months=12',
        expect.any(Object)
      );
    });

    it('should call GET /api/charts/hours-by-month', async () => {
      await dashboardApi.getHoursByMonth();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/charts/hours-by-month?months=12',
        expect.any(Object)
      );
    });
  });

  describe('Reports API', () => {
    it('should call GET /api/reports/invoices', async () => {
      await reportsApi.getInvoices();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/reports/invoices?'),
        expect.any(Object)
      );
    });

    it('should call GET /api/reports/income', async () => {
      await reportsApi.getIncome();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/reports/income?'),
        expect.any(Object)
      );
    });
  });

  describe('Critical Path: Invoice Creation from Project', () => {
    it('should use correct path for creating invoice from project page', async () => {
      const projectId = 123;
      await invoicesApi.create(projectId, {
        dateInvoiced: '2025-10-09',
        upToDate: '2025-10-09',
        notes: 'Test',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/123/invoices',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('dateInvoiced'),
        })
      );
    });
  });
});
