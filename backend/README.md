# Timesheet Invoice App – Backend

## Overview
This is the backend service for the Timesheet Invoice App. It provides RESTful APIs for timesheet management, invoice generation, and reporting. The backend is built with TypeScript, Express, Drizzle ORM (SQLite), and Bun.

## Tech Stack
- **Language:** TypeScript
- **Runtime:** Bun
- **Framework:** Express
- **ORM:** Drizzle ORM (with SQLite)
- **Validation:** Zod
- **Date/Time:** Luxon

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed
- SQLite (bundled, no setup required)

### Installation
```bash
bun install
```

## Development

### Start Dev Server
```bash
bun run dev
```
Runs the backend with hot-reload using tsx.

### Build
```bash
bun run build
```
Compiles TypeScript sources.

## Database Migrations
Drizzle ORM is used for schema and migrations.

```bash
bun run db:generate   # Generate migration files
bun run db:migrate    # Apply migrations to the database
```

## API Structure
- All routes are defined in `src/routes/`
- Service layer for PDF/CSV generation
- Centralized error handling via `errorHandler` middleware
- Data validation via Zod schemas in `src/types/validation.ts`
- Date/time handled with Luxon, all API/DB dates are ISO strings

## Code Style & Conventions
- **Indentation:** 2 spaces (see `.editorconfig`)
- **Imports:** ESM only, use `.js` extensions in backend imports
- **Types:** Strict TypeScript, infer from Drizzle schemas or Zod
- **Naming:** camelCase for variables/functions, PascalCase for components/types
- **Validation:** Use Zod schemas
- **Error Handling:** Use centralized error handler, throw errors in routes

## Troubleshooting
- If you encounter issues with Bun, ensure you have the latest version.
- For database errors, check migration status and schema in `db/schema.ts`.
- For API errors, review the error handler and validation schemas.

## License
MIT

---
For frontend setup and usage, see the `frontend/README.md`.
