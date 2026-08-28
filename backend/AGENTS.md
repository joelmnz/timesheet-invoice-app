# Agent Guidelines

## Purpose
- Own the Express API, Drizzle/SQLite data model, backend services, backend utilities, and backend tests.
- Keep backend work understandable without requiring frontend or e2e-specific context.

## Ownership
- `src/`, `drizzle/`, `drizzle.config.ts`, `seed-data.ts`, `test-sequential.sh`, backend package metadata, and backend README-level guidance.
- Test databases and migration artifacts under `data/` and `drizzle/meta/` when they are part of backend workflows.

## Local Contracts
- Backend imports in TypeScript must use `.js` extensions for local modules.
- Routes validate request data with Zod schemas from `src/types/validation.ts` and delegate failures to the centralized error handler.
- Error handling stays centralized in `src/middleware/errorHandler.ts`; routes throw or pass errors to `next(err)` instead of composing bespoke error responses.
- Database changes start in `src/db/schema.ts`, then use `bun run db:generate`, review generated SQL in `drizzle/`, and apply with `bun run db:migrate`.
- Drizzle ORM uses SQLite; persisted date columns remain ISO 8601 `TEXT` values rather than integer timestamps, and Luxon handles backend date and timezone logic.
- The `settings` table remains a singleton row with `id=1` and is seeded as part of initial migration setup.
- Session authentication depends on the existing cookie and proxy behavior; preserve the current `secure: 'auto'` cookie mode and trust-proxy assumptions when changing auth or deployment code.
- Session expiration is sliding (`rolling: true` in `src/app.ts`): the cookie and store TTL refresh on every request so regular use never logs the user out; sessions only expire after 7 days of complete inactivity. Keep this behavior when touching session config.
- Backend tests share a SQLite test database and must continue to run sequentially.

## Work Guidance
- Runtime is Bun with strict TypeScript and ESM modules.
- Express 5, Drizzle ORM, Zod, and Luxon are the default implementation stack; preserve existing patterns before introducing new abstractions.
- Infer application types from Drizzle schemas with `$inferSelect` and `$inferInsert` instead of duplicating model types.
- Keep route organization resource-based under `src/routes/` and place non-trivial document/export logic in `src/services/`.
- Preserve current API conventions for pagination, filtering, auth enforcement, and session-based authentication.
- Keep PDF generation aligned with the existing backend service stack, including pdfmake, embedded fonts, and the current Markdown-to-PDF rendering path.
- Preserve invoice footer template-variable support, including placeholders such as `{{invoice_number}}`, `{{due_date}}`, `{{total_amount}}`, and `{{client_name}}`.
- Watch for known backend constraints: invoice numbering is transactionally managed in settings, cascade deletes are intentional, and time rounding stays aligned with six-minute increments.

## Verification
- **Build**: `cd backend && bun run build`
- **All Backend Tests**: `cd backend && bun run test`
- **Single Backend Test**: `cd backend && bun test --preload ./src/tests/setup.ts src/tests/<file>.test.ts`
- **Migrations**: `cd backend && bun run db:generate && bun run db:migrate`

## Child DOX Index
- No deeper child AGENTS.md files currently exist under `backend/`.
- This contract retains backend package structure, migrations, test fixtures, and local documentation within `backend/`.