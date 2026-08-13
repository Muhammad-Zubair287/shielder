import fs from 'fs';
import path from 'path';
import type { Request } from 'express';
import { env } from '@/config/env';
import { storageService } from '@/common/storage/storage.service';
import {
  deleteStoredRefSafe,
  persistDataUrlImage,
  persistExistingPathImage,
  storeUploadedImageFile,
} from '@/common/storage/storage-image.helper';

const PRODUCT_IMAGE_RELATIVE_DIR = path.join('uploads', 'products');

export type ProductImageStorageHealth = {
  provider: 'local' | 's3';
  relativeDir: string;
  absoluteDir: string;
  exists: boolean;
  writable: boolean;
  checkedAt: string;
  error?: string;
};

type StoredProductImage = {
  path: string;
  provider: 'local' | 's3';
};

export const getProductImageRelativeDir = (): string => PRODUCT_IMAGE_RELATIVE_DIR;

export const getProductImageAbsoluteDir = (): string => {
  return path.resolve(process.cwd(), env.upload.uploadPath, 'products');
};

export const getProductImageStorageProvider = (): 'local' | 's3' => storageService.getProviderMode();

export const storeProductImageFile = async (
  file: Express.Multer.File,
  productId = 'product',
): Promise<StoredProductImage> => {
  const ref = await storeUploadedImageFile(file, 'products', productId);
  return {
    path: ref.replace(/^\/+/, ''),
    provider: storageService.getProviderMode(),
  };
};

export const deleteProductImageByRef = async (imageRef?: string | null): Promise<boolean> => {
  return deleteStoredRefSafe(imageRef);
};

export const deleteProductImageTempFile = (_file?: Express.Multer.File | null): void => {
  // Memory storage is used for product uploads; no temp disk files to clean up.
};

export const checkProductImageStorage = (): ProductImageStorageHealth => {
  const provider = storageService.getProviderMode();
  const absoluteDir = getProductImageAbsoluteDir();
  const exists = fs.existsSync(absoluteDir);

  if (provider === 's3') {
    return {
      provider,
      relativeDir: PRODUCT_IMAGE_RELATIVE_DIR,
      absoluteDir,
      exists: true,
      writable: true,
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    fs.mkdirSync(absoluteDir, { recursive: true });
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

export const saveDataUrlToUploads = async (dataUrl: string, productId = 'product'): Promise<string> => {
  const ref = await persistDataUrlImage(dataUrl, productId);
  return ref.replace(/^\/+/, '');
};

export const copyExistingImageToUploads = async (
  sourceRelative: string,
  productId = 'product',
): Promise<string | null> => {
  const ref = await persistExistingPathImage(sourceRelative, productId);
  return ref ? ref.replace(/^\/+/, '') : null;
};

const getRequestOrigin = (req: Request): string => {
  const appUrl = env.APP_URL;
  if (appUrl) {
    const raw = appUrl.startsWith('http://') || appUrl.startsWith('https://')
      ? appUrl
      : `https://${appUrl}`;
    return raw.replace(/\/$/, '');
  }

  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
  const isProduction = env.isProduction;
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
