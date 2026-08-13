import { BadRequestError } from '@/common/errors/api.error';
import { env } from '@/config/env';

export type ImageKind = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: '.jpg' | '.png' | '.webp';
};

export const detectImageKindFromMagicBytes = (buffer: Buffer): ImageKind | null => {
  if (!buffer) return null;

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: '.png' };
  }

  // WEBP: "RIFF"...."WEBP"
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: '.webp' };
  }

  return null;
};

export const validateImageBuffer = (input: {
  buffer: Buffer;
  declaredMimeType?: string;
  byteSize: number;
  allowedMimeTypes?: string[];
  maxBytes?: number;
}): ImageKind => {
  const { buffer, byteSize, declaredMimeType, allowedMimeTypes, maxBytes } = input;

  if (!buffer || buffer.length === 0) {
    throw new BadRequestError('storage.imageEmptyOrUnreadable');
  }
  const effectiveMaxBytes = maxBytes ?? env.storage.imageMaxFileSize;
  if (byteSize > effectiveMaxBytes) {
    throw new BadRequestError('storage.imageTooLarge');
  }

  const normalizedDeclaredMimeType =
    declaredMimeType === 'image/jpg' ? 'image/jpeg' : declaredMimeType;

  // Keep a light "mimetype allowlist" check, but final acceptance depends on magic bytes.
  const effectiveAllowedMimeTypes = allowedMimeTypes ?? env.storage.allowedImageMimeTypes;
  if (
    normalizedDeclaredMimeType &&
    !effectiveAllowedMimeTypes.some((allowed) => allowed === normalizedDeclaredMimeType)
  ) {
    throw new BadRequestError('storage.imageInvalidType');
  }

  const kind = detectImageKindFromMagicBytes(buffer);
  if (!kind) {
    throw new BadRequestError('storage.imageInvalidMagicBytes');
  }

  // Preserve existing stronger behavior: ensure declared mime matches detected magic bytes.
  if (
    normalizedDeclaredMimeType &&
    normalizedDeclaredMimeType !== kind.mimeType
  ) {
    throw new BadRequestError('storage.imageTypeMismatch');
  }

  return kind;
};

