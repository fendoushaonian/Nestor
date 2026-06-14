import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
  MongooseHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { Configuration } from '../../config/configuration';
import { RedisHealthIndicator } from '../redis/redis.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly config: ConfigService<Configuration, true>,
  ) {}

  @Get()
  @HealthCheck()
  @SkipTransform()
  @ApiOperation({ summary: '健康检查 (含数据库 / Redis / MongoDB 连通性)' })
  check() {
    const checks: HealthIndicatorFunction[] = [() => this.db.pingCheck('database')];

    // 仅在启用对应组件时才纳入探测, 未启用不影响整体健康状态
    if (this.config.get('redis', { infer: true }).enabled) {
      checks.push(() => this.redis.ping('redis'));
    }
    if (this.config.get('mongo', { infer: true }).enabled) {
      checks.push(() => this.mongoose.pingCheck('mongodb'));
    }

    return this.health.check(checks);
  }
}
