import { test as base, expect, Page } from '@playwright/test';

/**
 * E2E test prefix for all test data
 */
export const E2E_PREFIX = 'E2E-';

/**
 * Generates a unique test identifier using timestamp and random string
 */
export function generateTestId(prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${E2E_PREFIX}${prefix}${timestamp}-${random}`;
}

/**
 * Login helper
 */
export async function login(page: Page, username = 'admin', password = 'admin') {
  await page.goto('/');
  
  // Check if already logged in
  const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
  if (isLoggedIn) {
    return;
  }
  
  // Fill login form
  await page.locator('[data-testid="login-username"]').fill(username);
  await page.locator('[data-testid="login-password"]').fill(password);
  await page.locator('[data-testid="login-submit"]').click();
  
  // Wait for successful login
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 });
}

/**
 * Cleanup helper to remove test data
 */
export async function cleanupTestData(page: Page) {
  // This will be called after each test to clean up
  // We can implement API calls or UI cleanup as needed
  await page.evaluate((prefix) => {
    // Store cleanup info in session storage for debugging
    sessionStorage.setItem('lastTestCleanup', new Date().toISOString());
  }, E2E_PREFIX);
}

/**
 * Extended test fixture with authentication
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
    await cleanupTestData(page);
  },
});

export { expect };
