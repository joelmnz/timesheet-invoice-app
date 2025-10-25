import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'cd backend && rm -f ./data/e2e-test.db && export PATH="$HOME/.bun/bin:$PATH" && bun run dev',
      url: 'http://localhost:8080/health',
      reuseExistingServer: false, // Always start fresh
      timeout: 120000,
      env: {
        APP_USERNAME: 'admin',
        APP_PASSWORD: 'admin',
        SESSION_SECRET: 'test-secret-key-for-e2e-testing',
        DATABASE_PATH: './data/e2e-test.db',
        ALLOW_NO_ORIGIN_IN_DEV: 'true',
      },
    },
    {
      command: 'cd frontend && export PATH="$HOME/.bun/bin:$PATH" && bun run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: false, // Always start fresh
      timeout: 120000,
    },
  ],
});
