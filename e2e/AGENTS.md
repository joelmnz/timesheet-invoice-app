# Agent Guidelines

## Purpose
- Own Playwright scenarios, fixtures, and test-data conventions for end-to-end coverage.
- Keep browser-level workflows distinct from backend and frontend implementation details while relying on root-owned orchestration.

## Ownership
- All spec files in `e2e/`, `fixtures/`, and e2e package documentation.
- Test helper conventions and browser-flow assertions that exercise the integrated application.

## Local Contracts
- Root keeps `playwright.config.ts` because server startup and shared orchestration cross package boundaries.
- E2E tests use the shared fixtures in `fixtures/helpers.ts`, including the authenticated page workflow.
- E2E-created entities remain prefixed with `E2E-` so they are distinguishable and safe to clean up.
- Test scenarios should assert user-observable behavior rather than backend implementation details.

## Work Guidance
- Keep specs organized by user-facing feature area.
- Reuse helper functions for login, test IDs, and cleanup instead of reimplementing them in each spec.
- Preserve the fresh-database assumption for e2e runs and avoid coupling tests to pre-existing local data.
- Prefer resilient selectors and flows that match the current UI patterns.

## Verification
- **All E2E Tests**: `bun run test:e2e`
- **Headed E2E**: `bun run test:e2e:headed`
- **Debug E2E**: `bun run test:e2e:debug`
- **Report**: `bun run test:e2e:report`

## Child DOX Index
- No deeper child AGENTS.md files currently exist under `e2e/`.
- This contract retains Playwright specs, fixtures, and e2e-local documentation within `e2e/`.