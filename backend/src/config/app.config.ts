/**
 * Application Configuration
 * Central configuration for application-wide settings
 */

import { env } from './env';

export const appConfig = {
  // Application Info
  app: {
    name: 'Shielder Digital Platform',
    version: '1.0.0',
    description: 'Enterprise digital backbone for industrial filters',
  },

  // API Configuration
  api: {
    version: env.apiVersion,
    prefix: '/api',
    port: env.port,
  },

  // CORS Configuration
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = env.cors.allowedOrigins;
      
      // Allow wildcard for easier debugging
      if (allowedOrigins.includes('*')) return callback(null, true);
      
      // Check if the origin matches or is a vercel sub-domain
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed === origin) return true;
        // Match Vercel preview/deployment URLs
        if (allowed.includes('vercel.app') && origin.endsWith('vercel.app')) return true;
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS REJECTED] Origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  },

  // Pagination
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Supported Languages
  languages: {
    supported: ['en', 'ar'],
    default: 'en',
  },

  // User Roles
  roles: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    USER: 'USER',
  },

  // Order Status
  orderStatus: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PROCESSING: 'PROCESSING',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
  },

  // Product Status
  productStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    OUT_OF_STOCK: 'OUT_OF_STOCK',
  },

  // User Status
  userStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    SUSPENDED: 'SUSPENDED',
    PENDING: 'PENDING',
  },
};

export default appConfig;
