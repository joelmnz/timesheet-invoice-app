#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMP_DIR="$(mktemp -d)"
trap '/bin/rm -rf "$TEMP_DIR"' EXIT
ORIGINAL_PATH="$PATH"

fail() { echo "FAIL: $*" >&2; exit 1; }
fixture() {
  export PATH="$ORIGINAL_PATH"
  CASE_DIR="$TEMP_DIR/$1"
  REPO="$CASE_DIR/repo with spaces"
  export HOME="$CASE_DIR/home" LOG="$CASE_DIR/log"
  mkdir -p "$REPO/scripts" "$REPO/backend" "$REPO/frontend" "$HOME" "$CASE_DIR/bin"
  cp "$SOURCE_DIR/dev-setup.sh" "$REPO/scripts/"
  printf 'EXAMPLE=value\n\n' > "$REPO/backend/.env.example"
  : > "$LOG"
  for utility in dirname basename mkdir mv cp; do
    ln -s "$(PATH="$ORIGINAL_PATH" command -v "$utility")" "$CASE_DIR/bin/$utility"
  done
  export PATH="$CASE_DIR/bin"
  unset FAIL_INSTALL FAIL_BROWSER FAIL_NPM FAIL_VERSION
}
bun_stub() {
  /bin/cat > "$1" <<'STUB'
#!/bin/bash
if [[ "$1" == --version ]]; then
  [[ "${FAIL_VERSION:-}" != yes ]] || exit 7
  echo '1.test'
  exit 0
fi
printf '%s|%s\n' "$PWD" "$*" >> "$LOG"
if [[ "$1" == install && "$PWD" == *"${FAIL_INSTALL:-not-a-scope}" ]]; then exit 8; fi
if [[ "$1" != install && "${FAIL_BROWSER:-}" == yes ]]; then exit 9; fi
STUB
  /bin/chmod +x "$1"
}
bootstrap_stub() {
  /bin/cat > "$CASE_DIR/bin/npm" <<'STUB'
#!/bin/bash
printf 'npm|%s\n' "$*" >> "$LOG"
[[ "${FAIL_NPM:-}" != yes ]] || exit 6
mkdir -p "$HOME/.bun/bin"
cp "$BUN_TEMPLATE" "$HOME/.bun/bin/bun"
STUB
  /bin/chmod +x "$CASE_DIR/bin/npm"
  /bin/ln -s /bin/true "$CASE_DIR/bin/node"
  export BUN_TEMPLATE="$CASE_DIR/bun-template"
  bun_stub "$BUN_TEMPLATE"
}
run_setup() {
  (cd "$TEMP_DIR" && /bin/bash "$REPO/scripts/dev-setup.sh" "$@") > "$CASE_DIR/output" 2>&1
}
expect_failure() { if run_setup "$@"; then fail "expected failure"; fi; }
assert_installs() {
  local scope lines=0 line
  for scope in "$REPO" "$REPO/backend" "$REPO/frontend"; do
    /bin/grep -Fx "$scope|install" "$LOG" >/dev/null || fail "missing install: $scope"
  done
  while IFS= read -r line; do [[ "$line" != *'|install' ]] || lines=$((lines + 1)); done < "$LOG"
  [[ "$lines" == 3 ]] || fail "expected exactly three installs, got $lines"
}

fixture path-bun
bun_stub "$CASE_DIR/bin/bun"
run_setup
assert_installs
/bin/cmp "$REPO/backend/.env.example" "$REPO/backend/.env" || fail 'env copy'
/bin/grep -q 'cli.js' "$LOG" && fail 'default installed browsers'
printf 'KEEP=backend\n\n' > "$REPO/backend/.env"
printf 'KEEP=root\n\n' > "$REPO/.env"
cp "$REPO/backend/.env" "$CASE_DIR/backend-before"
cp "$REPO/.env" "$CASE_DIR/root-before"
: > "$LOG"
run_setup --with-e2e
assert_installs
/bin/cmp "$REPO/backend/.env" "$CASE_DIR/backend-before" || fail 'backend env changed'
/bin/cmp "$REPO/.env" "$CASE_DIR/root-before" || fail 'root env changed'
/bin/grep -Fx "$REPO|./node_modules/@playwright/test/cli.js install --with-deps chromium" "$LOG" >/dev/null || fail 'browser command'
export FAIL_BROWSER=yes
expect_failure --with-e2e

fixture relative-path-bun
bun_stub "$CASE_DIR/bin/bun"
export PATH="relative-path-bun/bin"
run_setup
assert_installs

fixture precedence
bun_stub "$CASE_DIR/bin/bun"
mkdir -p "$HOME/.bun/bin"
/bin/ln -s /bin/false "$HOME/.bun/bin/bun"
run_setup
cp "$REPO/backend/.env" "$CASE_DIR/before"
: > "$LOG"
run_setup
assert_installs
/bin/cmp "$CASE_DIR/before" "$REPO/backend/.env" || fail 'backend-only env changed'
[[ ! -e "$REPO/.env" ]] || fail 'created root env'

fixture local-bun
mkdir -p "$HOME/.bun/bin"
bun_stub "$HOME/.bun/bin/bun"
run_setup
assert_installs

fixture bootstrap
bootstrap_stub
printf 'MOVE=root\n\n' > "$REPO/.env"
cp "$REPO/.env" "$CASE_DIR/before"
run_setup
assert_installs
/bin/grep -Fx "npm|install --global --prefix $HOME/.bun bun" "$LOG" >/dev/null || fail 'bootstrap command'
[[ ! -e "$REPO/.env" ]] || fail 'root env not moved'
/bin/cmp "$CASE_DIR/before" "$REPO/backend/.env" || fail 'moved env changed'

fixture missing-npm
/bin/ln -s /bin/true "$CASE_DIR/bin/node"
expect_failure
[[ ! -s "$LOG" ]] || fail 'side effects without npm'

fixture missing-node
bootstrap_stub
/bin/rm "$CASE_DIR/bin/node"
expect_failure
[[ ! -s "$LOG" ]] || fail 'side effects without node'

fixture npm-failure
bootstrap_stub
export FAIL_NPM=yes
expect_failure
[[ ! -e "$REPO/backend/.env" ]] || fail 'env created after failed bootstrap'

fixture invalid-bun
bun_stub "$CASE_DIR/bin/bun"
export FAIL_VERSION=yes
expect_failure
[[ ! -s "$LOG" ]] || fail 'installs after invalid Bun'

fixture install-failure
bun_stub "$CASE_DIR/bin/bun"
export FAIL_INSTALL=backend
expect_failure
/bin/grep -q '/frontend|' "$LOG" && fail 'continued after failed install'
[[ ! -e "$REPO/backend/.env" ]] || fail 'env created after failed install'

fixture missing-example
bun_stub "$CASE_DIR/bin/bun"
/bin/rm "$REPO/backend/.env.example"
expect_failure
[[ ! -s "$LOG" ]] || fail 'installed without example'

fixture unknown-argument
bootstrap_stub
expect_failure --unknown
[[ ! -s "$LOG" ]] || fail 'unknown argument had side effects'

echo 'Setup regression tests passed (13 isolated fixtures).'
