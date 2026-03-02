/**
 * Server Entry Point
 * Starts the Express server and connects to the database
 */

import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './common/logger/logger';
import http from 'http';

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(env.port, () => {
      logger.info(`🚀 Shielder API Server started successfully`, {
        port: env.port,
        environment: env.nodeEnv,
        apiPrefix: '/api',
      });
      console.log(`\n✅ Server is running on http://localhost:${env.port}`);
      console.log(`✅ API Endpoint: http://localhost:${env.port}/api`);
      console.log(`✅ Health Check: http://localhost:${env.port}/health\n`);
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
