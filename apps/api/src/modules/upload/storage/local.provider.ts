import { promises as fs } from 'fs';
import * as path from 'path';
import { PutObjectInput, PutObjectResult, StorageProvider } from './storage-provider';

/** 本地磁盘存储。文件落在 baseDir 下, 对外通过 publicBaseUrl + key 访问(见 UploadController 的回源接口)。 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';

  constructor(
    private readonly baseDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  /** 解析 key 的绝对落盘路径, 并防止越界(路径穿越)。 */
  private resolve(key: string): string {
    const root = path.resolve(this.baseDir);
    const target = path.resolve(root, key);
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error(`Invalid storage key (path traversal): ${key}`);
    }
    return target;
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const target = this.resolve(input.key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, input.body);
    return { key: input.key, url: `${this.publicBaseUrl}/${input.key}` };
  }

  async delete(key: string): Promise<void> {
    const target = this.resolve(key);
    await fs.rm(target, { force: true });
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }
}
