import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ConnectSqlite3 from 'connect-sqlite3';

// Import routes
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import clientsRoutes from './routes/clients.js';
import projectsRoutes from './routes/projects.js';
import timeEntriesRoutes from './routes/timeEntries.js';
import expensesRoutes from './routes/expenses.js';
import invoicesRoutes from './routes/invoices.js';
import dashboardRoutes from './routes/dashboard.js';
import reportsRoutes from './routes/reports.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Session store
const SQLiteStore = ConnectSqlite3(session);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for React
}));

// CORS - same origin in production
app.use(cors({
  origin: NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
});

// Session management
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
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api', timeEntriesRoutes);
app.use('/api', expensesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/invoice-lines', invoicesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/charts', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/export', reportsRoutes);

// Serve static frontend files in production
if (NODE_ENV === 'production') {
  const frontendPath = join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  app.get('*', (req, res) => {
    res.sendFile(join(frontendPath, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Timezone: ${process.env.TZ || 'Pacific/Auckland'}`);
});
