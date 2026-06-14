import { randomUUID } from 'crypto';
import * as path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode, PaginatedResult, paginate } from '@nestor/shared';
import { Repository } from 'typeorm';
import { Configuration } from '../../config/configuration';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { FileObject } from './entities/file-object.entity';
import { STORAGE_PROVIDER } from './storage/storage.factory';
import { StorageProvider } from './storage/storage-provider';

/** 上传时所需的最小文件信息 (来自 multer 的 Express.Multer.File 子集)。 */
export interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class UploadService {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @InjectRepository(FileObject) private readonly files: Repository<FileObject>,
    private readonly config: ConfigService<Configuration, true>,
  ) {}

  private get cfg() {
    return this.config.get('storage', { infer: true });
  }

  /** 校验 → 生成 key → 写入存储 → 落库, 返回文件记录。 */
  async upload(file: UploadFile | undefined, uploaderId?: string): Promise<FileObject> {
    if (!file) {
      throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED, '未接收到文件');
    }
    const { maxFileSize, allowedMimeTypes } = this.cfg;
    if (file.size > maxFileSize) {
      throw new BusinessException(
        ErrorCode.FILE_TOO_LARGE,
        `文件大小 ${file.size} 超过上限 ${maxFileSize} 字节`,
      );
    }
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
      throw new BusinessException(
        ErrorCode.FILE_TYPE_NOT_ALLOWED,
        `不支持的文件类型: ${file.mimetype}`,
      );
    }

    const key = this.buildKey(file.originalname);
    let result;
    try {
      result = await this.storage.put({ key, body: file.buffer, mimeType: file.mimetype });
    } catch {
      throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED, '文件写入存储失败');
    }

    const record = this.files.create({
      key: result.key,
      url: result.url,
      driver: this.storage.name,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploaderId,
    });
    const saved = await this.files.save(record);

    // 本地驱动: provider 返回的 key 路径无对应路由, 改用按 id 回源的 raw 接口(见 UploadController)。
    // 远端驱动(s3/oss): 保留对象/CDN 直链。id 仅在落库后可知, 故二次保存。
    if (this.storage.name === 'local') {
      saved.url = `${this.cfg.local.publicBaseUrl}/${saved.id}/raw`;
      return this.files.save(saved);
    }
    return saved;
  }

  async list(query: PaginationQueryDto): Promise<PaginatedResult<FileObject>> {
    const [list, total] = await this.files.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return paginate(list, total, query.page, query.pageSize);
  }

  async findById(id: string): Promise<FileObject> {
    const file = await this.files.findOne({ where: { id } });
    if (!file) throw new BusinessException(ErrorCode.FILE_NOT_FOUND, '文件不存在');
    return file;
  }

  /** 删除存储对象并软删除记录。 */
  async remove(id: string): Promise<void> {
    const file = await this.findById(id);
    await this.storage.delete(file.key);
    await this.files.softRemove(file);
  }

  /** 读取本地驱动的文件字节(用于回源下载); 远端驱动返回 null, 应改用 url 跳转。 */
  async readContent(file: FileObject): Promise<Buffer | null> {
    return this.storage.read(file.key);
  }

  /** 生成 yyyy/mm/uuid.ext 形式的存储键, 保留原扩展名。 */
  private buildKey(originalName: string): string {
    const ext = path
      .extname(originalName)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${yyyy}/${mm}/${randomUUID()}${ext}`;
  }
}
