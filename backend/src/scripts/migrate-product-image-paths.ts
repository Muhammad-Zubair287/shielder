import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient, AttachmentType } from '@prisma/client';

const prisma = new PrismaClient();

const projectRoot = process.cwd();
const sourceUploadDir = path.join(projectRoot, 'images', 'products-images');
const canonicalImageDir = path.join(projectRoot, 'uploads', 'products');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function normalizeStoredPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
}

function toCanonicalRelativePath(productId: string, sourceRelativePath: string): string {
  const normalized = normalizeStoredPath(sourceRelativePath);
  const fileName = path.basename(normalized);
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');

  const canonicalFileName = `${productId}-${baseName || 'product'}${ext || '.jpg'}`;
  return `uploads/products/${canonicalFileName}`;
}

function resolveSourceCandidates(storedPath: string): string[] {
  const normalized = normalizeStoredPath(storedPath);
  return [
    path.join(projectRoot, normalized),
    path.join(projectRoot, 'backend', normalized),
    path.join(projectRoot, 'frontend', 'public', normalized),
  ];
}

async function moveIfPresent(productId: string, storedPath: string): Promise<string | null> {
  const normalized = normalizeStoredPath(storedPath);

  if (!normalized || normalized.startsWith('data:') || normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return null;
  }

  if (normalized.startsWith('uploads/products/')) {
    return normalized;
  }

  const targetRelative = toCanonicalRelativePath(productId, normalized);
  const targetAbsolute = path.join(projectRoot, targetRelative);
  ensureDir(path.dirname(targetAbsolute));

  const candidateSources = resolveSourceCandidates(normalized);
  const source = candidateSources.find((candidate) => fs.existsSync(candidate));

  if (source && source !== targetAbsolute) {
    fs.copyFileSync(source, targetAbsolute);
  }

  return targetRelative;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  
  if (isDryRun) {
    console.log('\n📋 DRY-RUN MODE: No changes will be applied.\n');
  }

  ensureDir(canonicalImageDir);

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { mainImage: { startsWith: 'uploads/' } },
        { mainImage: { startsWith: '/uploads/' } },
          { mainImage: { startsWith: 'images/products-images/' } },
        { mainImage: { startsWith: 'images/products images/' } },
      ],
    },
    select: { id: true, mainImage: true, updatedAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const imageAttachments = await prisma.productAttachment.findMany({
    where: {
      type: AttachmentType.IMAGE,
      OR: [
        { fileUrl: { startsWith: 'uploads/' } },
        { fileUrl: { startsWith: '/uploads/' } },
          { fileUrl: { startsWith: 'images/products-images/' } },
        { fileUrl: { startsWith: 'images/products images/' } },
      ],
    },
    select: { id: true, productId: true, fileUrl: true },
  });

  let migratedProducts = 0;
  let migratedAttachments = 0;

  if (products.length > 0) {
    console.log(`\n🏷️  PRODUCTS TO MIGRATE (${products.length}):`);
    for (const product of products) {
      if (!product.mainImage) continue;
      const updatedRelativePath = await moveIfPresent(product.id, product.mainImage);
      if (!updatedRelativePath || updatedRelativePath === normalizeStoredPath(product.mainImage)) continue;

      console.log(`  • Product "${product.id}"`);
      console.log(`    OLD: ${product.mainImage}`);
      console.log(`    NEW: ${updatedRelativePath}`);

      if (!isDryRun) {
        await prisma.product.update({
          where: { id: product.id },
          data: { mainImage: updatedRelativePath },
        });
      }
      migratedProducts += 1;
    }
  }

  if (imageAttachments.length > 0) {
    console.log(`\n📎 IMAGE ATTACHMENTS TO MIGRATE (${imageAttachments.length}):`);
    for (const attachment of imageAttachments) {
      if (!attachment.fileUrl) continue;
      const updatedRelativePath = await moveIfPresent(attachment.productId, attachment.fileUrl);
      if (!updatedRelativePath || updatedRelativePath === normalizeStoredPath(attachment.fileUrl)) continue;

      console.log(`  • Attachment "${attachment.id}" (Product: "${attachment.productId}")`);
      console.log(`    OLD: ${attachment.fileUrl}`);
      console.log(`    NEW: ${updatedRelativePath}`);

      if (!isDryRun) {
        await prisma.productAttachment.update({
          where: { id: attachment.id },
          data: { fileUrl: updatedRelativePath },
        });
      }
      migratedAttachments += 1;
    }
  }

  console.log('\n✅ MIGRATION SUMMARY:');
  console.log(JSON.stringify({
    mode: isDryRun ? 'dry-run' : 'applied',
    projectRoot,
    canonicalImageDir,
    sourceUploadDir,
    migratedProducts,
    migratedAttachments,
  }, null, 2));

  if (isDryRun) {
    console.log('\n💡 To apply these changes, run: npm run migrate:product-images (without --dry-run)\n');
  }
}

main()
  .catch((error) => {
    console.error('Failed to migrate product image paths:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
