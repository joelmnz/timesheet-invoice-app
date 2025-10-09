import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import { dirname, join } from 'path';
import ConnectSqlite3 from 'connect-sqlite3';

import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import clientsRoutes from './routes/clients.js';
import projectsRoutes from './routes/projects.js';
import timeEntriesRoutes from './routes/timeEntries.js';
import expensesRoutes from './routes/expenses.js';
import invoicesRoutes, { invoiceLinesRouter } from './routes/invoices.js';
import dashboardRoutes from './routes/dashboard.js';
import reportsRoutes from './routes/reports.js';

import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
  const NODE_ENV = process.env.NODE_ENV || 'development';

  // Trust proxy for both HTTPS tunnels (Cloudflare) and reverse proxies
  app.set('trust proxy', 1);

  const SQLiteStore = ConnectSqlite3(session);

  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  // CORS configuration - allows credentials from any origin in production
  // This is safe because authentication is still required
  app.use(cors({
    origin: NODE_ENV === 'production' 
      ? (origin, callback) => {
          // Allow any origin in production (for Cloudflare tunnel, UNRAID IP, etc.)
          callback(null, true);
        }
      : 'http://localhost:5173',
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    session({
      name: 'timesheet.sid', // Unique cookie name to avoid conflicts with other UNRAID containers
      store: new SQLiteStore({
        db: 'sessions.db',
        dir: process.env.DATABASE_PATH ? dirname(process.env.DATABASE_PATH) : './data',
      }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // Auto-detect: secure only if request came via HTTPS (Cloudflare tunnel)
        // This allows both HTTP (UNRAID IP) and HTTPS (Cloudflare) to work
        secure: 'auto',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use('/api/settings', settingsRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api', timeEntriesRoutes);
  app.use('/api', expensesRoutes);
  app.use('/api/invoices', invoicesRoutes);
  app.use('/api/invoice-lines', invoiceLinesRouter);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/charts', dashboardRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/export', reportsRoutes);
  app.use('/api/auth', authRoutes);

  // Lightweight health endpoint
  app.get('/health', (_req, res) => {
    res.status(200).send('ok');
  });

  if (NODE_ENV === 'production') {
    const frontendPath = join(import.meta.dirname, '../../frontend/dist');
    app.use(express.static(frontendPath));

    // Catch-all route for SPA - must be after static files
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(join(frontendPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
