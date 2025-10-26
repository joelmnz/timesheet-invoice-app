# Backend API Tests

This directory contains API integration tests for the backend Express application. Tests validate API endpoints, authentication, data validation, and business logic using Vitest and Supertest.

## Test Files

- `auth.test.ts` - Authentication endpoints and session management (16 tests)
- `settings.test.ts` - Application settings CRUD operations (14 tests)
- `clients.test.ts` - Client management endpoints (25 tests)
- `projects.test.ts` - Project management and timer functionality (26 tests)
- `import.test.ts` - CSV import validation and processing (5 tests)
- `invoices.test.ts` - Invoice generation and calculations (2 tests)

**Total: 88 tests**

## Running Tests

### Prerequisites

- **Bun** runtime installed
- Backend dependencies installed: `bun install`

### Commands

```bash
# From backend directory
cd backend

# Run all tests (sequential execution)
bun run test

# Run tests in parallel (for development/debugging)
bun run test:parallel

# Run tests with watch mode
bun run test:watch

# Run specific test file
bun test src/tests/auth.test.ts

# Run with UI (Vitest UI)
bun run test:ui
```

### Test Execution Strategy

Tests run **sequentially** (one file at a time) to prevent database race conditions:

- Uses `test-sequential.sh` script that chains test files with `&&`
- Exits on first failure (`set -e`)
- Total execution time: ~42 seconds
- Each file: 5-10 seconds

**Why Sequential?**
- All tests use a shared singleton in-memory SQLite database
- Routes import `db` from `db/index.js` (singleton pattern)
- Sequential execution prevents parallel test conflicts
- Simpler architecture than isolated DB injection

## Test Architecture

### Database Setup

**Singleton In-Memory Database Pattern:**

1. **`src/tests/setup.ts`** - Configures test environment variables:
   - Sets `DATABASE_PATH=':memory:'` for in-memory SQLite
   - Sets test credentials: `admin` / `admin`
   - Configures timezone and session secret

2. **`src/db/index.ts`** - Creates singleton database at module load:
   ```typescript
   export const db = drizzle(sqlite, { schema });
   ```

3. **All routes** import this singleton:
   ```typescript
   import { db } from '../db/index.js';
   ```

4. **Tests** use the same singleton via `ensureTestSettings()`

### Test Structure

Each test file follows this pattern:

```typescript
import { describe, test, expect, beforeAll } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { ensureTestSettings, createAuthenticatedAgent } from "./helpers.js";

describe("Feature Routes", () => {
  let app: any;
  let agent: request.SuperAgentTest;

  beforeAll(async () => {
    ensureTestSettings();           // Setup test settings in singleton DB
    app = createApp();              // Create Express app
    agent = request.agent(app);     // Create Supertest agent
    await createAuthenticatedAgent(agent); // Login (for protected routes)
  });

  describe("POST /api/endpoint", () => {
    test("should do something", async () => {
      const res = await agent.post("/api/endpoint").send(data);
      expect(res.status).toBe(200);
    });
  });
});
```

### Test Helpers

Located in `src/tests/helpers.ts`:

#### Database & Setup
- **`ensureTestSettings()`** - Inserts/updates default settings in singleton DB

#### Authentication
- **`createAuthenticatedAgent(agent)`** - Logs in agent with `admin`/`admin`

#### Test Data Factories
- **`createTestClientData(overrides?)`** - Generate client test data
- **`createTestProjectData(clientId, overrides?)`** - Generate project test data
- **`createTestTimeEntryData(projectId, overrides?)`** - Generate time entry test data
- **`createTestExpenseData(projectId, overrides?)`** - Generate expense test data
- **`createTestInvoiceData(overrides?)`** - Generate invoice test data

#### Assertion Helpers
- **`expectValidationError(res, field?)`** - Assert 400 status and optional field mention
- **`expectUnauthorized(res)`** - Assert 401 status
- **`expectNotFound(res)`** - Assert 404 status
- **`expectSuccess(res, expectedStatus?)`** - Assert expected status code

### Test Data Conventions

- Use unique timestamps in test data names to avoid collisions:
  ```typescript
  name: `Test Client ${Date.now()}`
  ```
- All tests share the same in-memory database (sequential execution prevents conflicts)
- No explicit cleanup needed (database persists across test files within same run)

## Testing Strategies

### 1. Authentication Tests (`auth.test.ts`)

**Coverage:**
- Valid/invalid credentials
- Missing/empty fields
- Session management
- Cookie persistence
- Logout functionality
- Password change
- Unauthenticated access

**Strategy:**
- Test both successful and failure paths
- Validate input validation (Zod schemas)
- Verify session state changes

### 2. CRUD Operation Tests (`clients.test.ts`, `projects.test.ts`)

**Coverage:**
- Create with all/minimal fields
- Read (list, pagination, single resource)
- Update (full and partial)
- Delete/archive operations
- Validation errors
- Authorization checks
- Not found scenarios

**Strategy:**
- Test happy path first (full data)
- Test minimal required fields
- Test each validation rule (negative values, missing fields, etc.)
- Test edge cases (empty strings, invalid formats)
- Verify cascade behaviors (e.g., archiving client archives projects)

### 3. Pagination Tests

**Coverage:**
- Default pagination (limit 10)
- Custom page sizes
- Page navigation
- Out-of-range pages
- Invalid pagination parameters

**Strategy:**
- Create known dataset size
- Verify correct page slicing
- Test metadata (total, page, pageSize, totalPages)

### 4. Business Logic Tests (`projects.test.ts` - Timer)

**Coverage:**
- Start timer (creates entry with startAt, no endAt)
- Stop timer (updates existing entry with endAt)
- Error cases:
  - Multiple active timers for same project (409 Conflict)
  - Stopping non-existent timer (404)
  - Starting timer when one already active (409)

**Strategy:**
- Test state transitions (no timer → active → stopped)
- Test conflict scenarios (concurrent timers)
- Verify database state changes (null endAt for active timers)

### 5. Import/Export Tests (`import.test.ts`)

**Coverage:**
- CSV format validation
- Required field validation
- Data type validation (dates, numbers)
- Error messaging for invalid rows

**Strategy:**
- Test valid CSV import
- Test each validation rule (missing fields, invalid formats)
- Verify error messages are helpful

### 6. Integration Tests (`invoices.test.ts`)

**Coverage:**
- Invoice generation from time entries
- Invoice calculations (subtotal, tax, total)
- PDF generation
- Invoice numbering

**Strategy:**
- Create realistic data graph (client → project → time entries → invoice)
- Verify calculations match business logic
- Test output formats (JSON, PDF)

## Environment Configuration

Test environment is configured in `src/tests/setup.ts`:

```typescript
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-key-for-testing';
process.env.TZ = 'Pacific/Auckland';
process.env.DATABASE_PATH = ':memory:';
process.env.APP_USERNAME = 'admin';
process.env.APP_PASSWORD = 'admin';
```

## Adding New Tests

1. **Create test file**: `src/tests/feature.test.ts`

2. **Add to test script**: Edit `test-sequential.sh` to include new file

3. **Follow structure**:
   ```typescript
   import { describe, test, expect, beforeAll } from "bun:test";
   import request from "supertest";
   import { createApp } from "../app.js";
   import { ensureTestSettings, createAuthenticatedAgent } from "./helpers.js";

   describe("Feature Routes", () => {
     let app: any;
     let agent: request.SuperAgentTest;

     beforeAll(async () => {
       ensureTestSettings();
       app = createApp();
       agent = request.agent(app);
       await createAuthenticatedAgent(agent);
     });

     // Tests here
   });
   ```

4. **Use helpers**:
   - Use test data factories for consistent data generation
   - Use assertion helpers for common status checks
   - Add new helpers if needed for reusable patterns

5. **Test coverage checklist**:
   - ✅ Happy path (valid data)
   - ✅ Validation errors (each required field, format rules)
   - ✅ Authorization (unauthenticated access)
   - ✅ Not found scenarios
   - ✅ Edge cases (empty values, boundary conditions)
   - ✅ Business logic rules

## Troubleshooting

### Tests Fail When Run in Parallel

- Backend tests **must** run sequentially due to shared singleton database
- Use `bun run test` (not `bun run test:parallel`)

### Database State Issues

- Tests share the same in-memory database instance
- Use unique names with timestamps to avoid conflicts
- Database is recreated fresh for each test run (not persisted)

### Session/Authentication Issues

- Ensure `createAuthenticatedAgent()` is called in `beforeAll()`
- Use the same `agent` instance across tests in a describe block
- Create new agent with `request.agent(app)` for unauthenticated tests

### Import Path Issues

- All imports **must** use `.js` extensions (ESM requirement)
- Example: `import { db } from '../db/index.js';` ✅
- Example: `import { db } from '../db/index';` ❌

## Future Improvements

### Test Coverage Expansion

Recommended new test files:

1. **`timeEntries.test.ts`** (~20 tests)
   - CRUD operations
   - Pagination
   - Filtering by project/date range
   - Validation (overlapping entries, required fields)

2. **`expenses.test.ts`** (~15 tests)
   - CRUD operations
   - Pagination
   - Billable/non-billable tracking
   - Date validation

3. **`dashboard.test.ts`** (~15 tests)
   - Statistics endpoints
   - Date range filtering
   - Aggregation calculations

4. **`invoices.test.ts` expansion** (from 2 to ~30 tests)
   - Complete CRUD coverage
   - PDF generation
   - Invoice status workflows
   - Payment tracking
   - Time entry grouping options

### Parallel Test Execution (Optional)

To enable parallel tests, refactor to isolated databases:

1. Change `createApp()` to accept `db` parameter
2. Convert route handlers to router factories accepting `db`
3. Each test creates isolated in-memory database
4. Update `test-sequential.sh` to `bun test` (parallel)

**Trade-off**: More complexity vs. faster execution (currently 42s sequential is acceptable)
