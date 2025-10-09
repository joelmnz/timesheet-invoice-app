# Deployment Guide

## Session Configuration for UNRAID and Cloudflare Tunnels

The app is configured to work in multiple deployment scenarios:

### Changes Made

1. **Trust Proxy**: Always enabled to detect HTTPS from reverse proxies/tunnels
2. **CORS**: Allows credentials from any origin in production (authentication still required)
3. **Session Cookie**:
   - Named `timesheet.sid` to avoid conflicts with other UNRAID containers
   - Uses `secure: 'auto'` to auto-detect HTTP vs HTTPS
   - Works with both local IP (HTTP) and Cloudflare tunnel (HTTPS)

### Deployment Scenarios

#### UNRAID Local Network (HTTP)

- Access via `http://localhost:8098`
- Session cookie will use `secure: false` (auto-detected)
- CORS allows the origin
- **Works out of the box**

#### Cloudflare Zero Trust Tunnel (HTTPS)

- Access via `https://your-domain.com`
- Session cookie will use `secure: true` (auto-detected)
- CORS allows the origin
- **Works out of the box**

#### Multiple Containers on Same UNRAID IP

- Unique cookie name `timesheet.sid` prevents conflicts
- Each container should use a **unique SESSION_SECRET**
- Each container should have its own session database

### Environment Variables for UNRAID

Required in your Docker container:

```bash
NODE_ENV=production
SESSION_SECRET=your-unique-secret-here
APP_USERNAME=admin
APP_PASSWORD=your-secure-password
TZ=Pacific/Auckland
```

### Security Notes

1. **SESSION_SECRET**: Use a long random string (>32 chars)
2. **APP_PASSWORD**: Change from default in production
3. **CORS**: Open in production but authentication is still required
4. **Session Store**: Uses SQLite, persists across restarts

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
