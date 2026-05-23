import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔧 Fixing products with missing image files...\n');

  // These two products have database paths that point to non-existent files  
  const productIds = [
    '2c4d1bf4-d859-41bd-8476-f5ae8fa9b629',
    '5a67faa0-b9cd-4198-bfd8-a9b61f2b036f'
  ];

  for (const id of productIds) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, mainImage: true, sku: true }
    });

    if (product) {
      console.log(`  ❌ Product ${product.sku || id}`);
      console.log(`     OLD mainImage: ${product.mainImage}`);
      
      await prisma.product.update({
        where: { id },
        data: { mainImage: null }
      });

      console.log(`     NEW mainImage: null (cleared)`);
    }
  }

  console.log('\n✅ Done! These products now show "No Image" placeholder.');
  console.log('📌 To restore images, upload them again in SuperAdmin > Products.\n');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
