import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import loadConfig, {
  assertSecureProductionConfig,
  INSECURE_DEFAULTS,
  type Configuration,
} from '../src/config/configuration';

const SECRET_KEYS = [
  'NODE_ENV',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CREDENTIAL_ENCRYPTION_KEY',
];

/** 取一份合法 (开发态) 配置作为基底, 便于在测试里按需覆盖字段。 */
function devConfig(): Configuration {
  process.env.NODE_ENV = 'development';
  return loadConfig();
}

describe('configuration production secret guard', () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of SECRET_KEYS) saved[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of SECRET_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('开发环境即使用默认占位密钥也能正常加载', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    expect(() => loadConfig()).not.toThrow();
  });

  it('生产环境使用默认占位密钥时启动报错', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    expect(() => loadConfig()).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('生产环境配置强密钥后正常加载', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = 'a-strong-random-access-secret';
    process.env.JWT_REFRESH_SECRET = 'a-strong-random-refresh-secret';
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'a-strong-random-credential-key';
    expect(() => loadConfig()).not.toThrow();
  });

  it('assertSecureProductionConfig 列出所有不安全的密钥', () => {
    const base = devConfig();
    const config: Configuration = {
      ...base,
      app: { ...base.app, env: 'production' },
      jwt: {
        ...base.jwt,
        accessSecret: INSECURE_DEFAULTS.jwtAccessSecret,
        refreshSecret: INSECURE_DEFAULTS.jwtRefreshSecret,
      },
      workflow: { ...base.workflow, encryptionKey: INSECURE_DEFAULTS.credentialKey },
    };
    expect(() => assertSecureProductionConfig(config)).toThrow(
      /JWT_ACCESS_SECRET.*JWT_REFRESH_SECRET.*CREDENTIAL_ENCRYPTION_KEY/s,
    );
  });
});
