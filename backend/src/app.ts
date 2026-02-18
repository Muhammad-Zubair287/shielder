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
import adminManagementRoutes from './modules/super-admin/admin-management.routes';
import superAdminRoutes from './modules/super-admin/super-admin.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import stockAlertRoutes from './modules/inventory/stock-alert/stock-alert.routes';
import notificationRoutes from './modules/notification/notification.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import profileRoutes from './modules/profile/profile.routes';
import cartRoutes from './modules/cart/cart.routes';
import orderRoutes from './modules/order/order.routes';
import paymentRoutes from './modules/payment/payment.routes';
import reportsRoutes from './modules/reports/reports.routes';
import settingsRoutes from './modules/settings/settings.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerConfig } from './config/swagger';

/**
 * Global BigInt serialization fix
 */
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

/**
 * Create Express application
 */
export const createApp = (): Application => {
  const app = express();

  // Debug middleware to log origins
  app.use((req, res, next) => {
    if (env.isProduction) {
      console.log(`[REQUEST] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'None'}`);
    }
    next();
  });

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

  // Static files
  app.use('/uploads', express.static('uploads'));

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

  // Debug route to verify prefixes
  app.get('/api/debug-routes', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Sub-route /api is working correctly',
      prefix: appConfig.api.prefix
    });
  });

  // API routes
  const apiPrefix = appConfig.api.prefix; // /api
  const versionedPrefix = `${apiPrefix}/${appConfig.api.version}`; // /api/v1
  
  // Log prefixes for debugging
  console.log(`[BOOT] Registering routes with prefixes: ${apiPrefix} and ${versionedPrefix}`);

  // Mounting routes on both /api AND /api/v1 to be safe and match documentation
  const mountRoutes = (prefix: string) => {
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/profile`, profileRoutes);
    app.use(`${prefix}/cart`, cartRoutes);
    app.use(`${prefix}/admin`, adminRoutes);
    app.use(`${prefix}/admins`, adminManagementRoutes);
    app.use(`${prefix}/super-admin`, superAdminRoutes);
    app.use(`${prefix}/inventory`, inventoryRoutes);
    app.use(`${prefix}/products`, stockAlertRoutes);
    app.use(`${prefix}/notifications`, notificationRoutes);
    app.use(`${prefix}/analytics`, analyticsRoutes);
    app.use(`${prefix}/orders`, orderRoutes);
    app.use(`${prefix}/payments`, paymentRoutes);
    app.use(`${prefix}/reports`, reportsRoutes);
    app.use(`${prefix}/settings`, settingsRoutes);
  };

  mountRoutes(apiPrefix);
  mountRoutes(versionedPrefix);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  logger.info('Express application initialized successfully');

  return app;
};

export default createApp;
