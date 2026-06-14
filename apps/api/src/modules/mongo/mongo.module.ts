import { DynamicModule, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Configuration } from '../../config/configuration';

/**
 * MongoDB 文档数据层 (与关系型数据库并存)。
 * 仅在 MONGO_ENABLED=true 时建立连接, 否则返回空模块、完全不连接。
 *
 * 用法: 在各业务模块里用 `MongooseModule.forFeature([...])` 注册 schema,
 * 适合存放日志、事件、行为埋点等文档型数据。
 */
@Module({})
export class MongoModule {
  static forRoot(): DynamicModule {
    const enabled = ['1', 'true', 'yes', 'on'].includes(
      (process.env.MONGO_ENABLED ?? '').toLowerCase(),
    );

    if (!enabled) {
      return { module: MongoModule };
    }

    return {
      module: MongoModule,
      imports: [
        MongooseModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService<Configuration, true>) => {
            const cfg = config.get('mongo', { infer: true });
            new Logger('MongoModule').log(`MongoDB 连接: ${cfg.uri}`);
            return { uri: cfg.uri };
          },
        }),
      ],
    };
  }
}
