/** 待写入存储的对象。 */
export interface PutObjectInput {
  /** 存储键 (由 UploadService 生成, driver 内唯一) */
  key: string;
  body: Buffer;
  mimeType: string;
}

/** 写入结果。 */
export interface PutObjectResult {
  key: string;
  /** 对外访问 URL */
  url: string;
}

/**
 * 存储驱动抽象。不同后端(本地/S3/OSS)实现统一的写入、删除与读取接口,
 * UploadService 只依赖该接口, 通过配置选择具体实现。
 */
export interface StorageProvider {
  readonly name: string;
  put(input: PutObjectInput): Promise<PutObjectResult>;
  delete(key: string): Promise<void>;
  /**
   * 读取对象内容。仅本地驱动需要(用于经接口回源/下载);
   * 远端驱动(S3/OSS)返回 null, 调用方应改用 url 直接访问。
   */
  read(key: string): Promise<Buffer | null>;
}
