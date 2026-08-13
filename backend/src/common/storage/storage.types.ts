export type StorageProviderMode = 'local' | 's3';

export type StorageScope =
  | 'products'
  | 'categories'
  | 'profiles'
  | 'applications'
  | 'companyLogoRoot'
  | 'contactAttachments';

export type StoredRef = {
  /**
   * Backend-controlled reference persisted in DB, typically in the legacy
   * format: `/uploads/<...>`.
   */
  ref: string;

  /**
   * Provider-internal key for deleting from object storage when needed.
   * For local storage, this is derived from `ref`.
   */
  providerKey: string;
};

export type StoreBufferInput = {
  scope: StorageScope;
  buffer: Buffer;
  contentType: string;
  extension: string; // includes leading dot (e.g. ".jpg")
  /**
   * Optional business identifier used only to make filenames deterministic-ish.
   * Never derived from raw client filename.
   */
  ownerId?: string;
};

export type StoreFileInput = {
  scope: StorageScope;
  filePath: string; // backend-only path (must already be validated)
  contentType: string;
  extension: string;
  ownerId?: string;
};

export type StorageProvider = {
  mode: StorageProviderMode;
  storeBuffer(input: StoreBufferInput): Promise<StoredRef>;
  storeFile(input: StoreFileInput): Promise<StoredRef>;
  deleteByRef(ref: string): Promise<boolean>;
  existsByRef(ref: string): Promise<boolean>;
  /**
   * For signed/private URL generation, providers need to map `ref` to their
   * internal providerKey.
   */
  refToProviderKey(ref: string): string;

  /**
   * Streams an object for private access (used by backend controller).
   * Implementations must not expose provider credentials.
   */
  getPrivateObjectStream?(ref: string): Promise<{ contentType?: string; stream: any }>;
};

