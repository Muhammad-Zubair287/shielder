/**
 * Environment Configuration
 * Centralized environment variables management with validation
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables in development only
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

/**
 * Validates that required environment variables are set
 */
const validateEnv = (): void => {
  const required = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
};

// Validate on module load
validateEnv();

/**
 * Environment configuration object
 */
export const env = {
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // CORS
  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
  },

  // Frontend URL (for email links)
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Email Configuration
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'smtp',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Shielder Platform',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'noreply@shielder.com',

  // SMTP Configuration (Gmail, Outlook, etc.)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',

  // SendGrid Configuration
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',

  // AWS SES Configuration
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_SES_ACCESS_KEY: process.env.AWS_SES_ACCESS_KEY || '',
  AWS_SES_SECRET_KEY: process.env.AWS_SES_SECRET_KEY || '',

  // Legacy email config (kept for backward compatibility)
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;

export default env;
