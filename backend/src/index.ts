import 'dotenv/config';
import { existsSync } from 'fs';
import { createApp } from './app.js';
import { runMigrations, checkMigrationStatus } from './services/migrations.js';

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_PATH = process.env.DATABASE_PATH || './data/app.db';

if (NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET must be set in production');
  process.exit(1);
}

// Auto-run migrations on first start if database doesn't exist
async function initializeDatabase() {
  const dbExists = existsSync(DATABASE_PATH);
  
  if (!dbExists) {
    console.log('Database not found. Running initial migrations...');
    try {
      await runMigrations();
      console.log('Initial database setup complete!');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      console.error('You can run migrations manually via the UI after login');
    }
  } else {
    // Check if migrations are needed
    try {
      const status = await checkMigrationStatus();
      if (status.needed) {
        console.log('⚠️  Database migrations needed. Please run migrations via the UI after login.');
        console.log(`   Reason: ${status.reason}`);
      } else {
        console.log('✓ Database schema is up to date');
      }
    } catch (error) {
      console.error('Failed to check migration status:', error);
    }
  }
}

const app = createApp();

// Initialize database before starting server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Timezone: ${process.env.TZ || 'Pacific/Auckland'}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
