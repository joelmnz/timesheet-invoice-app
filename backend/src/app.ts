import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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

  const SQLiteStore = ConnectSqlite3(session);

  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  app.use(cors({
    origin: NODE_ENV === 'production' ? false : 'http://localhost:5173',
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later',
  });

  app.use(
    session({
      store: new SQLiteStore({
        db: 'sessions.db',
        dir: process.env.DATABASE_PATH ? dirname(process.env.DATABASE_PATH) : './data',
      }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use('/api/auth', authLimiter, authRoutes);
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

  if (NODE_ENV === 'production') {
    const frontendPath = join(import.meta.dirname, '../../frontend/dist');
    app.use(express.static(frontendPath));

    app.get('*', (req, res) => {
      res.sendFile(join(frontendPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
