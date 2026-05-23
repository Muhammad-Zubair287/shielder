const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const products = await prisma.product.findMany({
    where: { mainImage: { not: null } },
    select: { id: true, sku: true, mainImage: true, updatedAt: true },
    take: 10,
    orderBy: { updatedAt: 'desc' }
  });
  
  console.log('\n📋 Products with images in DB: \n');
  for (const p of products) {
    console.log(`SKU: ${p.sku || 'N/A'}`);
    console.log(`ID: ${p.id}`);
    console.log(`mainImage: ${p.mainImage}`);
    console.log(`Updated: ${p.updatedAt}\n`);
  }
  
  await prisma.$disconnect();
})();
