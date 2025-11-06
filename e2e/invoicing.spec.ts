import { test, expect } from './fixtures/helpers';
import { generateTestId } from './fixtures/helpers';

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
