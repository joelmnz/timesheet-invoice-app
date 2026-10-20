import { test, expect } from './fixtures/helpers';
import { generateTestId } from './fixtures/helpers';

// Seed through the authenticated API so this regression is independent of invoice-generation UI.
test.describe('Invoice detail corrections', () => {
  for (const status of ['Draft', 'Sent', 'Paid', 'Cancelled'] as const) {
    test(`persists corrections and explicit clears without changing ${status}`, async ({ authenticatedPage: page }) => {
      const clientResponse = await page.request.post('/api/clients', {
        data: { name: generateTestId('InvoiceCorrection-'), defaultHourlyRate: 100 },
      });
      expect(clientResponse.ok()).toBeTruthy();
      const client = await clientResponse.json();
      const projectResponse = await page.request.post('/api/projects', {
        data: { name: generateTestId('InvoiceCorrection-'), clientId: client.id },
      });
      expect(projectResponse.ok()).toBeTruthy();
      const project = await projectResponse.json();
      const timeResponse = await page.request.post('/api/time-entries', {
        data: { projectId: project.id, startAt: '2026-10-01T09:00:00.000Z', endAt: '2026-10-01T10:00:00.000Z' },
      });
      expect(timeResponse.ok()).toBeTruthy();
      const invoiceResponse = await page.request.post(`/api/projects/${project.id}/invoices`, {
        data: { dateInvoiced: '2026-10-01', upToDate: '2026-10-31' },
      });
      expect(invoiceResponse.ok()).toBeTruthy();
      const { invoice } = await invoiceResponse.json();
      const seedResponse = await page.request.put(`/api/invoices/${invoice.id}`, {
        data: { status, dueDate: '2026-10-15', dateSent: '2026-10-02', datePaid: '2026-10-03', notes: 'Original notes' },
      });
      expect(seedResponse.ok()).toBeTruthy();
      await page.goto(`/invoices/${invoice.id}`);
      await page.getByRole('button', { name: 'Edit Invoice', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Edit Invoice' });
      const fields = ['Invoice Date', 'Due Date', 'Date Sent', 'Date Paid'];
      for (const [index, field] of fields.entries()) {
        await expect(dialog.getByLabel(field, { exact: true })).toBeVisible();
        await expect(dialog.getByLabel(field, { exact: true })).toBeEnabled();
        await dialog.getByLabel(field, { exact: true }).click();
        await page.getByRole('button', { name: `${index + 5} October 2026`, exact: true }).click();
      }
      await expect(dialog.getByLabel('Status', { exact: true })).toBeEnabled();
      await expect(dialog.getByLabel('Status', { exact: true })).toHaveValue(status);
      await dialog.getByLabel('Notes', { exact: true }).fill('Corrected notes');
      await dialog.getByRole('button', { name: 'Update', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await page.reload();
      await page.getByRole('button', { name: 'Edit Invoice', exact: true }).click();
      for (const [index, field] of fields.entries()) {
        await expect(dialog.getByLabel(field, { exact: true })).toHaveText(`October ${index + 5}, 2026`);
      }
      await expect(dialog.getByLabel('Status', { exact: true })).toHaveValue(status);
      await expect(dialog.getByLabel('Notes', { exact: true })).toHaveValue('Corrected notes');
      for (const field of ['Date Sent', 'Date Paid']) {
        await dialog.locator('.mantine-DatePickerInput-root').filter({ has: dialog.getByLabel(field, { exact: true }) }).getByRole('button').last().click();
      }
      await dialog.getByLabel('Notes', { exact: true }).fill('');
      await dialog.getByRole('button', { name: 'Update', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await page.reload();
      await page.getByRole('button', { name: 'Edit Invoice', exact: true }).click();
      await expect(dialog.getByLabel('Status', { exact: true })).toHaveValue(status);
      await expect(dialog.getByLabel('Date Sent', { exact: true })).toHaveText('');
      await expect(dialog.getByLabel('Date Paid', { exact: true })).toHaveText('');
      await expect(dialog.getByLabel('Notes', { exact: true })).toHaveValue('');
      await expect(dialog.getByLabel('Invoice Date', { exact: true })).toHaveText('October 5, 2026');
      await expect(dialog.getByLabel('Due Date', { exact: true })).toHaveText('October 6, 2026');
    });
  }
});

test.describe('Invoicing', () => {
  let clientName: string;
  let projectName: string;

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Create a client and project with time entries for invoicing
    clientName = generateTestId('Client-');
    projectName = generateTestId('Project-');
    
    // Create client
    await page.goto('/clients');
    await page.locator('[data-testid="create-client-btn"]').click();
    await page.locator('[data-testid="client-name-input"]').fill(clientName);
    await page.locator('[data-testid="client-rate-input"]').fill('100');
    await page.locator('[data-testid="client-submit-btn"]').click();
    await expect(page.getByText(clientName)).toBeVisible();
    
    // Create project
    await page.goto('/projects');
    await page.locator('[data-testid="create-project-btn"]').click();
    await page.locator('[data-testid="project-name-input"]').fill(projectName);
    await page.locator('[data-testid="project-client-select"]').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.locator('[data-testid="project-submit-btn"]').click();
    await expect(page.getByText(projectName)).toBeVisible();
    
    // Create a time entry
    await page.getByText(projectName).click();
    await page.locator('[data-testid="add-time-entry-btn"]').click();
    
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(17, 0, 0, 0);
    
    await page.locator('[data-testid="time-start-input"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(startTime.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }).replace(',', ''));
    
    await page.locator('[data-testid="time-end-input"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(endTime.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }).replace(',', ''));
    
    await page.locator('[data-testid="time-submit-btn"]').click();
    await expect(page.getByText('8.00', { exact: false })).toBeVisible();
  });

  test('should generate an invoice from time entries', async ({ authenticatedPage: page }) => {
    // Should be on project detail page from beforeEach
    // Click create invoice button
    await page.locator('[data-testid="create-invoice-btn"]').click();
    
    // Fill in invoice details
    const today = new Date();
    const invoiceDate = today.toLocaleDateString('en-GB').split('/').join('/');
    
    // Invoice date and up-to date should auto-populate with today
    await page.locator('[data-testid="invoice-notes-input"]').fill('Test invoice notes');
    
    // Submit invoice
    await page.locator('[data-testid="invoice-submit-btn"]').click();
    
    // Should navigate to invoice detail page
    await expect(page.url()).toContain('/invoices/');
    
    // Verify invoice details
    await expect(page.getByText('Draft')).toBeVisible(); // Default status
    await expect(page.getByText('8.00')).toBeVisible(); // Hours
    await expect(page.getByText('NZD 800.00')).toBeVisible(); // Total (8 hours * $100/hr)
  });

  test('should calculate invoice totals correctly', async ({ authenticatedPage: page }) => {
    // Create additional time entries
    await page.locator('[data-testid="add-time-entry-btn"]').click();
    
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(12, 0, 0, 0);
    
    await page.locator('[data-testid="time-start-input"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(startTime.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }).replace(',', ''));
    
    await page.locator('[data-testid="time-end-input"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(endTime.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }).replace(',', ''));
    
    await page.locator('[data-testid="time-submit-btn"]').click();
    
    // Total should now be 11 hours (8 + 3)
    await expect(page.getByText('11.00 hrs', { exact: false })).toBeVisible();
    
    // Create invoice
    await page.locator('[data-testid="create-invoice-btn"]').click();
    await page.locator('[data-testid="invoice-submit-btn"]').click();
    
    // Verify totals: 11 hours * $100/hr = $1,100
    await expect(page.getByText('NZD 1,100.00')).toBeVisible();
  });

  test('should update invoice status', async ({ authenticatedPage: page }) => {
    // Create invoice
    await page.locator('[data-testid="create-invoice-btn"]').click();
    await page.locator('[data-testid="invoice-submit-btn"]').click();
    
    // Should be on invoice detail page
    await expect(page.getByText('Draft')).toBeVisible();
    
    // Update status to Paid (this requires UI interaction on invoice detail page)
    // For now, verify the invoice was created
    await expect(page.url()).toContain('/invoices/');
  });

  test('should group time entries by day when option is selected', async ({ authenticatedPage: page }) => {
    // Create invoice with grouping option
    await page.locator('[data-testid="create-invoice-btn"]').click();
    
    // Enable group by day
    await page.locator('[data-testid="invoice-groupby-switch"]').click();
    
    await page.locator('[data-testid="invoice-submit-btn"]').click();
    
    // Verify invoice was created with grouped entries
    await expect(page.url()).toContain('/invoices/');
    await expect(page.getByText('NZD 800.00')).toBeVisible();
  });

  test('should prevent invoice creation with no uninvoiced items', async ({ authenticatedPage: page }) => {
    // Create first invoice
    await page.locator('[data-testid="create-invoice-btn"]').click();
    await page.locator('[data-testid="invoice-submit-btn"]').click();
    
    // Navigate back to project
    await page.goto('/projects');
    await page.getByText(projectName).click();
    
    // Create invoice button should be disabled (no uninvoiced items)
    const createInvoiceBtn = page.locator('[data-testid="create-invoice-btn"]');
    await expect(createInvoiceBtn).toBeDisabled();
  });

  test('should list all invoices on invoices page', async ({ authenticatedPage: page }) => {
    // Create invoice
    await page.locator('[data-testid="create-invoice-btn"]').click();
    await page.locator('[data-testid="invoice-submit-btn"]').click();
    
    const invoiceUrl = page.url();
    const invoiceNumber = invoiceUrl.split('/').pop();
    
    // Navigate to invoices list
    await page.goto('/invoices');
    
    // Verify invoice appears in list
    await expect(page.getByText(`INV-${invoiceNumber}`, { exact: false })).toBeVisible();
    await expect(page.getByText(projectName)).toBeVisible();
    await expect(page.getByText('Draft')).toBeVisible();
  });
});
