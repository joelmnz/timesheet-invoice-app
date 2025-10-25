# E2E Testing Quick Start Guide

## First Time Setup

### 1. Install Dependencies

```bash
# Install root-level dependencies (includes Playwright)
bun install

# Install Playwright browsers
bunx playwright install chromium
```

### 2. Verify Installation

```bash
# List all available tests
bunx playwright test --list

# Should show 21 tests across 5 test files
```

## Running Tests

### Quick Commands

```bash
# Run all tests (headless)
bun run test:e2e

# Interactive UI mode (recommended for development)
bun run test:e2e:ui

# Run with visible browser
bun run test:e2e:headed

# Debug mode with Playwright Inspector
bun run test:e2e:debug

# View last test report
bun run test:e2e:report
```

### Targeted Testing

```bash
# Run specific test file
bunx playwright test e2e/clients.spec.ts

# Run specific test by name
bunx playwright test -g "should create a new client"

# Run in specific browser
bunx playwright test --project=chromium

# Update snapshots (if using visual testing)
bunx playwright test --update-snapshots
```

## Debugging Failed Tests

### 1. Visual Inspection

```bash
# Run in headed mode to see what's happening
bun run test:e2e:headed

# Use UI mode for step-by-step debugging
bun run test:e2e:ui
```

### 2. Check Test Artifacts

After a test run, check these folders:
- `playwright-report/` - HTML report with screenshots/videos
- `test-results/` - JSON and XML results

```bash
# Open HTML report
bun run test:e2e:report
```

### 3. Use Playwright Inspector

```bash
# Debug specific test
bunx playwright test e2e/clients.spec.ts --debug

# Debug with grep pattern
bunx playwright test -g "should create" --debug
```

### 4. View Trace Files

```bash
# Show trace for a specific test
bunx playwright show-trace test-results/path-to-trace.zip
```

## Writing New Tests

### 1. Add Test File

Create a new file in `e2e/` directory:

```typescript
// e2e/feature-name.spec.ts
import { test, expect } from './fixtures/helpers';
import { generateTestId } from './fixtures/helpers';

test.describe('Feature Name', () => {
  test('should do something', async ({ authenticatedPage: page }) => {
    // Your test code here
  });
});
```

### 2. Add data-testid to UI Components

When testing new UI elements, add `data-testid` attributes:

```tsx
// In your React component
<Button data-testid="my-action-btn">
  Do Something
</Button>

<TextInput data-testid="my-input" />
```

### 3. Use Test Helpers

```typescript
// Generate unique test data
const testName = generateTestId('MyEntity-');

// Use authenticated page fixture
test('my test', async ({ authenticatedPage: page }) => {
  // Already logged in!
  await page.goto('/my-page');
});
```

### 4. Follow Best Practices

- Use `E2E-` prefix for all test data
- Make tests independent (no shared state)
- Use specific assertions
- Add meaningful test descriptions
- Clean up test data (handled by fixtures)

## Common Issues

### Tests Won't Start

**Issue**: Servers fail to start
```bash
Error: WebServer process exited unexpectedly with code 1
```

**Solution**: 
- Check if ports 8080 and 5173 are free
- Verify Bun is installed: `bun --version`
- Check backend/frontend dependencies are installed (`bun install` in each directory)

### Selector Not Found

**Issue**: `Error: Locator not found`

**Solutions**:
1. Check if `data-testid` exists in the component
2. Use Playwright Inspector to find the element:
   ```bash
   bunx playwright test --debug
   ```
3. Verify the element is visible (not hidden by CSS)

### Flaky Tests

**Issue**: Test passes sometimes, fails other times

**Solutions**:
1. Use `expect().toBeVisible()` instead of manual waits
2. Increase timeout for slow operations:
   ```typescript
   await expect(element).toBeVisible({ timeout: 10000 });
   ```
3. Check for race conditions
4. Ensure test data is unique

### Database Issues

**Issue**: Test database errors

**Solution**:
```bash
cd backend
export DATABASE_PATH=./data/e2e-test.db
bun run db:generate
bun run db:migrate
```

## CI/CD Integration

Tests run automatically in GitHub Actions on:
- Push to `main` or `develop`
- Pull requests
- Manual workflow dispatch

### Viewing CI Results

1. Go to GitHub Actions tab
2. Select the "E2E Tests" workflow
3. View test summary in the job summary
4. Download artifacts for detailed reports

## Tips & Tricks

### 1. Speed Up Development

```bash
# Run only changed tests
bunx playwright test --only-changed

# Run tests in parallel (faster)
bunx playwright test --workers=4
```

### 2. Codegen for New Tests

```bash
# Generate test code by recording actions
bunx playwright codegen http://localhost:5173
```

### 3. Mobile Testing

```bash
# Test on mobile viewport
bunx playwright test --project="Mobile Chrome"
```

### 4. Network Debugging

```bash
# See network requests
bunx playwright test --trace on
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Test Strategy Guide](./TEST_STRATEGY.md)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Getting Help

- Check existing tests for examples
- Review Playwright documentation
- Ask in team chat/discussions
- Open an issue for test infrastructure problems
