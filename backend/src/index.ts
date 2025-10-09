import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = createApp();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Timezone: ${process.env.TZ || 'Pacific/Auckland'}`);
  console.log(`Loaded APP_USERNAME: ${process.env.APP_USERNAME}`);
  console.log(`Loaded APP_PASSWORD: ${process.env.APP_PASSWORD}`);
});
