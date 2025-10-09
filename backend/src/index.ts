import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET must be set in production');
  process.exit(1);
}

const app = createApp();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Timezone: ${process.env.TZ || 'Pacific/Auckland'}`);
});
