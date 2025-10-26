# E2E Tests

This directory contains end-to-end tests for the Timesheet Invoice Application using Playwright.

## Test Files

- `auth.spec.ts` - Authentication and session management tests
- `clients.spec.ts` - Client CRUD operations tests
- `projects.spec.ts` - Project management and archival tests
- `time-tracking.spec.ts` - Time entry creation and tracking tests
- `invoicing.spec.ts` - Invoice generation and calculation tests

## Prerequisites

- **Bun** runtime installed
- Backend and frontend dependencies installed (`bun install` in both directories)
- Playwright browsers installed: `bunx playwright install --with-deps chromium`

## Quick Start

```bash
# Run all tests (from project root)
bun run test:e2e

# Run in UI mode (recommended for development)
bun run test:e2e:ui

# Run with browser visible
bun run test:e2e:headed

# Debug tests
bun run test:e2e:debug

# View test report
bun run test:e2e:report
```

## Test Configuration

Tests are configured in `playwright.config.ts`:

- **Test Directory**: `./e2e`
- **Parallel Execution**: Enabled locally, disabled in CI
- **Retries**: 2 retries in CI, 0 locally
- **Base URL**: `http://localhost:5173` (configurable via `BASE_URL` env var)
- **Test Database**: `./backend/data/e2e-test.db` (auto-created fresh for each run)
- **Test Credentials**: `admin` / `admin` (configured in `webServer` env)

### Web Servers

Playwright automatically starts both servers before running tests:

1. **Backend**: `http://localhost:8080` (fresh database, populated via migrations)
2. **Frontend**: `http://localhost:5173` (Vite dev server)

Both servers are terminated after tests complete.

## Test Structure

Each test file follows this pattern:

```typescript
import { test, expect } from './fixtures/helpers';
import { generateTestId } from './fixtures/helpers';

test.describe('Feature Name', () => {
  test('should do something', async ({ authenticatedPage: page }) => {
    // Test implementation using authenticated page fixture
  });
});
```

### Using Fixtures

- **`authenticatedPage`**: Pre-authenticated page fixture (auto-login before each test)
- **`page`**: Standard Playwright page (requires manual login)

## Test Data

All test data is prefixed with `E2E-` to avoid collisions and enable cleanup:

```typescript
const clientName = generateTestId('Client-');
// Result: "E2E-Client-1697654321-abc123"
```

## Fixtures & Helpers

Located in `fixtures/helpers.ts`:

- **`generateTestId(prefix?)`** - Generate unique test identifiers with timestamp and random string
- **`login(page, username?, password?)`** - Helper to authenticate users (defaults to `admin`/`admin`)
- **`cleanupTestData(page)`** - Post-test cleanup (currently stores cleanup timestamp)
- **`test`** - Extended test fixture with `authenticatedPage` support
- **`E2E_PREFIX`** - Constant for test data prefix (`'E2E-'`)

## CI/CD

Tests run in GitHub Actions via `.github/workflows/e2e-tests.yml`:

- **Trigger**: Manual workflow dispatch only (push/PR triggers commented out)
- **Runner**: Ubuntu latest with 30-minute timeout
- **Database Setup**: Fresh SQLite database created via migrations before tests
- **Artifacts**: Playwright reports and test results retained for 30 days
- **Summary**: Test counts and failed test details in GitHub step summary

### Running in CI

```bash
# Manually trigger from GitHub Actions tab
# Or uncomment push/pull_request triggers in workflow file
```

## Troubleshooting

### Tests Fail to Start

- Ensure both backend and frontend dependencies are installed
- Check that ports 8080 and 5173 are not in use
- Verify Playwright browsers are installed: `bunx playwright install chromium`

### Database Issues

- The test database `./backend/data/e2e-test.db` is deleted and recreated for each test run
- Migrations run automatically via the `webServer.command` in `playwright.config.ts`
- Test credentials are set via environment variables in the config

### Viewing Test Results

```bash
# Open HTML report
bun run test:e2e:report

# Check JSON results
cat test-results/results.json | jq

# Check JUnit XML
cat test-results/results.xml
```
