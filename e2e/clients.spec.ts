import { test, expect } from './fixtures/helpers';
import { generateTestId } from './fixtures/helpers';

test.describe('Client Management', () => {
  test('shows payment history from the latest twelve paid invoices', async ({ authenticatedPage: page }) => {
    const clientResponse = await page.request.post('/api/clients', { data: { name: generateTestId('PaymentHistory-') } });
    expect(clientResponse.ok()).toBeTruthy();
    const client = await clientResponse.json();
    const projectResponse = await page.request.post('/api/projects', { data: { clientId: client.id, name: generateTestId('Payments-') } });
    expect(projectResponse.ok()).toBeTruthy();
    const project = await projectResponse.json();

    await page.goto(`/clients/${client.id}`);
    await expect(page.getByText('No paid invoices yet.')).toBeVisible();
    await expect(page.getByText('Avg Days to Pay', { exact: true }).locator('..')).toContainText('—');

    for (let index = 0; index < 13; index++) {
      const expense = await page.request.post('/api/expenses', { data: {
        projectId: project.id, expenseDate: '2020-01-01', amount: index === 0 ? 1000 : 10,
        description: generateTestId('Payment-'), isBillable: true,
      } });
      expect(expense.ok()).toBeTruthy();
      const invoiceResponse = await page.request.post(`/api/projects/${project.id}/invoices`, { data: {
        dateInvoiced: '2020-01-01', upToDate: '2020-01-31',
      } });
      expect(invoiceResponse.ok()).toBeTruthy();
      const invoice = await invoiceResponse.json();
      const paid = await page.request.put(`/api/invoices/${invoice.id}`, { data: {
        status: 'Paid', dueDate: '2020-01-10', datePaid: '2020-01-08',
      } });
      expect(paid.ok()).toBeTruthy();
    }

    await page.reload();
    await expect(page.getByText(/Based on the latest 12 paid invoices/)).toBeVisible();
    await expect(page.getByText('Avg Days to Pay', { exact: true }).locator('..')).toContainText('7');
    await expect(page.getByText('Avg Overdue', { exact: true }).locator('..')).toContainText('-2');
    await expect(page.getByText('Total 12m', { exact: true }).locator('..')).toContainText('120.00');
    await expect(page.getByText('Inv Avg', { exact: true }).locator('..')).toContainText('10.00');
    await page.locator('input[value="25 per page"]').click();
    await page.getByRole('option', { name: '10 per page', exact: true }).click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await expect(page.getByText('Total 12m', { exact: true }).locator('..')).toContainText('120.00');
    await expect(page.getByText(/Based on the latest 12 paid invoices/)).toBeVisible();
  });

  test('keeps client editing available when payment history is unavailable', async ({ authenticatedPage: page }) => {
    const name = generateTestId('UnavailableSummary-');
    const response = await page.request.post('/api/clients', { data: { name } });
    expect(response.ok()).toBeTruthy();
    const client = await response.json();
    await page.route(`**/api/clients/${client.id}`, async route => {
      if (route.request().method() !== 'GET') return route.continue();
      const actual = await route.fetch();
      await route.fulfill({ response: actual, json: { ...await actual.json(), invoiceSummary: null } });
    });
    await page.goto(`/clients/${client.id}`);
    await expect(page.getByText(/Payment history is unavailable/)).toBeVisible();
    await page.getByRole('button', { name: 'Edit Client', exact: true }).click();
    await page.getByTestId('client-name-input').fill(`${name}-Updated`);
    await page.getByTestId('client-submit-btn').click();
    await expect(page.getByText(`${name}-Updated`, { exact: true })).toBeVisible();
  });

  test('should create a new client', async ({ authenticatedPage: page }) => {
    const clientName = generateTestId('Client-');
    
    // Navigate to clients page
    await page.goto('/clients');
    
    // Click create client button
    await page.locator('[data-testid="create-client-btn"]').click();
    
    // Wait for the modal to be visible
    await page.locator('[data-testid="client-name-input"]').waitFor({ state: 'visible' });
    
    // Fill in client details
    await page.locator('[data-testid="client-name-input"]').fill(clientName);
    await page.locator('[data-testid="client-contact-input"]').fill('John Doe');
    await page.locator('[data-testid="client-email-input"]').fill('john@example.com');
    await page.locator('[data-testid="client-address-input"]').fill('123 Main St, City');
    await page.locator('[data-testid="client-rate-input"]').fill('150');
    await page.locator('[data-testid="client-notes-input"]').fill('Test client notes');
    
    // Submit the form
    await page.locator('[data-testid="client-submit-btn"]').click();
    
    // Wait for the modal to be hidden (indicates submission success)
    await page.locator('[data-testid="client-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    
    // Wait for client to appear in the list
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 15000 });
  });

  test('should search for clients', async ({ authenticatedPage: page }) => {
    const clientName = generateTestId('SearchClient-');
    
    // Create a client first
    await page.goto('/clients');
    await page.locator('[data-testid="create-client-btn"]').click();
    
    // Wait for the modal to be visible
    await page.locator('[data-testid="client-name-input"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="client-name-input"]').fill(clientName);
    await page.locator('[data-testid="client-rate-input"]').fill('100');
    await page.locator('[data-testid="client-submit-btn"]').click();
    
    // Wait for modal to close
    await page.locator('[data-testid="client-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    
    // Wait for client to appear before searching
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 15000 });
    
    // Test search functionality - clear and search
    const searchInput = page.getByPlaceholder('Search clients...');
    await searchInput.clear();
    await searchInput.fill(clientName);
    
    // Wait for search results to update (should still show the created client)
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 15000 });
    
    // Search for non-existent client
    await searchInput.clear();
    await searchInput.fill('NonExistentClient-XYZ');
    
    // Wait for "No clients found" message
    await expect(page.getByText('No clients found')).toBeVisible({ timeout: 15000 });
  });

  test('should update a client', async ({ authenticatedPage: page }) => {
    const clientName = generateTestId('UpdateClient-');
    const updatedName = `${clientName}-Updated`;
    
    // Create a client
    await page.goto('/clients');
    await page.locator('[data-testid="create-client-btn"]').click();
    
    // Wait for the modal to be visible
    await page.locator('[data-testid="client-name-input"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="client-name-input"]').fill(clientName);
    await page.locator('[data-testid="client-rate-input"]').fill('100');
    await page.locator('[data-testid="client-submit-btn"]').click();
    
    // Wait for modal to close
    await page.locator('[data-testid="client-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    
    // Wait for the client to appear
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 15000 });
    
    // Find and click edit button for this client
    const clientRow = page.locator('tr:has-text("' + clientName + '")');
    await clientRow.locator('[aria-label="Edit"]').click();
    
    // Wait for the modal to be visible
    await page.locator('[data-testid="client-name-input"]').waitFor({ state: 'visible' });
    
    // Update the name
    await page.locator('[data-testid="client-name-input"]').clear();
    await page.locator('[data-testid="client-name-input"]').fill(updatedName);
    await page.locator('[data-testid="client-submit-btn"]').click();
    
    // Wait for modal to close
    await page.locator('[data-testid="client-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    
    // Verify update - wait for the updated name to appear
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible({ timeout: 15000 });
    
    // Verify old name is no longer visible (use exact match to avoid substring matching)
    await expect(page.getByText(clientName, { exact: true })).not.toBeVisible();
  });
});
