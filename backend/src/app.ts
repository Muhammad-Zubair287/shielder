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
import inventoryRoutes from './modules/inventory/inventory.routes';
import stockAlertRoutes from './modules/inventory/stock-alert/stock-alert.routes';
import notificationRoutes from './modules/notification/notification.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import profileRoutes from './modules/profile/profile.routes';
import cartRoutes from './modules/cart/cart.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerConfig } from './config/swagger';

/**
 * Create Express application
 */
export const createApp = (): Application => {
  const app = express();

  // Swagger setup
  const specs = swaggerJsdoc(swaggerConfig);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

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
  app.use(`${appConfig.api.prefix}/profile`, profileRoutes);
  app.use(`${appConfig.api.prefix}/cart`, cartRoutes);
  app.use(`${appConfig.api.prefix}/admin`, adminRoutes);
  app.use(`${appConfig.api.prefix}/super-admin`, superAdminRoutes);
  app.use(`${appConfig.api.prefix}/inventory`, inventoryRoutes);
  app.use(`${appConfig.api.prefix}/products`, stockAlertRoutes);
  app.use(`${appConfig.api.prefix}/notifications`, notificationRoutes);
  app.use(`${appConfig.api.prefix}/analytics`, analyticsRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  logger.info('Express application initialized successfully');

  return app;
};

export default createApp;
