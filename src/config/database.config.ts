import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '5', 10),
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
    acquireTimeout: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '60000', 10),
  },
  timezone: process.env.DEFAULT_TIMEZONE || 'Africa/Accra',
  locale: process.env.DEFAULT_LOCALE || 'en',
  currency: process.env.DEFAULT_CURRENCY || 'USD',
}));

