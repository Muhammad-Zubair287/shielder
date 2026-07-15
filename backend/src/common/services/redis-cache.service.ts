import { createClient, type RedisClientType } from 'redis';
import { env } from '@/config/env';
import { logger } from '@/common/logger/logger';

class RedisCacheService {
  private client: RedisClientType | null = null;
  private connecting: Promise<boolean> | null = null;

  private async ensureClient(): Promise<boolean> {
    if (this.client?.isReady) {
      return true;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = (async () => {
      try {
        if (!env.redis.url) {
          return false;
        }

        this.client = createClient({
          url: env.redis.url,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 5) return false;
              return Math.min(retries * 100, 1000);
            },
          },
        });

        this.client.on('error', (error) => {
          logger.warn('Redis cache client error; falling back to DB.', {
            message: error?.message,
          });
        });

        await this.client.connect();
        logger.info('Redis cache connected successfully.');
        return true;
      } catch (error) {
        logger.warn('Redis unavailable; cache disabled for this runtime.', {
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        this.client = null;
        return false;
      } finally {
        this.connecting = null;
      }
    })();

    return this.connecting;
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!(await this.ensureClient()) || !this.client) {
      return null;
    }

    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      logger.warn('Redis getJson failed; returning cache miss.', {
        key,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
    if (!(await this.ensureClient()) || !this.client) {
      return false;
    }

    try {
      await this.client.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
      return true;
    } catch (error) {
      logger.warn('Redis setJson failed; cache write skipped.', {
        key,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async del(key: string): Promise<void> {
    if (!(await this.ensureClient()) || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      logger.warn('Redis del failed.', {
        key,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (!(await this.ensureClient()) || !this.client) {
      return;
    }

    try {
      const keys: string[] = [];
      for await (const key of this.client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
        if (Array.isArray(key)) {
          keys.push(...key);
        } else {
          keys.push(String(key));
        }
      }

      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.warn('Redis delByPrefix failed.', {
        prefix,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const redisCacheService = new RedisCacheService();
export default redisCacheService;
