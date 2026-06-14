import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { AppController } from './app.controller';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { CardModule } from './modules/card/card.module';
import { HealthModule } from './modules/health/health.module';
import { MongoModule } from './modules/mongo/mongo.module';
import { RedisModule } from './modules/redis/redis.module';
import { SystemModule } from './modules/system/system.module';
import { WorkflowModule } from './modules/workflow/workflow.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      // 兼容从仓库根目录或 apps/api 目录启动两种情况
      envFilePath: [join(process.cwd(), '.env'), join(process.cwd(), '..', '..', '.env')],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) => (req.headers['x-request-id'] as string) ?? uuidv4(),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: true,
        customProps: (req) => ({ traceId: (req as { id?: string }).id }),
      },
    }),
    DatabaseModule,
    RedisModule,
    MongoModule.forRoot(),
    HealthModule,
    AuthModule,
    CardModule,
    SystemModule,
    WorkflowModule,
  ],
  controllers: [AppController],
  providers: [
    // 全局守卫顺序: 先登录鉴权, 再角色, 再权限
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
