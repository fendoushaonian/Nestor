import { OAuthProviderConfig } from '../../../../config/configuration';
import { fetchJson, OAuthProvider, OAuthUserProfile } from './types';

interface GoogleTokenResp {
  access_token: string;
}
interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/** Google OAuth2 / OpenID Connect 登录。 */
export class GoogleProvider implements OAuthProvider {
  readonly name = 'google';

  constructor(private readonly cfg: OAuthProviderConfig) {}

  isConfigured(): boolean {
    return this.cfg.enabled && !!this.cfg.clientId && !!this.cfg.clientSecret;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.cfg.clientId,
      redirect_uri: this.cfg.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      include_granted_scopes: 'true',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthUserProfile> {
    const token = await fetchJson<GoogleTokenResp>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
        redirect_uri: this.cfg.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const info = await fetchJson<GoogleUserInfo>(
      'https://openidconnect.googleapis.com/v1/userinfo',
      { headers: { authorization: `Bearer ${token.access_token}` } },
    );

    return {
      providerUserId: info.sub,
      email: info.email_verified ? info.email : undefined,
      nickname: info.name,
      avatarUrl: info.picture,
      raw: info as unknown as Record<string, unknown>,
    };
  }
}
