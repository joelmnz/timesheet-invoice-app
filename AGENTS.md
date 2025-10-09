# Agent Guidelines

## Build/Lint/Test Commands
- **Backend**: `cd backend && bun run build` (TypeScript compilation, no linter configured)
- **Frontend**: `cd frontend && bun run build` (Vite build, no linter configured)
- **Backend Dev**: `cd backend && bun run dev` (runs with tsx watch)
- **Frontend Dev**: `cd frontend && bun run dev` (runs on localhost:5173)
- **DB Migrations**: `cd backend && bun run db:generate && bun run db:migrate`
- No test framework configured. Check README before adding tests.

## Code Style
- **Indentation**: 2 spaces (enforced by .editorconfig)
- **Imports**: ESM only (`import`/`export`), `.js` extensions in backend imports
- **Types**: Strict TypeScript, infer from Drizzle schemas or Zod validators
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Validation**: Use Zod schemas in `backend/src/types/validation.ts`
- **Error Handling**: Use centralized `errorHandler` middleware, throw errors in routes
- **Date/Time**: Use Luxon (backend/frontend), ISO strings for API/DB
- **Database**: Drizzle ORM with SQLite, use `db/schema.ts` types
- **API**: Express routes in `backend/src/routes/`, service layer for PDF/CSV
