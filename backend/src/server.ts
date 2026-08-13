/**
 * Server Entry Point
 * Starts the Express server and connects to the database
 */

import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './common/logger/logger';
import { emailService } from './common/services/email.service';
import { checkProductImageStorage } from './common/services/product-image.service';
import { initSocketServer } from './modules/realtime/socket.service';
import http from 'http';

// Global error handlers - set these FIRST before anything else
process.on('uncaughtException', (error: Error) => {
  const errorId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  logger.error('[GLOBAL] Uncaught Exception', error, { errorId });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  const errorId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  logger.error('[GLOBAL] Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), { errorId });
  process.exit(1);
});

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Create Express app
    const app = createApp();

    const productImageStorage = checkProductImageStorage();
    const storageLog = {
      provider: productImageStorage.provider,
      writable: productImageStorage.writable,
      exists: productImageStorage.exists,
      checkedAt: productImageStorage.checkedAt,
      // Intentionally omit absoluteDir / raw error strings from logs.
    };
    if (productImageStorage.writable) {
      logger.info('✅ Product image storage verified', storageLog);
    } else {
      logger.error('❌ Product image storage is not writable', storageLog);
    }

    // Start listening
    const server = http.createServer(app);
    initSocketServer(server);

    server.listen(env.port, '0.0.0.0', async () => {
      logger.info(`🚀 Shielder API Server started successfully`, {
        port: env.port,
        environment: env.nodeEnv,
        apiPrefix: '/api',
      });
      console.log(`\n✅ Server is running on http://localhost:${env.port}`);
      console.log(`✅ API Endpoint: http://localhost:${env.port}/api`);
      console.log(`✅ Health Check: http://localhost:${env.port}/health`);
      console.log(`✅ Email Health: http://localhost:${env.port}/health/email\n`);

      // Verify email provider connectivity on startup
      try {
        const emailOk = await emailService.verifyConnection();
        if (emailOk) {
          logger.info('✅ Email service verified and ready');
        } else {
          logger.warn('⚠️ Email service not configured or not reachable');
        }
      } catch (verifyErr) {
        logger.warn('⚠️ Email service verification skipped or failed', verifyErr);
      }
    });
    
    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });

    // Keep-alive self-ping on Railway production to prevent cold-start sleeps.
    // Pings /health every 4 minutes (Railway idles after ~5 minutes of inactivity).
    if (env.isProduction) {
      const PING_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
      setInterval(() => {
        const options = {
          hostname: 'localhost',
          port: env.port,
          path: '/health',
          method: 'GET',
        };
        const req = http.request(options, (res) => {
          if (res.statusCode !== 200) {
            logger.warn(`[keep-alive] health ping returned ${res.statusCode}`);
          }
        });
        req.on('error', (err) => logger.warn('[keep-alive] ping error', err));
        req.end();
      }, PING_INTERVAL_MS);
      logger.info('[keep-alive] Self-ping enabled (every 4 min) to prevent Railway cold starts');
    }

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Disconnect from database
        await disconnectDatabase();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Rejection', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

// Start the server
startServer();
