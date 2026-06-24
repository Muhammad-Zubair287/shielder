import fs from 'fs';
import path from 'path';
import { BadRequestError } from '../errors/api.error';

const PROFILE_IMAGE_RELATIVE_DIR = path.join('uploads', 'profile');
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

export const getProfileImageAbsoluteDir = (): string => {
  return path.resolve(process.cwd(), PROFILE_IMAGE_RELATIVE_DIR);
};

export const ensureProfileImageDir = (): string => {
  const absoluteDir = getProfileImageAbsoluteDir();
  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }
  return absoluteDir;
};

const detectImageKind = (buffer: Buffer): ProfileImageKind | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }

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

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: '.webp' };
  }

  return null;
};

const sanitizeFilePart = (value: string): string => {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'profile';
};

export const validateProfileImageFile = (file: Express.Multer.File): ProfileImageKind => {
  if (!file.buffer?.length) {
    throw new BadRequestError('Uploaded image is empty or unreadable.');
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
    throw new BadRequestError('Profile image must be 5MB or smaller.');
  }

  if (!ALLOWED_PROFILE_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestError('Invalid file type. Only JPG, JPEG, PNG and WEBP are allowed.');
  }

  const detectedKind = detectImageKind(file.buffer);
  if (!detectedKind) {
    throw new BadRequestError('Invalid or corrupted image file.');
  }

  const normalizedMimeType = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
  if (normalizedMimeType !== detectedKind.mimeType) {
    throw new BadRequestError('Uploaded file content does not match its image type.');
  }

  return detectedKind;
};

export const storeProfileImageFile = async (
  file: Express.Multer.File,
  userId: string,
): Promise<StoredProfileImage> => {
  const imageKind = validateProfileImageFile(file);
  const absoluteDir = ensureProfileImageDir();
  const safeUserId = sanitizeFilePart(userId);
  const fileName = `${safeUserId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${imageKind.extension}`;
  const absolutePath = path.join(absoluteDir, fileName);

  fs.writeFileSync(absolutePath, file.buffer);

  return {
    path: `/${path.join(PROFILE_IMAGE_RELATIVE_DIR, fileName).replace(/\\/g, '/')}`,
  };
};

export const deleteLocalProfileImageFile = (imagePath?: string | null): void => {
  if (!imagePath) return;

  const normalized = imagePath.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized.startsWith('uploads/profile/')) return;

  const absolutePath = path.resolve(process.cwd(), normalized);
  const uploadDir = getProfileImageAbsoluteDir();
  if (!absolutePath.startsWith(`${uploadDir}${path.sep}`)) return;

  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch {
    // Best-effort cleanup only; a failed delete should not break profile updates.
  }
};
