export type DatabaseType = 'sqlite' | 'mysql' | 'postgres';

export interface AppConfig {
  env: string;
  port: number;
  prefix: string;
  swaggerEnabled: boolean;
}

export interface DatabaseConfig {
  type: DatabaseType;
  sqlitePath: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  logging: boolean;
  synchronize: boolean;
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
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export default (): Configuration => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: toInt(process.env.APP_PORT, 3000),
    prefix: process.env.APP_PREFIX ?? 'api',
    swaggerEnabled: toBool(process.env.SWAGGER_ENABLED, true),
  },
  database: {
    type: (process.env.DB_TYPE as DatabaseType) ?? 'sqlite',
    sqlitePath: process.env.DB_SQLITE_PATH ?? './data/nestor.sqlite',
    host: process.env.DB_HOST ?? 'localhost',
    port: toInt(process.env.DB_PORT, 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'nestor',
    logging: toBool(process.env.DB_LOGGING, false),
    synchronize: toBool(process.env.DB_SYNCHRONIZE, false),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});
