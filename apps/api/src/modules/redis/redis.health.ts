import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/** Redis 健康探针: 启用时执行 PING, 未启用时直接报告 disabled。 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis | null) {
    super();
  }

  async ping(key = 'redis'): Promise<HealthIndicatorResult> {
    if (!this.client) {
      return this.getStatus(key, true, { enabled: false });
    }
    try {
      const pong = await this.client.ping();
      return this.getStatus(key, pong === 'PONG', { enabled: true });
    } catch (err) {
      throw new HealthCheckError(
        'Redis ping failed',
        this.getStatus(key, false, {
          enabled: true,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
