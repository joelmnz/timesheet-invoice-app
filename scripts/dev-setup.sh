#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_ENV="$ROOT_DIR/backend/.env"
BACKEND_ENV_EXAMPLE="$ROOT_DIR/backend/.env.example"
ROOT_ENV="$ROOT_DIR/.env"

if [[ ! -f "$BACKEND_ENV_EXAMPLE" ]]; then
  echo "Missing backend env example: $BACKEND_ENV_EXAMPLE" >&2
  exit 1
fi

echo "Installing backend dependencies..."
(cd "$ROOT_DIR/backend" && bun install)

echo "Installing frontend dependencies..."
(cd "$ROOT_DIR/frontend" && bun install)

if [[ -f "$BACKEND_ENV" ]]; then
  echo "Using existing backend/.env"
  if [[ -f "$ROOT_ENV" ]]; then
    echo "Leaving root .env in place for Docker Compose usage."
  fi
  exit 0
fi

if [[ -f "$ROOT_ENV" ]]; then
  mv "$ROOT_ENV" "$BACKEND_ENV"
  echo "Moved .env from repo root to backend/.env for local development."
  echo "If you also use Docker Compose, recreate root .env from .env.example."
  exit 0
fi

cp "$BACKEND_ENV_EXAMPLE" "$BACKEND_ENV"
echo "Created backend/.env from backend/.env.example"