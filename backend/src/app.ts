/**
 * Express Application Configuration
 * Main application setup with middleware and routes
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { appConfig } from './config/app.config';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './common/middleware/error.middleware';
import { languageMiddleware } from './common/middleware/language.middleware';
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
import epgRoutes from './modules/payment/epg.routes';
import reportsRoutes from './modules/reports/reports.routes';
import settingsRoutes from './modules/settings/settings.routes';
import privacyPolicyRoutes from './modules/privacy-policy/privacy-policy.routes';
import quotationRoutes from './modules/quotation/quotation.routes';
import customerQuotationRoutes from './modules/customer-quotation/customer-quotation.routes';
import contactRoutes from './modules/contact/contact.routes';
import newsletterRoutes from './modules/newsletter/newsletter.routes';
import productReviewRoutes from './modules/product-review/product-review.routes';
import inventoryAlertRoutes from './modules/inventory-alert/inventory-alert.routes';
import publicWarehouseRoutes from './modules/warehouse/public-warehouse.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerConfig } from './config/swagger';
import { emailService } from './common/services/email.service';

const staticImageRoots = [
  path.resolve(process.cwd(), 'images'),
  path.resolve(process.cwd(), '..', 'images'),
  path.resolve(__dirname, 'images'),
  path.resolve(__dirname, '..', 'images'),
  path.resolve(__dirname, '..', '..', 'images'),
  path.resolve(__dirname, '..', '..', '..', 'images'),
  path.resolve(process.cwd(), '..', 'frontend', 'public', 'images'),
];

const staticUploadRoots = [
  path.resolve(process.cwd(), 'uploads'),
  path.resolve(process.cwd(), '..', 'uploads'),
  path.resolve(__dirname, 'uploads'),
  path.resolve(__dirname, '..', 'uploads'),
  path.resolve(__dirname, '..', '..', 'uploads'),
];

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

  // Compression FIRST — compresses all downstream responses
  app.use(compression());

  // Swagger UI (development / staging only — it is heavy)
  if (!env.isProduction) {
    const specs = swaggerJsdoc(swaggerConfig);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  }

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'http://localhost:3000', 'http://localhost:5001', 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'http://localhost:3000', 'http://localhost:5001'],
      },
    },
  }));

  // CORS middleware
  app.use(cors(appConfig.cors));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Language middleware
  app.use(languageMiddleware);

  // HTTP request logging (development only)
  if (env.isDevelopment) {
    app.use(morgan('dev'));
  }

  // Static files (served with long-lived cache in production)
  for (const root of staticUploadRoots) {
    app.use('/uploads', express.static(root, {
      maxAge: env.isProduction ? '7d' : 0,
    }));
  }

  // Serve root-level images folder (used by seed data / demo images)
  for (const root of staticImageRoots) {
    app.use('/images', express.static(root, {
      maxAge: env.isProduction ? '7d' : 0,
    }));
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

  // Development helper: set trusted device cookie for API origin
  if (!env.isProduction) {
    app.get('/set-trusted-cookie', (req, res) => {
      const token = String(req.query.token || '');
      if (!token) {
        return res.status(400).send('Missing token query parameter. Use /set-trusted-cookie?token=...');
      }

      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      res.cookie('trustedDeviceToken', token, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: env.isProduction ? 'none' : 'lax',
        maxAge,
        path: '/',
      });

      return res.status(200).send(`Trusted device cookie set for token=${token.slice(0, 8)}...`);
    });
  }

  // Email health check - verifies email provider connectivity (Brevo REST or SMTP)
  app.get('/health/email', async (_req, res) => {
    try {
      const ok = await emailService.verifyConnection();
      if (ok) {
        return res.status(200).json({ success: true, message: 'Email service OK' });
      }
      return res.status(502).json({ success: false, message: 'Email service not configured or unreachable' });
    } catch (err) {
      logger.error('Email health check error', err);
      return res.status(500).json({ success: false, message: 'Email health check failed', error: String(err) });
    }
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
    app.use(`${prefix}/epg`, epgRoutes);
    app.use(`${prefix}/reports`, reportsRoutes);
    app.use(`${prefix}/settings`, settingsRoutes);
    app.use(`${prefix}/privacy-policy`, privacyPolicyRoutes);
    app.use(`${prefix}/quotations`, quotationRoutes);
    app.use(`${prefix}/customer-quotations`, customerQuotationRoutes);
    app.use(`${prefix}/contact`, contactRoutes);
    app.use(`${prefix}/newsletter`, newsletterRoutes);
    app.use(`${prefix}/reviews`, productReviewRoutes);
    app.use(`${prefix}/warehouses`, publicWarehouseRoutes);
    app.use(`${prefix}/admin/inventory-alerts`, inventoryAlertRoutes);
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
