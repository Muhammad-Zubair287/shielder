import fs from 'fs';
import path from 'path';
import { env } from '@/config/env';
import type { StoredRef, StorageProvider, StoreBufferInput, StoreFileInput } from '../storage.types';

type ScopeConfig = {
  /**
   * Reference prefix persisted in DB (legacy compatible), e.g. "/uploads/products/"
   * or "/uploads/" for root-level logos.
   */
  publicRefPrefix: string;
  /**
   * Directory under the configured upload root where the file is written,
   * e.g. "products" or "".
   */
  physicalSubdir: string;
};

const getScopeConfig = (scope: string): ScopeConfig => {
  switch (scope) {
    case 'products':
      return { publicRefPrefix: '/uploads/products/', physicalSubdir: 'products' };
    case 'categories':
      return { publicRefPrefix: '/uploads/categories/', physicalSubdir: 'categories' };
    case 'profiles':
      return { publicRefPrefix: '/uploads/profile/', physicalSubdir: 'profile' };
    case 'applications':
      return { publicRefPrefix: '/uploads/applications/', physicalSubdir: 'applications' };
    case 'companyLogoRoot':
      return { publicRefPrefix: '/uploads/', physicalSubdir: '' };
    case 'contactAttachments':
      return { publicRefPrefix: '/uploads/contact/', physicalSubdir: 'contact' };
    default:
      return { publicRefPrefix: '/uploads/', physicalSubdir: '' };
  }
};

const normalizeRefToRelativePath = (ref: string): string => {
  const normalized = ref.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  // Accept both `/uploads/...` and `uploads/...` (legacy product refs omit leading slash).
  if (!normalized.startsWith('uploads/')) {
    throw new Error('Invalid storage ref (must start with /uploads/ or uploads/)');
  }
  return normalized.replace(/^uploads\//, '');
};

export class LocalStorageProvider implements StorageProvider {
  mode: 'local' = 'local';

  async storeBuffer(input: StoreBufferInput): Promise<StoredRef> {
    const { scope, buffer, extension, ownerId } = input;
    // contentType is intentionally ignored for local filesystem storage.
    const cfg = getScopeConfig(scope);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeOwner = ownerId ? ownerId.replace(/[^a-zA-Z0-9_-]/g, '-') : 'file';
    const fileName = `${safeOwner}-${uniqueSuffix}${extension}`;

    const physicalDir = path.resolve(process.cwd(), env.upload.uploadPath, cfg.physicalSubdir);
    fs.mkdirSync(physicalDir, { recursive: true });
    const absolutePath = path.join(physicalDir, fileName);
    fs.writeFileSync(absolutePath, buffer);

    const ref = `${cfg.publicRefPrefix}${fileName}`.replace(/\\/g, '/');
    const providerKey = normalizeRefToRelativePath(ref).replace(/\\/g, '/');

    return { ref, providerKey };
  }

  async storeFile(input: StoreFileInput): Promise<StoredRef> {
    const { scope, filePath, extension, ownerId } = input;
    const buffer = fs.readFileSync(filePath);
    return this.storeBuffer({ scope, buffer, contentType: input.contentType, extension, ownerId });
  }

  private isInsideUploadRoot(absolutePath: string): boolean {
    const uploadRootAbs = path.resolve(process.cwd(), env.upload.uploadPath);
    const absolute = path.resolve(absolutePath);
    return absolute === uploadRootAbs || absolute.startsWith(`${uploadRootAbs}${path.sep}`);
  }

  async deleteByRef(ref: string): Promise<boolean> {
    try {
      const relative = normalizeRefToRelativePath(ref);
      const absolute = path.resolve(process.cwd(), env.upload.uploadPath, relative);
      if (!this.isInsideUploadRoot(absolute)) return false;
      if (!fs.existsSync(absolute)) return false;
      // Refuse to follow symlinks outside the upload root.
      const real = fs.realpathSync(absolute);
      if (!this.isInsideUploadRoot(real)) return false;
      fs.unlinkSync(real);
      return true;
    } catch {
      return false;
    }
  }

  async existsByRef(ref: string): Promise<boolean> {
    try {
      const relative = normalizeRefToRelativePath(ref);
      const absolute = path.resolve(process.cwd(), env.upload.uploadPath, relative);
      if (!this.isInsideUploadRoot(absolute)) return false;
      return fs.existsSync(absolute);
    } catch {
      return false;
    }
  }

  refToProviderKey(ref: string): string {
    return normalizeRefToRelativePath(ref).replace(/\\/g, '/');
  }

  async getPrivateObjectStream(ref: string): Promise<{ contentType?: string; stream: any }> {
    const relative = normalizeRefToRelativePath(ref);
    const absolute = path.resolve(process.cwd(), env.upload.uploadPath, relative);
    if (!this.isInsideUploadRoot(absolute)) {
      throw new Error('Invalid storage ref.');
    }
    const real = fs.realpathSync(absolute);
    if (!this.isInsideUploadRoot(real)) {
      throw new Error('Invalid storage ref.');
    }

    const stream = fs.createReadStream(real);
    return { stream };
  }
}

