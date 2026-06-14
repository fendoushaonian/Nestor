import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { Configuration } from '../../config/configuration';
import { CacheService } from '../redis/cache.service';
import { JwtPayload } from './auth.types';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
}

interface UserClaims {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
}

/**
 * 令牌服务: 签发/校验 access & refresh token。
 * 启用 Redis 时:
 *  - refresh token 走白名单 (auth:rt:*), 登出/轮换即失效, 防止旧 refresh 复用;
 *  - access token 登出后进黑名单 (auth:bl:*), 在有效期内立即失效。
 * 未启用 Redis 时退化为无状态校验 (登出为客户端best-effort)。
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Configuration, true>,
    private readonly cache: CacheService,
  ) {}

  private get jwtCfg() {
    return this.config.get('jwt', { infer: true });
  }

  async issueTokens(user: UserClaims): Promise<IssuedTokens> {
    const cfg = this.jwtCfg;
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        username: user.username,
        roles: user.roles,
        permissions: user.permissions,
        jti: accessJti,
        type: 'access',
      } satisfies JwtPayload,
      {
        secret: cfg.accessSecret,
        expiresIn: cfg.accessExpiresIn as JwtSignOptions['expiresIn'],
      },
    );

    const refreshToken = await this.jwt.signAsync(
      {
        sub: user.id,
        username: user.username,
        roles: [],
        permissions: [],
        jti: refreshJti,
        type: 'refresh',
      } satisfies JwtPayload,
      {
        secret: cfg.refreshSecret,
        expiresIn: cfg.refreshExpiresIn as JwtSignOptions['expiresIn'],
      },
    );

    await this.whitelistRefresh(user.id, refreshJti, refreshToken);

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }

  /** 校验 refresh token 签名 + 白名单, 返回载荷。无效抛错由调用方处理。 */
  async verifyRefresh(token: string): Promise<JwtPayload> {
    const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.jwtCfg.refreshSecret,
    });
    if (this.cache.available) {
      const ok = await this.cache.exists(this.refreshKey(payload.sub, payload.jti));
      if (!ok) {
        throw new Error('refresh token 已失效');
      }
    }
    return payload;
  }

  /** 轮换: 旧 refresh 失效。 */
  async revokeRefresh(userId: string, jti: string): Promise<void> {
    await this.cache.del(this.refreshKey(userId, jti));
  }

  /** 登出: 拉黑当前 access token, 并清掉对应 refresh。 */
  async revokeAccess(payload: JwtPayload, exp?: number): Promise<void> {
    if (this.cache.available) {
      const ttl = exp ? Math.max(exp - Math.floor(Date.now() / 1000), 1) : 900;
      await this.cache.set(this.blacklistKey(payload.jti), 1, ttl);
    }
  }

  async isAccessRevoked(jti: string): Promise<boolean> {
    if (!this.cache.available) return false;
    return this.cache.exists(this.blacklistKey(jti));
  }

  private async whitelistRefresh(userId: string, jti: string, token: string): Promise<void> {
    if (!this.cache.available) return;
    const decoded = this.jwt.decode(token) as { exp?: number } | null;
    const ttl = decoded?.exp ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1) : 604800;
    await this.cache.set(this.refreshKey(userId, jti), 1, ttl);
  }

  private refreshKey(userId: string, jti: string): string {
    return `auth:rt:${userId}:${jti}`;
  }

  private blacklistKey(jti: string): string {
    return `auth:bl:${jti}`;
  }
}
