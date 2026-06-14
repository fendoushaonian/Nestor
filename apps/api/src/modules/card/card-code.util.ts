import { randomBytes, randomUUID } from 'crypto';

// 去掉易混淆字符 (0/O, 1/I) 的字母表
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomString(len: number): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** 生成可读的卡号, 形如 NESTOR-AB12-CD34-EF56 */
export function generateCardCode(): string {
  const seg = () => randomString(4);
  return `NESTOR-${seg()}-${seg()}-${seg()}`;
}

/** 生成卡密 (校验用), 高熵随机串 */
export function generateCardSecret(): string {
  return randomBytes(24).toString('base64url');
}

/** 兑换分布式锁的 key 后缀 */
export function redeemLockId(): string {
  return randomUUID();
}
