import multer from 'multer';
import { ApiError } from '../errors/api.error';
import { env } from '@/config/env';

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowedTypes: readonly string[] = env.storage.allowedImageMimeTypes;
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    // Multer FileFilterCallback accepts either (null, accept) or (Error).
    cb(new ApiError('storage.imageInvalidType', 400));
  },
  limits: {
    fileSize: env.storage.imageMaxFileSize,
  },
});
