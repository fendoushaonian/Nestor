import { describe, expect, it } from 'vitest';
import { paginate } from '../src/pagination/pagination';

describe('paginate', () => {
  it('计算 totalPages 并原样回传分页参数', () => {
    const result = paginate([1, 2, 3], 25, 2, 10);
    expect(result).toEqual({
      list: [1, 2, 3],
      total: 25,
      page: 2,
      pageSize: 10,
      totalPages: 3,
    });
  });

  it('总数为 0 时 totalPages 为 0', () => {
    expect(paginate([], 0, 1, 10).totalPages).toBe(0);
  });

  it('pageSize 为 0 时不除零, totalPages 退化为 0', () => {
    expect(paginate([], 5, 1, 0).totalPages).toBe(0);
  });
});
