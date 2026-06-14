import { beforeEach, describe, expect, it, vi } from 'vitest';

// 固定验证码文本, 便于断言(避免随机)
vi.mock('svg-captcha', () => ({
  create: vi.fn(() => ({ text: 'AbCd', data: '<svg>captcha</svg>' })),
}));

import { CaptchaService } from '../src/modules/auth/captcha/captcha.service';
import { LoginAttemptService } from '../src/modules/auth/login-attempt.service';

/** Redis 未启用: 走各服务的内存兜底路径。 */
const memCache = { available: false, raw: null } as never;

describe('CaptchaService (内存兜底)', () => {
  let svc: CaptchaService;
  beforeEach(() => {
    svc = new CaptchaService(memCache);
  });

  it('生成 captchaId + svg, 校验大小写不敏感且一次性消费', async () => {
    const { captchaId, svg } = await svc.generate();
    expect(captchaId).toBeTruthy();
    expect(svg).toContain('<svg');

    // 大小写不敏感
    expect(await svc.verify(captchaId, 'abcd')).toBe(true);
    // 已被消费, 二次失败
    expect(await svc.verify(captchaId, 'abcd')).toBe(false);
  });

  it('错误验证码 / 缺参 返回 false', async () => {
    const { captchaId } = await svc.generate();
    expect(await svc.verify(captchaId, 'wrong')).toBe(false);
    expect(await svc.verify(undefined, 'abcd')).toBe(false);
    expect(await svc.verify('no-such-id', 'abcd')).toBe(false);
  });
});

describe('LoginAttemptService (内存兜底)', () => {
  const config = {
    get: () => ({
      captcha: { enabled: true, alwaysOnLogin: false },
      lockout: { captchaAfter: 2, maxFailures: 3, durationSec: 900 },
    }),
  } as never;
  let svc: LoginAttemptService;
  beforeEach(() => {
    svc = new LoginAttemptService(memCache, config);
  });

  it('失败累计触发验证码门槛与锁定, 成功后清零', async () => {
    const id = 'Alice'; // 归一化为小写, 与大小写无关
    let s = await svc.getStatus(id);
    expect(s).toMatchObject({ failures: 0, locked: false, captchaRequired: false });

    await svc.recordFailure(id);
    await svc.recordFailure(id); // = 2 -> 达 captchaAfter
    s = await svc.getStatus('alice');
    expect(s.captchaRequired).toBe(true);
    expect(s.locked).toBe(false);

    await svc.recordFailure(id); // = 3 -> 达 maxFailures
    s = await svc.getStatus(id);
    expect(s.locked).toBe(true);

    await svc.reset(id);
    s = await svc.getStatus(id);
    expect(s).toMatchObject({ failures: 0, locked: false, captchaRequired: false });
  });

  it('内存模式为固定窗口: 失败不滑动续期(与 Redis incrWithTtl 一致)', async () => {
    vi.useFakeTimers();
    try {
      const svc2 = new LoginAttemptService(memCache, config); // durationSec=900
      await svc2.recordFailure('carol'); // t=0, 设定窗口到 t=900s
      vi.advanceTimersByTime(899_000); // t=899s
      await svc2.recordFailure('carol'); // 固定窗口: 不应把过期推到 t=1799s
      vi.advanceTimersByTime(2_000); // t=901s, 越过原始窗口
      const s = await svc2.getStatus('carol');
      expect(s.failures).toBe(0); // 若是滑动窗口这里会 >0
    } finally {
      vi.useRealTimers();
    }
  });

  it('alwaysOnLogin=true 时首次登录即要求验证码', async () => {
    const always = {
      get: () => ({
        captcha: { enabled: true, alwaysOnLogin: true },
        lockout: { captchaAfter: 99, maxFailures: 99, durationSec: 900 },
      }),
    } as never;
    const s = await new LoginAttemptService(memCache, always).getStatus('bob');
    expect(s.captchaRequired).toBe(true);
  });
});
