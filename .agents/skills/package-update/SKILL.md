---
name: package-update
description: Review pending dependency updates in Bun-based projects by running `bun outdated`, summarizing the results, and categorizing each update as `Low Risk - Safe`, `Medium Risk-(Needs Investigation)`, or `HighRisk (Propper Planning Needed)`. Use when Codex needs to assess backend/frontend package update scope first, before making any dependency changes or starting detailed package-by-package research.
---

# Package Update

## Overview

Run a report-first dependency review for Bun projects. Collect outdated packages from `backend/` and `frontend/`, then present only the updates needed and their risk category until the user explicitly approves deeper investigation or actual upgrades.

## Workflow

1. Confirm this is a review-only pass.
2. Collect outdated packages with `.agents/skills/package-update/scripts/collect_outdated.sh` when both `backend/` and `frontend/` exist. If the repository structure differs, run `bun outdated` manually in each relevant package directory.
3. Summarize only packages that need updates. Do not propose exact upgrade commands unless the user asks for them.
4. Categorize every update into one of these labels:
   - `Low Risk - Safe`
   - `Medium Risk-(Needs Investigation)`
   - `HighRisk (Propper Planning Needed)`
5. Stop after reporting unless the user approves either:
   - executing dependency updates, or
   - doing detailed follow-up research on specific packages.

## Guardrails

- Do not run `bun update`, `bun add`, `bun install`, or edit `package.json` / lockfiles during the first pass.
- Do not do package-by-package changelog research during the first pass.
- Do not collapse risk upward or downward without saying why. Give a short rationale for each category.
- If `bun outdated` fails in one directory, report the failure and continue with any other directory that can be checked.
- When uncertainty is high, use the higher-risk category.

## Categorization Rules

Classify updates with fast heuristics first. Avoid pretending certainty where there is none.

- `Low Risk - Safe`
  Use for patch updates and clearly routine minor updates with low blast radius, especially leaf dependencies, test utilities, linting/formatting tools, type packages, and non-core build helpers. Prefer this only when there is no sign of peer dependency churn, runtime contract changes, or framework-level impact.
- `Medium Risk-(Needs Investigation)`
  Use for updates that are probably manageable but deserve inspection before execution. Typical cases: major updates for isolated tooling, minor updates to central libraries, packages with peer dependency sensitivity, or anything where the package role suggests user-facing/runtime impact but the scope is not obviously disruptive.
- `HighRisk (Propper Planning Needed)`
  Use for framework/runtime/database/router/auth/build-foundation changes with likely migration work, coordinated version alignment, or cross-package ripple effects. Also use when multiple related packages must move together, the update likely needs code changes, or the repo appears sensitive to the package.

## Report Format

Keep the output compact and decision-oriented.

Include:
- One short section for `backend/`
- One short section for `frontend/`
- One grouped list per risk category
- A short `Needs approval` section stating that no updates or detailed research were performed yet

If a package cannot be categorized confidently from name, version delta, and role in the repo, say that the category is provisional.

## Script

Use `scripts/collect_outdated.sh` to gather raw command output for both package directories in one pass.

```bash
./scripts/collect_outdated.sh
```

The script is collection-only. It must not write files or change dependencies.

After collection, interpret the results from the package names, semver delta, and each package's role in the repo. Save deeper research for a follow-up pass only if approved.
