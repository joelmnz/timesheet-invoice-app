import 'dotenv/config';
import { existsSync } from 'fs';
import { createApp, setDbInitialized } from './app.js';
import { runMigrations, checkMigrationStatus } from './services/migrations.js';

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_PATH = process.env.DATABASE_PATH || './data/app.db';

if (NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET must be set in production');
  process.exit(1);
}

// Auto-run migrations on first start or if database schema is missing
async function initializeDatabase() {
  const dbExists = existsSync(DATABASE_PATH);
  
  try {
    // Check migration status (whether file exists or not)
    const status = await checkMigrationStatus();
    
    if (!dbExists || status.needed) {
      if (!dbExists) {
        console.log('Database not found. Running initial migrations...');
      } else {
        console.log('Database migrations needed. Running migrations...');
        console.log(`Reason: ${status.reason}`);
      }
      
      await runMigrations();
      console.log('✓ Database migrations complete!');
    } else {
      console.log('✓ Database schema is up to date');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    if (!dbExists) {
      console.error('FATAL: Cannot start without a database');
      throw error;
    } else {
      console.error('You may need to run migrations manually via the UI after login');
    }
  }
  
  // Mark database as initialized after migrations are complete
  setDbInitialized();
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
