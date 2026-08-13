import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { env } from '@/config/env';
import type { StoredRef, StorageProvider, StoreBufferInput, StoreFileInput } from '../storage.types';

type ScopeConfig = {
  providerKeyPrefix: string; // e.g. "uploads/products/"
  publicRefPrefix: string; // "/uploads/products/"
};

const getScopeConfig = (scope: string): ScopeConfig => {
  switch (scope) {
    case 'products':
      return { providerKeyPrefix: 'uploads/products/', publicRefPrefix: '/uploads/products/' };
    case 'categories':
      return { providerKeyPrefix: 'uploads/categories/', publicRefPrefix: '/uploads/categories/' };
    case 'profiles':
      return { providerKeyPrefix: 'uploads/profile/', publicRefPrefix: '/uploads/profile/' };
    case 'applications':
      return { providerKeyPrefix: 'uploads/applications/', publicRefPrefix: '/uploads/applications/' };
    case 'companyLogoRoot':
      return { providerKeyPrefix: 'uploads/', publicRefPrefix: '/uploads/' };
    case 'contactAttachments':
      return { providerKeyPrefix: 'uploads/contact/', publicRefPrefix: '/uploads/contact/' };
    default:
      return { providerKeyPrefix: 'uploads/', publicRefPrefix: '/uploads/' };
  }
};

const getS3Client = (): S3Client => {
  return new S3Client({
    region: env.productImageStorage.region,
    endpoint: env.productImageStorage.endpoint || undefined,
    credentials: {
      accessKeyId: env.productImageStorage.accessKeyId || '',
      secretAccessKey: env.productImageStorage.secretAccessKey || '',
    },
    forcePathStyle: Boolean(env.productImageStorage.endpoint),
  });
};

const normalizeRefToProviderKey = (ref: string): string => {
  const normalized = ref.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  // Expected format: uploads/<subdir>/<file> (legacy DB references include leading "/")
  if (!normalized.startsWith('uploads/')) {
    throw new Error('Invalid storage ref (must start with /uploads/ or uploads/)');
  }
  return normalized;
};

const safeOwner = (ownerId?: string): string => {
  if (!ownerId) return 'file';
  return ownerId.replace(/[^a-zA-Z0-9_-]/g, '-');
};

export class S3StorageProvider implements StorageProvider {
  mode: 's3' = 's3';

  async storeBuffer(input: StoreBufferInput): Promise<StoredRef> {
    const { scope, buffer, extension, ownerId } = input;
    const cfg = getScopeConfig(scope);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileName = `${safeOwner(ownerId)}-${uniqueSuffix}${extension}`;
    const key = path.posix.join(cfg.providerKeyPrefix, fileName);

    const s3 = getS3Client();
    await s3.send(new PutObjectCommand({
      Bucket: env.productImageStorage.bucket || '',
      Key: key,
      Body: buffer,
      ContentType: input.contentType,
    }));

    const ref = `${cfg.publicRefPrefix}${fileName}`.replace(/\\/g, '/');
    return { ref, providerKey: normalizeRefToProviderKey(ref) };
  }

  async storeFile(input: StoreFileInput): Promise<StoredRef> {
    const buffer = fs.readFileSync(input.filePath);
    return this.storeBuffer({
      ...input,
      buffer,
    });
  }

  async deleteByRef(ref: string): Promise<boolean> {
    try {
      const key = normalizeRefToProviderKey(ref);
      const s3 = getS3Client();
      await s3.send(new DeleteObjectCommand({
        Bucket: env.productImageStorage.bucket || '',
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }

  async existsByRef(_ref: string): Promise<boolean> {
    // Optional. Not needed for basic idempotent replacement.
    return true;
  }

  refToProviderKey(ref: string): string {
    return normalizeRefToProviderKey(ref);
  }

  // NOTE: private access streaming will be handled by StorageController
  // using providerKey derived from ref.
  async getObjectStreamByRef(ref: string): Promise<{ contentType: string | undefined; stream: any }> {
    const s3 = getS3Client();
    const key = normalizeRefToProviderKey(ref);
    const result = await s3.send(new GetObjectCommand({
      Bucket: env.productImageStorage.bucket || '',
      Key: key,
    }));

    return {
      contentType: result.ContentType,
      stream: result.Body,
    };
  }

  async getPrivateObjectStream(ref: string): Promise<{ contentType?: string; stream: any }> {
    const { contentType, stream } = await this.getObjectStreamByRef(ref);
    return { contentType, stream };
  }
}

