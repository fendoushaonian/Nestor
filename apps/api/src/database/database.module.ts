import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Configuration } from '../config/configuration';
import { buildTypeOrmOptions, RUNTIME_MIGRATIONS_GLOB } from './typeorm-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Configuration, true>) => {
        const db = config.get('database', { infer: true });
        return {
          ...buildTypeOrmOptions(db, RUNTIME_MIGRATIONS_GLOB),
          // 是否在启动时自动执行 migration (内置迁移仅针对 sqlite,
          // 切换到 mysql/postgres 时应重新生成迁移并按需开关此项)
          migrationsRun: db.migrationsRun,
          autoLoadEntities: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
