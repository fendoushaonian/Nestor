import { StorageConfig } from '../../../config/configuration';
import { PutObjectInput, PutObjectResult, StorageProvider } from './storage-provider';

// ali-oss 无完善的 ESM 类型默认导出, 用最小接口约束我们用到的方法。
interface OssClient {
  put(key: string, body: Buffer, options?: { mime?: string }): Promise<{ url: string }>;
  delete(key: string): Promise<unknown>;
}

/**
 * 阿里云 OSS 存储。SDK 懒加载, 仅在该驱动启用时引入。
 */
export class OssStorageProvider implements StorageProvider {
  readonly name = 'oss';
  private client?: OssClient;

  constructor(private readonly cfg: StorageConfig['oss']) {}

  private async getClient(): Promise<OssClient> {
    if (!this.client) {
      const mod = await import('ali-oss');
      const OSS = (mod as { default?: unknown }).default ?? mod;
      const Ctor = OSS as new (opts: Record<string, unknown>) => OssClient;
      this.client = new Ctor({
        region: this.cfg.region,
        bucket: this.cfg.bucket,
        accessKeyId: this.cfg.accessKeyId,
        accessKeySecret: this.cfg.accessKeySecret,
        endpoint: this.cfg.endpoint,
      });
    }
    return this.client;
  }

  private publicUrl(key: string, fallback: string): string {
    return this.cfg.publicBaseUrl ? `${this.cfg.publicBaseUrl}/${key}` : fallback;
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const client = await this.getClient();
    const res = await client.put(input.key, input.body, { mime: input.mimeType });
    return { key: input.key, url: this.publicUrl(input.key, res.url) };
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    await client.delete(key);
  }

  /** 远端对象不经应用回源, 调用方应使用 url 直接访问。 */
  async read(): Promise<Buffer | null> {
    return null;
  }
}
