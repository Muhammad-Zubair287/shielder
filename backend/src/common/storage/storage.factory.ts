import { env } from '@/config/env';
import type { StorageProvider } from './storage.types';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

export type StorageProviderMode = 'local' | 's3';

export const getStorageProvider = (): StorageProvider => {
  const provider = (process.env.STORAGE_PROVIDER || env.productImageStorage.provider || 'local').toLowerCase() as StorageProviderMode;
  if (provider === 's3') {
    if (!env.productImageStorage.bucket) {
      throw new Error('S3 storage provider selected but PRODUCT_IMAGE_S3_BUCKET is not configured.');
    }
    return new S3StorageProvider();
  }
  return new LocalStorageProvider();
};

