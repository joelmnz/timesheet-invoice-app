import cors from 'cors';
import type { Request } from 'express';

/**
 * Environment-aware CORS middleware
 * 
 * Production mode:
 * - Requires Origin header for API requests
 * - Only allows origins specified in ALLOWED_ORIGINS env var
 * - Optionally allows requests without Origin if ALLOW_NO_ORIGIN_IN_DEV=true (not recommended in production)
 * - Logs blocked attempts with origin or '(no origin header)'
 * 
 * Development mode:
 * - Allows localhost:5173 by default
 * - Optionally allows requests without Origin if ALLOW_NO_ORIGIN_IN_DEV=true
 */
export function createCorsMiddleware(nodeEnv: string = 'development') {
  const isProduction = nodeEnv === 'production';
  
  // Parse allowed origins from environment variable
  const allowedOrigins = isProduction
    ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
    : ['http://localhost:5173'];

  // Check if requests without Origin header should be allowed
  const allowNoOrigin = process.env.ALLOW_NO_ORIGIN_IN_DEV === 'true';

  // Warn if no origins configured in production
  if (isProduction && allowedOrigins.length === 0) {
    console.warn('WARNING: ALLOWED_ORIGINS not set in production. CORS is disabled - assuming same-origin deployment.');
  }

  // Only enable CORS middleware in development or when origins are configured in production
  if (!isProduction || allowedOrigins.length > 0) {
    return cors({
      origin: isProduction
        ? (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // In production, validate origins strictly
            if (origin && allowedOrigins.includes(origin)) {
              callback(null, true);
            } else if (!origin && allowNoOrigin) {
              // Allow requests with no origin only if explicitly enabled
              // This is useful for tools like Postman, mobile apps, or server-to-server requests
              callback(null, true);
            } else {
              const blockedOrigin = origin || '(no origin header)';
              console.warn(`CORS blocked request from: ${blockedOrigin}`);
              callback(new Error(`Not allowed by CORS. Origin '${blockedOrigin}' is not in the allowed origins list. Please add it to the ALLOWED_ORIGINS environment variable.`));
            }
          }
        : 'http://localhost:5173', // In development, allow localhost frontend
      credentials: true, // Allow cookies and authentication headers
    });
  }

  // Return a no-op middleware if CORS is disabled
  return (_req: Request, _res: any, next: () => void) => next();
}
