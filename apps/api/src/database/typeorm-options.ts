import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { DatabaseConfig } from '../config/configuration';
import { entities } from './entities';

/**
 * 根据配置生成 TypeORM 连接参数。这里是「多数据库」的核心:
 * 业务代码完全不变, 仅靠 DB_TYPE 在 sqlite / mysql / postgres 之间切换。
 */
export function buildTypeOrmOptions(db: DatabaseConfig, migrationsGlob: string): DataSourceOptions {
  const common = {
    entities,
    migrations: [migrationsGlob],
    synchronize: db.synchronize,
    logging: db.logging,
  };

  switch (db.type) {
    case 'mysql':
      return {
        type: 'mysql',
        host: db.host,
        port: db.port,
        username: db.username,
        password: db.password,
        database: db.database,
        ...common,
      };
    case 'postgres':
      return {
        type: 'postgres',
        host: db.host,
        port: db.port,
        username: db.username,
        password: db.password,
        database: db.database,
        ...common,
      };
    case 'sqlite':
    default:
      return {
        type: 'sqlite',
        database: db.sqlitePath,
        ...common,
      };
  }
}

/** migration 编译产物在 dist 下的位置, 运行时用 */
export const RUNTIME_MIGRATIONS_GLOB = join(__dirname, 'migrations', '*.js');
