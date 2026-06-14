import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuditLogService } from './audit-log.service';
import { ConfigService } from './config.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { QueryLoginLogDto } from './dto/query-login-log.dto';
import { UpsertConfigDto } from './dto/upsert-config.dto';
import { LoginLogService } from './login-log.service';

@ApiTags('system')
@ApiBearerAuth()
@Controller('system')
export class SystemController {
  constructor(
    private readonly auditLogs: AuditLogService,
    private readonly loginLogs: LoginLogService,
    private readonly configs: ConfigService,
  ) {}

  @Get('audit-logs')
  @Permissions('system:read')
  @ApiOperation({ summary: '操作审计日志 (分页, 可按用户/动作过滤)' })
  listAuditLogs(@Query() q: QueryAuditLogDto) {
    return this.auditLogs.query({
      page: q.page,
      pageSize: q.pageSize,
      userId: q.userId,
      action: q.action,
    });
  }

  @Get('login-logs')
  @Permissions('system:read')
  @ApiOperation({ summary: '登录日志 (分页, 可按用户名/成败过滤)' })
  listLoginLogs(@Query() q: QueryLoginLogDto) {
    return this.loginLogs.query({
      page: q.page,
      pageSize: q.pageSize,
      username: q.username,
      success: q.success,
    });
  }

  @Get('configs')
  @Permissions('system:read')
  @ApiOperation({ summary: '系统配置列表 (可按分组过滤)' })
  listConfigs(@Query('group') group?: string) {
    return this.configs.list(group);
  }

  @Get('configs/:key')
  @Permissions('system:read')
  @ApiOperation({ summary: '读取单个配置项' })
  getConfig(@Param('key') key: string) {
    return this.configs.get(key);
  }

  @Put('configs/:key')
  @Permissions('system:write')
  @ApiOperation({ summary: '新增或更新配置项' })
  upsertConfig(@Param('key') key: string, @Body() dto: UpsertConfigDto) {
    return this.configs.upsert(key, dto);
  }

  @Delete('configs/:key')
  @Permissions('system:write')
  @ApiOperation({ summary: '删除配置项' })
  async removeConfig(@Param('key') key: string) {
    await this.configs.remove(key);
    return { removed: true };
  }
}
