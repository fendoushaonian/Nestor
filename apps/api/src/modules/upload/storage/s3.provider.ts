import type { S3Client } from '@aws-sdk/client-s3';
import { StorageConfig } from '../../../config/configuration';
import { PutObjectInput, PutObjectResult, StorageProvider } from './storage-provider';

/**
 * S3 / S3 兼容存储 (AWS S3、MinIO、Cloudflare R2 等)。
 * SDK 采用懒加载, 仅在该驱动启用时引入, 避免本地驱动场景的无谓依赖加载。
 */
export class S3StorageProvider implements StorageProvider {
  readonly name = 's3';
  private client?: S3Client;

  constructor(private readonly cfg: StorageConfig['s3']) {}

  private async getClient(): Promise<S3Client> {
    if (!this.client) {
      const { S3Client: Client } = await import('@aws-sdk/client-s3');
      this.client = new Client({
        region: this.cfg.region,
        endpoint: this.cfg.endpoint,
        forcePathStyle: this.cfg.forcePathStyle,
        credentials: {
          accessKeyId: this.cfg.accessKeyId,
          secretAccessKey: this.cfg.secretAccessKey,
        },
      });
    }
    return this.client;
  }

  private publicUrl(key: string): string {
    if (this.cfg.publicBaseUrl) return `${this.cfg.publicBaseUrl}/${key}`;
    if (this.cfg.endpoint) {
      const base = this.cfg.endpoint.replace(/\/$/, '');
      return this.cfg.forcePathStyle ? `${base}/${this.cfg.bucket}/${key}` : `${base}/${key}`;
    }
    return `https://${this.cfg.bucket}.s3.${this.cfg.region}.amazonaws.com/${key}`;
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const client = await this.getClient();
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.mimeType,
      }),
    );
    return { key: input.key, url: this.publicUrl(input.key) };
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
  }

  /** 远端对象不经应用回源, 调用方应使用 url 直接访问。 */
  async read(): Promise<Buffer | null> {
    return null;
  }
}
