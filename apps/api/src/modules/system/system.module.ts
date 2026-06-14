import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogService } from './audit-log.service';
import { ConfigService } from './config.service';
import { AuditLog } from './entities/audit-log.entity';
import { Config } from './entities/config.entity';
import { LoginLog } from './entities/login-log.entity';
import { LoginLogService } from './login-log.service';
import { SystemController } from './system.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, LoginLog, Config])],
  controllers: [SystemController],
  providers: [AuditLogService, LoginLogService, ConfigService],
  exports: [AuditLogService, LoginLogService, ConfigService],
})
export class SystemModule {}
