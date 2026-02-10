/**
 * JWT Configuration
 * JWT token generation and verification utilities
 */

import jwt from 'jsonwebtoken';
import { env } from './env';
import { UserRole } from '../types/rbac.types';

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  preferredLanguage?: string;
}

/**
 * Generates an access token
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as string,
  } as jwt.SignOptions);
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
