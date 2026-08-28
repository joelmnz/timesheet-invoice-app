import { test, expect, generateTestId } from './fixtures/helpers';

test.describe('Global Expenses', () => {
  test('creates, assigns, and unassigns an expense', async ({ authenticatedPage: page }) => {
    const clientName = generateTestId('Client-');
    const projectName = generateTestId('Project-');
    const expenseDescription = generateTestId('Laptop-');

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

    await page.goto('/expenses');
    await page.locator('[data-testid="add-expense-btn"]').click();
    await page.locator('[data-testid="expense-description-input"]').fill(expenseDescription);
    await page.locator('[data-testid="expense-amount-input"]').fill('2000');
    await page.locator('[data-testid="expense-submit-btn"]').click();

    let expenseRow = page.locator('tr').filter({ hasText: expenseDescription });
    await expect(expenseRow).toContainText('General');

    await expenseRow.getByLabel('Edit').click();
    await page.locator('[data-testid="expense-project-input"]').click();
    await page.getByRole('option', { name: new RegExp(projectName) }).click();
    await page.locator('[data-testid="expense-submit-btn"]').click();

    expenseRow = page.locator('tr').filter({ hasText: expenseDescription });
    await expect(expenseRow).toContainText(projectName);

    await expenseRow.getByLabel('Edit').click();
    await page.locator('[data-testid="expense-project-input"]').click();
    await page.getByRole('option', { name: 'General / No project' }).click();
    await page.locator('[data-testid="expense-submit-btn"]').click();

    expenseRow = page.locator('tr').filter({ hasText: expenseDescription });
    await expect(expenseRow).toContainText('General');
  });
});
