import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../config/configuration';
import { CacheService } from '../redis/cache.service';

const KEY_PREFIX = 'auth:loginfail:';

export interface LoginGateStatus {
  failures: number;
  /** 是否已被临时锁定 */
  locked: boolean;
  /** 本次登录是否需要图形验证码 */
  captchaRequired: boolean;
}

/**
 * 登录失败计数与软锁定。按 identifier(用户名/邮箱/手机号)累计失败次数:
 *  - 达到 captchaAfter → 后续登录要求图形验证码;
 *  - 达到 maxFailures → 在 durationSec 内锁定(即便密码正确也拒绝, 防爆破);
 *  - 登录成功即清零。
 * 失败窗口与锁定时长共用同一个带 TTL 的计数键(durationSec)。
 * Redis 未启用时退化为单实例内存计数。
 */
@Injectable()
export class LoginAttemptService {
  private readonly local = new Map<string, { count: number; exp: number }>();

  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService<Configuration, true>,
  ) {}

  private get cfg() {
    return this.config.get('security', { infer: true });
  }

  async getStatus(identifier: string): Promise<LoginGateStatus> {
    const failures = await this.getCount(identifier);
    const { lockout, captcha } = this.cfg;
    return {
      failures,
      locked: failures >= lockout.maxFailures,
      captchaRequired:
        captcha.enabled && (captcha.alwaysOnLogin || failures >= lockout.captchaAfter),
    };
  }

  /** 记一次失败, 返回累计次数。 */
  async recordFailure(identifier: string): Promise<number> {
    const ttl = this.cfg.lockout.durationSec;
    const key = `${KEY_PREFIX}${this.norm(identifier)}`;
    if (this.cache.available) {
      const n = await this.cache.incrWithTtl(key, ttl);
      return n < 0 ? 0 : n;
    }
    const now = Date.now();
    const entry = this.local.get(key);
    const count = entry && entry.exp > now ? entry.count + 1 : 1;
    this.local.set(key, { count, exp: now + ttl * 1000 });
    return count;
  }

  async reset(identifier: string): Promise<void> {
    const key = `${KEY_PREFIX}${this.norm(identifier)}`;
    if (this.cache.available) {
      await this.cache.del(key);
    } else {
      this.local.delete(key);
    }
  }

  private async getCount(identifier: string): Promise<number> {
    const key = `${KEY_PREFIX}${this.norm(identifier)}`;
    if (this.cache.available) {
      return (await this.cache.get<number>(key)) ?? 0;
    }
    const entry = this.local.get(key);
    return entry && entry.exp > Date.now() ? entry.count : 0;
  }

  private norm(identifier: string): string {
    return identifier.trim().toLowerCase();
  }
}
