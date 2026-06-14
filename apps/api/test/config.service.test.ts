import 'reflect-metadata';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it } from 'vitest';
import { BusinessException } from '../src/common/exceptions/business.exception';
import { ConfigService } from '../src/modules/system/config.service';
import { Config } from '../src/modules/system/entities/config.entity';

/** 用 Map 模拟 TypeORM Repository, 只实现 ConfigService 用到的方法。 */
function createFakeRepo(): Repository<Config> {
  const store = new Map<string, Config>();
  const repo = {
    create: (partial: Partial<Config>) => ({ ...partial }) as Config,
    save: async (entity: Config) => {
      store.set(entity.key, entity);
      return entity;
    },
    findOne: async ({ where }: { where: { key: string } }) => store.get(where.key) ?? null,
    find: async ({ where }: { where?: { group?: string } } = {}) => {
      const all = [...store.values()];
      return where?.group ? all.filter((c) => c.group === where.group) : all;
    },
    remove: async (entity: Config) => {
      store.delete(entity.key);
      return entity;
    },
  };
  return repo as unknown as Repository<Config>;
}

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = new ConfigService(createFakeRepo());
  });

  it('upsert 新增后可读取', async () => {
    await service.upsert('site.title', { value: 'Nestor', group: 'site' });
    const got = await service.get('site.title');
    expect(got.value).toBe('Nestor');
    expect(got.group).toBe('site');
  });

  it('upsert 对同一 key 为幂等更新而非重复插入', async () => {
    await service.upsert('site.title', { value: 'A' });
    await service.upsert('site.title', { value: 'B' });
    expect((await service.get('site.title')).value).toBe('B');
    expect(await service.list()).toHaveLength(1);
  });

  it('list 可按分组过滤', async () => {
    await service.upsert('a', { value: '1', group: 'g1' });
    await service.upsert('b', { value: '2', group: 'g2' });
    const g1 = await service.list('g1');
    expect(g1.map((c) => c.key)).toEqual(['a']);
  });

  it('get 不存在的 key 抛出业务异常', async () => {
    await expect(service.get('missing')).rejects.toBeInstanceOf(BusinessException);
  });

  it('remove 后再读取抛出业务异常', async () => {
    await service.upsert('temp', { value: 'x' });
    await service.remove('temp');
    await expect(service.get('temp')).rejects.toBeInstanceOf(BusinessException);
  });
});
