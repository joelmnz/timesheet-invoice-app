#!/bin/bash
set -e

echo "Running tests sequentially..."
echo ""

bun test src/tests/auth.test.ts && \
bun test src/tests/settings.test.ts && \
bun test src/tests/clients.test.ts && \
bun test src/tests/projects.test.ts && \
bun test src/tests/import.test.ts && \
bun test src/tests/invoices.test.ts

echo ""
echo "✓ All tests passed!"
