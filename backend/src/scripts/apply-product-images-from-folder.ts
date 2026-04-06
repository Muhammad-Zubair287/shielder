import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const sourceDir = path.join(projectRoot, 'shileder products images');
const targetRootImagesDir = path.join(projectRoot, 'images', 'products-images');
const targetFrontendImagesDir = path.join(
  projectRoot,
  'frontend',
  'public',
  'images',
  'products-images'
);

function normalizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function getImageFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => {
      const lower = name.toLowerCase();
      return (
        !name.startsWith('.') &&
        (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp'))
      );
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

async function main() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source folder not found: ${sourceDir}`);
  }

  fs.mkdirSync(targetRootImagesDir, { recursive: true });
  fs.mkdirSync(targetFrontendImagesDir, { recursive: true });

  const sourceFiles = getImageFiles(sourceDir);
  if (sourceFiles.length === 0) {
    throw new Error('No image files found in source folder.');
  }

  const normalizedFiles: string[] = [];

  for (const file of sourceFiles) {
    const src = path.join(sourceDir, file);
    const normalized = normalizeFileName(file);
    const dstRoot = path.join(targetRootImagesDir, normalized);
    const dstFrontend = path.join(targetFrontendImagesDir, normalized);

    fs.copyFileSync(src, dstRoot);
    fs.copyFileSync(src, dstFrontend);
    normalizedFiles.push(normalized);
  }

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { mainImage: { startsWith: '/uploads/' } },
        { mainImage: { startsWith: 'uploads/' } },
        { mainImage: null },
        { mainImage: '' },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, sku: true, mainImage: true },
  });

  if (products.length === 0) {
    console.log('No target products found. Nothing to update.');
    return;
  }

  let updated = 0;
  const details: Array<{ id: string; sku: string | null; oldImage: string | null; newImage: string }> = [];

  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    const file = normalizedFiles[i % normalizedFiles.length];
    const newImage = `images/products-images/${file}`;

    await prisma.product.update({
      where: { id: product.id },
      data: { mainImage: newImage },
    });

    updated += 1;
    if (details.length < 20) {
      details.push({
        id: product.id,
        sku: product.sku,
        oldImage: product.mainImage,
        newImage,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        sourceFolder: sourceDir,
        copiedImages: sourceFiles.length,
        updatedProducts: updated,
        sampleUpdates: details,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Failed to apply product images:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
