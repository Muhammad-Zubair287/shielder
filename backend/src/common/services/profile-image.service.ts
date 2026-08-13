import { storageService } from '@/common/storage/storage.service';
import { validateImageBuffer } from '@/common/storage/image-validation.service';

const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

type ProfileImageKind = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: '.jpg' | '.png' | '.webp';
};

export type StoredProfileImage = {
  path: string;
};

export const getAllowedProfileImageMimeTypes = (): string[] => [...ALLOWED_PROFILE_IMAGE_MIME_TYPES];

export const getMaxProfileImageSizeBytes = (): number => MAX_PROFILE_IMAGE_SIZE_BYTES;

export const validateProfileImageFile = (file: Express.Multer.File): ProfileImageKind => {
  return validateImageBuffer({
    buffer: file.buffer as Buffer,
    declaredMimeType: file.mimetype,
    byteSize: file.size,
    allowedMimeTypes: ALLOWED_PROFILE_IMAGE_MIME_TYPES,
    maxBytes: MAX_PROFILE_IMAGE_SIZE_BYTES,
  }) as ProfileImageKind;
};

export const storeProfileImageFile = async (
  file: Express.Multer.File,
  userId: string,
): Promise<StoredProfileImage> => {
  const imageKind = validateProfileImageFile(file);
  const stored = await storageService.storeFileFromBuffer({
    scope: 'profiles',
    buffer: file.buffer as Buffer,
    contentType: file.mimetype,
    extension: imageKind.extension,
    ownerId: userId,
  });

  return { path: stored.ref };
};

export const deleteLocalProfileImageFile = (imagePath?: string | null): void => {
  if (!imagePath) return;

  // Best-effort idempotent delete.
  if (!imagePath.startsWith('/uploads/profile/')) return;
  void storageService.deleteByRef(imagePath);
};
