#!/usr/bin/env bash

set -euo pipefail

WITH_E2E=false
for argument in "$@"; do
  case "$argument" in
    --with-e2e) WITH_E2E=true ;;
    *) echo "Unknown argument: $argument. Usage: bash scripts/dev-setup.sh [--with-e2e]" >&2; exit 1 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_ENV="$ROOT_DIR/backend/.env"
BACKEND_ENV_EXAMPLE="$ROOT_DIR/backend/.env.example"
ROOT_ENV="$ROOT_DIR/.env"

if [[ ! -f "$BACKEND_ENV_EXAMPLE" ]]; then
  echo "Missing backend env example: $BACKEND_ENV_EXAMPLE" >&2
  exit 1
fi

if command -v bun >/dev/null 2>&1; then
  BUN="$(command -v bun)"
elif [[ -x "$HOME/.bun/bin/bun" ]]; then
  BUN="$HOME/.bun/bin/bun"
else
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "Install Bun, or install Node.js and npm so setup can provision Bun without sudo." >&2
    exit 1
  fi
  echo "Installing Bun into $HOME/.bun using npm..."
  if ! npm install --global --prefix "$HOME/.bun" bun; then
    echo "Bun installation failed. Check npm/network access, then rerun setup." >&2
    exit 1
  fi
  BUN="$HOME/.bun/bin/bun"
fi

BUN="$(cd "$(dirname "$BUN")" && pwd)/$(basename "$BUN")"
if ! BUN_VERSION="$("$BUN" --version)"; then
  echo "Bun could not run. Check your Bun installation, then rerun setup." >&2
  exit 1
fi
export PATH="$(dirname "$BUN"):$PATH"
echo "Using Bun $BUN_VERSION"
if [[ "$BUN" == "$HOME/.bun/bin/bun" ]]; then
  echo 'For subsequent commands in your shell: export PATH="$HOME/.bun/bin:$PATH"'
fi

for scope in . backend frontend; do
  echo "Installing dependencies in $scope..."
  (cd "$ROOT_DIR/$scope" && "$BUN" install)
done

if [[ -f "$BACKEND_ENV" ]]; then
  echo "Using existing backend/.env"
  if [[ -f "$ROOT_ENV" ]]; then
    echo "Leaving root .env in place for Docker Compose usage."
  fi
elif [[ -f "$ROOT_ENV" ]]; then
  mv "$ROOT_ENV" "$BACKEND_ENV"
  echo "Moved .env from repo root to backend/.env for local development."
  echo "If you also use Docker Compose, recreate root .env from .env.example."
else
  cp "$BACKEND_ENV_EXAMPLE" "$BACKEND_ENV"
  echo "Created backend/.env from backend/.env.example"
fi

if [[ "$WITH_E2E" == true ]]; then
  echo "Installing Chromium and Playwright system dependencies (may require administrator privileges)..."
  if ! (cd "$ROOT_DIR" && "$BUN" ./node_modules/@playwright/test/cli.js install --with-deps chromium); then
    echo "Playwright setup failed. Ask an administrator to install browser system dependencies, then retry --with-e2e." >&2
    exit 1
  fi
fi

echo "Development setup complete."
