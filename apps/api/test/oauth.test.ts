import { generateKeyPairSync, createVerify } from 'crypto';
import { ErrorCode } from '@nestor/shared';
import { describe, expect, it, vi } from 'vitest';
import { BusinessException } from '../src/common/exceptions/business.exception';
import { GoogleProvider } from '../src/modules/auth/oauth/providers/google.provider';
import { GithubProvider } from '../src/modules/auth/oauth/providers/github.provider';
import { WechatProvider } from '../src/modules/auth/oauth/providers/wechat.provider';
import { AppleProvider } from '../src/modules/auth/oauth/providers/apple.provider';
import { OAuthProvider, OAuthUserProfile } from '../src/modules/auth/oauth/providers/types';
import { OAuthService } from '../src/modules/auth/oauth/oauth.service';

const std = { enabled: true, clientId: 'cid', clientSecret: 'sec', redirectUri: 'https://cb/x' };

describe('oauth providers - 授权 URL 与配置', () => {
  it('Google 授权 URL 含必要参数', () => {
    const url = new URL(new GoogleProvider(std).getAuthorizationUrl('st1'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('state')).toBe('st1');
    expect(url.searchParams.get('scope')).toContain('email');
  });

  it('GitHub 授权 URL 含必要参数', () => {
    const url = new URL(new GithubProvider(std).getAuthorizationUrl('st2'));
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('state')).toBe('st2');
  });

  it('微信授权 URL 含 appid 与 snsapi_login', () => {
    const raw = new WechatProvider(std).getAuthorizationUrl('st3');
    expect(raw).toContain('appid=cid');
    expect(raw).toContain('scope=snsapi_login');
    expect(raw.endsWith('#wechat_redirect')).toBe(true);
  });

  it('未配置时 isConfigured=false', () => {
    expect(new GoogleProvider({ ...std, clientId: '' }).isConfigured()).toBe(false);
    expect(new GoogleProvider({ ...std, enabled: false }).isConfigured()).toBe(false);
    expect(new GoogleProvider(std).isConfigured()).toBe(true);
  });
});

describe('apple provider - client_secret(ES256) 签名', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const apple = new AppleProvider({
    enabled: true,
    clientId: 'com.svc.id',
    teamId: 'TEAM123',
    keyId: 'KEY123',
    privateKey: pem,
    redirectUri: 'https://cb/apple',
  });

  it('isConfigured 校验完整字段', () => {
    expect(apple.isConfigured()).toBe(true);
  });

  it('签出的 JWT 可被对应公钥验签且 claims 正确', () => {
    // @ts-expect-error 访问私有方法做单元验证
    const jwt: string = apple.buildClientSecret();
    const [h, p, sig] = jwt.split('.');
    expect(sig).toBeTruthy();

    const verifier = createVerify('SHA256');
    verifier.update(`${h}.${p}`);
    verifier.end();
    const ok = verifier.verify(
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(sig, 'base64url'),
    );
    expect(ok).toBe(true);

    const header = JSON.parse(Buffer.from(h, 'base64url').toString());
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    expect(header).toMatchObject({ alg: 'ES256', kid: 'KEY123' });
    expect(payload).toMatchObject({
      iss: 'TEAM123',
      sub: 'com.svc.id',
      aud: 'https://appleid.apple.com',
    });
  });
});

// ---- OAuthService 用 fake provider 覆盖 state + 找到/创建用户 ----

class FakeProvider implements OAuthProvider {
  readonly name = 'fake';
  constructor(private readonly profile: OAuthUserProfile) {}
  isConfigured(): boolean {
    return true;
  }
  getAuthorizationUrl(state: string): string {
    return `https://fake/auth?state=${state}`;
  }
  exchangeCode(): Promise<OAuthUserProfile> {
    return Promise.resolve(this.profile);
  }
}

function buildService(profile: OAuthUserProfile, opts: { identityUserId?: string } = {}) {
  const provider = new FakeProvider(profile);
  const registry = {
    get: (n: string) => (n === 'fake' ? provider : undefined),
    enabledNames: () => ['fake'],
  };
  const cache = { available: false } as never; // 走内存 state 兜底
  const issueTokensForUser = vi.fn().mockResolvedValue({
    accessToken: 'a',
    refreshToken: 'r',
    tokenType: 'Bearer',
  });
  const auth = { issueTokensForUser } as never;

  const saved: Record<string, unknown>[] = [];
  const manager = {
    findOne: vi.fn().mockResolvedValue(null),
    create: (_entity: unknown, obj: Record<string, unknown>) => obj,
    save: (obj: Record<string, unknown>) => {
      const withId = { id: obj.id ?? `id_${saved.length + 1}`, ...obj };
      saved.push(withId);
      return Promise.resolve(withId);
    },
  };
  const dataSource = {
    transaction: (cb: (m: typeof manager) => unknown) => Promise.resolve(cb(manager)),
  } as never;
  const config = { get: () => ({ successRedirect: undefined }) } as never;
  const identities = {
    findOne: vi.fn().mockResolvedValue(opts.identityUserId ? { userId: opts.identityUserId } : null),
  } as never;

  const service = new OAuthService(registry as never, cache, auth, dataSource, config, identities);
  return { service, issueTokensForUser, identities, manager };
}

describe('OAuthService - state 与用户归并', () => {
  const profile: OAuthUserProfile = {
    providerUserId: 'p-1',
    nickname: 'Alice',
    email: undefined,
    raw: {},
  };

  it('未启用的 provider 抛 OAUTH_PROVIDER_DISABLED', async () => {
    const { service } = buildService(profile);
    await expect(service.authorize('google')).rejects.toMatchObject({
      code: ErrorCode.OAUTH_PROVIDER_DISABLED,
    });
  });

  it('错误/缺失 state 抛 OAUTH_STATE_INVALID', async () => {
    const { service } = buildService(profile);
    await expect(service.handleCallback('fake', 'code', 'never-issued')).rejects.toBeInstanceOf(
      BusinessException,
    );
    await expect(service.handleCallback('fake', 'code', undefined)).rejects.toMatchObject({
      code: ErrorCode.OAUTH_STATE_INVALID,
    });
  });

  it('合法 state 一次性消费: 首次成功创建用户并签发令牌, 二次失败', async () => {
    const { service, issueTokensForUser } = buildService(profile);
    const { state } = await service.authorize('fake');

    const tokens = await service.handleCallback('fake', 'code', state);
    expect(tokens.accessToken).toBe('a');
    expect(issueTokensForUser).toHaveBeenCalledTimes(1);

    // state 已被消费, 重放应失败
    await expect(service.handleCallback('fake', 'code', state)).rejects.toMatchObject({
      code: ErrorCode.OAUTH_STATE_INVALID,
    });
  });

  it('已绑定身份直接登录, 不再创建用户', async () => {
    const { service, issueTokensForUser, manager } = buildService(profile, {
      identityUserId: 'existing-user',
    });
    const { state } = await service.authorize('fake');
    await service.handleCallback('fake', 'code', state);
    expect(issueTokensForUser).toHaveBeenCalledWith('existing-user');
    expect(manager.findOne).not.toHaveBeenCalled();
  });
});
