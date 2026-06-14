import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import type { Configuration } from '../src/config/configuration';

/**
 * 端到端测试: 启动完整 NestJS 应用 (内存 sqlite), 通过真实 HTTP 验证
 * 健康检查、登录鉴权、注册、RBAC 守卫等主链路。
 */

const ADMIN_PASSWORD = 'admin-e2e-pass';

function configureTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_SQLITE_PATH = ':memory:';
  process.env.DB_SYNCHRONIZE = 'true';
  process.env.DB_MIGRATIONS_RUN = 'false';
  process.env.REDIS_ENABLED = 'false';
  process.env.MONGO_ENABLED = 'false';
  process.env.SECURITY_CAPTCHA_ENABLED = 'false';
  process.env.THROTTLE_ENABLED = 'false';
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
}

describe('API e2e', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prefix: string;

  beforeAll(async () => {
    configureTestEnv();
    // 延迟到 env 配置后再加载 AppModule, 确保 configuration() 读到测试环境变量。
    const { AppModule } = await import('../src/app.module');
    app = await NestFactory.create(AppModule, { logger: false });

    const config = app.get(ConfigService<Configuration, true>);
    prefix = config.get('app', { infer: true }).prefix;

    app.setGlobalPrefix(prefix);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.listen(0);
    baseUrl = (await app.getUrl()).replace('[::1]', '127.0.0.1');
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  const api = (path: string, init?: RequestInit): Promise<Response> =>
    fetch(`${baseUrl}/${prefix}${path}`, init);

  const json = (body: unknown): RequestInit => ({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('GET /health 返回数据库健康', async () => {
    const res = await api('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; info: { database: { status: string } } };
    expect(body.status).toBe('ok');
    expect(body.info.database.status).toBe('up');
  });

  it('未带 token 访问受保护接口返回 401', async () => {
    const res = await api('/system/configs');
    expect(res.status).toBe(401);
  });

  it('管理员登录 → profile → 注册新用户 全链路', async () => {
    // 登录
    const loginRes = await api(
      '/auth/login',
      json({ identifier: 'admin', password: ADMIN_PASSWORD }),
    );
    expect(loginRes.status).toBe(201);
    const login = (await loginRes.json()) as { data: { accessToken: string } };
    const token = login.data.accessToken;
    expect(token).toBeTruthy();

    // profile (带 token)
    const profileRes = await api('/auth/profile', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(profileRes.status).toBe(200);
    const profile = (await profileRes.json()) as {
      data: { username: string; roles: string[] };
    };
    expect(profile.data.username).toBe('admin');
    expect(profile.data.roles).toContain('admin');

    // 注册新用户
    const registerRes = await api(
      '/auth/register',
      json({ username: 'e2e_user', email: 'e2e@test.com', password: 'Passw0rd!23' }),
    );
    expect(registerRes.status).toBe(201);
    const reg = (await registerRes.json()) as { data: { accessToken: string } };
    expect(reg.data.accessToken).toBeTruthy();
  });

  it('错误密码登录被拒绝', async () => {
    const res = await api('/auth/login', json({ identifier: 'admin', password: 'wrong-password' }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
