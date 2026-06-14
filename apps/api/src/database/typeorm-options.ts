import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { DatabaseConfig } from '../config/configuration';
import { entities } from './entities';

/**
 * 根据配置生成 TypeORM 连接参数。这里是「多数据库」的核心:
 * 业务代码完全不变, 仅靠 DB_TYPE 在各数据库之间切换。
 *
 * 支持: sqlite / better-sqlite3 / mysql / mariadb / postgres /
 *       cockroachdb / mssql / oracle
 *
 * 注意: 对应数据库的驱动包按需安装 (见 .env.example / README), 例如
 *   mysql|mariadb -> mysql2, postgres|cockroachdb -> pg,
 *   mssql -> mssql, oracle -> oracledb, better-sqlite3 -> better-sqlite3
 */
export function buildTypeOrmOptions(db: DatabaseConfig, migrationsGlob: string): DataSourceOptions {
  const common = {
    entities,
    migrations: [migrationsGlob],
    synchronize: db.synchronize,
    logging: db.logging,
  };

  // 基于 host/port 的服务器型连接 (mysql/mariadb/postgres/cockroachdb/oracle)
  const server = {
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
  };

  switch (db.type) {
    case 'mysql':
    case 'mariadb':
      return { type: db.type, ...server, ...common };

    case 'postgres':
      return { type: 'postgres', ...server, schema: db.schema, ...common };

    case 'cockroachdb':
      return {
        type: 'cockroachdb',
        ...server,
        schema: db.schema,
        timeTravelQueries: false,
        ...common,
      };

    case 'mssql':
      return {
        type: 'mssql',
        ...server,
        schema: db.schema,
        options: { encrypt: db.mssqlEncrypt, trustServerCertificate: !db.mssqlEncrypt },
        ...common,
      };

    case 'oracle':
      return { type: 'oracle', ...server, ...common };

    case 'better-sqlite3':
      return { type: 'better-sqlite3', database: db.sqlitePath, ...common };

    case 'sqlite':
      return { type: 'sqlite', database: db.sqlitePath, ...common };

    default:
      throw new Error(
        `Unsupported DB_TYPE: "${db.type}". Must be one of: sqlite, better-sqlite3, mysql, mariadb, postgres, cockroachdb, mssql, oracle.`,
      );
  }
}

/** migration 编译产物在 dist 下的位置, 运行时用 */
export const RUNTIME_MIGRATIONS_GLOB = join(__dirname, 'migrations', '*.js');
