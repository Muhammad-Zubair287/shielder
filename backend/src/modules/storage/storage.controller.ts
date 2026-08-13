import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { BadRequestError, NotFoundError } from '@/common/errors/api.error';
import { storageService } from '@/common/storage/storage.service';
import { verifyPrivateAccessToken } from '@/common/storage/private-url.service';

const getContentTypeFromExtension = (ref: string): string | undefined => {
  const ext = path.extname(ref).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.pdf') return 'application/pdf';
  return undefined;
};

export class StorageController {
  async streamPrivateObject(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params as { token: string };
      const payload = verifyPrivateAccessToken(token);
      const ref = payload.ref;

      if (!ref || typeof ref !== 'string') {
        throw new BadRequestError('storage.privateInvalidToken');
      }
      if (!ref.startsWith('/uploads/')) {
        // Never allow arbitrary filesystem/object paths.
        throw new BadRequestError('storage.privateInvalidRef');
      }

      // Private streaming endpoint is only for private scopes.
      const isPrivateScope =
        ref.startsWith('/uploads/profile/') ||
        ref.startsWith('/uploads/contact/');
      if (!isPrivateScope) {
        throw new BadRequestError('storage.privateInvalidRef');
      }

      const streamResult = await storageService.getPrivateObjectStream(ref);
      const contentType = streamResult.contentType || getContentTypeFromExtension(ref);
      if (!contentType) res.setHeader('Content-Type', 'application/octet-stream');
      else res.setHeader('Content-Type', contentType);

      streamResult.stream.on('error', () => {
        next(new NotFoundError('storage.fileNotFound'));
      });
      return streamResult.stream.pipe(res);
    } catch (err: unknown) {
      return next(err);
    }
  }
}

export const storageController = new StorageController();

