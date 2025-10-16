import { test, expect } from './fixtures/helpers';
import { generateTestId } from './fixtures/helpers';

test.describe('Client Management', () => {
  test('should create a new client', async ({ authenticatedPage: page }) => {
    const clientName = generateTestId('Client-');
    
    // Navigate to clients page
    await page.goto('/clients');
    
    // Click create client button
    await page.locator('[data-testid="create-client-btn"]').click();
    
    // Fill in client details
    await page.locator('[data-testid="client-name-input"]').fill(clientName);
    await page.locator('[data-testid="client-contact-input"]').fill('John Doe');
    await page.locator('[data-testid="client-email-input"]').fill('john@example.com');
    await page.locator('[data-testid="client-address-input"]').fill('123 Main St, City');
    await page.locator('[data-testid="client-rate-input"]').fill('150');
    await page.locator('[data-testid="client-notes-input"]').fill('Test client notes');
    
    // Submit the form
    await page.locator('[data-testid="client-submit-btn"]').click();
    
    // Verify client was created
    await expect(page.getByText(clientName)).toBeVisible();
  });

  test('should search for clients', async ({ authenticatedPage: page }) => {
    const clientName = generateTestId('SearchClient-');
    
    // Create a client first
    await page.goto('/clients');
    await page.locator('[data-testid="create-client-btn"]').click();
    await page.locator('[data-testid="client-name-input"]').fill(clientName);
    await page.locator('[data-testid="client-rate-input"]').fill('100');
    await page.locator('[data-testid="client-submit-btn"]').click();
    await expect(page.getByText(clientName)).toBeVisible();
    
    // Test search functionality
    await page.getByPlaceholder('Search clients...').fill(clientName);
    await expect(page.getByText(clientName)).toBeVisible();
    
    // Search for non-existent client
    await page.getByPlaceholder('Search clients...').fill('NonExistentClient-XYZ');
    await expect(page.getByText('No clients found')).toBeVisible();
  });

  test('should update a client', async ({ authenticatedPage: page }) => {
    const clientName = generateTestId('UpdateClient-');
    const updatedName = `${clientName}-Updated`;
    
    // Create a client
    await page.goto('/clients');
    await page.locator('[data-testid="create-client-btn"]').click();
    await page.locator('[data-testid="client-name-input"]').fill(clientName);
    await page.locator('[data-testid="client-rate-input"]').fill('100');
    await page.locator('[data-testid="client-submit-btn"]').click();
    
    // Find and edit the client
    const clientRow = page.getByText(clientName).locator('..');
    await clientRow.getByLabel('Edit').click();
    
    // Update the name
    await page.locator('[data-testid="client-name-input"]').clear();
    await page.locator('[data-testid="client-name-input"]').fill(updatedName);
    await page.locator('[data-testid="client-submit-btn"]').click();
    
    // Verify update
    await expect(page.getByText(updatedName)).toBeVisible();
  });
});
