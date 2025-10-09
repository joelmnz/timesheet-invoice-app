## syntax=docker/dockerfile:1.7

# 1) Builder stage: install deps and build backend + frontend
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy only manifests first to maximize cache hits
COPY backend/package.json backend/bun.lockb ./backend/
COPY frontend/package.json frontend/bun.lock ./frontend/

# Install dependencies
RUN --mount=type=cache,target=/root/.bun \
    cd /app/backend && bun install --frozen-lockfile && \
    cd /app/frontend && bun install --frozen-lockfile

# Now copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build both projects
RUN cd /app/backend && bun run build
RUN cd /app/frontend && bun run build

# 2) Runtime stage: minimal runtime with prod deps only
FROM oven/bun:latest AS runtime

# Create non-root user with UNRAID compatible IDs (GID 100 already exists as 'users')
RUN adduser --system --uid 99 --ingroup users bunuser

ENV NODE_ENV=production
WORKDIR /app

# Copy backend manifests and install production deps
COPY --chown=99:100 --from=builder /app/backend/package.json /app/backend/bun.lockb /app/backend/
RUN --mount=type=cache,target=/root/.bun \
    cd /app/backend && bun install --production --frozen-lockfile

# Copy compiled backend and built frontend assets
COPY --chown=99:100 --from=builder /app/backend/dist /app/backend/dist
COPY --chown=99:100 --from=builder /app/frontend/dist /app/frontend/dist

# Ensure writable data dir for SQLite sessions
RUN mkdir -p /data && chown -R 99:100 /data
VOLUME ["/data"]

# Run as non-root
USER 99:100

# Expose backend port
EXPOSE 8080

# Container health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8080/health || exit 1

# Start backend (serves frontend in production)
WORKDIR /app/backend
CMD ["bun", "run", "start"]
