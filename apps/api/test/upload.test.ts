import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode } from '@nestor/shared';
import { BusinessException } from '../src/common/exceptions/business.exception';
import { StorageConfig } from '../src/config/configuration';
import { FileObject } from '../src/modules/upload/entities/file-object.entity';
import { LocalStorageProvider } from '../src/modules/upload/storage/local.provider';
import { StorageProvider } from '../src/modules/upload/storage/storage-provider';
import { UploadFile, UploadService } from '../src/modules/upload/upload.service';

describe('LocalStorageProvider', () => {
  let dir: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nestor-upload-'));
    provider = new LocalStorageProvider(dir, '/api/files');
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('put 落盘并返回 url, read 取回内容, delete 后读为 null', async () => {
    const body = Buffer.from('hello');
    const { key, url } = await provider.put({ key: '2026/06/a.txt', body, mimeType: 'text/plain' });
    expect(url).toBe('/api/files/2026/06/a.txt');
    expect((await provider.read(key))?.toString()).toBe('hello');
    await provider.delete(key);
    expect(await provider.read(key)).toBeNull();
  });

  it('拒绝路径穿越的 key', async () => {
    await expect(
      provider.put({ key: '../escape.txt', body: Buffer.from('x'), mimeType: 'text/plain' }),
    ).rejects.toThrow(/path traversal/);
  });

  it('读取不存在的 key 返回 null', async () => {
    expect(await provider.read('nope/none.txt')).toBeNull();
  });
});

/** 内存 fake 仓库, 仅实现 UploadService 用到的方法。 */
function fakeRepo() {
  const rows: FileObject[] = [];
  return {
    rows,
    create: (data: Partial<FileObject>) => ({ id: 'generated-id', ...data }) as FileObject,
    save: async (e: FileObject) => {
      rows.push(e);
      return e;
    },
    findOne: async ({ where: { id } }: { where: { id: string } }) =>
      rows.find((r) => r.id === id) ?? null,
    findAndCount: async () => [rows, rows.length] as [FileObject[], number],
    softRemove: async (e: FileObject) => {
      const i = rows.indexOf(e);
      if (i >= 0) rows.splice(i, 1);
      return e;
    },
  };
}

function fakeConfig(overrides: Partial<StorageConfig> = {}) {
  const cfg: StorageConfig = {
    driver: 'local',
    maxFileSize: 10,
    allowedMimeTypes: [],
    local: { dir: './x', publicBaseUrl: '/api/files' },
    s3: { region: 'us', bucket: '', accessKeyId: '', secretAccessKey: '', forcePathStyle: false },
    oss: { region: 'cn', bucket: '', accessKeyId: '', accessKeySecret: '' },
    ...overrides,
  };
  return { get: () => cfg } as never;
}

function recordingProvider(): StorageProvider & { puts: string[]; deletes: string[] } {
  const puts: string[] = [];
  const deletes: string[] = [];
  return {
    name: 'fake',
    puts,
    deletes,
    put: async (input) => {
      puts.push(input.key);
      return { key: input.key, url: `https://cdn/${input.key}` };
    },
    delete: async (key) => {
      deletes.push(key);
    },
    read: async () => null,
  };
}

const file = (over: Partial<UploadFile> = {}): UploadFile => ({
  originalname: 'pic.PNG',
  mimetype: 'image/png',
  size: 5,
  buffer: Buffer.from('hello'),
  ...over,
});

describe('UploadService', () => {
  it('上传成功: 生成 yyyy/mm/uuid.ext 键、保留扩展名、落库并带 uploaderId', async () => {
    const repo = fakeRepo();
    const storage = recordingProvider();
    const svc = new UploadService(storage, repo as never, fakeConfig());

    const saved = await svc.upload(file(), 'user-1');
    expect(saved.key).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
    expect(saved.url).toBe(`https://cdn/${saved.key}`);
    expect(saved.driver).toBe('fake');
    expect(saved.uploaderId).toBe('user-1');
    expect(storage.puts).toHaveLength(1);
    expect(repo.rows).toHaveLength(1);
  });

  it('无文件时抛 FILE_UPLOAD_FAILED', async () => {
    const svc = new UploadService(recordingProvider(), fakeRepo() as never, fakeConfig());
    await expect(svc.upload(undefined)).rejects.toMatchObject({
      code: ErrorCode.FILE_UPLOAD_FAILED,
    });
  });

  it('超过大小上限抛 FILE_TOO_LARGE', async () => {
    const svc = new UploadService(recordingProvider(), fakeRepo() as never, fakeConfig());
    await expect(svc.upload(file({ size: 999 }))).rejects.toMatchObject({
      code: ErrorCode.FILE_TOO_LARGE,
    });
  });

  it('不在白名单的 MIME 抛 FILE_TYPE_NOT_ALLOWED', async () => {
    const svc = new UploadService(
      recordingProvider(),
      fakeRepo() as never,
      fakeConfig({ allowedMimeTypes: ['image/jpeg'] }),
    );
    await expect(svc.upload(file({ mimetype: 'image/png' }))).rejects.toMatchObject({
      code: ErrorCode.FILE_TYPE_NOT_ALLOWED,
    });
    expect(BusinessException).toBeTruthy();
  });

  it('findById 不存在抛 FILE_NOT_FOUND; remove 删除存储对象并移除记录', async () => {
    const repo = fakeRepo();
    const storage = recordingProvider();
    const svc = new UploadService(storage, repo as never, fakeConfig());

    const saved = await svc.upload(file(), 'user-1');
    (saved as FileObject).id = 'f1';
    await expect(svc.findById('missing')).rejects.toMatchObject({ code: ErrorCode.FILE_NOT_FOUND });

    await svc.remove('f1');
    expect(storage.deletes).toEqual([saved.key]);
    expect(repo.rows).toHaveLength(0);
  });
});
