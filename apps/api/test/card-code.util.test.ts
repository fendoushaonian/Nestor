import { describe, expect, it } from 'vitest';
import {
  generateCardCode,
  generateCardSecret,
  redeemLockId,
} from '../src/modules/card/card-code.util';

describe('card-code.util', () => {
  it('卡号形如 NESTOR-XXXX-XXXX-XXXX 且随机段不含易混淆字符', () => {
    const code = generateCardCode();
    expect(code).toMatch(/^NESTOR-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    const segments = code.slice('NESTOR-'.length);
    expect(segments).not.toMatch(/[01OI]/);
  });

  it('批量生成的卡号基本不重复', () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateCardCode()));
    expect(codes.size).toBe(2000);
  });

  it('卡密为高熵 base64url 串', () => {
    const secret = generateCardSecret();
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  it('redeemLockId 返回唯一 UUID', () => {
    expect(redeemLockId()).not.toBe(redeemLockId());
  });
});
