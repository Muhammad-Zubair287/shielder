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
    datasources: {
      db: {
        // Railway PostgreSQL: keep pool small to avoid connection exhaustion on
        // the free/hobby plan. connection_limit=5 and pool_timeout=20 are safe
        // defaults; tweak via DATABASE_URL query params if needed.
        url: env.databaseUrl,
      },
    },
  });

if (env.isDevelopment) {
  global.prisma = prisma;
}

/**
 * Connects to the database
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    console.log('📡 Attempting to connect to database...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    const isLocalhost = env.databaseUrl.includes('127.0.0.1') || env.databaseUrl.includes('localhost');
    const isProduction = process.env.NODE_ENV === 'production';

    console.error('❌ Database connection failed!');
    console.error('Error Details:', error instanceof Error ? error.message : error);

    if (isProduction && isLocalhost) {
      console.error('\n🔧 ACTION REQUIRED (Production):');
      console.error('Your app is running in PRODUCTION but DATABASE_URL points to localhost.');
      console.error('Go to Railway → your backend service → Variables and set DATABASE_URL');
      console.error('to your Railway PostgreSQL connection string.');
    } else if (!isProduction && isLocalhost) {
      console.error('\n🔧 Local development fix:');
      console.error('Make sure PostgreSQL is running:  brew services start postgresql');
      console.error('Check your backend/.env DATABASE_URL is:');
      console.error('  postgresql://postgres:<password>@127.0.0.1:5432/shielderDB');
    } else {
      console.error('\n🔧 Check your DATABASE_URL credentials in backend/.env');
    }

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
