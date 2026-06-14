import { OAuthProviderConfig } from '../../../../config/configuration';
import { fetchJson, OAuthProvider, OAuthUserProfile } from './types';

interface WechatTokenResp {
  access_token?: string;
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}
interface WechatUserInfo {
  openid: string;
  unionid?: string;
  nickname?: string;
  headimgurl?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信网页扫码登录(开放平台 网站应用, scope=snsapi_login)。
 * providerUserId 优先用 unionid(跨应用统一), 否则退回 openid。
 */
export class WechatProvider implements OAuthProvider {
  readonly name = 'wechat';

  constructor(private readonly cfg: OAuthProviderConfig) {}

  isConfigured(): boolean {
    return this.cfg.enabled && !!this.cfg.clientId && !!this.cfg.clientSecret;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      appid: this.cfg.clientId,
      redirect_uri: this.cfg.redirectUri,
      response_type: 'code',
      scope: 'snsapi_login',
      state,
    });
    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  }

  async exchangeCode(code: string): Promise<OAuthUserProfile> {
    const tokenUrl = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
    tokenUrl.search = new URLSearchParams({
      appid: this.cfg.clientId,
      secret: this.cfg.clientSecret,
      code,
      grant_type: 'authorization_code',
    }).toString();
    const token = await fetchJson<WechatTokenResp>(tokenUrl.toString());
    if (token.errcode || !token.access_token || !token.openid) {
      throw new Error(`WeChat token error: ${token.errcode} ${token.errmsg ?? ''}`);
    }

    const infoUrl = new URL('https://api.weixin.qq.com/sns/userinfo');
    infoUrl.search = new URLSearchParams({
      access_token: token.access_token,
      openid: token.openid,
    }).toString();
    const info = await fetchJson<WechatUserInfo>(infoUrl.toString());
    if (info.errcode) {
      throw new Error(`WeChat userinfo error: ${info.errcode} ${info.errmsg ?? ''}`);
    }

    const unionId = info.unionid ?? token.unionid;
    return {
      providerUserId: unionId ?? info.openid,
      unionId,
      nickname: info.nickname,
      avatarUrl: info.headimgurl,
      raw: info as unknown as Record<string, unknown>,
    };
  }
}
