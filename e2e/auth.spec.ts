import { test, expect, Page } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
    
    // Fill in credentials
    await page.locator('[data-testid="login-username"]').fill('admin');
    await page.locator('[data-testid="login-password"]').fill('admin');
    await page.locator('[data-testid="login-submit"]').click();
    
    // Should redirect to dashboard
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.locator('[data-testid="login-username"]').fill('invalid');
    await page.locator('[data-testid="login-password"]').fill('wrong');
    await page.locator('[data-testid="login-submit"]').click();
    
    // Should show error message
    await expect(page.getByText('Invalid credentials', { exact: false })).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.locator('[data-testid="login-username"]').fill('admin');
    await page.locator('[data-testid="login-password"]').fill('admin');
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Click logout
    await page.locator('[data-testid="user-menu"]').click();
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    await page.goto('/clients');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should maintain session after page reload', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.locator('[data-testid="login-username"]').fill('admin');
    await page.locator('[data-testid="login-password"]').fill('admin');
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });
});
