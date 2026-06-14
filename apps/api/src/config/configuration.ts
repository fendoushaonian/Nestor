export type DatabaseType =
  | 'sqlite'
  | 'better-sqlite3'
  | 'mysql'
  | 'mariadb'
  | 'postgres'
  | 'cockroachdb'
  | 'mssql'
  | 'oracle';

export interface AppConfig {
  env: string;
  port: number;
  prefix: string;
  swaggerEnabled: boolean;
  // 允许的跨域来源, 空数组表示不限制 (仅开发期)
  corsOrigins: string[];
}

export interface DatabaseConfig {
  type: DatabaseType;
  sqlitePath: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  // schema 名 (postgres/cockroachdb/mssql 可用), 留空用驱动默认
  schema?: string;
  // mssql 是否启用 TLS 加密 (Azure SQL 通常需要)
  mssqlEncrypt: boolean;
  logging: boolean;
  synchronize: boolean;
  // 启动时是否自动执行 migration
  migrationsRun: boolean;
}

export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
}

const toBool = (v: string | undefined, fallback = false): boolean =>
  v === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());

const toInt = (v: string | undefined, fallback: number): number => {
  if (v === undefined || v.trim() === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toList = (v: string | undefined): string[] =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const DB_TYPES: readonly DatabaseType[] = [
  'sqlite',
  'better-sqlite3',
  'mysql',
  'mariadb',
  'postgres',
  'cockroachdb',
  'mssql',
  'oracle',
];

const toDbType = (v: string | undefined): DatabaseType => {
  const value = (v ?? 'sqlite').trim();
  if (!DB_TYPES.includes(value as DatabaseType)) {
    throw new Error(`Unsupported DB_TYPE: "${v}". Must be one of: ${DB_TYPES.join(', ')}.`);
  }
  return value as DatabaseType;
};

export default (): Configuration => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: toInt(process.env.APP_PORT, 3000),
    prefix: process.env.APP_PREFIX ?? 'api',
    swaggerEnabled: toBool(process.env.SWAGGER_ENABLED, true),
    corsOrigins: toList(process.env.CORS_ORIGINS),
  },
  database: {
    type: toDbType(process.env.DB_TYPE),
    sqlitePath: process.env.DB_SQLITE_PATH ?? './data/nestor.sqlite',
    host: process.env.DB_HOST ?? 'localhost',
    port: toInt(process.env.DB_PORT, 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'nestor',
    schema: process.env.DB_SCHEMA,
    mssqlEncrypt: toBool(process.env.DB_MSSQL_ENCRYPT, true),
    logging: toBool(process.env.DB_LOGGING, false),
    synchronize: toBool(process.env.DB_SYNCHRONIZE, false),
    migrationsRun: toBool(process.env.DB_MIGRATIONS_RUN, true),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});
