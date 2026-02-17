/**
 * Database Configuration
 * Prisma client instance and database utilities
 */

import { PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * Prisma Client Instance
 * Singleton pattern to ensure only one instance
 */
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: env.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.isDevelopment) {
  global.prisma = prisma;
}

/**
 * Connects to the database
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error Details:', error instanceof Error ? error.message : error);
    console.error('Note: Ensure DATABASE_URL is correctly set in your environment variables.');
    process.exit(1);
  }
};

/**
 * Disconnects from the database
 */
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log('Database disconnected');
};

export default prisma;
