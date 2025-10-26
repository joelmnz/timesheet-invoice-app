import { test, expect } from './fixtures/helpers';
import { generateTestId } from './fixtures/helpers';

test.describe('Project Management', () => {
  let clientName: string;
  let projectName: string;

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Create a client for projects to use
    clientName = generateTestId('Client-');
    
    await page.goto('/clients');
    await page.locator('[data-testid="create-client-btn"]').click();
    
    // Wait for modal to be visible
    await page.locator('[data-testid="client-name-input"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="client-name-input"]').fill(clientName);
    await page.locator('[data-testid="client-rate-input"]').fill('120');
    await page.locator('[data-testid="client-submit-btn"]').click();
    
    // Wait for modal to close
    await page.locator('[data-testid="client-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    
    await expect(page.getByText(clientName)).toBeVisible();
  });

  test('should create a new project', async ({ authenticatedPage: page }) => {
    projectName = generateTestId('Project-');
    
    // Navigate to projects page
    await page.goto('/projects');
    
    // Click create project button
    await page.locator('[data-testid="create-project-btn"]').click();
    
    // Wait for modal to be visible
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'visible' });
    
    // Fill in project details
    await page.locator('[data-testid="project-name-input"]').fill(projectName);
    
    // Select client from dropdown
    await page.locator('[data-testid="project-client-select"]').click();
    await page.getByRole('option', { name: clientName }).click();
    
    // Rate should auto-populate from client, verify and adjust if needed
    await expect(page.locator('[data-testid="project-rate-input"]')).toHaveValue('120.00');
    
    await page.locator('[data-testid="project-notes-input"]').fill('Test project notes');
    
    // Ensure active is checked (should be default)
    const activeSwitch = page.locator('[data-testid="project-active-switch"]');
    const isChecked = await activeSwitch.isChecked();
    if (!isChecked) {
      await activeSwitch.click();
    }
    
    // Submit the form
    await page.locator('[data-testid="project-submit-btn"]').click();
    
    // Verify project was created
    await expect(page.getByText(projectName)).toBeVisible();
  });

  test('should filter projects by status', async ({ authenticatedPage: page }) => {
    const activeProjectName = generateTestId('ActiveProject-');
    const inactiveProjectName = generateTestId('InactiveProject-');
    
    // Create active project
    await page.goto('/projects');
    await page.locator('[data-testid="create-project-btn"]').click();
    
    // Wait for modal to be visible
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="project-name-input"]').fill(activeProjectName);
    await page.locator('[data-testid="project-client-select"]').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.locator('[data-testid="project-submit-btn"]').click();
    
    // Wait for modal to close
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    
    await expect(page.getByText(activeProjectName)).toBeVisible();
    
    // Create inactive project
    await page.locator('[data-testid="create-project-btn"]').click();
    
    // Wait for modal to be visible
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="project-name-input"]').fill(inactiveProjectName);
    await page.locator('[data-testid="project-client-select"]').click();
    await page.getByRole('option', { name: clientName }).click();
    
    // Uncheck active switch - force click since the input is visually hidden
    await page.locator('[data-testid="project-active-switch"]').click({ force: true });
    
    await page.locator('[data-testid="project-submit-btn"]').click();
    
    // Wait for modal to close
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    
    // Should only see active project by default
    await expect(page.getByText(activeProjectName)).toBeVisible();
    await expect(page.getByText(inactiveProjectName)).not.toBeVisible();
    
    // Filter for inactive projects
    await page.getByRole('button', { name: 'Inactive' }).click();
    await expect(page.getByText(inactiveProjectName)).toBeVisible();
    await expect(page.getByText(activeProjectName)).not.toBeVisible();
    
    // Show all projects
    await page.getByRole('button', { name: 'All' }).click();
    await expect(page.getByText(activeProjectName)).toBeVisible();
    await expect(page.getByText(inactiveProjectName)).toBeVisible();
  });

  test('should archive and unarchive a project', async ({ authenticatedPage: page }) => {
    projectName = generateTestId('ArchiveProject-');
    
    // Create a project
    await page.goto('/projects');
    await page.locator('[data-testid="create-project-btn"]').click();
    
    // Wait for modal to be visible
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="project-name-input"]').fill(projectName);
    await page.locator('[data-testid="project-client-select"]').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.locator('[data-testid="project-submit-btn"]').click();
    
    // Wait for modal to close
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    
    await expect(page.getByText(projectName)).toBeVisible();
    
    // Archive the project (set to inactive)
    const projectRow = page.locator('tr:has-text("' + projectName + '")');
    await projectRow.locator('[aria-label="Edit"]').click();
    
    // Wait for modal to be visible
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="project-active-switch"]').click({ force: true });
    await page.locator('[data-testid="project-submit-btn"]').click();
    
    // Wait for modal to close
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    // Wait for modal to close
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    
    // Project should no longer be visible in active filter
    await expect(page.getByText(projectName)).not.toBeVisible();
    
    // View inactive projects
    await page.getByRole('button', { name: 'Inactive' }).click();
    await expect(page.getByText(projectName)).toBeVisible();
    
    // Unarchive the project (set to active)
    const inactiveProjectRow = page.locator('tr:has-text("' + projectName + '")');
    await inactiveProjectRow.locator('[aria-label="Edit"]').click();
    
    // Wait for modal to be visible
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="project-active-switch"]').click({ force: true });
    await page.locator('[data-testid="project-submit-btn"]').click();
    
    // Wait for modal to close
    await page.locator('[data-testid="project-name-input"]').waitFor({ state: 'hidden', timeout: 15000 });
    
    // Switch back to active filter
    await page.getByRole('button', { name: 'Active' }).click();
    await expect(page.getByText(projectName)).toBeVisible();
  });
});
