import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @SkipTransform()
  @ApiOperation({ summary: '健康检查 (含数据库连通性)' })
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
