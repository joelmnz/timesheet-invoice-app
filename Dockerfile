# Use official Bun image
FROM oven/bun:1.0.25

# Create non-root user and group (UNRAID: UID 99, GID 100)
RUN addgroup --gid 100 unraid && \
    adduser --uid 99 --gid 100 --disabled-password --gecos "UNRAID User" unraid

# Set working directory
WORKDIR /app

# Copy package files and source
COPY backend backend
COPY frontend frontend
COPY backend/package.json backend/bun.lockb backend/
COPY frontend/package.json frontend/bun.lock frontend/

# Install dependencies and build backend
WORKDIR /app/backend
RUN bun install && bun run build

# Install dependencies and build frontend
WORKDIR /app/frontend
RUN bun install && bun run build

# Set permissions for UNRAID user
WORKDIR /app
RUN chown -R 99:100 /app

# Switch to non-root user
USER 99:100

# Expose backend port
EXPOSE 8080

# Start backend (serves frontend in production)
WORKDIR /app/backend
CMD ["bun", "run", "start"]
