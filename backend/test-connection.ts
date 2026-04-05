import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Database URL from env:', process.env.DATABASE_URL);
    console.log('Attempting connection...');
    await prisma.$connect();
    console.log('✅ Connected!');
    
    // Test a query
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Query successful:', result);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
