import { OAuthProviderConfig } from '../../../../config/configuration';
import { fetchJson, OAuthProvider, OAuthUserProfile } from './types';

interface GithubTokenResp {
  access_token?: string;
  error?: string;
  error_description?: string;
}
interface GithubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}
interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/** GitHub OAuth 登录。 */
export class GithubProvider implements OAuthProvider {
  readonly name = 'github';

  constructor(private readonly cfg: OAuthProviderConfig) {}

  isConfigured(): boolean {
    return this.cfg.enabled && !!this.cfg.clientId && !!this.cfg.clientSecret;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.cfg.clientId,
      redirect_uri: this.cfg.redirectUri,
      scope: 'read:user user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthUserProfile> {
    const token = await fetchJson<GithubTokenResp>('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        code,
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
        redirect_uri: this.cfg.redirectUri,
      }).toString(),
    });
    if (!token.access_token) {
      throw new Error(`GitHub token error: ${token.error_description ?? token.error ?? 'unknown'}`);
    }

    const headers = {
      authorization: `Bearer ${token.access_token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'nestor-oauth',
    };
    const user = await fetchJson<GithubUser>('https://api.github.com/user', { headers });

    let email = user.email ?? undefined;
    if (!email) {
      const emails = await fetchJson<GithubEmail[]>('https://api.github.com/user/emails', {
        headers,
      }).catch(() => [] as GithubEmail[]);
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails.find((e) => e.verified)?.email;
    }

    return {
      providerUserId: String(user.id),
      email,
      nickname: user.name ?? user.login,
      avatarUrl: user.avatar_url,
      raw: user as unknown as Record<string, unknown>,
    };
  }
}
