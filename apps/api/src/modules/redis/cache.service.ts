import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * 通用缓存服务, 对业务层屏蔽底层 Redis。
 * Redis 未启用 (REDIS_ENABLED=false) 时所有方法安全降级为空操作,
 * 这样业务代码无需到处判断 Redis 是否可用。
 */
@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis | null) {}

  get available(): boolean {
    return this.client !== null;
  }

  /** 取值并反序列化为对象; 不存在或未启用返回 null。 */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const raw = await this.client.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }

  /** 存值 (自动 JSON 序列化), ttlSeconds 给定时设置过期。 */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    const raw = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, raw, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, raw);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) return;
    await this.client.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    return (await this.client.exists(key)) === 1;
  }

  /**
   * 原子自增 (用于限流/计数), 首次写入时设置过期。
   * 未启用 Redis 时返回 -1 表示不可用。
   */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    if (!this.client) return -1;
    const n = await this.client.incr(key);
    if (n === 1 && ttlSeconds > 0) {
      await this.client.expire(key, ttlSeconds);
    }
    return n;
  }

  /** 暴露原始客户端供高级用法 (如分布式锁); 未启用时为 null。 */
  get raw(): Redis | null {
    return this.client;
  }
}
