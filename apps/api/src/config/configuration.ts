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

export interface RedisConfig {
  // 关闭时整个 Redis 能力降级为空操作, 不影响应用启动
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  db: number;
  // 所有 key 自动加的前缀, 便于多环境/多项目共用一个实例
  keyPrefix: string;
}

export interface MongoConfig {
  // 关闭时不建立 MongoDB 连接
  enabled: boolean;
  uri: string;
}

/** 标准 OAuth2 授权码 provider 配置(Google / GitHub / 微信)。 */
export interface OAuthProviderConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  /** 回调地址, 必须与各平台后台登记的一致 */
  redirectUri: string;
}

/** Apple Sign in 需要用 .p8 私钥(ES256)动态签出 client_secret。 */
export interface AppleOAuthConfig {
  enabled: boolean;
  /** Services ID, 作为 client_id */
  clientId: string;
  teamId: string;
  keyId: string;
  /** .p8 私钥内容(PEM), 可用 \n 转义换行 */
  privateKey: string;
  redirectUri: string;
}

export interface OAuthConfig {
  /** 成功后回跳前端地址(可选): 命中时 callback 以 302 带 token 跳转, 否则返回 JSON */
  successRedirect?: string;
  google: OAuthProviderConfig;
  github: OAuthProviderConfig;
  wechat: OAuthProviderConfig;
  apple: AppleOAuthConfig;
}

export interface WorkflowConfig {
  /** 凭证加密密钥 (AES-256-GCM, 任意长度自动 sha256 规整) */
  encryptionKey: string;
}

/** 全局接口限流 (基于 @nestjs/throttler)。 */
export interface ThrottleConfig {
  enabled: boolean;
  /** 时间窗口 (毫秒) */
  ttl: number;
  /** 窗口内允许的最大请求数 */
  limit: number;
}

/** 登录安全: 图形验证码 + 失败锁定。 */
export interface SecurityConfig {
  captcha: {
    enabled: boolean;
    /** 为 true 时每次登录都要验证码; 否则仅在失败达 captchaAfter 后要求 */
    alwaysOnLogin: boolean;
  };
  lockout: {
    /** 失败达到该次数后, 登录开始要求图形验证码 */
    captchaAfter: number;
    /** 失败达到该次数后, 在 durationSec 内锁定账号 */
    maxFailures: number;
    /** 锁定/失败计数窗口时长 (秒) */
    durationSec: number;
  };
}

export type StorageDriver = 'local' | 's3' | 'oss';

/** 文件存储: 本地磁盘 / S3 兼容 / 阿里云 OSS。 */
export interface StorageConfig {
  driver: StorageDriver;
  /** 单文件大小上限 (字节) */
  maxFileSize: number;
  /** 允许的 MIME 类型; 空数组表示不限制 */
  allowedMimeTypes: string[];
  local: {
    /** 落盘目录 */
    dir: string;
    /** 对外访问前缀 (绝对 URL 或以 / 开头的路径), 末尾不含斜杠 */
    publicBaseUrl: string;
  };
  s3: {
    /** S3 兼容服务端点 (MinIO 等需要; AWS 留空走默认) */
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    /** 自定义/CDN 访问域名; 留空则按 endpoint/region 推导 */
    publicBaseUrl?: string;
    /** MinIO 等需 path-style 寻址 */
    forcePathStyle: boolean;
  };
  oss: {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    endpoint?: string;
    /** 自定义/CDN 访问域名; 留空则用 OSS 默认域名 */
    publicBaseUrl?: string;
  };
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  redis: RedisConfig;
  mongo: MongoConfig;
  oauth: OAuthConfig;
  workflow: WorkflowConfig;
  throttle: ThrottleConfig;
  security: SecurityConfig;
  storage: StorageConfig;
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

const STORAGE_DRIVERS: readonly StorageDriver[] = ['local', 's3', 'oss'];

const toStorageDriver = (v: string | undefined): StorageDriver => {
  const value = (v ?? 'local').trim();
  if (!STORAGE_DRIVERS.includes(value as StorageDriver)) {
    throw new Error(`Unsupported STORAGE_DRIVER: "${v}". Must be one of: ${STORAGE_DRIVERS.join(', ')}.`);
  }
  return value as StorageDriver;
};

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
  redis: {
    enabled: toBool(process.env.REDIS_ENABLED, false),
    host: process.env.REDIS_HOST ?? 'localhost',
    port: toInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: toInt(process.env.REDIS_DB, 0),
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'nestor:',
  },
  mongo: {
    enabled: toBool(process.env.MONGO_ENABLED, false),
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/nestor',
  },
  oauth: {
    successRedirect: process.env.OAUTH_SUCCESS_REDIRECT || undefined,
    google: {
      enabled: toBool(process.env.OAUTH_GOOGLE_ENABLED, false),
      clientId: process.env.OAUTH_GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET ?? '',
      redirectUri: process.env.OAUTH_GOOGLE_REDIRECT_URI ?? '',
    },
    github: {
      enabled: toBool(process.env.OAUTH_GITHUB_ENABLED, false),
      clientId: process.env.OAUTH_GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET ?? '',
      redirectUri: process.env.OAUTH_GITHUB_REDIRECT_URI ?? '',
    },
    wechat: {
      enabled: toBool(process.env.OAUTH_WECHAT_ENABLED, false),
      clientId: process.env.OAUTH_WECHAT_APP_ID ?? '',
      clientSecret: process.env.OAUTH_WECHAT_APP_SECRET ?? '',
      redirectUri: process.env.OAUTH_WECHAT_REDIRECT_URI ?? '',
    },
    apple: {
      enabled: toBool(process.env.OAUTH_APPLE_ENABLED, false),
      clientId: process.env.OAUTH_APPLE_CLIENT_ID ?? '',
      teamId: process.env.OAUTH_APPLE_TEAM_ID ?? '',
      keyId: process.env.OAUTH_APPLE_KEY_ID ?? '',
      privateKey: (process.env.OAUTH_APPLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
      redirectUri: process.env.OAUTH_APPLE_REDIRECT_URI ?? '',
    },
  },
  workflow: {
    encryptionKey:
      process.env.CREDENTIAL_ENCRYPTION_KEY ||
      process.env.JWT_ACCESS_SECRET ||
      'change-me-credential-key',
  },
  throttle: {
    enabled: toBool(process.env.THROTTLE_ENABLED, true),
    ttl: toInt(process.env.THROTTLE_TTL, 60_000),
    limit: toInt(process.env.THROTTLE_LIMIT, 120),
  },
  security: {
    captcha: {
      enabled: toBool(process.env.SECURITY_CAPTCHA_ENABLED, true),
      alwaysOnLogin: toBool(process.env.SECURITY_CAPTCHA_ALWAYS, false),
    },
    lockout: {
      captchaAfter: toInt(process.env.SECURITY_LOCKOUT_CAPTCHA_AFTER, 3),
      maxFailures: toInt(process.env.SECURITY_LOCKOUT_MAX_FAILURES, 10),
      durationSec: toInt(process.env.SECURITY_LOCKOUT_DURATION_SEC, 900),
    },
  },
  storage: {
    driver: toStorageDriver(process.env.STORAGE_DRIVER),
    maxFileSize: toInt(process.env.STORAGE_MAX_FILE_SIZE, 10 * 1024 * 1024),
    allowedMimeTypes: toList(process.env.STORAGE_ALLOWED_MIME_TYPES),
    local: {
      dir: process.env.STORAGE_LOCAL_DIR ?? './data/uploads',
      publicBaseUrl: (process.env.STORAGE_LOCAL_PUBLIC_BASE_URL ?? '/api/files').replace(/\/$/, ''),
    },
    s3: {
      endpoint: process.env.STORAGE_S3_ENDPOINT || undefined,
      region: process.env.STORAGE_S3_REGION ?? 'us-east-1',
      bucket: process.env.STORAGE_S3_BUCKET ?? '',
      accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY ?? '',
      publicBaseUrl: (process.env.STORAGE_S3_PUBLIC_BASE_URL || '').replace(/\/$/, '') || undefined,
      forcePathStyle: toBool(process.env.STORAGE_S3_FORCE_PATH_STYLE, false),
    },
    oss: {
      region: process.env.STORAGE_OSS_REGION ?? 'oss-cn-hangzhou',
      bucket: process.env.STORAGE_OSS_BUCKET ?? '',
      accessKeyId: process.env.STORAGE_OSS_ACCESS_KEY_ID ?? '',
      accessKeySecret: process.env.STORAGE_OSS_ACCESS_KEY_SECRET ?? '',
      endpoint: process.env.STORAGE_OSS_ENDPOINT || undefined,
      publicBaseUrl: (process.env.STORAGE_OSS_PUBLIC_BASE_URL || '').replace(/\/$/, '') || undefined,
    },
  },
});
