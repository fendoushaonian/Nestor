import { createSign } from 'crypto';
import { AppleOAuthConfig } from '../../../../config/configuration';
import { fetchJson, OAuthProvider, OAuthUserProfile } from './types';

interface AppleTokenResp {
  id_token?: string;
  error?: string;
}
interface AppleIdToken {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
}

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64url');

/**
 * Sign in with Apple。
 * client_secret 是一段用 .p8 私钥(ES256)动态签出的 JWT;
 * 用户标识与邮箱从 token 端点返回的 id_token 中解析(经 TLS 直连 Apple 获取)。
 */
export class AppleProvider implements OAuthProvider {
  readonly name = 'apple';

  constructor(private readonly cfg: AppleOAuthConfig) {}

  isConfigured(): boolean {
    return (
      this.cfg.enabled &&
      !!this.cfg.clientId &&
      !!this.cfg.teamId &&
      !!this.cfg.keyId &&
      !!this.cfg.privateKey
    );
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      response_mode: 'form_post',
      client_id: this.cfg.clientId,
      redirect_uri: this.cfg.redirectUri,
      scope: 'name email',
      state,
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthUserProfile> {
    const token = await fetchJson<AppleTokenResp>('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.cfg.clientId,
        client_secret: this.buildClientSecret(),
        redirect_uri: this.cfg.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!token.id_token) {
      throw new Error(`Apple token error: ${token.error ?? 'missing id_token'}`);
    }

    const claims = decodeJwtPayload<AppleIdToken>(token.id_token);
    return {
      providerUserId: claims.sub,
      email: claims.email,
      raw: claims as unknown as Record<string, unknown>,
    };
  }

  /** 用 ES256(.p8)签出 Apple 要求的 client_secret JWT(有效期最长 6 个月, 这里取 1 小时)。 */
  private buildClientSecret(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'ES256', kid: this.cfg.keyId, typ: 'JWT' };
    const payload = {
      iss: this.cfg.teamId,
      iat: now,
      exp: now + 3600,
      aud: 'https://appleid.apple.com',
      sub: this.cfg.clientId,
    };
    const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
    const signer = createSign('SHA256');
    signer.update(signingInput);
    signer.end();
    // JOSE 要求 ES256 签名为 raw r||s(P1363), 而非默认 DER。
    const signature = signer.sign({ key: this.cfg.privateKey, dsaEncoding: 'ieee-p1363' });
    return `${signingInput}.${signature.toString('base64url')}`;
  }
}

function decodeJwtPayload<T>(jwt: string): T {
  const parts = jwt.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as T;
}
