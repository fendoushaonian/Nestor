import { BaseEntity } from '@nestor/shared';
import { Column, Entity, Index } from 'typeorm';

/**
 * 上传文件记录。key 为存储后端内的对象键(本地为相对路径), url 为对外访问地址。
 * 物理文件存于存储后端(本地磁盘 / S3 / OSS), 本表仅记录元数据用于管理与审计。
 */
@Entity('file_objects')
export class FileObject extends BaseEntity {
  /** 存储后端内的对象键 (driver 内唯一) */
  @Index({ unique: true })
  @Column({ length: 512 })
  key!: string;

  /** 写入时使用的存储驱动 */
  @Column({ length: 16 })
  driver!: string;

  /** 上传时的原始文件名 */
  @Column({ name: 'original_name', length: 255 })
  originalName!: string;

  @Column({ name: 'mime_type', length: 128 })
  mimeType!: string;

  /** 字节数 (bigint 在部分驱动读回为字符串, 用 transformer 统一为 number) */
  @Column({
    type: 'bigint',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number | null) => (v === null ? 0 : Number(v)),
    },
  })
  size!: number;

  /** 对外访问 URL */
  @Column({ length: 1024 })
  url!: string;

  /** 上传者用户 id (匿名上传时为空) */
  @Index()
  @Column({ name: 'uploader_id', type: 'uuid', nullable: true })
  uploaderId?: string;
}
