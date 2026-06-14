/** 各 provider 归一化后的用户资料。 */
export interface OAuthUserProfile {
  /** provider 内的稳定唯一标识 */
  providerUserId: string;
  /** 微信 unionId 等跨应用统一标识(可选) */
  unionId?: string;
  email?: string;
  nickname?: string;
  avatarUrl?: string;
  /** 原始返回(排查/审计用) */
  raw: Record<string, unknown>;
}

/**
 * 第三方登录 provider 抽象。每个实现负责:
 *  - 拼接授权跳转 URL;
 *  - 用回调拿到的 code 换取并归一化用户资料。
 */
export interface OAuthProvider {
  /** 唯一名: google | github | wechat | apple */
  readonly name: string;
  /** 是否已配置(client id/secret 等齐全且开关打开) */
  isConfigured(): boolean;
  /** 构造授权跳转地址(带 state) */
  getAuthorizationUrl(state: string): string;
  /** 用授权码换取用户资料 */
  exchangeCode(code: string): Promise<OAuthUserProfile>;
}

/** 简单的 fetch 包装: 非 2xx 抛错, 期望 JSON 响应。 */
export async function fetchJson<T>(
  url: string,
  init: RequestInit & { expect?: 'json' } = {},
): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 200)}`);
  }
}
