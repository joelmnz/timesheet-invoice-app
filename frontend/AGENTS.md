# Agent Guidelines

## Purpose
- Own the React SPA, Mantine-driven UI, routing, contexts, browser persistence, frontend services, and frontend tests.
- Keep frontend work understandable within the package boundary while relying on the root contract for cross-package integration rules.

## Ownership
- `src/`, `public/`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, frontend scripts, and package metadata.
- Built output and generated PWA assets under `dist/` and `dev-dist/` when the task explicitly concerns them.

## Local Contracts
- Frontend remains strict TypeScript with bundler-based module resolution and enforced unused-local and unused-parameter checks.
- Use the existing React 19, React Router v7, Mantine 8, and TanStack Query patterns before adding new state or data-fetching approaches.
- API access continues through frontend service modules rather than scattering fetch logic across components.
- Authentication state stays in `src/contexts/AuthContext.tsx`; timer persistence and reconnect behavior stay in `src/contexts/TimerContext.tsx` and related utilities.
- Keep frontend types in the existing package type modules and share them via `import type` where appropriate.

## Work Guidance
- Prefer Mantine form and component patterns already used in the app.
- Preserve current route and page organization under `src/pages/` and `src/components/`.
- Respect the existing offline/browser-storage behavior, especially timer persistence via IndexedDB helpers.
- Keep UI changes consistent with the established app unless the task explicitly asks for a redesign.
- Remove unused imports and locals as part of edits because the package typecheck enforces them.

## Verification
- **Build**: `cd frontend && bun run build`
- **Type Check**: `cd frontend && npx tsc --noEmit`
- **Single Frontend Test**: `cd frontend && bun run test <file>`
- **Test UI**: `cd frontend && bun run test:ui`

## Child DOX Index
- No deeper child AGENTS.md files currently exist under `frontend/`.
- This contract retains frontend source, assets, local scripts, and frontend package configuration within `frontend/`.