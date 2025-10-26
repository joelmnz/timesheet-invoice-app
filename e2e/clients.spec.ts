import { test, expect } from './fixtures/helpers';
import { generateTestId } from './fixtures/helpers';

test.describe('Client Management', () => {
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
