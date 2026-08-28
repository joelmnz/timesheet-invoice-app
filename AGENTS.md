# Agent Guidelines

## Purpose
- Root DOX rail for the monorepo.
- Owns cross-cutting conventions, root documentation, deployment, CI, scripts, and integration boundaries between backend, frontend, and Playwright.

## Build/Lint/Test Commands
- **Dev Setup**: `bun run dev:setup` (prepares local backend env file and related defaults)
- **Install Dependencies**: `bun run dev:install` (installs backend and frontend dependencies)
- **Start Backend**: `bun run dev:backend` (delegates to `backend/`)
- **Start Frontend**: `bun run dev:frontend` (delegates to `frontend/`)
- **E2E Tests**: `bun run test:e2e`
- **E2E UI**: `bun run test:e2e:ui`
- **E2E Headed**: `bun run test:e2e:headed`
- **E2E Debug**: `bun run test:e2e:debug`
- **E2E Report**: `bun run test:e2e:report`
- **Precommit**: `bun run precommit` (backend compile, frontend type/build checks, Docker build)

## Project Structure
- **Monorepo**: `backend/` (Express API), `frontend/` (React SPA), `e2e/` (Playwright)
- **Runtime**: Bun across the workspace
- **Package Manager**: Bun
- **Integration Model**: backend serves the built frontend in production; Playwright exercises both applications together from root configuration

## Shared Code Style
- **Formatting**: 2 spaces, LF endings, final newline required
- **Modules**: ESM only throughout the workspace
- **TypeScript**: strict mode stays enabled; `as any`, `@ts-ignore`, and `@ts-expect-error` are prohibited
- **Naming**: camelCase for values/functions, PascalCase for React components and TypeScript types
- **Scope**: package-specific implementation rules live in the nearest child contract

## Root-Owned Paths
- Root documentation and operations: `README.md`, `DEPLOYMENT.md`, `MIGRATION_GUIDE.md`, `docker-compose.yml`, `Dockerfile`, `package.json`, `playwright.config.ts`, `scripts/`
- Root assets and metadata: `LICENSE`, `banner.jpg`, `video-thumbnail.jpg`, `.github/`
- Root-level reports and generated artifacts remain disposable unless the task explicitly concerns them

---

# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

## Child DOX Index
- `backend/AGENTS.md` owns the Express API, authentication, Drizzle/SQLite schema and migrations, backend services, backend utilities, and backend tests.
- `frontend/AGENTS.md` owns the React SPA, routing, Mantine UI, contexts, browser persistence, API client, and frontend tests.
- `e2e/AGENTS.md` owns Playwright scenarios and fixtures; root keeps `playwright.config.ts` because it coordinates backend and frontend startup.
- Root-owned files remain `README.md`, `DEPLOYMENT.md`, `MIGRATION_GUIDE.md`, `docker-compose.yml`, `Dockerfile`, `package.json`, `playwright.config.ts`, `scripts/`, `LICENSE`, `banner.jpg`, `video-thumbnail.jpg`, and `.github/`.