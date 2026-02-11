# Agent Guidelines

## Build/Lint/Test Commands
- **Backend Build**: `cd backend && bun run build` (TypeScript compilation via `tsc`, no linter configured)
- **Frontend Build**: `cd frontend && bun run build` (Vite production build)
- **Frontend Type Check**: `cd frontend && npx tsc --noEmit` (type check without emitting)
- **Backend Dev**: `cd backend && bun run dev` (bun --watch on localhost:8080)
- **Frontend Dev**: `cd frontend && bun run dev` (Vite on localhost:5173)
- **Backend Tests**: `cd backend && bun run test` (sequential via `test-sequential.sh`, shared DB)
- **Single Backend Test**: `cd backend && bun test --preload ./src/tests/setup.ts src/tests/<filename>.test.ts`
- **Single Frontend Test**: `cd frontend && bun run test <filename>`
- **Test UI** (frontend only): `cd frontend && bun run test:ui`
- **E2E Tests**: `bun run test:e2e` (Playwright, from project root, auto-starts servers)
- **E2E Headed**: `bun run test:e2e:headed`
- **DB Migrations**: `cd backend && bun run db:generate && bun run db:migrate`
- **DB Seed**: `cd backend && bun run db:seed`
- **Precommit**: `bun run precommit` (runs backend tsc, frontend tsc --noEmit, frontend vite build, Docker build)

## Project Structure
- **Monorepo**: `backend/` (Express API) + `frontend/` (React SPA) + `e2e/` (Playwright)
- **Runtime**: Bun for both backend and frontend
- **Package Manager**: Bun (lockfile: `bun.lockb`)
- **Backend**: Express 5 + Drizzle ORM (SQLite) + Zod validation + Luxon dates
- **Frontend**: React 19 + Mantine 8 + React Router v7 + TanStack Query + Vitest
- **Auth**: Session-based (express-session + connect-sqlite3), single-user via env vars

## Code Style

### Formatting
- **Indentation**: 2 spaces (enforced by `.editorconfig`), LF line endings
- **Final newline**: Required (`.editorconfig`)
- **No linter/formatter tool** configured (no ESLint, no Prettier)

### Imports
- **ESM only** (`import`/`export`) throughout — both packages have `"type": "module"`
- **Backend imports MUST use `.js` extensions** (TypeScript compiles to ESM, Node requires extensions):
  ```typescript
  import { db } from '../db/index.js';           // CORRECT
  import { requireAuth } from '../middleware/auth.js'; // CORRECT
  import { db } from '../db/index';              // WRONG - runtime error
  ```
- **Frontend imports do NOT need extensions** (Vite/bundler resolves them)

### TypeScript
- **Strict mode** enabled in both `tsconfig.json` files
- **Backend**: target ES2022, module ESNext, moduleResolution node, `bun-types` included
- **Frontend**: target ES2020, moduleResolution bundler, `noUnusedLocals` + `noUnusedParameters` enabled
- **Never suppress errors** with `as any`, `@ts-ignore`, or `@ts-expect-error`

### Naming
- **camelCase** for variables, functions, route handlers, database column aliases
- **PascalCase** for React components, types, interfaces, Zod schema names
- **Database columns**: snake_case in SQL, camelCase in Drizzle schema definitions

### Types
- **Infer from Drizzle schemas** using `$inferSelect` / `$inferInsert` (never duplicate types):
  ```typescript
  export type Client = typeof clients.$inferSelect;
  export type NewClient = typeof clients.$inferInsert;
  ```
- **Validation schemas** in `backend/src/types/validation.ts` using Zod — parse in route handlers:
  ```typescript
  const result = createClientSchema.parse(req.body); // Throws ZodError on failure
  ```
- **Frontend types** in `frontend/src/types/index.ts`, shared via `import type`

### Error Handling
- **Backend routes**: Wrap handler body in `try/catch`, pass errors to `next()`:
  ```typescript
  router.get('/', requireAuth, async (req, res, next) => {
    try {
      // ... handler logic
      res.json(data);
    } catch (err) { next(err); }
  });
  ```
- **Centralized error handler** in `backend/src/middleware/errorHandler.ts` handles:
  - `ZodError` → 400 with validation details
  - `UNIQUE constraint failed` → 409
  - Everything else → 500
- **Never send error responses directly in routes** — always throw or `next(err)`

### Date/Time
- **Always use Luxon** (`DateTime`) for date operations, never raw `Date` for display
- **API/DB format**: ISO 8601 TEXT strings (`YYYY-MM-DD` or full timestamp)
- **Default timezone**: `Pacific/Auckland`, configurable via `TZ` env var
- **Utilities**: `backend/src/utils/time.ts` — `roundUpToSixMinutes()`, `calculateDueDate()`, `getCurrentTimestamp()`

## Database
- **Drizzle ORM with SQLite** (via `bun:sqlite`)
- **Schema**: `backend/src/db/schema.ts` — all tables, types, indexes, foreign keys
- **Cascade deletes** configured: deleting client cascades to projects → time entries, expenses, invoices
- **Migration workflow**: Edit schema → `bun run db:generate` → review SQL in `backend/drizzle/` → `bun run db:migrate`
- **Settings**: Singleton row (`id=1`), seeded on first migration
- **Date columns**: Stored as TEXT (ISO 8601), not INTEGER timestamps

## API Patterns
- **Routes** in `backend/src/routes/`, one file per resource (clients, projects, timeEntries, etc.)
- **Auth middleware**: `requireAuth` from `middleware/auth.ts` on all non-auth routes
- **Pagination**: Query params `page` (1-indexed), `page_size` (10/25/50/100)
- **Filtering**: Resource-specific query params (`status`, `clientId`, `from`, `to`)
- **Response format**: `{ data: [...], pagination: { page, pageSize, total, totalPages } }`
- **Service layer**: `backend/src/services/` for PDF (`pdfmake`) and CSV generation

## Frontend Patterns
- **UI library**: Mantine 8 components and hooks (`@mantine/core`, `@mantine/form`, `@mantine/dates`)
- **Icons**: `@tabler/icons-react`
- **Data fetching**: TanStack Query (`useQuery`, `useMutation`) with API services in `frontend/src/services/api.ts`
- **Routing**: React Router v7 (`react-router-dom`)
- **Auth context**: `frontend/src/contexts/AuthContext.tsx` — wraps app, provides `user`, `login()`, `logout()`
- **Timer context**: `frontend/src/contexts/TimerContext.tsx` — offline support via IndexedDB
- **Forms**: Mantine `useForm` hook with inline validation

## Testing
- **Backend tests**: Vitest + Supertest, sequential execution required (shared SQLite test DB)
  - Setup in `backend/src/tests/setup.ts` creates fresh DB, runs migrations, seeds settings
  - Test DB path: `backend/data/test/app.test.db` (isolated from dev `app.db`)
  - Tests: auth, settings, clients, projects, import, invoices, client-invoices
  - Helper utilities in `backend/src/tests/helpers.ts`
- **Frontend tests**: Vitest with jsdom environment
- **E2E tests**: Playwright in `e2e/`, fresh DB per run (`backend/data/e2e-test.db`)
  - Use `authenticatedPage` fixture from `e2e/fixtures/helpers.ts`
  - Test data prefixed with `E2E-` for identification

## Key Files Reference
- **Schema**: `backend/src/db/schema.ts` — all tables, types, foreign keys
- **Validation**: `backend/src/types/validation.ts` — all Zod schemas
- **Error handler**: `backend/src/middleware/errorHandler.ts`
- **Auth**: `backend/src/routes/auth.ts` + `backend/src/middleware/auth.ts`
- **API client**: `frontend/src/services/api.ts` — all frontend API calls
- **Frontend types**: `frontend/src/types/index.ts`
- **Invoice logic**: `backend/src/routes/invoices.ts` — complex transaction logic
- **PDF service**: `backend/src/services/pdf.ts` — pdfmake with Markdown footer
- **Timer offline**: `frontend/src/utils/timerDb.ts` — IndexedDB persistence
- **Test setup**: `backend/src/tests/setup.ts`

## Common Gotchas
1. **Backend imports MUST use `.js` extension** even in `.ts` files — ESM requirement, will fail at runtime without it
2. **Backend tests must run sequentially** — they share a test DB; use `bun run test` (not `bun test` directly for all)
3. **Time entry rounding**: `roundUpToSixMinutes()` rounds to 0.1 hour increments (6-minute blocks)
4. **Invoice number auto-increment**: Managed by `settings.nextInvoiceNumber`, updated atomically in transaction
5. **Cascade deletes are configured** — deleting a client deletes all its projects, time entries, expenses, invoices
6. **Session cookies**: `secure: 'auto'`, `trust proxy` enabled for Cloudflare tunnels
7. **PDF generation**: Uses pdfmake with embedded Roboto fonts via `vfs_fonts.js`, JSDOM for Markdown rendering
8. **Template variables** in invoice footer: `{{invoice_number}}`, `{{due_date}}`, `{{total_amount}}`, `{{client_name}}`
9. **Frontend has `noUnusedLocals`/`noUnusedParameters`** enabled — remove unused imports/vars or build fails
10. **Express 5** is used (not 4) — async error handling differs slightly from Express 4
