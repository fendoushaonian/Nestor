import { describe, expect, it } from 'vitest';
import { decryptJson, encryptJson } from '../src/modules/workflow/crypto.util';

describe('crypto.util', () => {
  it('加解密往返还原数据', () => {
    const data = { headerName: 'X-Api-Key', headerValue: 's3cr3t', n: 1 };
    const enc = encryptJson(data, 'my-key');
    expect(enc).not.toContain('s3cr3t');
    expect(decryptJson(enc, 'my-key')).toEqual(data);
  });

  it('密钥不同无法解密', () => {
    const enc = encryptJson({ a: 1 }, 'key-a');
    expect(() => decryptJson(enc, 'key-b')).toThrow();
  });

  it('密文格式错误抛错', () => {
    expect(() => decryptJson('garbage', 'k')).toThrow('格式');
  });
});
