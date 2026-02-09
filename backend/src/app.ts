/**
 * Express Application Configuration
 * Main application setup with middleware and routes
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { appConfig } from './config/app.config';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './common/middleware/error.middleware';
import { logger } from './common/logger/logger';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import adminRoutes from './modules/admin/admin.routes';
import superAdminRoutes from './modules/super-admin/super-admin.routes';

/**
 * Create Express application
 */
export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS middleware
  app.use(cors(appConfig.cors));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware
  app.use(compression());

  // Logging middleware (only in development)
  if (env.isDevelopment) {
    app.use(morgan('dev'));
  }

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Shielder API is running',
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    });
  });

  // API routes
  app.use(`${appConfig.api.prefix}/auth`, authRoutes);
  app.use(`${appConfig.api.prefix}/admin`, adminRoutes);
  app.use(`${appConfig.api.prefix}/super-admin`, superAdminRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  logger.info('Express application initialized successfully');

  return app;
};

export default createApp;
