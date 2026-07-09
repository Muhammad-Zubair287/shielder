import fs from 'fs';
import path from 'path';
import type { Request } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const PRODUCT_IMAGE_RELATIVE_DIR = path.join('uploads', 'products');

type ProductImageStorageProvider = 'local' | 's3';

export type ProductImageStorageHealth = {
  provider: ProductImageStorageProvider;
  relativeDir: string;
  absoluteDir: string;
  exists: boolean;
  writable: boolean;
  checkedAt: string;
  error?: string;
};

type ProductImageStorageConfig = {
  provider: ProductImageStorageProvider;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
};

type StoredProductImage = {
  path: string;
  provider: ProductImageStorageProvider;
  publicUrl?: string;
};

const getProductImageStorageConfig = (): ProductImageStorageConfig => {
  const provider = (process.env.PRODUCT_IMAGE_STORAGE || 'local').toLowerCase() === 's3' ? 's3' : 'local';

  return {
    provider,
    bucket: process.env.PRODUCT_IMAGE_S3_BUCKET || process.env.S3_BUCKET,
    region: process.env.PRODUCT_IMAGE_S3_REGION || process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.PRODUCT_IMAGE_S3_ENDPOINT || process.env.S3_ENDPOINT,
    accessKeyId: process.env.PRODUCT_IMAGE_S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.PRODUCT_IMAGE_S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY,
    publicBaseUrl: process.env.PRODUCT_IMAGE_PUBLIC_BASE_URL || process.env.UPLOADS_BASE_URL,
  };
};

const isS3StorageConfigured = (config: ProductImageStorageConfig): boolean => {
  return !!(
    config.provider === 's3' &&
    config.bucket &&
    config.accessKeyId &&
    config.secretAccessKey
  );
};

const getS3Client = (config: ProductImageStorageConfig): S3Client => {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId || '',
      secretAccessKey: config.secretAccessKey || '',
    },
    forcePathStyle: !!config.endpoint,
  });
};

const buildProductImageFileName = (productId: string, originalName: string): string => {
  const ext = path.extname(originalName) || '.jpg';
  const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${safeProductId}-${uniqueSuffix}${ext}`;
};

const buildPublicProductImageUrl = (baseUrl: string | undefined, objectKey: string): string | null => {
  if (!baseUrl) return null;
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedKey = objectKey.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedKey}`;
};

export const getProductImageRelativeDir = (): string => PRODUCT_IMAGE_RELATIVE_DIR;

export const getProductImageAbsoluteDir = (): string => {
  return path.resolve(process.cwd(), PRODUCT_IMAGE_RELATIVE_DIR);
};

export const ensureProductImageDir = (): string => {
  const absoluteDir = getProductImageAbsoluteDir();
  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }
  return absoluteDir;
};

export const getProductImageStorageProvider = (): ProductImageStorageProvider => {
  const config = getProductImageStorageConfig();
  return isS3StorageConfigured(config) ? 's3' : 'local';
};

export const storeProductImageFile = async (
  file: Express.Multer.File,
  productId = 'product',
): Promise<StoredProductImage> => {
  const config = getProductImageStorageConfig();
  const fileName = buildProductImageFileName(productId, file.originalname);
  const objectKey = path.posix.join('uploads', 'products', fileName);

  if (isS3StorageConfigured(config)) {
    const client = getS3Client(config);
    const body = file.buffer || fs.readFileSync(file.path);

    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: file.mimetype,
    }));

    const publicUrl = buildPublicProductImageUrl(config.publicBaseUrl, objectKey) || undefined;

    return {
      path: publicUrl || objectKey,
      provider: 's3',
      publicUrl,
    };
  }

  const absoluteDir = ensureProductImageDir();
  const resolvedTargetDir = path.resolve(absoluteDir);
  const filePath = file.path ? path.resolve(file.path) : '';

  if (filePath && filePath.startsWith(`${resolvedTargetDir}${path.sep}`)) {
    return {
      path: path.join('uploads', 'products', path.basename(filePath)).replace(/\\/g, '/'),
      provider: 'local',
    };
  }

  const absolutePath = path.join(absoluteDir, fileName);

  if (file.buffer) {
    fs.writeFileSync(absolutePath, file.buffer);
  } else if (file.path) {
    fs.copyFileSync(file.path, absolutePath);
  } else {
    throw new Error('Product image file is missing both buffer and path');
  }

  return {
    path: path.join('uploads', 'products', fileName).replace(/\\/g, '/'),
    provider: 'local',
  };
};

export const deleteProductImageTempFile = (file?: Express.Multer.File | null): void => {
  if (!file?.path) return;

  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  } catch {
    // Ignore cleanup failures for temp upload files.
  }
};

export const checkProductImageStorage = (): ProductImageStorageHealth => {
  const provider = getProductImageStorageProvider();
  const absoluteDir = getProductImageAbsoluteDir();
  const exists = fs.existsSync(absoluteDir);

  try {
    ensureProductImageDir();

    const probeName = `.storage-check-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;
    const probePath = path.join(absoluteDir, probeName);
    fs.writeFileSync(probePath, 'ok');
    fs.unlinkSync(probePath);

    return {
      provider,
      relativeDir: PRODUCT_IMAGE_RELATIVE_DIR,
      absoluteDir,
      exists: true,
      writable: true,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      provider,
      relativeDir: PRODUCT_IMAGE_RELATIVE_DIR,
      absoluteDir,
      exists,
      writable: false,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unable to verify product image storage',
    };
  }
};

/**
 * Save a data:... base64 image string into the uploads/products directory
 * and return the relative uploads path (uploads/products/filename.ext).
 */
export const saveDataUrlToUploads = (dataUrl: string, productId = 'product'): string => {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.*)$/i);
  if (!match) throw new Error('Invalid data URL');

  const mime = match[1];
  const b64 = match[2];
  const ext = mime.split('/').pop() || 'png';

  const timestamp = Date.now();
  const safeFileName = `${productId}-${timestamp}.${ext}`;
  const absolute = path.join(getProductImageAbsoluteDir(), safeFileName);
  fs.writeFileSync(absolute, Buffer.from(b64, 'base64'));
  return path.join('uploads', 'products', safeFileName).replace(/\\/g, '/');
};

/**
 * Copy an existing file from known repository/public locations into uploads/products
 * and return the new relative uploads path or null if not found.
 */
export const copyExistingImageToUploads = (sourceRelative: string, productId = 'product'): string | null => {
  if (!sourceRelative) return null;
  const normalized = sourceRelative.replace(/\\\\/g, '/').replace(/^\./, '').replace(/^\//, '');
  // Don't attempt to copy remote or data URLs
  if (/^(https?:|data:)/i.test(normalized)) return null;

  const candidates = [
    path.join(process.cwd(), normalized),
    path.join(process.cwd(), 'backend', normalized),
    path.join(process.cwd(), 'frontend', 'public', normalized),
  ];

  const source = candidates.find((p) => fs.existsSync(p));
  if (!source) return null;

  const ext = path.extname(source) || '.jpg';
  const base = path.basename(source, ext)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');

  const fileName = `${productId}-${base || 'product'}${ext}`;
  const destDir = getProductImageAbsoluteDir();
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, fileName);
  try {
    fs.copyFileSync(source, dest);
    return path.join('uploads', 'products', fileName).replace(/\\/g, '/');
  } catch (err) {
    return null;
  }
};

const getRequestOrigin = (req: Request): string => {
  // APP_URL is the canonical public URL of the backend (e.g. http://1.2.3.4:5000).
  // When set, use it directly so image URLs are always correct regardless of
  // reverse-proxy header configuration.
  const appUrl = process.env.APP_URL || process.env.BASE_URL;
  if (appUrl) {
    const raw = appUrl.startsWith('http://') || appUrl.startsWith('https://')
      ? appUrl
      : `https://${appUrl}`;
    return raw.replace(/\/$/, '');
  }

  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
  const isProduction = process.env.NODE_ENV === 'production';
  const protocol = isProduction ? 'https' : (forwardedProto || req.protocol);
  const host = forwardedHost || req.get('host');

  return host ? `${protocol}://${host}` : '';
};

export const resolvePublicProductImageUrl = (
  req: Request,
  imagePath?: string | null,
  cacheKey?: string | number | Date,
): string | null => {
  if (!imagePath) return null;

  if (/^(https?:\/\/|data:|blob:)/i.test(imagePath)) {
    return imagePath;
  }

  const normalized = imagePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  const pathPart = normalized.startsWith('/') ? normalized : `/${normalized}`;

  if (
    normalized.startsWith('images/') ||
    normalized.startsWith('uploads/') ||
    pathPart.startsWith('/images/') ||
    pathPart.startsWith('/uploads/')
  ) {
    const origin = getRequestOrigin(req);
    const absolute = origin ? `${origin}${pathPart}` : pathPart;
    if (!cacheKey) return absolute;

    const stamp = cacheKey instanceof Date
      ? cacheKey.getTime()
      : typeof cacheKey === 'string'
        ? Date.parse(cacheKey)
        : Number(cacheKey);

    if (!Number.isFinite(stamp) || stamp <= 0) return absolute;
    const separator = absolute.includes('?') ? '&' : '?';
    return `${absolute}${separator}v=${stamp}`;
  }

  return imagePath;
};
