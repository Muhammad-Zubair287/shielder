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
    origin: env.cors.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as string[],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'] as string[],
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
} as const;

export default appConfig;
