// Application Constants
// These values serve as fallbacks when environment variables are not set
// Sensitive values should be set in .env file

export const CONSTANTS = {
  // API Configuration
  API: {
    PORT: parseInt(process.env.PORT || '3001'),
    NODE_ENV: process.env.NODE_ENV || 'development',
    API_PREFIX: process.env.API_PREFIX || '/api',
  },

  // Database Configuration
  DATABASE: {
    URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/tradelink',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT Configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // External APIs
  EXTERNAL_APIS: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'sk-your-openai-api-key',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    GCMS_API_URL: process.env.GCMS_API_URL || 'https://gcmstest.gov.gh/api',
    ICUMS_API_URL: process.env.ICUMS_API_URL || 'https://icumstest.gov.gh/api',
    GEPA_API_URL: process.env.GEPA_API_URL || 'https://gepa.gov.gh/api',
    GHANA_BUSINESS_REGISTRY_URL: process.env.GHANA_BUSINESS_REGISTRY_URL || 'https://brs.gov.gh/api',
  },

  // Payment Configuration
  PAYMENT: {
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || 'sk_test_your-paystack-key',
    PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_your-paystack-key',
    MOMO_API_KEY: process.env.MOMO_API_KEY || 'your-momo-api-key',
  },

  // File Upload Configuration
  UPLOAD: {
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf,doc,docx',
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'tradelink-uploads',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'your-aws-access-key',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'your-aws-secret-key',
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  },

  // Email Configuration
  EMAIL: {
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
    SMTP_USER: process.env.SMTP_USER || 'your-email@gmail.com',
    SMTP_PASS: process.env.SMTP_PASS || 'your-email-password',
    FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@tradelink.com',
    FROM_NAME: process.env.FROM_NAME || 'TradeLink+',
  },

  // App Configuration
  APP: {
    NAME: process.env.APP_NAME || 'TradeLink+',
    URL: process.env.APP_URL || 'http://localhost:3000',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@tradelink.com',
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // Logging
  LOG: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    FILE: process.env.LOG_FILE || 'logs/app.log',
  },

  // AI Configuration
  AI: {
    MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS || '2000'),
    TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    MODEL_VERSION: process.env.AI_MODEL_VERSION || 'latest',
  },

  // Trade Configuration
  TRADE: {
    MIN_ORDER_AMOUNT: parseFloat(process.env.MIN_ORDER_AMOUNT || '100'),
    MAX_ORDER_AMOUNT: parseFloat(process.env.MAX_ORDER_AMOUNT || '1000000'),
    DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'GHS',
    SUPPORTED_CURRENCIES: process.env.SUPPORTED_CURRENCIES?.split(',') || ['GHS', 'USD', 'EUR', 'GBP'],
  },

  // Security
  SECURITY: {
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Feature Flags
  FEATURES: {
    ENABLE_AI_MATCHING: process.env.ENABLE_AI_MATCHING === 'true',
    ENABLE_BLOCKCHAIN: process.env.ENABLE_BLOCKCHAIN === 'true',
    ENABLE_SMS_NOTIFICATIONS: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
    ENABLE_REAL_TIME_TRACKING: process.env.ENABLE_REAL_TIME_TRACKING === 'true',
  },
} as const;

// Helper function to get environment variable with fallback
export const getEnvVar = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value === undefined) {
    if (fallback !== undefined) {
      console.warn(`Environment variable ${key} not set, using fallback value`);
      return fallback;
    }
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

// Helper function to get required environment variable (throws if not set)
export const getRequiredEnvVar = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

export default CONSTANTS;
