import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check the two products that were migrated
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: ['2c4d1bf4-d859-41bd-8476-f5ae8fa9b629', '5a67faa0-b9cd-4198-bfd8-a9b61f2b036f']
      }
    },
    select: { id: true, mainImage: true }
  });

  console.log('Migrated products:');
  products.forEach(p => {
    console.log(`  ${p.id}: ${p.mainImage}`);
  });

  // Check how many products have canonical paths
  const canonical = await prisma.product.count({
    where: { mainImage: { startsWith: 'uploads/products/' } }
  });

  console.log(`\nTotal products with canonical paths: ${canonical}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
