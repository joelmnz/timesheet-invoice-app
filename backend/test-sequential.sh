#!/bin/bash
set -e

echo "Running tests sequentially..."
echo ""

# Run tests with setup file preloaded
bun test --preload ./src/tests/setup.ts src/tests/auth.test.ts && \
bun test --preload ./src/tests/setup.ts src/tests/settings.test.ts && \
bun test --preload ./src/tests/setup.ts src/tests/clients.test.ts && \
bun test --preload ./src/tests/setup.ts src/tests/projects.test.ts && \
bun test --preload ./src/tests/setup.ts src/tests/import.test.ts && \
bun test --preload ./src/tests/setup.ts src/tests/invoices.test.ts

echo ""
echo "✓ All tests passed!"
