# Database Migration Guide

This document explains how database migrations work in the Timesheet Invoice App.

## Overview

The application uses a migration system that allows database schema updates to be applied safely, with automatic backups and a user-friendly interface.

## How It Works

### First-Time Container Start

When you start the Docker container for the first time (no database file exists):

1. The backend automatically detects there's no database
2. Migrations run automatically to create all tables and initial settings
3. The application is ready to use immediately

### Existing Database Updates

When you update the application and migrations are needed:

1. The backend detects the database exists but schema updates are needed
2. On login, you'll see a migration prompt
3. You can trigger the migration through the UI
4. A backup is automatically created before migration
5. Migrations run and apply schema changes
6. You're redirected to the dashboard

## Migration API Endpoints

### GET /api/migrations/status

Check if migrations are needed (public endpoint, no auth required).

**Response:**

```json
{
  "needed": true,
  "reason": "Database tables do not exist",
  "tablesExist": false,
  "settingsExist": false
}
```

### POST /api/migrations/run

Run pending migrations (requires authentication).

**Response:**

```json
{
  "success": true,
  "message": "Migrations completed successfully",
  "backupPath": "/data/app.db.backup-2025-10-10T12-30-45-123Z"
}
```

### POST /api/migrations/backup

Create a manual backup of the database (requires authentication).

**Response:**

```json
{
  "success": true,
  "message": "Backup created successfully",
  "backupPath": "/data/app.db.backup-2025-10-10T12-30-45-123Z"
}
```

## Manual Migration via API

If needed, you can trigger migrations manually using curl:

```bash
# Check migration status
curl http://localhost:8080/api/migrations/status

# Login first to get session cookie
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  -c cookies.txt

# Run migrations
curl -X POST http://localhost:8080/api/migrations/run \
  -b cookies.txt
```

## Backup Location

Backups are stored in the same directory as the database with a timestamp:

```text
/data/app.db                          # Main database
/data/app.db.backup-2025-10-10T...   # Automatic backup
```

## Rollback

If a migration fails or causes issues:

1. Stop the container
2. Restore from backup:

   ```bash
   docker exec -it timesheet-prod sh
   cd /data
   cp app.db.backup-2025-10-10T... app.db
   exit
   ```

3. Restart the container

## Development Workflow

For local development, migrations work the same way:

```bash
cd backend

# Generate new migrations after schema changes
bun run db:generate

# Apply migrations (old way, still works)
bun run db:migrate

# Or use the API after starting the server
bun run dev
# Then visit http://localhost:5173 and trigger via UI
```

## Migration Files

Migration SQL files are stored in `backend/drizzle/`:

```text
backend/drizzle/
  0000_young_madripoor.sql          # Initial schema
  meta/
    _journal.json                    # Migration metadata
    0000_snapshot.json               # Schema snapshot
```

These files are copied to the Docker image and used at runtime.

## Troubleshooting

### "Module not found" error

If you see this error when running migrations manually:

- Ensure you're in the `backend/` directory
- Use `bun src/db/migrate.ts` instead of `bun run db:migrate`
- Or use the new migration API endpoints

### Database locked

If migrations fail with "database locked":

- Ensure no other processes are accessing the database
- Stop the container and try again
- Check for stale lock files (`.db-wal`, `.db-shm`)

### Missing tables after deployment

If tables are missing in Docker:

- Check container logs: `docker logs timesheet-prod`
- Verify migrations ran on startup
- Trigger migrations via UI after login
- Check that drizzle folder was copied to the image

## Architecture

The migration system consists of:

1. **Backend Service** (`backend/src/services/migrations.ts`)
   - `checkMigrationStatus()` - Checks if migrations needed
   - `runMigrations()` - Applies pending migrations
   - `backupDatabase()` - Creates timestamped backups
   - `runMigrationsWithBackup()` - Runs with auto-backup

2. **API Routes** (`backend/src/routes/migrations.ts`)
   - GET `/api/migrations/status`
   - POST `/api/migrations/run`
   - POST `/api/migrations/backup`

3. **Frontend UI** (`frontend/src/components/MigrationModal.tsx`)
   - Detects migration needed on login
   - Shows user-friendly migration wizard
   - Displays backup confirmation
   - Shows progress and results

4. **Startup Logic** (`backend/src/index.ts`)
   - Auto-runs migrations on first start
   - Checks and reports migration status
   - Continues even if migration check fails

This design ensures migrations can be safely applied in production without bundling the database with the application image.
