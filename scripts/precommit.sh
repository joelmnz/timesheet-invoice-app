#!/usr/bin/env bash
# precommit.sh — Final check before pushing code for a PR.
# Runs TypeScript type checking, build verification, and Docker build.
#
# Usage: bun run precommit

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FAILED=0
STEP=0

step() {
  STEP=$((STEP + 1))
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Step $STEP: $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

pass() {
  echo -e "${GREEN}  ✓ $1${NC}"
}

fail() {
  echo -e "${RED}  ✗ $1${NC}"
  FAILED=1
}

SECONDS=0

echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║              Precommit Checks                              ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"

# ── 1. Backend TypeScript type check ──────────────────────────────────────────
step "Backend TypeScript type check (tsc)"
if (cd "$ROOT_DIR/backend" && bun run build); then
  pass "Backend TypeScript — no type errors"
else
  fail "Backend TypeScript — type errors found"
fi

# ── 2. Frontend TypeScript type check ─────────────────────────────────────────
step "Frontend TypeScript type check (tsc --noEmit)"
if (cd "$ROOT_DIR/frontend" && npx tsc --noEmit); then
  pass "Frontend TypeScript — no type errors"
else
  fail "Frontend TypeScript — type errors found"
fi

# ── 3. Frontend Vite build ────────────────────────────────────────────────────
step "Frontend build (vite build)"
if (cd "$ROOT_DIR/frontend" && bun run build); then
  pass "Frontend build — success"
else
  fail "Frontend build — failed"
fi

# ── 4. Docker build ──────────────────────────────────────────────────────────
step "Docker build"
if (cd "$ROOT_DIR" && docker build -t timesheet-invoice-app:precommit .); then
  pass "Docker build — success"
else
  fail "Docker build — failed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
DURATION=$SECONDS
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}  ✓ All precommit checks passed! (${DURATION}s)${NC}"
  echo -e "${GREEN}    Ready to push.${NC}"
else
  echo -e "${RED}  ✗ Some precommit checks failed. (${DURATION}s)${NC}"
  echo -e "${RED}    Please fix the issues above before pushing.${NC}"
fi
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

exit $FAILED
