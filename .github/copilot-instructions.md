# Timesheet Invoice App - AI Coding Agent Instructions

## Architecture Overview

**Full-stack timesheet/invoicing app:** Backend (Express + Drizzle ORM + SQLite) serves REST API and built frontend (React + Mantine + React Router v7). Uses **Bun runtime** for both backend and frontend.

### Key Architectural Patterns

- **Monorepo structure:** `backend/` and `frontend/` with independent packages, shared E2E tests at root
- **Session-based auth:** Express-session with SQLite store (`connect-sqlite3`), single-user auth via env vars
- **Type-safe data flow:** Drizzle schema → `$inferSelect`/`$inferInsert` → Zod validation → API → TanStack Query
- **Service layer:** PDF/CSV generation in `backend/src/services/`, complex queries in routes
- **Production serving:** Backend serves `frontend/dist` static files, SPA catch-all route handles client-side routing

### Database Architecture

- **SQLite with Drizzle ORM:** Schema in `backend/src/db/schema.ts` with foreign key cascade deletes
- **Migration workflow:** Edit schema → `bun run db:generate` → review SQL → `bun run db:migrate`
- **Auto-migrations:** Production runs migrations on startup via `backend/src/index.ts`, checks `checkMigrationStatus()`
- **Migration tracking:** Drizzle uses `__drizzle_migrations` table with hash-based tracking
- **Date/time storage:** All dates stored as ISO 8601 TEXT strings, use Luxon for timezone-aware operations (default: Pacific/Auckland)
- **Singleton settings:** `settings` table enforces `id=1`, seeded on first migration

## Development Workflow

### Essential Commands (from AGENTS.md)

```bash
# Backend (from backend/)
bun run dev          # Watch mode on localhost:8080
bun run build        # TypeScript compilation
bun run test         # Sequential test suite via test-sequential.sh
bun test --preload ./src/tests/setup.ts src/tests/<file>.test.ts  # Single test
bun run db:generate  # Generate Drizzle migration
bun run db:migrate   # Apply migrations

# Frontend (from frontend/)
bun run dev          # Vite dev server on localhost:5173
bun run build        # Production build to dist/
bun run test <file>  # Single test file
bun run test:ui      # Vitest UI

# E2E (from root)
bun run test:e2e     # Playwright tests (auto-starts servers)
```

### Testing Strategy

- **Backend tests:** Sequential execution required (shared test DB), 88 tests covering auth/CRUD/CSV import. Setup in `backend/src/tests/setup.ts` creates fresh test DB, mocks env vars.
- **E2E tests:** Playwright tests in `e2e/`, fresh DB per run (`backend/data/e2e-test.db`), prefixed test data (`E2E-`). Use `authenticatedPage` fixture from `e2e/fixtures/helpers.ts`.
- **Test isolation:** Backend tests use `backend/data/test.db`, E2E uses `e2e-test.db`, dev uses `app.db`

## Critical Code Conventions

### Backend Import Extensions

**MUST use `.js` extensions** in backend imports (TypeScript compiles to ESM):
```typescript
import { db } from '../db/index.js';  // ✓ Correct
import { db } from '../db/index';     // ✗ Wrong - runtime error
```

### Type Inference Pattern

**Infer types from Drizzle schemas** (never duplicate):
```typescript
// In backend/src/db/schema.ts
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

// In backend/src/routes/
const [client] = await db.select().from(clients)...;  // Type: Client
```

### Validation Pattern

**Zod schemas in `backend/src/types/validation.ts`**, parse in routes:
```typescript
const result = createClientSchema.parse(req.body);  // Throws ZodError
await db.insert(clients).values(result);
```

### Error Handling Pattern

**Throw errors in routes, catch in centralized `errorHandler` middleware**:
```typescript
// Routes throw, never send error responses directly
if (!invoice) throw new Error('Invoice not found');

// middleware/errorHandler.ts handles ZodError, SQL errors, generic errors
```

### Date/Time Handling

- **Always use Luxon** for date operations (never native Date for display)
- **API/DB format:** ISO 8601 strings (`YYYY-MM-DD` or full timestamp)
- **Timezone:** Defaults to `Pacific/Auckland`, configurable via `TZ` env var
- **Utilities:** `backend/src/utils/time.ts` has `roundUpToSixMinutes()`, `calculateDueDate()`, tax year helpers

## API Patterns

### Route Structure

Routes in `backend/src/routes/`, grouped by resource:
- **Auth middleware:** `requireAuth` from `middleware/auth.ts`, checks `req.session.authenticated`
- **Pagination:** Query params `page` (1-indexed), `page_size` (10/25/50/100)
- **Filtering:** Resource-specific query params (e.g., `status`, `clientId`, `from`, `to`)

### Invoice Generation Flow

Multi-step process in `backend/src/routes/invoices.ts`:
1. **Calculate totals:** Query uninvoiced time/expenses, group by day if requested
2. **Atomic transaction:** Create invoice, line items, update `isInvoiced` flags, increment `nextInvoiceNumber`
3. **PDF generation:** `backend/src/services/pdf.ts` uses pdfmake with Markdown footer support (via `html-to-pdfmake`)

### Template Variables

Invoice footer Markdown supports variables via `backend/src/utils/template.ts`:
```markdown
Invoice #{{invoice_number}} due {{due_date}}
Total: {{total_amount}} for {{client_name}}
```

## Frontend Patterns

### Data Fetching

**TanStack Query everywhere**, API services in `frontend/src/services/api.ts`:
```typescript
const { data: clients } = useQuery({
  queryKey: ['clients', page, query],
  queryFn: () => clientsApi.list(query, page),
});
```

### Auth Context

`frontend/src/contexts/AuthContext.tsx` wraps app, provides `user`, `login()`, `logout()`. Protected routes check `user?.authenticated`.

### Timer Context

`frontend/src/contexts/TimerContext.tsx` manages running timer state with:
- **Offline support:** IndexedDB via `utils/timerDb.ts` for offline timer persistence
- **Sync on reconnect:** Auto-syncs unsynced timers when back online
- **Long-running alerts:** Notification at 6 hours runtime

### Form Handling

**Mantine `useForm` hook** with validation:
```typescript
const form = useForm({
  initialValues: { name: '', email: '' },
  validate: { email: (v) => (/.+@.+/.test(v) ? null : 'Invalid') },
});
```

## Deployment & Environment

### Docker Production Setup

- **Multi-stage Dockerfile:** Builds both backend/frontend, runs as UID 99 (UNRAID compatible)
- **Auto-migrations:** Runs on startup via `backend/src/index.ts`, checks `checkMigrationStatus()` before starting server
- **Health check:** `/health` endpoint returns 503 until DB initialized, 200 after
- **Static serving:** Backend serves `frontend/dist` in production, SPA catch-all at `app.get(/^\/(?!api).*/)`

### CORS Configuration

**Environment-aware via `middleware/cors.ts`:**
- **Development:** Allows `localhost:5173`, optionally allows no `Origin` header if `ALLOW_NO_ORIGIN_IN_DEV=true`
- **Production (same-origin):** Leave `ALLOWED_ORIGINS` empty, CORS disabled (backend serves frontend)
- **Production (cross-origin):** Set `ALLOWED_ORIGINS=https://app.example.com`, requires `Origin` header
- **Security:** Logs blocked origins, fails closed if origin not in allowlist

### Critical Environment Variables

```bash
NODE_ENV=production
SESSION_SECRET=<32+ char random string>  # Required in prod, app fails to start if missing
APP_USERNAME=admin
APP_PASSWORD=<secure password>           # Required in prod (or APP_PASSWORD_HASH)
DATABASE_PATH=/data/app.db               # Default: ./data/app.db
TZ=Pacific/Auckland                      # Affects date calculations
ALLOWED_ORIGINS=                         # Empty = same-origin (recommended), set for cross-origin
ALLOW_NO_ORIGIN_IN_DEV=false             # Only true for dev testing (curl/Postman)
```

## Common Gotchas

1. **Backend imports must use `.js` extension** even in `.ts` files (ESM requirement)
2. **Sequential tests required** - backend tests share DB, use `test-sequential.sh` not parallel runs
3. **Database migrations best practices:**
   - Always review generated SQL in `backend/drizzle/` before committing
   - Test migrations locally with `bun run db:migrate` before deployment
   - Migration files are part of Docker image, auto-run on container startup
   - Use `checkMigrationStatus()` API to verify migration state
4. **Session cookies work HTTP + HTTPS** - `secure: 'auto'` detects protocol, `trust proxy` enabled for Cloudflare tunnels
5. **Time entry rounding** - `roundUpToSixMinutes()` rounds to 0.1 hour increments (6-minute blocks)
6. **Invoice number auto-increment** - Managed by `settings.nextInvoiceNumber`, updated in transaction during invoice creation
7. **Cascade deletes configured in schema** - Deleting client/project cascades to time entries, expenses, invoices
8. **PDF generation requires fonts** - Uses pdfmake with embedded Roboto fonts via `vfs_fonts.js`, JSDOM for Markdown rendering

## File Reference

Key files for understanding patterns:
- **Schema:** `backend/src/db/schema.ts` - all tables, types, indexes
- **Validation:** `backend/src/types/validation.ts` - all Zod schemas
- **Error handling:** `backend/src/middleware/errorHandler.ts` - centralized error responses
- **Auth flow:** `backend/src/routes/auth.ts` + `middleware/auth.ts`
- **API client:** `frontend/src/services/api.ts` - all API calls
- **Invoice logic:** `backend/src/routes/invoices.ts` - complex transaction logic
- **PDF generation:** `backend/src/services/pdf.ts` - pdfmake integration
- **Timer offline support:** `frontend/src/utils/timerDb.ts` - IndexedDB wrapper
