import { test, expect } from '../fixtures/helpers';
import { generateTestId } from '../fixtures/helpers';

test.describe('Time Tracking', () => {
  let clientName: string;
  let projectName: string;

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Create a client and project for time tracking
    clientName = generateTestId('Client-');
    projectName = generateTestId('Project-');
    
    await page.goto('/clients');
    await page.locator('[data-testid="create-client-btn"]').click();
    await page.locator('[data-testid="client-name-input"]').fill(clientName);
    await page.locator('[data-testid="client-rate-input"]').fill('150');
    await page.locator('[data-testid="client-submit-btn"]').click();
    await expect(page.getByText(clientName)).toBeVisible();
    
    await page.goto('/projects');
    await page.locator('[data-testid="create-project-btn"]').click();
    await page.locator('[data-testid="project-name-input"]').fill(projectName);
    await page.locator('[data-testid="project-client-select"]').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.locator('[data-testid="project-submit-btn"]').click();
    await expect(page.getByText(projectName)).toBeVisible();
  });

  test('should create a manual time entry', async ({ authenticatedPage: page }) => {
    // Navigate to project detail page
    await page.goto('/projects');
    await page.getByText(projectName).click();
    
    // Click add time entry button
    await page.locator('[data-testid="add-time-entry-btn"]').click();
    
    // Fill in time entry details
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(17, 0, 0, 0);
    
    // Set start time
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
    
    // Set end time
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
    
    // Add a note
    await page.locator('[data-testid="time-note-input"]').fill('Testing time entry creation');
    
    // Submit the form
    await page.locator('[data-testid="time-submit-btn"]').click();
    
    // Verify time entry was created - should show 8.00 hours
    await expect(page.getByText('8.00', { exact: false })).toBeVisible();
    await expect(page.getByText('Testing time entry creation')).toBeVisible();
  });

  test('should track time with timer (simulated)', async ({ authenticatedPage: page }) => {
    // Note: We can't actually test the real-time timer in E2E, but we can test the UI flow
    // Navigate to project detail
    await page.goto('/projects');
    await page.getByText(projectName).click();
    
    // Add a time entry manually to simulate timer
    await page.locator('[data-testid="add-time-entry-btn"]').click();
    
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    await page.locator('[data-testid="time-start-input"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(twoHoursAgo.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }).replace(',', ''));
    
    await page.locator('[data-testid="time-end-input"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(now.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }).replace(',', ''));
    
    await page.locator('[data-testid="time-note-input"]').fill('Timer simulation');
    await page.locator('[data-testid="time-submit-btn"]').click();
    
    // Verify 2 hours were tracked
    await expect(page.getByText('2.00', { exact: false })).toBeVisible();
  });

  test('should edit a time entry', async ({ authenticatedPage: page }) => {
    // Create a time entry first
    await page.goto('/projects');
    await page.getByText(projectName).click();
    
    await page.locator('[data-testid="add-time-entry-btn"]').click();
    
    const startTime = new Date();
    startTime.setHours(10, 0, 0, 0);
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
    
    await page.locator('[data-testid="time-note-input"]').fill('Original note');
    await page.locator('[data-testid="time-submit-btn"]').click();
    
    await expect(page.getByText('2.00', { exact: false })).toBeVisible();
    
    // Edit the time entry
    const timeEntryRow = page.getByText('Original note').locator('..');
    await timeEntryRow.getByLabel('Edit').click();
    
    // Update the note
    await page.locator('[data-testid="time-note-input"]').clear();
    await page.locator('[data-testid="time-note-input"]').fill('Updated note');
    await page.locator('[data-testid="time-submit-btn"]').click();
    
    // Verify update
    await expect(page.getByText('Updated note')).toBeVisible();
    await expect(page.getByText('Original note')).not.toBeVisible();
  });

  test('should calculate total hours correctly', async ({ authenticatedPage: page }) => {
    // Navigate to project
    await page.goto('/projects');
    await page.getByText(projectName).click();
    
    // Create first time entry - 3 hours
    await page.locator('[data-testid="add-time-entry-btn"]').click();
    
    let startTime = new Date();
    startTime.setHours(9, 0, 0, 0);
    let endTime = new Date();
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
    await expect(page.getByText('3.00', { exact: false })).toBeVisible();
    
    // Create second time entry - 5 hours
    await page.locator('[data-testid="add-time-entry-btn"]').click();
    
    startTime = new Date();
    startTime.setHours(13, 0, 0, 0);
    endTime = new Date();
    endTime.setHours(18, 0, 0, 0);
    
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
    await expect(page.getByText('5.00', { exact: false })).toBeVisible();
    
    // Verify total uninvoiced hours (should show 8 hours total)
    await expect(page.getByText('8.00 hrs', { exact: false })).toBeVisible();
  });
});
