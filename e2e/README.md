# E2E Tests

This directory contains end-to-end tests for the Timesheet Invoice Application using Playwright.

## Test Files

- `auth.spec.ts` - Authentication and session management tests
- `clients.spec.ts` - Client CRUD operations tests
- `projects.spec.ts` - Project management and archival tests
- `time-tracking.spec.ts` - Time entry creation and tracking tests
- `invoicing.spec.ts` - Invoice generation and calculation tests

## Quick Start

```bash
# Run all tests
bun run test:e2e

# Run in UI mode (recommended for development)
bun run test:e2e:ui

# Run with browser visible
bun run test:e2e:headed

# Debug tests
bun run test:e2e:debug
```

## Test Structure

Each test file follows this pattern:

```typescript
import { test, expect } from './fixtures/helpers';
import { generateTestId } from './fixtures/helpers';

test.describe('Feature Name', () => {
  test('should do something', async ({ authenticatedPage: page }) => {
    // Test implementation
  });
});
```

## Test Data

All test data is prefixed with `E2E-` to avoid collisions with production data:

```typescript
const clientName = generateTestId('Client-');
// Result: "E2E-Client-1697654321-abc123"
```

## Fixtures

Located in `fixtures/helpers.ts`:

- `generateTestId()` - Generate unique test identifiers
- `login()` - Helper to authenticate users
- `test` - Extended test fixture with authenticated page
- `E2E_PREFIX` - Constant for test data prefix

## Documentation

For more detailed information, see:

- [Test Strategy](../docs/testing/TEST_STRATEGY.md) - Complete testing strategy
- [Quick Start Guide](../docs/testing/QUICK_START.md) - Developer quick start
- [Implementation Summary](../docs/testing/IMPLEMENTATION_SUMMARY.md) - Implementation details

## CI/CD

Tests run automatically in GitHub Actions on:
- Push to `main` or `develop`
- Pull requests
- Manual workflow dispatch

See `.github/workflows/e2e-tests.yml` for details.
