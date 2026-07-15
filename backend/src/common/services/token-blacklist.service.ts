import { redisCacheService } from './redis-cache.service';
import { logger } from '@/common/logger/logger';

const PREFIX = 'token_bl:';

class TokenBlacklistService {
  /**
   * Blacklist a JWT access token by its JTI until it naturally expires.
   * Returns true if successfully written to Redis, false if Redis is unavailable.
   */
  async blacklist(jti: string, ttlSeconds: number): Promise<boolean> {
    if (ttlSeconds <= 0) return true; // already expired — nothing to blacklist
    try {
      return await redisCacheService.setJson(`${PREFIX}${jti}`, 1, ttlSeconds);
    } catch {
      logger.warn(`TokenBlacklist: failed to blacklist jti=${jti}`);
      return false;
    }
  }

  /**
   * Check whether a JTI has been blacklisted (i.e. the token was explicitly revoked).
   * Returns false if Redis is unavailable — caller must fall back to DB tokenVersion check.
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    try {
      const val = await redisCacheService.getJson<number>(`${PREFIX}${jti}`);
      return val !== null;
    } catch {
      return false;
    }
  }
}

export const tokenBlacklistService = new TokenBlacklistService();
