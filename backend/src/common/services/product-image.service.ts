import fs from 'fs';
import path from 'path';
import type { Request } from 'express';

const PRODUCT_IMAGE_RELATIVE_DIR = path.join('uploads', 'products');

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
