# Test Strategy

## Overview

This document outlines the automated testing strategy for the Timesheet Invoice Application, including end-to-end (E2E) testing with Playwright to ensure core business functionality remains stable across changes.

## Testing Framework

### Playwright E2E Tests

We use [Playwright](https://playwright.dev/) for end-to-end testing because:

- **Cross-browser support**: Test on Chromium, Firefox, and WebKit
- **Auto-wait**: Intelligent waiting for elements to be ready
- **Network interception**: Ability to mock API responses
- **Parallel execution**: Run tests concurrently for faster feedback
- **Rich debugging**: Screenshots, videos, and trace files on failure
- **TypeScript support**: Full type safety in tests

### Test Architecture

```
timesheet-invoice-app/
├── e2e/                          # E2E test files
│   ├── fixtures/
│   │   └── helpers.ts           # Test utilities and fixtures
│   ├── auth.spec.ts             # Authentication flows
│   ├── clients.spec.ts          # Client management tests
│   ├── projects.spec.ts         # Project management tests
│   ├── time-tracking.spec.ts    # Time tracking tests
│   └── invoicing.spec.ts        # Invoice generation tests
├── playwright.config.ts          # Playwright configuration
└── .github/workflows/
    └── e2e-tests.yml            # CI pipeline for E2E tests
```

## Test Coverage

### 1. Authentication (`e2e/auth.spec.ts`)

- ✅ Login with valid credentials
- ✅ Login error with invalid credentials
- ✅ Logout functionality
- ✅ Protected route redirection
- ✅ Session persistence after reload

### 2. Client Management (`e2e/clients.spec.ts`)

- ✅ Create new client with all fields
- ✅ Search/filter clients
- ✅ Update client information
- ✅ Client validation (name required, rate positive)

### 3. Project Management (`e2e/projects.spec.ts`)

- ✅ Create new project linked to client
- ✅ Filter projects by status (Active/Inactive/All)
- ✅ Archive/unarchive projects
- ✅ Auto-populate hourly rate from client

### 4. Time Tracking (`e2e/time-tracking.spec.ts`)

- ✅ Create manual time entry
- ✅ Edit time entry
- ✅ Timer simulation (start/stop)
- ✅ Calculate total hours correctly
- ✅ Time entry validation

### 5. Invoicing (`e2e/invoicing.spec.ts`)

- ✅ Generate invoice from time entries
- ✅ Calculate invoice totals correctly
- ✅ Update invoice status
- ✅ Group time entries by day
- ✅ Prevent invoice creation without uninvoiced items
- ✅ Invoice listing and filtering

## Test Data Management

### E2E Prefix Convention

All test data is prefixed with `E2E-` followed by a descriptive name and unique identifier:

```typescript
const clientName = generateTestId('Client-');
// Result: "E2E-Client-1697654321-abc123"
```

This ensures:
- Test data is easily identifiable
- No collisions with real data
- Easy cleanup and debugging

### Data Seeding

Each test suite creates its own test data in `beforeEach` hooks:

```typescript
test.beforeEach(async ({ authenticatedPage: page }) => {
  // Create test client
  clientName = generateTestId('Client-');
  // ... setup code
});
```

### Cleanup

Test data is isolated per test and uses unique identifiers. The test database is reset between CI runs.

## Selectors Strategy

We use `data-testid` attributes for reliable element selection:

```html
<Button data-testid="create-client-btn">New Client</Button>
<TextInput data-testid="client-name-input" />
```

### Selector Priority

1. **data-testid** - Primary selector for critical actions
2. **Role-based** - For semantic elements (`getByRole('button')`)
3. **Text content** - For verification (`getByText()`)
4. **CSS selectors** - Last resort, avoid when possible

## Running Tests

### Local Development

```bash
# Run all E2E tests
bun run test:e2e

# Run in UI mode (interactive)
bun run test:e2e:ui

# Run in headed mode (see browser)
bun run test:e2e:headed

# Debug a specific test
bun run test:e2e:debug

# View latest test report
bun run test:e2e:report
```

### Test-Specific Commands

```bash
# Run specific test file
bunx playwright test e2e/clients.spec.ts

# Run specific test by name
bunx playwright test -g "should create a new client"

# Run in debug mode for specific test
bunx playwright test e2e/clients.spec.ts --debug
```

### CI/CD Pipeline

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

**GitHub Actions Workflow**: `.github/workflows/e2e-tests.yml`

Outputs:
- HTML report artifact
- JSON test results
- JUnit XML for test reporting
- GitHub Step Summary with test counts

## Test Configuration

### Playwright Config (`playwright.config.ts`)

Key settings:
- **Parallel execution**: Disabled in CI, enabled locally
- **Retries**: 2 retries on CI, 0 locally
- **Timeouts**: 30 seconds per test
- **Base URL**: `http://localhost:5173`
- **Reporters**: HTML, JSON, JUnit, and List

### Web Servers

The configuration automatically starts:
1. **Backend** on `http://localhost:8080`
2. **Frontend** on `http://localhost:5173`

Environment variables for test backend:
```env
APP_USERNAME=admin
APP_PASSWORD=admin
SESSION_SECRET=test-secret-key-for-e2e-testing
DATABASE_PATH=./data/e2e-test.db
ALLOW_NO_ORIGIN_IN_DEV=true
```

## Debugging Tests

### 1. Visual Debugging

```bash
# Run with headed browser
bun run test:e2e:headed

# Interactive UI mode
bun run test:e2e:ui

# Debug mode with Inspector
bun run test:e2e:debug
```

### 2. Screenshots and Videos

On test failure, Playwright automatically captures:
- Screenshots at failure point
- Video recording of the test
- Trace file for step-by-step replay

View in the HTML report:
```bash
bun run test:e2e:report
```

### 3. Trace Viewer

```bash
# Open trace for failed test
bunx playwright show-trace test-results/path-to-trace.zip
```

### 4. Console Logs

Tests can access browser console logs:

```typescript
page.on('console', msg => console.log(msg.text()));
```

## Best Practices

### 1. Test Independence

- Each test should be independent and not rely on other tests
- Use `beforeEach` for setup, not shared state
- Clean up test data after each test

### 2. Reliable Selectors

- Prefer `data-testid` for critical UI elements
- Avoid CSS selectors that might change
- Use semantic queries (`getByRole`, `getByLabel`) when appropriate

### 3. Waiting Strategies

- Let Playwright auto-wait for elements
- Use `expect().toBeVisible()` instead of manual waits
- Set appropriate timeouts for slow operations

### 4. Assertions

- Be specific in assertions
- Check both positive and negative cases
- Verify side effects (e.g., navigation, notifications)

### 5. Test Data

- Always use the `E2E-` prefix
- Generate unique identifiers for concurrent tests
- Use descriptive names for test data

## Continuous Improvement

### Adding New Tests

1. Create test file in `e2e/` directory
2. Import helpers: `import { test, expect } from '../fixtures/helpers'`
3. Add `data-testid` to relevant UI components
4. Write tests following existing patterns
5. Update this documentation

### Maintaining Tests

- Review and update tests when UI changes
- Keep selectors up-to-date
- Refactor common patterns into helper functions
- Monitor flaky tests and fix root causes

### Coverage Goals

- ✅ Core authentication flows
- ✅ CRUD operations for all entities
- ✅ Critical business logic (time tracking, invoicing)
- 🔄 Error handling and edge cases (ongoing)
- 🔄 Integration with external systems (future)

## Troubleshooting

### Common Issues

**Tests fail to start servers:**
- Check if ports 8080 and 5173 are available
- Verify Bun is installed: `bun --version`
- Check backend/frontend dependencies are installed

**Tests are flaky:**
- Increase timeout for slow operations
- Check for race conditions in test code
- Ensure test data is unique

**Selectors not found:**
- Verify `data-testid` exists in component
- Check if element is visible (not hidden by CSS)
- Use Playwright Inspector to debug: `npm run test:e2e:debug`

**Database issues:**
- Ensure test database is created: `bun run db:migrate`
- Check database path in environment variables
- Reset database if corrupted

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generators](https://playwright.dev/docs/codegen)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Contact

For questions or issues with the test suite:
- Open an issue in the repository
- Contact the development team
- Check existing test examples for guidance
