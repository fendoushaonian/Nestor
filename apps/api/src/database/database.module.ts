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
          // 应用启动时自动执行已生成的 migration
          migrationsRun: true,
          autoLoadEntities: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
