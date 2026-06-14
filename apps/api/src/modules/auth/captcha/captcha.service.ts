import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as svgCaptcha from 'svg-captcha';
import { CacheService } from '../../redis/cache.service';

const CAPTCHA_TTL = 300; // 验证码 5 分钟有效
const KEY_PREFIX = 'auth:captcha:';

export interface CaptchaResult {
  /** 验证码标识, 登录时随表单回传 */
  captchaId: string;
  /** SVG 图片字符串 (可直接内联到 <img src> 的 data URI 或前端渲染) */
  svg: string;
}

/**
 * 图形验证码: 服务端生成文本+SVG, 文本存入缓存(Redis 或内存兜底), 校验时一次性消费。
 * 校验大小写不敏感。
 */
@Injectable()
export class CaptchaService {
  /** Redis 未启用时的内存兜底(单实例, 带过期)。 */
  private readonly local = new Map<string, { text: string; exp: number }>();

  constructor(private readonly cache: CacheService) {}

  async generate(): Promise<CaptchaResult> {
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 2,
      ignoreChars: '0o1ilI',
      color: true,
      background: '#f2f3f5',
    });
    const captchaId = randomUUID();
    await this.store(captchaId, captcha.text.toLowerCase());
    return { captchaId, svg: captcha.data };
  }

  /** 校验并一次性消费; 命中返回 true。 */
  async verify(captchaId: string | undefined, input: string | undefined): Promise<boolean> {
    if (!captchaId || !input) return false;
    const expected = await this.consume(captchaId);
    if (expected === null) return false;
    return expected === input.trim().toLowerCase();
  }

  private async store(id: string, text: string): Promise<void> {
    if (this.cache.available) {
      await this.cache.set(`${KEY_PREFIX}${id}`, text, CAPTCHA_TTL);
    } else {
      this.local.set(id, { text, exp: Date.now() + CAPTCHA_TTL * 1000 });
    }
  }

  private async consume(id: string): Promise<string | null> {
    const client = this.cache.raw;
    if (client) {
      // GETDEL 原子取出并删除, 保证验证码一次性消费(无 get+del 竞态)。
      const raw = await client.getdel(`${KEY_PREFIX}${id}`);
      return raw === null ? null : (JSON.parse(raw) as string);
    }
    const entry = this.local.get(id);
    this.local.delete(id);
    if (!entry || entry.exp < Date.now()) return null;
    return entry.text;
  }
}
