import jwt from 'jsonwebtoken';
import { BadRequestError } from '@/common/errors/api.error';
import { env } from '@/config/env';

export type PrivateUrlPayload = {
  ref: string;
};

export const createPrivateAccessToken = (payload: PrivateUrlPayload): string => {
  if (!env.storage.privateUrlSigningSecret) {
    // This should only be hit in local dev without config; fail safe.
    throw new Error('Private URL signing secret is not configured.');
  }

  return jwt.sign(payload, env.storage.privateUrlSigningSecret, {
    expiresIn: env.storage.privateUrlTtlSeconds,
  });
};

export const verifyPrivateAccessToken = (token: string): PrivateUrlPayload => {
  if (!env.storage.privateUrlSigningSecret) {
    throw new BadRequestError('storage.uploadFailed');
  }

  try {
    const decoded = jwt.verify(token, env.storage.privateUrlSigningSecret) as PrivateUrlPayload;
    if (!decoded?.ref || typeof decoded.ref !== 'string') {
      throw new BadRequestError('storage.privateInvalidToken');
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new BadRequestError('storage.privateExpired');
    }
    throw new BadRequestError('storage.privateInvalidToken');
  }
};

