/**
 * JWT Configuration
 * JWT token generation and verification utilities
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from './env';
import { UserRole } from '../types/rbac.types';

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  jti: string;        // unique token ID — used for per-token blacklisting on logout
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
  preferredLanguage?: string;
  exp?: number;       // standard JWT claim — populated by jsonwebtoken on sign/verify
}

/**
 * Generates an access token — embeds a unique jti for blacklisting on logout.
 */
export const generateAccessToken = (payload: Omit<JWTPayload, 'jti' | 'exp'>): string => {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn as string } as jwt.SignOptions,
  );
};

/**
 * Generates a refresh token
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as string,
  } as jwt.SignOptions);
};

/**
 * Verifies an access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, env.jwt.secret) as JWTPayload;
};

/**
 * Verifies a refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, env.jwt.refreshSecret) as JWTPayload;
};

/**
 * Generates both access and refresh tokens
 */
export const generateTokenPair = (
  payload: JWTPayload
): { accessToken: string; refreshToken: string } => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
};
