import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected');
    });
  }

  async onModuleInit() {
    // Redis 连接在构造函数中已初始化
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * 生成缓存键
   */
  private generateKey(prefix: string, data: string): string {
    // 使用 SHA-256 哈希生成固定长度的键
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `cache:${prefix}:${hash}`;
  }

  /**
   * 获取缓存值
   */
  async get<T>(prefix: string, key: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(prefix, key);
      const value = await this.redis.get(cacheKey);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Cache get error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // 缓存失败不影响主流程，返回 null
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set(
    prefix: string,
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.generateKey(prefix, key);
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(cacheKey, ttlSeconds, serialized);
      } else {
        await this.redis.set(cacheKey, serialized);
      }
    } catch (error) {
      this.logger.error(
        `Cache set error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // 缓存失败不影响主流程，静默失败
    }
  }

  /**
   * 删除缓存
   */
  async delete(prefix: string, key: string): Promise<void> {
    try {
      const cacheKey = this.generateKey(prefix, key);
      await this.redis.del(cacheKey);
    } catch (error) {
      this.logger.error(
        `Cache delete error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(prefix: string, key: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(prefix, key);
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      this.logger.error(
        `Cache exists error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * 获取 Redis 客户端（用于高级操作）
   */
  getClient(): Redis {
    return this.redis;
  }
}

