import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { Configuration } from '../../config/configuration';
import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './redis.constants';
import { RedisHealthIndicator } from './redis.health';

/**
 * 全局 Redis 模块。REDIS_ENABLED=true 时创建 ioredis 客户端,
 * 否则注入 null, 由 CacheService 统一降级处理。
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Configuration, true>): Redis | null => {
        const cfg = config.get('redis', { infer: true });
        if (!cfg.enabled) {
          return null;
        }
        const logger = new Logger('RedisModule');
        const client = new Redis({
          host: cfg.host,
          port: cfg.port,
          password: cfg.password,
          db: cfg.db,
          keyPrefix: cfg.keyPrefix,
          maxRetriesPerRequest: 2,
          lazyConnect: false,
        });
        client.on('error', (err) => logger.error(`Redis 连接错误: ${err.message}`));
        client.on('connect', () => logger.log(`Redis 已连接 ${cfg.host}:${cfg.port}`));
        return client;
      },
    },
    CacheService,
    RedisHealthIndicator,
  ],
  exports: [REDIS_CLIENT, CacheService, RedisHealthIndicator],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly cache: CacheService) {}

  async onApplicationShutdown(): Promise<void> {
    await this.cache.raw?.quit();
  }
}
