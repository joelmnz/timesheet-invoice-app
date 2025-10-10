# Deployment Guide

## Session Configuration for UNRAID and Cloudflare Tunnels

The app is configured to work in multiple deployment scenarios:

### Changes Made

1. **Trust Proxy**: Always enabled to detect HTTPS from reverse proxies/tunnels
2. **CORS**: Configurable via `ALLOWED_ORIGINS` environment variable in production
   - If `ALLOWED_ORIGINS` is set: validates requests against comma-separated list of allowed origins
   - If `ALLOWED_ORIGINS` is empty or not set: CORS is disabled (recommended for same-origin deployments where backend serves frontend)
   - **Security Note**: Only set `ALLOWED_ORIGINS` if your frontend is hosted on a different domain. Leaving it empty disables CORS middleware entirely.
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
  - When set, CORS will strictly validate origins
  - If you need to allow non-browser clients (Postman, mobile apps), set `ALLOW_NO_ORIGIN=true`
- **Content Security Policy**: Automatically enabled in production to mitigate XSS risks
- **Session Store**: Uses SQLite, persists across restarts

### Security Notes

1. **SESSION_SECRET**: Use a long random string (>32 chars)
2. **APP_PASSWORD**: Change from default in production (enforced - app will fail to start)
3. **ALLOWED_ORIGINS**: 
   - For same-origin deployments (recommended): leave empty
   - For cross-origin deployments: set to explicit list of allowed domains
   - **Never leave ALLOWED_ORIGINS empty if you're hosting frontend separately**
4. **CORS**: Disabled by default in production for same-origin security
5. **Session Store**: Uses SQLite, persists across restarts
6. **CSP**: Enabled in production, disabled in development

### Testing

After deployment:

1. Login at `/login`
2. Check browser DevTools → Application → Cookies
3. Verify `timesheet.sid` cookie is set
4. Navigate to Dashboard - API calls should work
5. Refresh page - session should persist

### Troubleshooting

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
