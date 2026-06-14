import { describe, expect, it } from 'vitest';
import { failure, success } from '../src/response/api-response';

describe('api-response', () => {
  it('success 包装数据, code 为 0', () => {
    const res = success({ id: 1 }, 'ok', 'trace-1');
    expect(res.code).toBe(0);
    expect(res.message).toBe('ok');
    expect(res.data).toEqual({ id: 1 });
    expect(res.traceId).toBe('trace-1');
    expect(typeof res.timestamp).toBe('number');
  });

  it('failure 携带业务码, data 为 null', () => {
    const res = failure(30001, '卡密已被使用');
    expect(res.code).toBe(30001);
    expect(res.data).toBeNull();
    expect(res.message).toBe('卡密已被使用');
  });
});
