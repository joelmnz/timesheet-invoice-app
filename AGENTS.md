# Agent Guidelines

## Build/Lint/Test Commands
- **Backend Build**: `cd backend && bun run build` (TypeScript compilation, no linter)
- **Frontend Build**: `cd frontend && bun run build` (Vite build, no linter)
- **Backend Dev**: `cd backend && bun run dev` (bun watch on localhost:8080)
- **Frontend Dev**: `cd frontend && bun run dev` (Vite on localhost:5173)
- **Backend Tests**: `cd backend && bun run test` (runs sequential test suite via test-sequential.sh)
- **Single Backend Test**: `cd backend && bun test --preload ./src/tests/setup.ts src/tests/<filename>.test.ts`
- **Single Frontend Test**: `cd frontend && bun run test <filename>`
- **Test UI** (frontend only): `cd frontend && bun run test:ui`
- **DB Migrations**: `cd backend && bun run db:generate && bun run db:migrate`
- **E2E Tests**: `bun run test:e2e` (Playwright, from project root)

## Code Style
- **Indentation**: 2 spaces (enforced by .editorconfig), LF line endings
- **Imports**: ESM only (`import`/`export`), **MUST** use `.js` extensions in backend imports
- **Types**: Strict TypeScript, infer from Drizzle schemas (`$inferSelect`/`$inferInsert`) or Zod validators
- **Naming**: camelCase for variables/functions, PascalCase for components/types/interfaces
- **Validation**: Use Zod schemas in `backend/src/types/validation.ts`, parse in route handlers
- **Error Handling**: Use centralized `errorHandler` middleware, throw errors in routes, pass to `next()`
- **Date/Time**: Use Luxon (backend/frontend), ISO 8601 strings for API/DB (TEXT columns)
- **Database**: Drizzle ORM with SQLite, use types from `db/schema.ts`, cascade deletes configured
- **API**: Express routes in `backend/src/routes/`, service layer in `services/` for PDF/CSV
- **Frontend**: Mantine UI components, React Router v7, TanStack Query for data fetching
- **Package Manager**: Bun for both backend and frontend
