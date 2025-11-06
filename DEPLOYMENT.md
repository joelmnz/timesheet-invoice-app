# Deployment Guide

## Database Migrations

### Automatic Migration on Startup

The application automatically runs database migrations on startup:

- **First Start**: Creates all database tables and seeds initial settings
- **Subsequent Starts**: Checks for pending migrations and applies them automatically
- **Migration Tracking**: Uses Drizzle ORM's built-in migration system with `__drizzle_migrations` table

### How It Works

1. **On Container Start**: The app checks if migrations are needed by examining:
   - Whether database tables exist
   - Whether the Drizzle migration tracking table exists
   - Whether settings are initialized

2. **Auto-Migration**: If migrations are needed, they run automatically before the server starts:

   ```text
   Database migrations needed. Running migrations...
   ✓ All migrations applied successfully
   ✓ Database schema is up to date
   ```

3. **Production Safety**:
   - Migrations use transactions where possible
   - The app will log errors but attempt to continue if migrations fail
   - Database backups can be created via the API (`POST /api/migrations/backup`)

### Manual Migration (if needed)

If you need to run migrations manually:

**Via UI** (after login):
- Future feature: Migration UI panel will be available in Settings

**Via API** (requires authentication):
```bash
# Check migration status
curl -X GET http://localhost:8080/api/migrations/status

# Run migrations
curl -X POST http://localhost:8080/api/migrations/run \
  -H "Content-Type: application/json" \
  --cookie "timesheet.sid=your-session-cookie"

# Create backup
curl -X POST http://localhost:8080/api/migrations/backup \
  -H "Content-Type: application/json" \
  --cookie "timesheet.sid=your-session-cookie"
```

**Via bun script** (development only, not available in Docker):
```bash
cd backend
bun run db:migrate
```

### Docker Considerations

The Dockerfile includes everything needed for auto-migrations:

1. **Migration Files**: Copied from `backend/drizzle/` folder during build
2. **Config File**: `drizzle.config.ts` included in runtime image
3. **Auto-Execution**: Runs on every container start via `src/index.ts`

**Important**: 
- Migration files (`backend/drizzle/*.sql`) are part of the Docker image
- No manual intervention needed when deploying new versions with migrations
- Migrations run BEFORE the server starts listening, ensuring schema is ready

### Adding New Migrations

When developing new features that require schema changes:

1. **Update Schema**: Edit `backend/src/db/schema.ts`
2. **Generate Migration**: Run `bun run db:generate` in backend folder
3. **Review SQL**: Check generated SQL in `backend/drizzle/NNNN_*.sql`
4. **Test Locally**: Run `bun run db:migrate` to test
5. **Commit**: Commit both schema.ts and migration files
6. **Deploy**: New Docker image will include migrations, applied on startup

## Session Configuration for UNRAID and Cloudflare Tunnels

The app is configured to work in multiple deployment scenarios:

### Changes Made

1. **Trust Proxy**: Always enabled to detect HTTPS from reverse proxies/tunnels
2. **CORS**: Configurable via `ALLOWED_ORIGINS` environment variable with secure, environment-aware middleware
   - **Production mode**: 
     - Requires `Origin` header for API requests
     - Only allows origins explicitly listed in `ALLOWED_ORIGINS` (comma-separated)
     - Blocks requests without `Origin` header by default (secure)
     - Optionally allows requests without `Origin` if `ALLOW_NO_ORIGIN_IN_DEV=true` (not recommended)
     - Logs blocked CORS attempts with origin or '(no origin header)'
   - **Development mode**:
     - Allows `http://localhost:5173` by default
     - Optionally allows requests without `Origin` if `ALLOW_NO_ORIGIN_IN_DEV=true`
   - **Same-origin deployments** (recommended):
     - Leave `ALLOWED_ORIGINS` empty - CORS middleware is disabled
     - Backend serves frontend from same origin - no CORS needed
   - **Cross-origin deployments**:
     - Set `ALLOWED_ORIGINS` to explicit list of allowed frontend domains
     - CORS will strictly validate all requests
3. **Session Cookie**:
   - Named `timesheet.sid` to avoid conflicts with other UNRAID containers
   - Uses `secure: 'auto'` to auto-detect HTTP vs HTTPS
   - Works with both local IP (HTTP) and Cloudflare tunnel (HTTPS)
   - Session fixation protection via session regeneration on login
4. **Content Security Policy**: Enabled by default in production to prevent XSS attacks
5. **Credential Requirements**: In production, the app will fail to start if `APP_PASSWORD` or `APP_PASSWORD_HASH` is not set

### Deployment Scenarios

#### UNRAID Local Network (HTTP)

- Access via `http://localhost:8098`
- Session cookie will use `secure: false` (auto-detected)
- CORS disabled (same-origin)
- **Works out of the box**

#### Cloudflare Zero Trust Tunnel (HTTPS)

- Access via `https://your-domain.com`
- Session cookie will use `secure: true` (auto-detected)
- CORS disabled (same-origin, backend serves frontend)
- **Works out of the box**

#### Multiple Containers on Same UNRAID IP

- Unique cookie name `timesheet.sid` prevents conflicts
- Each container should use a **unique SESSION_SECRET**
- Each container should have its own session database

### Environment Variables for UNRAID

**Container User/Group:**
- The container runs as UID 99 (nobody) and GID 100 (users) - standard UNRAID compatibility
- If using bind mounts, ensure your host data directory has ownership `99:100`:
  ```bash
  chown -R 99:100 /mnt/user/appdata/timesheet-invoice-app
  ```
- If using named volumes, Docker handles ownership automatically

**Required in your Docker container:**

```bash
NODE_ENV=production
# Generate with: openssl rand -base64 32
SESSION_SECRET=your-unique-secret-here-at-least-32-chars
APP_USERNAME=admin
# Option 1: Plain password (hashed at startup)
APP_PASSWORD=your-secure-password
# Option 2: Pre-hashed (RECOMMENDED)
# APP_PASSWORD_HASH=$(docker run --rm oven/bun:latest bun -e "import bcrypt from 'bcrypt'; console.log(await bcrypt.hash('your-password', 12))")
TZ=Pacific/Auckland
```

**Optional:**

```bash
# Only set if frontend is hosted separately (cross-origin)
ALLOWED_ORIGINS=https://your-domain.com,https://another-domain.com

# Only enable for testing with tools like Postman
ALLOW_NO_ORIGIN=true
```

**Important Security Notes:**

- **SESSION_SECRET**: Use a long random string (>= 32 chars). Generate with `openssl rand -base64 32`
- **APP_PASSWORD / APP_PASSWORD_HASH**: 
  - **CRITICAL**: You MUST set one of these in production. The app will refuse to start without credentials.
  - Prefer `APP_PASSWORD_HASH` (pre-hashed) over `APP_PASSWORD` (plain text) for production
  - Never use "admin" as a password in production
- **ALLOWED_ORIGINS**: 
  - **Leave empty (recommended)** if backend serves frontend (same-origin deployment)
  - Only set this if your frontend is on a different domain
  - When set, CORS will strictly validate origins and require Origin header
  - Format: comma-separated list (e.g., `https://app.example.com,https://timesheet.mydomain.com`)
- **ALLOW_NO_ORIGIN_IN_DEV**:
  - Set to `true` to allow requests without Origin header (useful for curl, Postman, mobile apps)
  - Only recommended in development/testing environments
  - In production, prefer explicit `ALLOWED_ORIGINS` for security
- **Content Security Policy**: Automatically enabled in production to mitigate XSS risks
- **Session Store**: Uses SQLite, persists across restarts

### Security Notes

1. **SESSION_SECRET**: Use a long random string (>32 chars)
2. **APP_PASSWORD**: Change from default in production (enforced - app will fail to start)
3. **ALLOWED_ORIGINS**: 
   - For same-origin deployments (recommended): leave empty
   - For cross-origin deployments: set to explicit list of allowed domains
   - **Never leave ALLOWED_ORIGINS empty if you're hosting frontend separately**
4. **ALLOW_NO_ORIGIN_IN_DEV**:
   - Only enable in development for testing tools (curl, Postman)
   - **Never set to true in production** - always require Origin header
   - Logs blocked attempts to help debug CORS issues
5. **CORS Behavior**:
   - Production: Requires Origin header, validates against ALLOWED_ORIGINS
   - Development: Allows localhost:5173, optionally allows no Origin
   - Same-origin: CORS disabled when ALLOWED_ORIGINS is empty (secure default)
6. **Session Store**: Uses SQLite, persists across restarts
7. **CSP**: Enabled in production, disabled in development

### Testing

After deployment:

1. Login at `/login`
2. Check browser DevTools → Application → Cookies
3. Verify `timesheet.sid` cookie is set
4. Navigate to Dashboard - API calls should work
5. Refresh page - session should persist

### Troubleshooting

#### CORS Errors ("Not allowed by CORS")

1. Check the error message in server logs - it will show the blocked origin URL or '(no origin header)'
2. **If origin is blocked:**
   - Add that origin to `ALLOWED_ORIGINS` environment variable (comma-separated)
   - Example: `ALLOWED_ORIGINS=https://your-domain.com,https://app.example.com`
3. **If '(no origin header)' is blocked:**
   - In development: Set `ALLOW_NO_ORIGIN_IN_DEV=true` to allow tools like curl/Postman
   - In production: Origin header is required for security - configure your client to send it
4. **If using a reverse proxy or tunnel:**
   - Ensure the proxy forwards the Origin header correctly
   - Check proxy configuration (nginx, Cloudflare, etc.)
5. **For same-origin deployments (recommended):**
   - Leave `ALLOWED_ORIGINS` empty to disable CORS
   - Backend will serve frontend from same domain - no CORS needed

#### Testing CORS Configuration

```bash
# Test with valid origin (should succeed if origin is in ALLOWED_ORIGINS)
curl -v -H "Origin: https://your-domain.com" \
     -H "Content-Type: application/json" \
     -X GET http://localhost:8080/api/settings \
     --cookie-jar cookies.txt

# Test without origin (will fail unless ALLOW_NO_ORIGIN_IN_DEV=true)
curl -v -X GET http://localhost:8080/api/settings

# Test with invalid origin (should fail)
curl -v -H "Origin: https://evil.com" \
     -X GET http://localhost:8080/api/settings

# Check server logs for CORS blocked messages
docker compose logs -f backend
```

If you still get 401 errors:

1. Check browser DevTools → Network → Request Headers
2. Verify `Cookie: timesheet.sid=...` is being sent
3. Check server logs for session errors
4. Verify `SESSION_SECRET` is set in environment
5. Check `trust proxy` is working (X-Forwarded-Proto header)

If app fails to start:

1. Check logs for "SESSION_SECRET must be set" or "APP_PASSWORD must be set"
2. Ensure you've set strong values for both in your environment
3. Verify environment variables are being passed to the container
