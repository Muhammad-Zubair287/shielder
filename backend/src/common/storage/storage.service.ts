import type { StorageProvider, StorageScope, StoredRef, StoreFileInput } from './storage.types';
import type { ImageKind } from './image-validation.service';
import { validateImageBuffer } from './image-validation.service';
import { getStorageProvider } from './storage.factory';

export class StorageService {
  private provider: StorageProvider;

  constructor() {
    this.provider = getStorageProvider();
  }

  getProviderMode() {
    return this.provider.mode;
  }

  /**
   * Store a validated image (magic-bytes validated).
   * Returns a backend ref string (legacy `/uploads/...` shape).
   */
  async storeValidatedImage(input: {
    scope: StorageScope;
    buffer: Buffer;
    declaredMimeType?: string;
    extension: ImageKind['extension'];
    ownerId?: string;
  }): Promise<StoredRef> {
    const { scope, buffer, declaredMimeType, extension, ownerId } = input;
    // Centralized validation happens before passing to provider.
    validateImageBuffer({
      buffer,
      declaredMimeType,
      byteSize: buffer.length,
    });

    const storeResult = await this.provider.storeBuffer({
      scope,
      buffer,
      contentType: declaredMimeType || 'application/octet-stream',
      extension,
      ownerId,
    });

    return storeResult;
  }

  /**
   * Convenience method: validate image buffer and then store it.
   */
  async storeImageFromBuffer(input: {
    scope: StorageScope;
    buffer: Buffer;
    declaredMimeType?: string;
    ownerId?: string;
  }): Promise<StoredRef> {
    const kind = validateImageBuffer({
      buffer: input.buffer,
      declaredMimeType: input.declaredMimeType,
      byteSize: input.buffer.length,
    });

    return this.provider.storeBuffer({
      scope: input.scope,
      buffer: input.buffer,
      contentType: input.declaredMimeType || kind.mimeType,
      extension: kind.extension,
      ownerId: input.ownerId,
    });
  }

  async storeFileFromBuffer(input: {
    scope: StorageScope;
    buffer: Buffer;
    contentType: string;
    extension: string;
    ownerId?: string;
  }): Promise<StoredRef> {
    return this.provider.storeBuffer({
      scope: input.scope,
      buffer: input.buffer,
      contentType: input.contentType,
      extension: input.extension,
      ownerId: input.ownerId,
    });
  }

  async storeFileFromPath(input: StoreFileInput): Promise<StoredRef> {
    return this.provider.storeFile(input);
  }

  async deleteByRef(ref: string): Promise<boolean> {
    return this.provider.deleteByRef(ref);
  }

  async existsByRef(ref: string): Promise<boolean> {
    return this.provider.existsByRef(ref);
  }

  refToProviderKey(ref: string): string {
    return this.provider.refToProviderKey(ref);
  }

  async getPrivateObjectStream(ref: string): Promise<{ contentType?: string; stream: NodeJS.ReadableStream }> {
    if (!this.provider.getPrivateObjectStream) {
      throw new Error('Private object streaming is not supported by the active storage provider.');
    }
    return this.provider.getPrivateObjectStream(ref);
  }
}

export const storageService = new StorageService();

