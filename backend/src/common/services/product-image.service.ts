import fs from 'fs';
import path from 'path';
import type { Request } from 'express';

const PRODUCT_IMAGE_RELATIVE_DIR = path.join('images', 'products-images');

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
