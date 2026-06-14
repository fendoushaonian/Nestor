import { describe, expect, it } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service';
import { BusinessException } from '../src/common/exceptions/business.exception';

/**
 * 回归:GET /auth/profile 必须返回编码字符串数组的 roles/permissions,
 * 而非 Role 实体对象 —— 否则前端 `roles.join(', ')` 会得到 "[object Object]"。
 */
function makeService(user: unknown): AuthService {
  const users = { findOne: async () => user } as unknown as never;
  const stub = {} as unknown as never;
  return new AuthService(users, stub, stub, stub, stub, stub);
}

describe('AuthService.getProfileView', () => {
  it('将角色/权限映射为编码字符串(去重), 而非实体对象', async () => {
    const svc = makeService({
      id: 'u1',
      username: 'admin',
      passwordHash: 'should-not-leak',
      roles: [
        { code: 'admin', permissions: [{ code: 'card:read' }, { code: 'card:write' }] },
        { code: 'editor', permissions: [{ code: 'card:read' }] },
      ],
    });

    const view = await svc.getProfileView('u1');

    expect(view).toEqual({
      id: 'u1',
      username: 'admin',
      roles: ['admin', 'editor'],
      permissions: ['card:read', 'card:write'],
    });
    expect(typeof view.roles[0]).toBe('string');
    expect(Object.keys(view)).not.toContain('passwordHash');
  });

  it('用户不存在时抛 BusinessException', async () => {
    const svc = makeService(null);
    await expect(svc.getProfileView('missing')).rejects.toBeInstanceOf(BusinessException);
  });
});
