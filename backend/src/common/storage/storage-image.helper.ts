import fs from 'fs';
import path from 'path';
import { prisma } from '@/config/database';
import { BadRequestError } from '@/common/errors/api.error';
import { storageService } from './storage.service';
import type { StorageScope } from './storage.types';
import { validateImageBuffer } from './image-validation.service';

export const normalizeStorageRef = (ref: string): string => ref.trim().replace(/\\/g, '/');

export const toProviderRef = (ref: string): string => {
  const normalized = normalizeStorageRef(ref);
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

export const isUploadsRef = (ref: string | null | undefined): boolean => {
  if (!ref) return false;
  const normalized = normalizeStorageRef(ref).replace(/^\/+/, '');
  return normalized.startsWith('uploads/');
};

export const storeUploadedImageFile = async (
  file: Express.Multer.File,
  scope: StorageScope,
  ownerId?: string,
): Promise<string> => {
  if (!file?.buffer?.length) {
    throw new BadRequestError('storage.imageEmptyOrUnreadable');
  }

  const stored = await storageService.storeImageFromBuffer({
    scope,
    buffer: file.buffer,
    declaredMimeType: file.mimetype,
    ownerId,
  });

  return stored.ref;
};

export const deleteStoredRefSafe = async (ref: string | null | undefined): Promise<boolean> => {
  if (!ref || !isUploadsRef(ref)) return false;
  return storageService.deleteByRef(toProviderRef(ref));
};

const countRefUsage = async (providerRef: string): Promise<number> => {
  const withoutSlash = providerRef.replace(/^\/+/, '');
  const withSlash = providerRef.startsWith('/') ? providerRef : `/${providerRef}`;

  const [
    products,
    categories,
    subcategories,
    applications,
    profiles,
    contacts,
    settings,
  ] = await Promise.all([
    prisma.product.count({ where: { OR: [{ mainImage: providerRef }, { mainImage: withoutSlash }, { mainImage: withSlash }] } }),
    prisma.category.count({ where: { OR: [{ image: providerRef }, { image: withoutSlash }, { image: withSlash }] } }),
    prisma.subcategory.count({ where: { OR: [{ image: providerRef }, { image: withoutSlash }, { image: withSlash }] } }),
    prisma.application.count({ where: { OR: [{ image: providerRef }, { image: withoutSlash }, { image: withSlash }] } }),
    prisma.userProfile.count({ where: { OR: [{ profileImage: providerRef }, { profileImage: withoutSlash }, { profileImage: withSlash }] } }),
    prisma.contact.count({ where: { OR: [{ fileUrl: providerRef }, { fileUrl: withoutSlash }, { fileUrl: withSlash }] } }),
    prisma.systemSettings.count({ where: { OR: [{ companyLogo: providerRef }, { companyLogo: withoutSlash }, { companyLogo: withSlash }] } }),
  ]);

  return products + categories + subcategories + applications + profiles + contacts + settings;
};

export const deleteStoredRefIfUnused = async (ref: string | null | undefined): Promise<boolean> => {
  if (!ref || !isUploadsRef(ref)) return false;
  const providerRef = toProviderRef(ref);

  try {
    const usage = await countRefUsage(providerRef);
    if (usage > 0) return false;
  } catch {
    // If reference counting fails (e.g. incomplete test mocks), skip deletion
    // rather than failing the parent business operation.
    return false;
  }

  return storageService.deleteByRef(providerRef);
};

export const replaceStoredImage = async (input: {
  file: Express.Multer.File;
  scope: StorageScope;
  ownerId?: string;
  oldRef: string | null | undefined;
  updateDb: (newRef: string) => Promise<void>;
}): Promise<string> => {
  const newRef = await storeUploadedImageFile(input.file, input.scope, input.ownerId);
  try {
    await input.updateDb(newRef);
  } catch (error) {
    await deleteStoredRefSafe(newRef);
    throw error;
  }

  await deleteStoredRefIfUnused(input.oldRef);
  return newRef;
};

export const persistImageBuffer = async (input: {
  scope: StorageScope;
  buffer: Buffer;
  declaredMimeType?: string;
  ownerId?: string;
}): Promise<string> => {
  const stored = await storageService.storeImageFromBuffer({
    scope: input.scope,
    buffer: input.buffer,
    declaredMimeType: input.declaredMimeType,
    ownerId: input.ownerId,
  });
  return stored.ref;
};

export const persistDataUrlImage = async (dataUrl: string, ownerId?: string): Promise<string> => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    throw new BadRequestError('storage.imageInvalidMagicBytes');
  }

  const declaredMimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const kind = validateImageBuffer({
    buffer,
    declaredMimeType,
    byteSize: buffer.length,
  });

  return persistImageBuffer({
    scope: 'products',
    buffer,
    declaredMimeType: kind.mimeType,
    ownerId,
  });
};

const isPathInsideRoot = (absolutePath: string, rootAbsolute: string): boolean => {
  const normalizedPath = path.resolve(absolutePath);
  const normalizedRoot = path.resolve(rootAbsolute);
  return (
    normalizedPath === normalizedRoot ||
    normalizedPath.startsWith(`${normalizedRoot}${path.sep}`)
  );
};

const hasPathTraversal = (value: string): boolean => {
  const normalized = value.replace(/\\/g, '/');
  return (
    normalized.includes('\0') ||
    normalized.includes('..') ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.startsWith('\\\\')
  );
};

const getAllowedBulkImageRoots = (): string[] => {
  const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads');
  return [
    path.join(uploadRoot, 'products'),
    path.resolve(process.cwd(), 'images'),
    path.resolve(process.cwd(), 'images', 'products-images'),
    path.resolve(process.cwd(), 'frontend', 'public', 'images'),
    path.resolve(process.cwd(), 'frontend', 'public', 'images', 'products-images'),
  ];
};

/**
 * Resolve a bulk/Excel image source against allowlisted server directories only.
 * Never trusts client-provided absolute paths or path traversal segments.
 */
export const persistExistingPathImage = async (sourceRelative: string, ownerId?: string): Promise<string | null> => {
  if (!sourceRelative) return null;
  if (/^(https?:|data:)/i.test(sourceRelative.trim())) return null;
  if (hasPathTraversal(sourceRelative)) {
    throw new BadRequestError('storage.privateInvalidRef');
  }

  let normalized = sourceRelative.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  // Treat virtual URL-style paths as relative under allowlisted roots.
  if (normalized.startsWith('/uploads/')) normalized = normalized.slice(1);
  if (normalized.startsWith('/images/')) normalized = normalized.slice(1);
  normalized = normalized.replace(/^\/+/, '');

  // Bare filename → look under uploads/products and known image folders only.
  const relativeCandidates = normalized.includes('/')
    ? [normalized]
    : [
        path.posix.join('uploads', 'products', normalized),
        path.posix.join('images', 'products-images', normalized),
        path.posix.join('images', normalized),
      ];

  const roots = getAllowedBulkImageRoots();
  let source: string | null = null;

  for (const relative of relativeCandidates) {
    if (hasPathTraversal(relative)) {
      throw new BadRequestError('storage.privateInvalidRef');
    }

    const candidatePaths = [
      path.resolve(process.cwd(), relative),
      path.resolve(process.cwd(), 'backend', relative),
      path.resolve(process.cwd(), 'frontend', 'public', relative),
    ];

    for (const candidate of candidatePaths) {
      if (!roots.some((root) => isPathInsideRoot(candidate, root))) continue;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        source = candidate;
        break;
      }
    }
    if (source) break;
  }

  if (!source) return null;

  const buffer = fs.readFileSync(source);
  // Magic-byte validation decides the real type; do not trust extension.
  return persistImageBuffer({
    scope: 'products',
    buffer,
    ownerId,
  });
};

const isPrivateOrLocalHostname = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host === 'metadata.google.internal'
  ) {
    return true;
  }

  // Basic private IPv4 ranges
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(host)) return true;

  return false;
};

export const persistRemoteImageUrl = async (url: string, ownerId?: string): Promise<string> => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestError('storage.imageInvalidType');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestError('storage.imageInvalidType');
  }
  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new BadRequestError('storage.privateInvalidRef');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new BadRequestError('storage.uploadFailed');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const declaredMimeType = response.headers.get('content-type')?.split(';')[0]?.trim();

    return persistImageBuffer({
      scope: 'products',
      buffer,
      declaredMimeType: declaredMimeType || undefined,
      ownerId,
    });
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError('storage.uploadFailed');
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Resolve an Excel Image-column value / embedded image into a StorageService-owned ref.
 * Never persists client-controlled paths into the database.
 */
export const resolveAndStoreBulkProductImage = async (input: {
  rawImage?: string;
  embeddedBuffer?: Buffer;
  ownerId?: string;
}): Promise<string | undefined> => {
  const ownerId = input.ownerId || 'product';

  if (input.rawImage && input.rawImage.trim()) {
    const raw = input.rawImage.trim();

    if (hasPathTraversal(raw) && !/^https?:\/\//i.test(raw)) {
      throw new BadRequestError('storage.privateInvalidRef');
    }

    if (/^data:/i.test(raw)) {
      const ref = await persistDataUrlImage(raw, ownerId);
      return ref.replace(/^\/+/, '');
    }

    if (/^https?:\/\//i.test(raw)) {
      const ref = await persistRemoteImageUrl(raw, ownerId);
      return ref.replace(/^\/+/, '');
    }

    const ref = await persistExistingPathImage(raw, ownerId);
    if (!ref) {
      throw new BadRequestError('storage.fileNotFound');
    }
    return ref.replace(/^\/+/, '');
  }

  if (input.embeddedBuffer?.length) {
    const ref = await persistImageBuffer({
      scope: 'products',
      buffer: input.embeddedBuffer,
      ownerId,
    });
    return ref.replace(/^\/+/, '');
  }

  return undefined;
};
